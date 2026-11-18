#!/usr/bin/env python3
"""Keeps every hero sheet at the idle size by measuring the head (2026-11-18).

The image generator does not keep one figure size: walk, guard, heavy-weapon and attack
sheets came out up to 20 % smaller or larger than the idle sheet, so a hero grew or shrank
whenever the animation changed (lessons_learned.md B1). The standing-height scales in the
importers miss this, because a pose's height depends on the pose (crouch, lean, raised
arms). The head does not: it is drawn at one size in every pose.

For each hero and outfit, the head of idle cell 0 (its face side) is searched for in every
cell of every other sheet (several sizes, both facings, slight tilts). Cells with a
confident match give a head-size ratio; when at least MIN_CELLS of them agree, a sheet whose
median is more than TOLERANCE away from 1 is reported with the scale that would fix it.

The measurement is a pointer, not a verdict: a head drawn in profile reads about 10 % small
against the three-quarter idle head (walks, runs), and sheets whose cells differ from each
other cannot be fixed with one scale. Check each reported sheet by eye beside idle, then
record the scale in size_fixes.py (every importer applies it last).

Usage (from the repository root; needs numpy, pillow and opencv-python-headless):

    python3 tools/art/fit_head_scale.py
"""

from __future__ import annotations

import json
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import size_fixes  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"
PUBLIC = ROOT / "apps/game/public"
HEROES = ["mountain", "river", "wind", "fire"]
OUTFITS = ["", "s3."]
SKIP = ("horse-", "mount-")
WORK = 0.75  # working resolution (speed)
SIZES = np.arange(0.76, 1.36, 0.02)
TILTS = (-20, 0, 20)
MIN_SCORE = 0.85
MIN_CELLS = 2
MAX_SPREAD = 0.06  # the agreeing cells' inter-quartile range (two cells: their difference)
TOLERANCE = 0.06

_images: dict[str, np.ndarray] = {}


def cell_image(entry: dict, i: int) -> np.ndarray:
    s = entry["sheet"]
    url = entry["url"]
    if url not in _images:
        _images[url] = np.array(Image.open(PUBLIC / url).convert("RGBA"))
    c = s["cell"]
    r, col = divmod(i, s["cols"])
    a = _images[url][r * c : r * c + c, col * c : col * c + c]
    n = max(1, round(c * s.get("scale", 1) * WORK))
    return cv2.resize(a, (n, n), interpolation=cv2.INTER_AREA)


def flat(a: np.ndarray) -> np.ndarray:
    alpha = a[:, :, 3:4] / 255.0
    return (a[:, :, :3] * alpha + 128 * (1 - alpha)).astype(np.float32)


def head_template(entry: dict) -> np.ndarray:
    a = cell_image(entry, 0)
    solid = a[:, :, 3] > 40
    ys = np.where(solid.any(1))[0]
    top, h = ys[0], ys[-1] - ys[0]
    band = solid[top : top + int(h * 0.17)]
    xs = np.where(band.any(0))[0]
    # The face side only (heroes face right): hair behind the head moves from pose to pose.
    x0 = xs[0] + int((xs[-1] - xs[0]) * 0.35)
    return a[top : top + int(h * 0.17), x0 : xs[-1] + 1]


def variants(t: np.ndarray) -> list[tuple[float, np.ndarray, np.ndarray]]:
    out = []
    for k in SIZES:
        base = cv2.resize(t, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
        for flip in (False, True):
            v = base[:, ::-1] if flip else base
            for tilt in TILTS:
                if tilt:
                    m = cv2.getRotationMatrix2D((v.shape[1] / 2, v.shape[0] / 2), tilt, 1)
                    w = cv2.warpAffine(v, m, (v.shape[1], v.shape[0]), borderValue=(0, 0, 0, 0))
                else:
                    w = np.ascontiguousarray(v)
                mask = (w[:, :, 3] > 128).astype(np.float32)
                out.append((float(k), flat(w), cv2.merge([mask] * 3)))
    return out


def head_ratio(vs: list, cell: np.ndarray) -> tuple[float, float]:
    """(score, head size relative to the idle head) for one cell."""
    solid = cell[:, :, 3] > 40
    ys = np.where(solid.any(1))[0]
    if len(ys) == 0:
        return 0.0, 0.0
    top, h = ys[0], ys[-1] - ys[0]
    img = flat(cell[max(0, top - 4) : min(cell.shape[0], top + int(h * 0.5) + 60)])
    best = (0.0, 0.0)
    for k, t, mask in vs:
        if t.shape[0] >= img.shape[0] or t.shape[1] >= img.shape[1]:
            continue
        r = cv2.matchTemplate(img, t, cv2.TM_CCOEFF_NORMED)
        r[~np.isfinite(r)] = 0
        v = float(r.max())
        if v > best[0]:
            best = (v, k)
    return best


def measure(job: tuple[str, str]) -> list[tuple[str, float, float | None, list]]:
    hero, outfit = job
    assets = json.loads(MANIFEST.read_text(encoding="utf-8"))["assets"]
    pre = f"hero.{hero}.{outfit}"
    idle = assets.get(f"{pre}sheet.idle")
    if not idle:
        return []
    vs = variants(head_template(idle))
    rows = []
    for key in sorted(assets):
        if not key.startswith(pre) or (not outfit and key.startswith(f"hero.{hero}.s3.")):
            continue
        e = assets[key]
        s = e.get("sheet")
        if not s or "cells" not in s or any(x in key for x in SKIP) or key.endswith("sheet.idle"):
            continue
        cells = [head_ratio(vs, cell_image(e, i)) for i, c in enumerate(s["cells"]) if c]
        good = sorted(k for v, k in cells if v >= MIN_SCORE)
        med = None
        if len(good) >= MIN_CELLS:
            q1, q3 = np.percentile(good, [25, 75]) if len(good) > 2 else (good[0], good[-1])
            if q3 - q1 <= MAX_SPREAD:
                med = float(np.median(good))
        rows.append((key, s.get("scale", 1.0), med, cells))
    return rows


def main() -> None:
    jobs = [(h, o) for h in HEROES for o in OUTFITS]
    with ProcessPoolExecutor() as pool:
        results = [r for rows in pool.map(measure, jobs) for r in rows]
    off = []
    for key, scale, med, _ in results:
        if med is None or abs(med - 1) <= TOLERANCE:
            continue
        mark = " (listed)" if key in size_fixes.SIZE_FIX else ""
        off.append(f"{key}: head {med:.2f} x idle, scale {scale} -> {round(scale / med, 3)}{mark}")
    print("\n".join(off) if off else "every measured sheet is within tolerance")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""M27: imports the heroes' approved Stage 3 outfit sheets (HERO-<X>-S3-*.png).

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/art/import_s3_outfit.py ../pictures/FightForPeace

The Stage 3 weapon and horse sheets were drawn in the Stage 3 outfit, so a Stage 3 room
dresses every hero in it (SpritePicker.setOutfit('s3')). Each S3 sheet is a pose-for-pose
redraw of a Stage 1 or 2 sheet (APPROVED_VARIANTS.md #049-#186): for every hero asset whose
provenance names `<PREFIX>-<SUFFIX>.png`, the twin `<PREFIX>-S3-<SUFFIX>.png` is imported as
`hero.<id>.s3.<rest of the key>` with the same cell layout. Its draw scale is measured, not
guessed: the original's scale times the median ratio of the figure heights cell by cell, so
the hero keeps one size when the outfit changes. Sheets flagged at approval for a refit
(feet over the row line) are refitted like their originals.

Other manifest entries are kept. Requires Pillow.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import import_art  # noqa: E402
import import_stage2  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"
HEROES = {"mountain": "HERO-MTN", "river": "HERO-RIV", "wind": "HERO-WND", "fire": "HERO-FIR"}
# Refits noted at approval (#050, #119, #159), keyed by the output name.
REFIT = {"mountain-s3-anchor-hook": 0.9, "wind-s3-idle": 0.92, "fire-s3-ember-knee": 0.95}


def heights(cells: list) -> list[float | None]:
    return [None if c is None else c["foot"] - c["y0"] for c in cells]


def measured_scale(orig: dict, twin: dict) -> float:
    a, b = heights(orig["cells"]), heights(twin["cells"])
    ratios = sorted(x / y for x, y in zip(a, b) if x and y)
    base = orig.get("scale", 1.0)
    if not ratios:
        return base
    return round(base * ratios[len(ratios) // 2], 3)


def stage1_source(hero: str, prefix: str, key: str) -> str:
    """The Stage 1 importer records no provenance: its file names follow from the key."""
    rest = key[len(f"hero.{hero}.") :]
    if rest.startswith("sheet.") and rest[6:] in import_art.HERO_COMMON:
        stem = f"{prefix}-{import_art.HERO_COMMON[rest[6:]]}"
    elif rest.startswith("pose."):
        stem = f"{prefix}-{rest.split('.')[-1].upper()}"
    else:
        return ""
    return f"heroes/{hero}/{import_art.APPROVED.get(stem, stem + '.png')}"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    base = Path(sys.argv[1]).resolve()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    import_art.REFIT.update(REFIT)
    done: list[str] = []
    for hero, prefix in HEROES.items():
        for key, entry in sorted(assets.items()):
            if not key.startswith(f"hero.{hero}.") or key.startswith(f"hero.{hero}.s3."):
                continue
            src = (entry.get("provenance") or {}).get("source", "") or stage1_source(hero, prefix, key)
            sheet = entry.get("sheet")
            m = re.fullmatch(rf"heroes/{hero}/{prefix}-(.+?)(?:_v\d+)?\.png", src)
            if not m or not sheet or sheet["cols"] != 3 or sheet["rows"] != 2:
                continue
            suffix = m.group(1)
            if suffix.startswith("S3-"):
                continue
            twin_src = base / f"heroes/{hero}" / f"{prefix}-S3-{suffix}.png"
            if not twin_src.exists():
                continue
            rest = key[len(f"hero.{hero}.") :]
            name = f"{hero}-s3-{rest.split('.')[-1]}"
            twin = import_art.convert(twin_src, name)
            twin["sheet"]["scale"] = measured_scale(sheet, twin["sheet"])
            assets[f"hero.{hero}.s3.{rest}"] = import_stage2.provenance(
                twin, f"heroes/{hero}/{twin_src.name}"
            )
            done.append(f"{hero}.s3.{rest} {twin['sheet']['scale']}")
    manifest["assets"] = dict(sorted(assets.items()))
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")
    print("\n".join(done))
    print(len(done), "sheets")


if __name__ == "__main__":
    main()

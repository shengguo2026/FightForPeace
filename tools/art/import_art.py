#!/usr/bin/env python3
"""Imports approved art from the shengguo2026/pictures checkout into the game.

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/art/import_art.py ../pictures/FightForPeace

What it does, for every sheet listed below:
  * picks the approved file (APPROVED_VARIANTS.md: e.g. HERO-RIV-STAFF-B_v2.png),
  * scales the 1536x1024 sheet (3x2 cells of 512 px) to 75 % (cells of 384 px, so a
    standing adult drawn at ~400 px is ~300 px, the simulation's body height),
  * writes it as lossy WebP with alpha to apps/game/public/art/,
  * measures each cell's opaque bounds (`foot` is the lowest opaque row) and the sheet's
    ground line (`ground`, the median foot) so the renderer stands every pose on the
    fighter's ground point, and skips empty cells,
  * writes packages/platform/src/assets/manifest.json (logical asset id -> sheet).

Re-running it is deterministic for the same inputs. Requires Pillow.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "apps/game/public/art"
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"

SCALE = 0.75
COLS, ROWS = 3, 2
CELL = int(512 * SCALE)  # 384
ALPHA_MIN = 40
WEBP_QUALITY = 88

# Approved variants (APPROVED_VARIANTS.md): asset id -> file name actually used.
APPROVED = {
    "HERO-RIV-STAFF-B": "HERO-RIV-STAFF-B_v2.png",
    "ENM-LOOKOUT-REACT": "ENM-LOOKOUT-REACT_v2.png",
}

HEROES = {"mountain": ("heroes/mountain", "HERO-MTN"), "river": ("heroes/river", "HERO-RIV")}

# Movement and reaction sheets every founder has (logical id suffix -> sheet name suffix).
HERO_COMMON = {
    "idle": "IDLE",
    "walk": "WALK",
    "jump": "JUMP",
    "dash": "DASH",
    "hurt": "HURT",
    "knockdown": "KNOCKDOWN",
    "guard": "GUARD",
    "exact-counter": "EXACT-COUNTER",
    "breaker-pickup": "BREAKER-PICKUP",
    "grab-throw": "GRAB-THROW",
    "staff-a": "STAFF-A",
    "staff-b": "STAFF-B",
    "handwheel": "HANDWHEEL",
}

# The training dummy and the Pressed Recruit share the recruit sheets (key "trainer").
ENEMIES = {
    "trainer": ("enemies/recruit", "ENM-RECRUIT", ["IDLE-WALK", "ATTACK", "REACT", "EXIT"]),
    "shield": ("enemies/shield", "ENM-SHIELD", ["IDLE-WALK", "ATTACK", "GUARD", "REACT", "EXIT"]),
    "runner": ("enemies/runner", "ENM-RUNNER", ["IDLE-WALK", "ATTACK", "AIR", "REACT", "EXIT"]),
    "overseer": ("enemies/overseer", "ENM-OVERSEER", ["IDLE-WALK", "ATTACK", "GRAB", "REACT", "EXIT"]),
    "lookout": ("enemies/lookout", "ENM-LOOKOUT", ["IDLE-WALK", "ATTACK", "REPOSITION", "REACT", "EXIT"]),
    "enforcer": (
        "enemies/enforcer",
        "ENM-ENFORCER",
        ["IDLE-WALK", "ATTACK-A", "ATTACK-B", "ARMOR", "REACT", "EXIT"],
    ),
    "commander": (
        "enemies/commander",
        "ENM-COMMANDER",
        ["IDLE-WALK", "ATTACK-A", "ATTACK-B", "ATTACK-C", "PHASE", "STAGGER", "REACT", "REACT-P2", "EXIT", "EXIT-P2"],
    ),
}

# Stage 1 areas (environments/stage1): far, middle, floor and foreground layers, plus the
# full plate. A seamless `_tiled` variant is used where one was delivered.
STAGE1_AREAS = ["fields", "bridge", "mill", "canal", "courtyard", "sluice"]
STAGE1_LAYERS = ["FAR", "MID", "FLOOR", "FG", "PLATE"]
BG_QUALITY = 80
# Areas whose arena is drawn on the full plate (the Commander fights on the Sluice PLATE).
PLATE_AREAS = {"sluice"}

PROPS = ["WORKSTAFF", "HANDWHEEL", "SLUICEBOARDS", "IMPACT-HAZARD", "FOOD", "BARRICADE"]

# M9 non-combatants: the two coerced workers of the Stage 1 rescue (pose sheets).
NPCS = {"worker-a": "NPC-WORKER-A", "worker-b": "NPC-WORKER-B"}


def action_ids(hero: str) -> list[tuple[str, str]]:
    """(category, action id) for every action of a hero, read from its YAML file."""
    out = []
    category = None
    for line in (ROOT / f"packages/data/heroes/{hero}.yaml").read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s.startswith("- id:") and line.startswith("  - id:"):
            current = s.split(":", 1)[1].strip()
            category = None
            out.append([None, current])
        elif s.startswith("category:") and out and out[-1][0] is None and category is None:
            category = s.split(":", 1)[1].strip()
            out[-1][0] = category
    return [(c, i) for c, i in out]


def cell_info(img: Image.Image) -> list[dict | None]:
    cells = []
    alpha = img.getchannel("A").point(lambda v: 255 if v >= ALPHA_MIN else 0)
    for r in range(ROWS):
        for c in range(COLS):
            box = alpha.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).getbbox()
            if box is None:
                cells.append(None)
                continue
            x0, y0, x1, y1 = box
            cells.append({"x0": x0, "y0": y0, "x1": x1, "foot": y1})
    return cells


def convert(src: Path, name: str) -> dict:
    img = Image.open(src).convert("RGBA")
    if img.size != (1536, 1024):
        raise SystemExit(f"{src}: expected a 1536x1024 sheet, got {img.size}")
    img = img.resize((COLS * CELL, ROWS * CELL), Image.Resampling.LANCZOS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{name}.webp"
    img.save(out, "WEBP", quality=WEBP_QUALITY, alpha_quality=90, method=6)
    cells = cell_info(img)
    feet = sorted(c["foot"] for c in cells if c)
    # The sheet's ground line: the median foot. Standing cells sit on it; jumps and
    # launches keep the lift they were drawn with.
    ground = feet[len(feet) // 2] if feet else CELL
    return {
        "url": f"art/{name}.webp",
        "sheet": {"cols": COLS, "rows": ROWS, "cell": CELL, "ground": ground, "cells": cells},
    }


def convert_layer(src: Path, name: str, tiled: bool) -> dict:
    img = Image.open(src).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{name}.webp"
    opaque = img.getchannel("A").getextrema()[0] == 255
    img.save(out, "WEBP", quality=BG_QUALITY, alpha_quality=85, method=6, exact=not opaque)
    box = img.getchannel("A").point(lambda v: 255 if v >= ALPHA_MIN else 0).getbbox()
    top, bottom = (box[1], box[3]) if box else (0, img.size[1])
    return {
        "url": f"art/{name}.webp",
        "layer": {"w": img.size[0], "h": img.size[1], "top": top, "bottom": bottom, "tiled": tiled},
    }


def source(base: Path, folder: str, stem: str) -> Path | None:
    name = APPROVED.get(stem, f"{stem}.png")
    p = base / folder / name
    return p if p.exists() else None


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    base = Path(sys.argv[1]).resolve()
    assets: dict[str, dict] = {}
    missing: list[str] = []
    for hero, (folder, prefix) in HEROES.items():
        for key, suffix in HERO_COMMON.items():
            p = source(base, folder, f"{prefix}-{suffix}")
            if p is None:
                missing.append(f"{prefix}-{suffix}")
                continue
            assets[f"hero.{hero}.sheet.{key}"] = convert(p, f"{hero}-{key}")
        for category, action in action_ids(hero):
            p = source(base, folder, f"{prefix}-{action.upper()}")
            if p is None:
                continue  # drawn from a shared sheet (counter, grabs) or still a placeholder
            assets[f"hero.{hero}.pose.{category}.{action}"] = convert(p, f"{hero}-{action}")
    for enemy, (folder, prefix, sheets) in ENEMIES.items():
        for suffix in sheets:
            p = source(base, folder, f"{prefix}-{suffix}")
            if p is None:
                missing.append(f"{prefix}-{suffix}")
                continue
            assets[f"enemy.{enemy}.sheet.{suffix.lower()}"] = convert(p, f"{enemy}-{suffix.lower()}")
    for prop in PROPS:
        p = source(base, "props", f"PROP-{prop}")
        if p is None:
            missing.append(f"PROP-{prop}")
            continue
        assets[f"prop.{prop.lower()}"] = convert(p, f"prop-{prop.lower()}")
    for key, stem in NPCS.items():
        p = source(base, "npcs", stem)
        if p is None:
            missing.append(stem)
            continue
        assets[f"npc.{key}.sheet"] = convert(p, f"npc-{key}")
    for area in STAGE1_AREAS:
        for layer in STAGE1_LAYERS:
            stem = f"ENV-{area.upper()}-{layer}"
            folder = "environments/stage1"
            if layer == "PLATE" and area not in PLATE_AREAS:
                continue
            tiled = source(base, folder, f"{stem}_tiled") if layer != "PLATE" else None
            p = tiled or source(base, folder, stem)
            if p is None:
                if layer != "PLATE":
                    missing.append(stem)
                continue
            key = f"bg.stage1.{area}.{layer.lower()}"
            assets[key] = convert_layer(p, f"bg-{area}-{layer.lower()}", tiled is not None)
    manifest = {"version": 2, "assets": dict(sorted(assets.items()))}
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    # Keep the manifest in the repository's Prettier style (best effort).
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")
    total = sum(f.stat().st_size for f in OUT_DIR.glob("*.webp"))
    print(f"{len(assets)} sheets, {total / 1e6:.1f} MB in {OUT_DIR.relative_to(ROOT)}")
    if missing:
        print("missing:", ", ".join(missing))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""M27: imports the approved Stage 3 systems art (enemies, Garran Voss, weapons, horses, props).

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/art/import_stage3.py ../pictures/FightForPeace [--only enemies,heroes,props]

What it does (APPROVED_VARIANTS.md "Use" files only, scales as recorded at approval):
  * enemies: Garran Voss (idle, hookstaff A and B, clinch, ground, winch, defense, hit,
    capture, walk), the five Stage 3 bandit roles (idle, attack or role sheet, hit, walk or
    run, flee) and the Mounted Raider (RIDER3: ride, attack and disengage as 2 x 2 mounted
    grids; on foot, its walk and flee as 3 x 2 sheets) -> `enemy.<art>.sheet.<suffix>`.
  * heroes: each hero's Stage 3 weapon sheets (hiking staff -> `hike`, wood axe -> `axe`,
    quarry hammer -> `hammer`), their armed walks (`hike-walk`, `axe-walk`, `hammer-walk`)
    and the horse sheets (2 x 2 grids, `horse-ride`, `horse-attack`, `horse-defense`,
    `horse-special`, `horse-ultimate`, `horse-stability`). The bandit revolver reuses the
    Stage 2 revolver sheets; the Stage 3 outfit sheets and story art stay for M28.
  * props: the Stage 3 weapons, recovery food, quarry scaffold and quarry interactables
    -> `prop.s3-weapons`, `prop.s3-food`, `prop.s3-scaffold`, `prop.s3-quarry`.

Other manifest entries are kept. Requires Pillow.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import import_art  # noqa: E402  (3 x 2 sheet conversion)
import import_stage2  # noqa: E402  (2 x 2 mounted grids, provenance)

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"

# art id -> (folder, prefix, {suffix: draw scale}); 3 x 2 sheets.
ENEMIES: dict[str, tuple[str, str, dict[str, float | None]]] = {
    "garran": (
        "enemies/garran",
        "ENM-GARRAN",
        {
            "IDLE-WALK": None, "WALK": None, "HOOK-A": None, "HOOK-B": None,
            "CLINCH": 0.94, "GROUND": 0.92, "WINCH": 0.95, "DEFENSE": None, "HIT": None,
            "CAPTURE": 0.9,
        },
    ),
    "ambusher": (
        "enemies/ambusher",
        "ENM-AMBUSHER",
        {"IDLE-RUN": 0.85, "ATTACK": 0.85, "HIT": 0.85, "RUN": 0.9, "FLEE": 0.85},
    ),
    "bruiser": (
        "enemies/bruiser",
        "ENM-BRUISER",
        {"IDLE-WALK": 0.9, "ATTACK": 0.9, "HIT": 0.9, "WALK": 0.9, "FLEE": 0.9},
    ),
    "trapper": (
        "enemies/trapper",
        "ENM-TRAPPER",
        {"IDLE-WALK": 0.85, "ROPE": 0.85, "HIT": 0.85, "WALK": 0.85, "FLEE": 0.85},
    ),
    "stalker": (
        "enemies/stalker",
        "ENM-STALKER",
        {"IDLE-WALK": 0.85, "FEINT": 0.85, "HIT": 0.85, "WALK": 0.85, "FLEE": 0.85},
    ),
    "captain": (
        "enemies/captain",
        "ENM-CAPTAIN",
        {"IDLE-WALK": 0.87, "ATTACK": 0.87, "HIT": 0.87, "WALK": 0.84, "FLEE": 0.84},
    ),
    "rider3": (
        "enemies/rider3",
        "ENM-RIDER3",
        {"FOOT": 0.88, "FOOT-WALK": 0.84, "FOOT-FLEE": 0.84},
    ),
}
# The Mounted Raider on its bandit horse: 2 x 2 mounted grids (no scale, like the bikes).
RAIDER_MOUNT = ["RIDE", "GALLOP", "ATTACK", "DISENGAGE"]

HEROES = {
    "mountain": ("heroes/mountain", "HERO-MTN"),
    "river": ("heroes/river", "HERO-RIV"),
    "wind": ("heroes/wind", "HERO-WND"),
    "fire": ("heroes/fire", "HERO-FIR"),
}
# Weapon sheet key -> (sheet suffix, walk suffix). The Stage 3 staff walk is the -v2 file
# (the Stage 2 STAFF-WALK stays the Workstaff's).
WEAPONS = {"hike": ("STAFF", "STAFF-WALK-v2"), "axe": ("AXE", "AXE-WALK"), "hammer": ("HAMMER", "HAMMER-WALK")}
# Draw scales recorded at approval (APPROVED_VARIANTS.md #187-#198 and #350-#361).
WEAPON_SCALE = {"mountain-axe": 0.92, "river-axe": 0.93}
WALK_SCALE = {
    "mountain-hike-walk": 0.83, "mountain-axe-walk": 0.82, "mountain-hammer-walk": 0.82,
    "river-hike-walk": 0.84, "river-axe-walk": 0.82, "river-hammer-walk": 0.85,
    "wind-hike-walk": 0.84, "wind-axe-walk": 0.84, "wind-hammer-walk": 0.84,
    "fire-hike-walk": 0.85, "fire-axe-walk": 0.84, "fire-hammer-walk": 0.86,
}
# GALLOP (2026-11-18): the four-frame canter loop (codex_prompts_stage3_gallop.md).
HORSE_SHEETS = ["RIDE", "GALLOP", "ATTACK", "DEFENSE", "SPECIAL", "ULTIMATE", "STABILITY"]
PROPS = ["WEAPONS", "FOOD", "SCAFFOLD", "QUARRY"]


def sheet3(src: Path, name: str, scale: float | None) -> dict:
    entry = import_art.convert(src, name)
    if scale:
        entry["sheet"]["scale"] = scale
    return entry


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__)
    only = None
    for a in sys.argv[1:]:
        if a.startswith("--only="):
            only = set(a.split("=", 1)[1].split(","))
    want = lambda part: only is None or part in only  # noqa: E731
    base = Path(args[0]).resolve()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    prov = import_stage2.provenance
    missing: list[str] = []
    if want("enemies"):
        for art, (folder, prefix, sheets) in ENEMIES.items():
            for suffix, scale in sheets.items():
                p = import_art.source(base, folder, f"{prefix}-{suffix}")
                if p is None:
                    missing.append(f"{prefix}-{suffix}")
                    continue
                key = suffix.lower()
                assets[f"enemy.{art}.sheet.{key}"] = prov(
                    sheet3(p, f"{art}-{key}", scale), f"{folder}/{p.name}"
                )
        for m in RAIDER_MOUNT:
            rel = f"enemies/rider3/ENM-RIDER3-{m}.png"
            key = f"mount-{m.lower()}"
            assets[f"enemy.rider3.sheet.{key}"] = prov(
                import_stage2.grid_sheet(base / rel, f"rider3-{key}", 2, 2, False), rel, edits="75 %"
            )
    if want("heroes"):
        for hero, (folder, prefix) in HEROES.items():
            for key, (suffix, walk) in WEAPONS.items():
                p = import_art.source(base, folder, f"{prefix}-{suffix}")
                if p is None:
                    missing.append(f"{prefix}-{suffix}")
                else:
                    assets[f"hero.{hero}.sheet.{key}"] = prov(
                        sheet3(p, f"{hero}-{key}", WEAPON_SCALE.get(f"{hero}-{key}")), f"{folder}/{p.name}"
                    )
                w = base / folder / f"{prefix}-{walk}.png"
                if not w.exists():
                    missing.append(w.name)
                    continue
                entry = import_stage2.grid_sheet(w, f"{hero}-{key}-walk", 3, 2, False, clear=16)
                entry["sheet"]["scale"] = WALK_SCALE[f"{hero}-{key}-walk"]
                assets[f"hero.{hero}.sheet.{key}-walk"] = prov(entry, f"{folder}/{w.name}", edits="75 %")
            for m in HORSE_SHEETS:
                p = import_art.source(base, folder, f"{prefix}-HORSE-{m}")
                if p is None:
                    missing.append(f"{prefix}-HORSE-{m}")
                    continue
                key = f"horse-{m.lower()}"
                assets[f"hero.{hero}.sheet.{key}"] = prov(
                    import_stage2.grid_sheet(p, f"{hero}-{key}", 2, 2, False), f"{folder}/{p.name}", edits="75 %"
                )
    if want("props"):
        for prop in PROPS:
            rel = f"props/PROP-S3-{prop}.png"
            key = f"prop.s3-{prop.lower()}"
            assets[key] = prov(
                import_stage2.grid_sheet(base / rel, key.replace(".", "-"), 3, 2, False), rel, edits="75 %"
            )
    manifest["assets"] = dict(sorted(assets.items()))
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")
    if missing:
        print("missing:", ", ".join(missing))


if __name__ == "__main__":
    main()

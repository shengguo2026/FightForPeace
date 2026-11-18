#!/usr/bin/env python3
"""Imports the hero run cycles and the Stage 3 gallop loops (2026-11-18) without re-importing
every other sheet.

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/art/import_run_gallop.py ../pictures/FightForPeace

  * HERO-<X>-RUN.png -> `hero.<id>.sheet.run` (3 x 2, scale from import_art.SHEET_SCALE);
    HERO-<X>-S3-RUN.png -> `hero.<id>.s3.sheet.run`, scale measured against the base run
    like import_s3_outfit.py.
  * HERO-<X>-HORSE-GALLOP.png -> `hero.<id>.sheet.horse-gallop` and ENM-RIDER3-GALLOP.png ->
    `enemy.rider3.sheet.mount-gallop` (2 x 2 mounted grids, no scale).

The full importers (import_art.py, import_s3_outfit.py, import_stage3.py) know these sheets
too; this script only saves re-encoding everything. Other manifest entries are kept.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import size_fixes  # noqa: E402
import import_art  # noqa: E402
import import_s3_outfit  # noqa: E402
import import_stage2  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    base = Path(sys.argv[1]).resolve()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    prov = import_stage2.provenance
    missing: list[str] = []
    for hero, (folder, prefix) in import_art.HEROES.items():
        run = import_art.source(base, folder, f"{prefix}-RUN")
        if run is None:
            missing.append(f"{prefix}-RUN")
        else:
            entry = import_art.convert(run, f"{hero}-run")
            assets[f"hero.{hero}.sheet.run"] = prov(entry, f"{folder}/{run.name}")
            twin = import_art.source(base, folder, f"{prefix}-S3-RUN")
            if twin is None:
                missing.append(f"{prefix}-S3-RUN")
            else:
                t = import_art.convert(twin, f"{hero}-s3-run")
                t["sheet"]["scale"] = import_s3_outfit.measured_scale(entry["sheet"], t["sheet"])
                assets[f"hero.{hero}.s3.sheet.run"] = prov(t, f"{folder}/{twin.name}")
        gallop = import_art.source(base, folder, f"{prefix}-HORSE-GALLOP")
        if gallop is None:
            missing.append(f"{prefix}-HORSE-GALLOP")
        else:
            key = "horse-gallop"
            assets[f"hero.{hero}.sheet.{key}"] = prov(
                import_stage2.grid_sheet(gallop, f"{hero}-{key}", 2, 2, False),
                f"{folder}/{gallop.name}",
                edits="75 %",
            )
    rel = "enemies/rider3/ENM-RIDER3-GALLOP.png"
    if (base / rel).exists():
        assets["enemy.rider3.sheet.mount-gallop"] = prov(
            import_stage2.grid_sheet(base / rel, "rider3-mount-gallop", 2, 2, False), rel, edits="75 %"
        )
    else:
        missing.append(rel)
    manifest["assets"] = dict(sorted(assets.items()))
    size_fixes.apply(manifest["assets"])
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")
    if missing:
        print("missing:", ", ".join(missing))


if __name__ == "__main__":
    main()

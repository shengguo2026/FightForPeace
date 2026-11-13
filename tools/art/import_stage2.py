#!/usr/bin/env python3
"""M22: imports the approved Stage 2 art and story media into the game and the manifest.

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/art/import_stage2.py ../pictures/FightForPeace [--only clips,stills,env,sheets,shell]

What it does (APPROVED_VARIANTS.md "Use" files only):
  * clips: the 32 story clips and the title loop (story/stage2) -> 960 px MP4 (H.264, fast
    start) in apps/game/public/media/cine/, **audio stripped** (the Flow soundtrack never
    ships; music, ambience, narration and captions are runtime layers), with the approved
    trims (P04 0-3.5 s, P07 0-5 s, R02 0-6.5 s, J05 the 0-5.5 s `_trim` file). Ids
    `cine.stage2.<code>` (`cine.stage2.p01` ... `cine.stage2.title-loop`). Stage 2 ships one
    encoding: every supported browser plays H.264, and it halves the download.
  * stills: every clip's approved start frame plus the Community Recovery inserts (C01D/F,
    C03D/F), the two briefing stills, the formula/ledger and seal close-ups and the title
    loop frame -> apps/game/public/art/shell/s2-*.webp, ids `story.stage2.<code>`.
  * env: the 12 Stage 2 areas (environments/stage2) -> far, mid, floor and fg layers
    (`_tiled` where made) as `bg.stage2.<area>.<layer>`, the PLATE as a reference layer.
  * sheets: the Stage 2 weapon and mounted hero sheets, Stage 2 villagers, parked and
    downed bikes, props and effect sheets -> sprite sheets in the manifest (mounted and bike
    sheets are 2 x 2 grids of 768 x 512 cells, scaled to 75 %).
  * shell: Stage 2 key art, menu and Museum backgrounds, the eight Stage 2 outfit renders,
    Tomas and Marek portraits, the three Museum artifacts and two badges.

Other manifest entries are kept. Requires Pillow and ffmpeg/ffprobe on PATH.
Music is built by tools/audio/build_stage2_score.py (loops, stingers, loudness).
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import import_art  # noqa: E402  (shared sheet and layer conversion)
import import_media  # noqa: E402  (effect sheets)

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "apps/game/public"
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"
WIDTH = 960

# code -> (approved clip, start-frame still, trim end in s or None, edit note)
CLIPS: dict[str, tuple[str, str, float | None, str | None]] = {
    "p01": ("P01-water-returns-v1.mp4", "P01-water-returns-v1.png", None, None),
    "p02": ("P02-building-a-reserve-v1.mp4", "P02-building-a-reserve-v1.png", None, None),
    "p03": ("P03-seasons-of-construction-v3.mp4", "P03-seasons-of-construction-v1.png", None, "v3 take"),
    "p04": ("P04-hydroponic-cultivation-v1.mp4", "P04-hydroponic-cultivation-v1.png", 3.5, "cut at 3.5 s (second half switches to open tubs)"),
    "p05": ("P05-aquaponic-cycle-v3.mp4", "P05-aquaponic-cycle-v1.png", None, "v3 take"),
    "p06": ("P06-medicinal-plants-and-clinic-v1.mp4", "P06-medicinal-plants-and-clinic-v1.png", None, None),
    "p07": ("P07-education-reinvestment-v2.mp4", "P07-education-reinvestment-v1.png", 5.0, "v2 cut at 5.0 s (duplicate twin after 5.2 s)"),
    "p08": ("P08-clinic-homes-civic-life-v3.mp4", "P08-clinic-homes-civic-life-v1.png", None, "v3 take"),
    "p09": ("P09-civil-protection-formation-v1.mp4", "P09-civil-protection-formation-v1.png", None, None),
    "p10": ("P10-combat-discipline-v2.mp4", "P10-combat-discipline-v1.png", None, "v2 take"),
    "p11": ("P11-responsible-mobility-v2.mp4", "P11-responsible-mobility-v1.png", None, "v2 take"),
    "p12": ("P12-the-future-they-built-v1.mp4", "P12-the-future-they-built-v1.png", None, None),
    "r01": ("R01-routine-patrol-v2.mp4", "R01-routine-patrol-v1.png", None, "v2 take"),
    "r02": ("R02-the-pursued-stranger-v2.mp4", "R02-the-pursued-stranger-v1.png", 6.5, "v2 cut at 6.5 s (she turns to the camera)"),
    "r03": ("R03-compassionate-intervention-v2.mp4", "R03-compassionate-intervention-v1.png", None, "v2 take"),
    "r04": ("R04-clinic-arrival-v2.mp4", "R04-clinic-arrival-v1.png", None, "v2 take"),
    "g01": ("G01-the-offer-v2.mp4", "G01-the-offer-v1.png", None, "v2 take"),
    "g02": ("G02-greenhouse-tour-v1.mp4", "G02-greenhouse-tour-v1.png", None, None),
    "g03": ("G03-questions-that-do-not-fit-v1.mp4", "G03-questions-that-do-not-fit-v1.png", None, None),
    "g04": ("G04-quiet-preparation-v1.mp4", "G04-quiet-preparation-v1.png", None, None),
    "n01": ("N01-the-attempt-v2.mp4", "N01-the-attempt-v1.png", None, "v2 take"),
    "n02": ("N02-the-trap-closes-v1.mp4", "N02-the-trap-closes-v1.png", None, None),
    "n03": ("N03-raiders-at-the-glasshouses-v1.mp4", "N03-raiders-at-the-glasshouses-v1.png", None, None),
    "c01": ("C01-systems-breathing-again-v2.mp4", "C01-systems-breathing-again-v1.png", None, "v2 take"),
    "c02": ("C02-care-before-celebration-v1.mp4", "C02-care-before-celebration-v1.png", None, None),
    "c03": ("C03-living-harvest-v2.mp4", "C03-living-harvest-v1.png", None, "v2 take"),
    "c04": ("C04-community-repair-v2.mp4", "C04-community-repair-v1.png", None, "v2 take"),
    "j01": ("J01-knowledge-under-quarantine-v1.mp4", "J01-knowledge-under-quarantine-v1.png", None, None),
    "j02": ("J02-documented-custody-v3.mp4", "J02-documented-custody-v1.png", None, "v3 take"),
    "j03": ("J03-expulsion-at-dawn-v2.mp4", "J03-expulsion-at-dawn-v1.png", None, "v2 take"),
    "j04": ("J04-the-matching-seal-v1.mp4", "J04-the-matching-seal-v1.png", None, None),
    "j05": ("J05-the-abandoned-depot-v1_trim.mp4", "J05-the-abandoned-depot-v1.png", None, "0-5.5 s trim (before the chain appears)"),
    "title-loop": ("FLOW-S2-TITLE-LOOP_seamless.mp4", "STORY-S2-TITLE-LOOP.png", None, "end crossfaded into the start (seamless loop)"),
}

# Stills without a clip: Community Recovery inserts, briefings, close-ups.
STILLS = {
    "c01d": "C01D-damaged-recoverable-v1.png",
    "c01f": "C01F-flourishing-v1.png",
    "c03d": "C03D-damaged-recoverable-v1.png",
    "c03f": "C03F-flourishing-v1.png",
    "brief-01": "S2-BRIEF-01-civil-protection-room-v1.png",
    "brief-02": "S2-BRIEF-02-perimeter-at-night-v1.png",
    "docs": "S2-DOCS-formula-and-ledger-v1.png",
    "seal": "S2-SEAL-closeup-v1.png",
}

AREAS = ["road", "yard", "aqua", "annex", "vestibule", "crops", "seedbay", "medicinal",
         "preproom", "filtration", "hall", "dispatch"]
LAYERS = ["FAR", "MID", "FLOOR", "FG"]  # PLATEs are reference paintings

# Hero sheets (folder, prefix, {key: sheet suffix}, grid). Mountain and River have one lance
# sheet (the shared core), imported as `lance-a`; only the twins have the revolver sheet.
HERO_FOLDERS = {"wind": ("heroes/wind", "HERO-WND"), "fire": ("heroes/fire", "HERO-FIR"),
                "mountain": ("heroes/mountain", "HERO-MTN"), "river": ("heroes/river", "HERO-RIV")}
WEAPON_SHEETS = {"lance-a": ["LANCE-A", "LANCE"], "lance-b": ["LANCE-B"], "revolver": ["REVOLVER"],
                 "heavy": ["HEAVY"]}
# Weapon sheets drawn larger than the hero's idle sheet (standing height measured at
# ingest): shown at this scale so the hero keeps one size.
WEAPON_SCALE = {"fire": 0.92, "mountain": 0.9, "river": 0.92}
MOUNT_SHEETS = ["RIDE", "ATTACK", "DEFENSE", "SPECIAL", "ULTIMATE", "STABILITY"]

# Other sprite sheets: logical id -> (source, grid cols, rows).
SHEETS = {
    "npc.s2-worker.sheet": ("npcs/NPC-S2-WORKER.png", 3, 2),
    "npc.s2-maintenance.sheet": ("npcs/NPC-S2-MAINTENANCE.png", 3, 2),
    "npc.s2-researcher.sheet": ("npcs/NPC-S2-RESEARCHER.png", 3, 2),
    "npc.s2-clinician.sheet": ("npcs/NPC-S2-CLINICIAN.png", 3, 2),
    "npc.s2-guard.sheet": ("npcs/NPC-S2-GUARD.png", 3, 2),
    "npc.s2-council.sheet": ("npcs/NPC-S2-COUNCIL.png", 3, 2),
    "prop.s2-bike-parked": ("vehicles/VEH-BIKE-HERO-PARKED.png", 2, 2),
    "prop.s2-bike-down": ("vehicles/VEH-BIKE-RAIDER-DOWN.png", 2, 2),
}
# M22 fix: the Road Rider's and Marek's mounted sheets are 2x2 mounted grids (M19 cut them
# as 3x2 pose grids); same file names, re-cut.
ENEMY_MOUNT = {
    "enemy.rider.sheet.mount-ride": ("enemies/rider/ENM-RIDER-MOUNT-RIDE.png", "rider-mount-ride"),
    "enemy.rider.sheet.mount-attack": ("enemies/rider/ENM-RIDER-MOUNT-ATTACK.png", "rider-mount-attack"),
    "enemy.rider.sheet.mount-stability": ("enemies/rider/ENM-RIDER-MOUNT-STABILITY.png", "rider-mount-stability"),
    "enemy.marek.sheet.mounted": ("enemies/marek/ENM-MAREK-MOUNTED.png", "marek-mounted"),
    "enemy.marek.sheet.mounted-break": ("enemies/marek/ENM-MAREK-MOUNTED-BREAK.png", "marek-mounted-break"),
}
PROPS = ["LANCE", "FIREARMS", "FOOD", "CONTAINERS-A", "CONTAINERS-B", "BREAKABLES", "ENV-A",
         "ENV-B", "OBJECTIVES", "OBJECTIVES-DAMAGED", "EVIDENCE", "ARTIFACTS", "ROAD", "ENV-MISC"]
VFX = ["S2-WIND", "S2-FIRE", "S2-GUNFIRE", "S2-GRENADE", "S2-WATER", "S2-MOUNT", "S2-WARNINGS"]

# Shell pictures: (source, output name, width, quality).
SHELL = [
    ("ui/KEYART-S2-TITLE.png", "keyart-s2", 1536, 82),
    ("ui/UI-S2-MENU-BG.png", "menu-bg-s2", 1536, 82),
    ("ui/UI-S2-MUSEUM-BG.png", "museum-bg-s2", 1536, 82),
    ("heroes/wind/HERO-WND-OUTFIT-GREENHOUSE.png", "outfit-wind-greenhouse-response", 512, 88),
    ("heroes/wind/HERO-WND-OUTFIT-FESTIVAL.png", "outfit-wind-prosperity-festival", 512, 88),
    ("heroes/fire/HERO-FIR-OUTFIT-PUMPHOUSE.png", "outfit-fire-pump-house-response", 512, 88),
    ("heroes/fire/HERO-FIR-OUTFIT-HERITAGE.png", "outfit-fire-ember-heritage", 512, 88),
    ("heroes/mountain/HERO-MTN-OUTFIT-S2-SERVICE.png", "outfit-mountain-greenhouse-builder", 512, 88),
    ("heroes/mountain/HERO-MTN-OUTFIT-S2-HERITAGE.png", "outfit-mountain-harvest-heritage", 512, 88),
    ("heroes/river/HERO-RIV-OUTFIT-S2-SERVICE.png", "outfit-river-channel-patrol", 512, 88),
    ("heroes/river/HERO-RIV-OUTFIT-S2-HERITAGE.png", "outfit-river-lantern-festival", 512, 88),
    ("npcs/NPC-TOMAS-PORTRAIT.png", "portrait-tomas", 384, 88),
    ("enemies/marek/ENM-MAREK-PORTRAIT.png", "portrait-marek", 384, 88),
    ("ui/UI-S2-MUSEUM-ARTIFACT-1.png", "artifact-early-aerator-impeller", 512, 88),
    ("ui/UI-S2-MUSEUM-ARTIFACT-2.png", "artifact-first-harvest-seed-tin", 512, 88),
    ("ui/UI-S2-MUSEUM-ARTIFACT-3.png", "artifact-medicinal-cooperative-field-card", 512, 88),
    ("ui/UI-BADGE-GLASSHOUSE.png", "badge-glasshouse", 256, 88),
    ("ui/UI-BADGE-TWIN-GUARDIANS.png", "badge-twin-guardians", 256, 88),
    ("ui/UI-S2-ICONS-MUSEUM.png", "icons-museum-s2", 768, 88),
]


def run(*args: str) -> str:
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def clip(src: Path, name: str, until: float | None) -> dict:
    out = PUBLIC / "media/cine"
    out.mkdir(parents=True, exist_ok=True)
    mp4 = out / f"{name}.mp4"
    cut = ["-t", f"{until:.2f}"] if until else []
    run("ffmpeg", "-v", "error", "-y", "-i", str(src), *cut, "-vf", f"scale={WIDTH}:-2", "-an",
        "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(mp4))
    w, h, ms, _ = import_media.probe(mp4)
    print(f"{name}: {ms} ms, mp4 {mp4.stat().st_size // 1024} KB")
    return {"mp4": f"media/cine/{name}.mp4", "ms": ms, "w": w, "h": h, "audio": False}


def still(src: Path, name: str) -> str:
    out = PUBLIC / "art/shell" / f"{name}.webp"
    im = Image.open(src).convert("RGB")
    im = im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
    im.save(out, "WEBP", quality=80, method=6)
    return f"art/shell/{name}.webp"


def grid_sheet(src: Path, name: str, cols: int, rows: int, keep: bool) -> dict:
    """A cols x rows sheet scaled to 75 % (cells of 384 px height), cell bounds measured."""
    img = Image.open(src).convert("RGBA")
    cw, ch = img.width // cols, img.height // rows
    cw2, ch2 = int(cw * import_art.SCALE), int(ch * import_art.SCALE)
    img = img.resize((cols * cw2, rows * ch2), Image.Resampling.LANCZOS)
    out = PUBLIC / "art" / f"{name}.webp"
    if not (keep and out.exists()):
        img.save(out, "WEBP", quality=import_art.WEBP_QUALITY, alpha_quality=90, method=6)
    alpha = img.getchannel("A").point(lambda v: 255 if v >= import_art.ALPHA_MIN else 0)
    cells = []
    for r in range(rows):
        for c in range(cols):
            box = alpha.crop((c * cw2, r * ch2, (c + 1) * cw2, (r + 1) * ch2)).getbbox()
            cells.append(None if box is None else {"x0": box[0], "y0": box[1], "x1": box[2], "foot": box[3]})
    feet = sorted(c["foot"] for c in cells if c)
    sheet = {"cols": cols, "rows": rows, "cell": ch2, "ground": feet[len(feet) // 2] if feet else ch2, "cells": cells}
    if cw2 != ch2:
        sheet["w"] = cw2
    return {"url": f"art/{name}.webp", "sheet": sheet}


def provenance(entry: dict, source: str, tool: str = "Codex image generation", edits: str | None = None) -> dict:
    entry["provenance"] = {"source": source, "tool": tool, **({"edits": edits} if edits else {})}
    return entry


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__)
    only = None
    for a in sys.argv[1:]:
        if a.startswith("--only="):
            only = set(a.split("=", 1)[1].split(","))
    keep = "--keep-existing" in sys.argv
    want = lambda part: only is None or part in only  # noqa: E731
    base = Path(args[0]).resolve()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    story = base / "story/stage2"
    if want("clips"):
        for code, (clip_file, _, until, note) in CLIPS.items():
            meta = clip(story / clip_file, f"s2-{code}", until)
            edits = f"{note}; " if note else ""
            assets[f"cine.stage2.{code}"] = provenance(
                {"url": meta["mp4"], "video": meta},
                f"story/stage2/{clip_file}",
                "Google Flow (Veo)",
                f"{edits}audio track removed; {WIDTH} px H.264 CRF 30",
            )
    if want("stills"):
        for code, (_, still_file, _, _) in CLIPS.items():
            assets[f"story.stage2.{code}"] = provenance(
                {"url": still(story / still_file, f"s2-{code}")}, f"story/stage2/{still_file}"
            )
        for code, still_file in STILLS.items():
            assets[f"story.stage2.{code}"] = provenance(
                {"url": still(story / still_file, f"s2-{code}")}, f"story/stage2/{still_file}"
            )
    if want("env"):
        folder = "environments/stage2"
        for area in AREAS:
            for layer in LAYERS:
                stem = f"ENV-{area.upper()}-{layer}"
                tiled = import_art.source(base, folder, f"{stem}_tiled") if layer != "PLATE" else None
                p = tiled or import_art.source(base, folder, stem)
                if p is None:
                    print("missing:", stem)
                    continue
                entry = import_art.convert_layer(p, f"bg-s2-{area}-{layer.lower()}", tiled is not None)
                assets[f"bg.stage2.{area}.{layer.lower()}"] = provenance(
                    entry, f"{folder}/{p.name}", edits="seamless repeat made by Claude" if tiled else None
                )
    if want("sheets"):
        for hero, (folder, prefix) in HERO_FOLDERS.items():
            for key, names in WEAPON_SHEETS.items():
                p = next((x for n in names if (x := import_art.source(base, folder, f"{prefix}-{n}"))), None)
                if p is None:
                    continue
                entry = grid_sheet(p, f"{hero}-{key}", 3, 2, keep)
                if hero in WEAPON_SCALE:
                    entry["sheet"]["scale"] = WEAPON_SCALE[hero]
                assets[f"hero.{hero}.sheet.{key}"] = provenance(entry, f"{folder}/{p.name}", edits="75 %")
            for m in MOUNT_SHEETS:
                p = import_art.source(base, folder, f"{prefix}-MOUNT-{m}")
                if p is None:
                    print("missing:", f"{prefix}-MOUNT-{m}")
                    continue
                key = f"mount-{m.lower()}"
                entry = grid_sheet(p, f"{hero}-{key}", 2, 2, keep)
                assets[f"hero.{hero}.sheet.{key}"] = provenance(entry, f"{folder}/{p.name}", edits="75 %")
        for key, (rel, cols, rows) in SHEETS.items():
            name = key.replace(".sheet", "").replace(".", "-")
            assets[key] = provenance(grid_sheet(base / rel, name, cols, rows, keep), rel, edits="75 %")
        for key, (rel, name) in ENEMY_MOUNT.items():
            assets[key] = provenance(grid_sheet(base / rel, name, 2, 2, False), rel, edits="75 %")
        for prop in PROPS:
            rel = f"props/PROP-S2-{prop}.png"
            key = f"prop.s2-{prop.lower()}"
            assets[key] = provenance(grid_sheet(base / rel, key.replace(".", "-"), 3, 2, keep), rel, edits="75 %")
        for v in VFX:
            entry = import_media.vfx(base / "vfx" / f"VFX-{v}.png", v.lower())
            assets[f"vfx.{v.lower()}.sheet"] = entry
    if want("shell"):
        out = PUBLIC / "art/shell"
        for rel, name, width, quality in SHELL:
            im = Image.open(base / rel)
            im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
            im.save(out / f"{name}.webp", "WEBP", quality=quality, method=6)
            print(f"art/shell/{name}.webp {(out / f'{name}.webp').stat().st_size // 1024} KB")
    manifest["assets"] = dict(sorted(assets.items()))
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")


if __name__ == "__main__":
    main()

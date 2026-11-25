#!/usr/bin/env python3
"""M28: imports the approved Stage 3 story media, area backdrops, villagers and shell art.

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/art/import_stage3_media.py ../pictures/FightForPeace [--only=clip,stills,env,npcs,shell]

What it does (APPROVED_VARIANTS.md "Use" files only):
  * clip: the F01 Silvermist title loop -> 960 px MP4 (H.264, fast start) in
    apps/game/public/media/cine/s3-title-loop.mp4, **audio stripped**, id
    `cine.stage3.title-loop`. Every other Stage 3 story scene is a still sequence of its
    approved start and end pictures (decision 2026-11-10; the H01 clip is not used).
  * stills: each scene's start and end pictures (`story.stage3.<code>` and
    `story.stage3.<code>-end`), the E03 Secure and Critical inserts, the two briefing
    pictures, the invoice insert and the title loop's frame -> art/shell/s3-*.webp.
  * env: the eight Stage 3 areas (environments/stage3) -> far, mid, floor and fg layers as
    `bg.stage3.<area>.<layer>`.
  * npcs: the five rescued people (pose sheet and walk), Tomas (Stage 3 poses and walk) and
    the Qinglan residents -> `npc.s3-<id>.sheet` / `.walk` (3 x 2, 75 %, approval scales).
  * shell: Stage 3 key art, menu background, the Silvermist Ecology Folio, the three
    artifacts, the two badges, the eight Store outfit renders (Coming soon), the
    expedition, Garran and Tomas portraits, and the achievement and menu icon sheets.

Other manifest entries are kept. Requires Pillow and ffmpeg/ffprobe on PATH.
Music is built by tools/audio/build_stage3_score.py.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import size_fixes  # noqa: E402
import import_art  # noqa: E402  (layer conversion)
import import_stage2  # noqa: E402  (clip, still, grid sheets, provenance)

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "apps/game/public"
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"

# Still sequences: code -> (start picture, end picture), approved variants.
SCENES: dict[str, tuple[str, str]] = {
    "h01": ("H01-research-update-start-v1.png", "H01-research-update-end-v1.png"),
    "h02": ("H02-qinglan-partnership-start-v1.png", "H02-qinglan-partnership-end-v1.png"),
    "h03": ("H03-gathering-at-the-ledge-start-v1.png", "H03-gathering-at-the-ledge-end-v1.png"),
    "h04": ("H04-return-with-the-demand-start-v2.png", "H04-return-with-the-demand-end-v2.png"),
    "h05": ("H05-departure-at-dawn-start-v2.png", "H05-departure-at-dawn-end-v2.png"),
    "t01": ("T01-radio-intercept-start-v1.png", "T01-radio-intercept-end-v1.png"),
    "t02": ("T02-the-planning-cabin-start-v1.png", "T02-the-planning-cabin-end-v1.png"),
    "t03": ("T03-the-prepared-route-start-v1.png", "T03-the-prepared-route-end-v1.png"),
    "e01": ("E01-garran-restrained-start-v2.png", "E01-garran-restrained-end-v1.png"),
    "e02": ("E02-the-private-case-start-v1.png", "E02-the-private-case-end-v1.png"),
    "e03": ("E03-reunion-at-qinglan-start-v1.png", "E03-reunion-at-qinglan-end-v1.png"),
    "e04": ("E04-seals-compared-start-v1.png", "E04-seals-compared-end-v1.png"),
    "e05": ("E05-the-lowland-shelter-start-v1.png", "E05-the-lowland-shelter-end-v1.png"),
    "e06": ("E06-paths-through-the-mist-start-v2.png", "E06-paths-through-the-mist-end-v2.png"),
}
STILLS = {
    "e03-secure": "E03-SECURE-v1.png",
    "e03-critical": "E03-CRITICAL-v1.png",
    "brief-01": "S3-BRIEF-01-v1.png",
    "brief-02": "S3-BRIEF-02-v1.png",
    "invoice": "S3-INVOICE-v1.png",
    "title-loop": "F01-silvermist-title-loop-start-v2.png",
}
TITLE_LOOP = "F01-silvermist-title-loop-v1.mp4"

AREAS = ["switchback", "qinglan", "basin", "quarry", "camp", "terrace", "signalhut", "shelter"]
LAYERS = ["FAR", "MID", "FLOOR", "FG"]

# Villager sheets: id -> (pose sheet, walk sheet, pose scale, walk scale).
NPCS: dict[str, tuple[str, str | None, float, float]] = {
    "gao-wen": ("NPC-S3-GAOWEN.png", "NPC-S3-GAOWEN-WALK.png", 0.85, 0.84),
    "tao-min": ("NPC-S3-TAOMIN.png", "NPC-S3-TAOMIN-WALK.png", 0.85, 0.87),
    "an-bo": ("NPC-S3-ANBO.png", "NPC-S3-ANBO-WALK.png", 0.85, 0.84),
    "ren-xia": ("NPC-S3-RENXIA.png", "NPC-S3-RENXIA-WALK.png", 0.85, 0.84),
    "wei-shan": ("NPC-S3-WEISHAN.png", "NPC-S3-WEISHAN-WALK.png", 0.85, 0.83),
    "tomas": ("NPC-TOMAS-S3-POSES.png", "NPC-TOMAS-S3-WALK.png", 0.85, 0.84),
    "qinglan": ("NPC-S3-QINGLAN-IDLE.png", None, 0.83, 0.83),
    "luo-deng": ("NPC-S3-LUO-DENG.png", None, 0.85, 0.85),
}

# Shell pictures: (source, output name, width, quality).
SHELL = [
    ("ui/KEYART-S3-TITLE.png", "keyart-s3", 1536, 82),
    ("ui/UI-S3-MENU-BG.png", "menu-bg-s3", 1536, 82),
    ("ui/UI-S3-MUSEUM-FOLIO.png", "artifact-silvermist-ecology-folio", 512, 88),
    ("ui/UI-S3-MUSEUM-ARTIFACT-1.png", "artifact-qinglan-rescue-bell", 512, 88),
    ("ui/UI-S3-MUSEUM-ARTIFACT-2.png", "artifact-gao-wen-trail-ledger", 512, 88),
    ("ui/UI-S3-MUSEUM-ARTIFACT-3.png", "artifact-broken-hookstaff", 512, 88),
    ("ui/UI-BADGE-SILVERMIST.png", "badge-silvermist", 256, 88),
    ("ui/UI-BADGE-RIDGE-UNHOOKED.png", "badge-ridge-unhooked", 256, 88),
    ("ui/UI-S3-ACH-A.png", "icons-ach-s3-a", 768, 88),
    ("ui/UI-S3-ACH-B.png", "icons-ach-s3-b", 768, 88),
    ("ui/UI-S3-MENU-ICONS.png", "icons-menu-s3", 768, 88),
    ("enemies/garran/ENM-GARRAN-PORTRAIT.png", "portrait-garran", 384, 88),
    ("npcs/NPC-TOMAS-S3-PORTRAIT.png", "portrait-tomas-s3", 384, 88),
    ("npcs/NPC-S3-PORTRAITS.png", "portraits-expedition", 768, 88),
] + [
    (f"heroes/{hero}/HERO-{code}-OUTFIT-S3-{kind}.png", f"outfit-{hero}-{name}", 512, 88)
    for hero, code in (("mountain", "MTN"), ("river", "RIV"), ("wind", "WND"), ("fire", "FIR"))
    for kind, name in (("RESCUE", "mountain-rescue"), ("FESTIVAL", "highland-festival"))
]


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
    story = base / "story/stage3"
    prov = import_stage2.provenance
    if want("clip"):
        meta = import_stage2.clip(story / TITLE_LOOP, "s3-title-loop", None)
        assets["cine.stage3.title-loop"] = prov(
            {"url": meta["mp4"], "video": meta},
            f"story/stage3/{TITLE_LOOP}",
            "Google Flow (Veo)",
            f"audio track removed; {import_stage2.WIDTH} px H.264 CRF 30",
        )
    if want("stills"):
        for code, (start, end) in SCENES.items():
            assets[f"story.stage3.{code}"] = prov(
                {"url": import_stage2.still(story / start, f"s3-{code}")}, f"story/stage3/{start}"
            )
            assets[f"story.stage3.{code}-end"] = prov(
                {"url": import_stage2.still(story / end, f"s3-{code}-end")}, f"story/stage3/{end}"
            )
        for code, name in STILLS.items():
            assets[f"story.stage3.{code}"] = prov(
                {"url": import_stage2.still(story / name, f"s3-{code}")}, f"story/stage3/{name}"
            )
    if want("env"):
        folder = "environments/stage3"
        for area in AREAS:
            for layer in LAYERS:
                stem = f"ENV-{area.upper()}-{layer}"
                p = import_art.source(base, folder, stem)
                if p is None:
                    print("missing:", stem)
                    continue
                entry = import_art.convert_layer(p, f"bg-s3-{area}-{layer.lower()}", False)
                assets[f"bg.stage3.{area}.{layer.lower()}"] = prov(entry, f"{folder}/{p.name}")
    if want("npcs"):
        for key, (pose, walk, scale, walk_scale) in NPCS.items():
            entry = import_stage2.grid_sheet(base / "npcs" / pose, f"npc-s3-{key}", 3, 2, False)
            entry["sheet"]["scale"] = scale
            assets[f"npc.s3-{key}.sheet"] = prov(entry, f"npcs/{pose}", edits="75 %")
            if walk:
                entry = import_stage2.grid_sheet(base / "npcs" / walk, f"npc-s3-{key}-walk", 3, 2, False, clear=16)
                entry["sheet"]["scale"] = walk_scale
                assets[f"npc.s3-{key}.walk"] = prov(entry, f"npcs/{walk}", edits="75 %")
    if want("shell"):
        out = PUBLIC / "art/shell"
        for rel, name, width, quality in SHELL:
            im = Image.open(base / rel)
            im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
            im.save(out / f"{name}.webp", "WEBP", quality=quality, method=6)
            print(f"art/shell/{name}.webp {(out / f'{name}.webp').stat().st_size // 1024} KB")
    manifest["assets"] = dict(sorted(assets.items()))
    size_fixes.apply(manifest["assets"])
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")


if __name__ == "__main__":
    main()

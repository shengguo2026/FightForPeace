#!/usr/bin/env python3
"""M10: imports the approved shell art (menu, title, icons, portraits, elder, Stage 1 story
stills) from the shengguo2026/pictures checkout into apps/game/public/art/shell/.

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/art/import_shell_art.py ../pictures/FightForPeace

Each picture is scaled to the size the shell draws it at and written as WebP. Re-running
it is deterministic for the same inputs. Requires Pillow.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps/game/public/art/shell"

# (source path in the pictures repository, output name, target width, quality)
PICTURES = [
    ("ui/UI-MENU-BG.png", "menu-bg", 1536, 82),
    ("ui/KEYART-TITLE.png", "keyart-title", 1536, 82),
    ("ui/UI-ICONS-MENU.png", "icons-menu", 768, 88),
    ("ui/UI-ICONS-HUD.png", "icons-hud", 768, 88),
    ("heroes/mountain/HERO-MTN-PORTRAIT.png", "portrait-mountain", 384, 88),
    ("heroes/river/HERO-RIV-PORTRAIT.png", "portrait-river", 384, 88),
    ("heroes/mountain/HERO-MTN-SELECT.png", "select-mountain", 512, 88),
    ("heroes/river/HERO-RIV-SELECT.png", "select-river", 512, 88),
    ("elder/ELDER-PORTRAIT.png", "elder-portrait", 512, 88),
    ("elder/ELDER-BRIEFING.png", "elder-briefing", 1152, 88),
    ("story/stage1/STORY-S1-INTRO-01.png", "s1-intro-01", 1280, 80),
    ("story/stage1/STORY-S1-INTRO-02.png", "s1-intro-02", 1280, 80),
    ("story/stage1/STORY-S1-INTRO-03.png", "s1-intro-03", 1280, 80),
    ("story/stage1/STORY-S1-INTRO-04.png", "s1-intro-04", 1280, 80),
    # APPROVED_VARIANTS.md: v4 (earlier versions dressed the workers in faction outfits).
    ("story/stage1/STORY-S1-INTRO-05_v4.png", "s1-intro-05", 1280, 80),
    ("story/stage1/STORY-S1-INTRO-06.png", "s1-intro-06", 1280, 80),
    ("story/stage1/STORY-S1-BRIEF-01.png", "s1-brief-01", 1280, 80),
]


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "../pictures/FightForPeace")
    OUT.mkdir(parents=True, exist_ok=True)
    for rel, name, width, quality in PICTURES:
        im = Image.open(src / rel)
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        height = round(im.height * width / im.width)
        im = im.resize((width, height), Image.LANCZOS)
        out = OUT / f"{name}.webp"
        im.save(out, "WEBP", quality=quality, method=6)
        print(f"{out.relative_to(ROOT)}  {width}x{height}  {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""M13: imports the delivered Stage 1 media into the game and the asset manifest.

Usage (from the repository root, with the pictures repository checked out beside it and
the project's audio folder at hand):

    python3 tools/art/import_media.py ../pictures/FightForPeace [path/to/MUS-STINGER-VICTORY_cut19s.mp3]

What it does:
  * Flow clips (story/stage1, approved takes per APPROVED_VARIANTS.md) -> 960 px wide
    WebM (VP9 + Opus) and MP4 (H.264 + AAC, fast start) in apps/game/public/media/cine/,
    manifest ids `cine.stage1.intro.01` ... with length, size and provenance,
  * the matching story stills -> apps/game/public/art/shell/*.webp, ids `story.stage1.*`,
  * effect sheets (vfx/VFX-*.png, 3x2 cells) -> apps/game/public/art/vfx-*.webp at half
    size, ids `vfx.<name>.sheet` with their cell bounds,
  * the victory stinger -> apps/game/public/media/music/*.mp3, id
    `mus.stage1.river-returned.victory`.

Other manifest entries are kept. Requires Pillow and ffmpeg/ffprobe on PATH.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "apps/game/public"
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"

# id suffix -> (approved clip file, still file, human edit note)
CLIPS = {
    "intro.01": ("FLOW-S1-INTRO-01.mp4", "STORY-S1-INTRO-01.png", None),
    "intro.02": ("FLOW-S1-INTRO-02_trim.mp4", "STORY-S1-INTRO-02.png", "first 1.5 s cut (spin with a floating hat)"),
    "intro.03": ("FLOW-S1-INTRO-03_v2.mp4", "STORY-S1-INTRO-03.png", "second take (first invented chains)"),
    "intro.04": ("FLOW-S1-INTRO-04.mp4", "STORY-S1-INTRO-04.png", None),
    "intro.05": ("FLOW-S1-INTRO-05.mp4", "STORY-S1-INTRO-05_v4.png", None),
    "intro.06": ("FLOW-S1-INTRO-06.mp4", "STORY-S1-INTRO-06.png", None),
    "end.01": ("FLOW-S1-END-01.mp4", "STORY-S1-END-01.png", None),
    "end.02": ("FLOW-S1-END-02.mp4", "STORY-S1-END-02.png", None),
    "end.03": ("FLOW-S1-END-03_trim.mp4", "STORY-S1-END-03.png", "last 2 s cut (stray needle, gear sinks)"),
    "title-loop": ("FLOW-S1-TITLE-LOOP_seamless.mp4", "STORY-S1-TITLE-LOOP.png", "end blended into the start (seamless loop)"),
}
# Stills already imported by import_shell_art.py (same file, now also a manifest id).
SHELL_STILLS = {"intro.01", "intro.02", "intro.03", "intro.04", "intro.05", "intro.06"}

VFX = ["HIT-SPARKS", "GUARD", "DUST", "ULTIMATE", "BREAKER-TEAM"]
VFX_CELL = 256
ALPHA_MIN = 40

WIDTH = 960


def run(*args: str) -> str:
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def probe(path: Path) -> tuple[int, int, int, bool]:
    info = json.loads(run("ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)))
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    audio = any(s["codec_type"] == "audio" for s in info["streams"])
    return int(v["width"]), int(v["height"]), round(float(info["format"]["duration"]) * 1000), audio


def clip(src: Path, name: str) -> dict:
    out = PUBLIC / "media/cine"
    out.mkdir(parents=True, exist_ok=True)
    w, h, ms, audio = probe(src)
    scale = ["-vf", f"scale={WIDTH}:-2"]
    webm, mp4 = out / f"{name}.webm", out / f"{name}.mp4"
    a_webm = ["-c:a", "libopus", "-b:a", "64k"] if audio else ["-an"]
    a_mp4 = ["-c:a", "aac", "-b:a", "96k"] if audio else ["-an"]
    run("ffmpeg", "-v", "error", "-y", "-i", str(src), *scale, "-c:v", "libvpx-vp9", "-crf", "42", "-b:v", "0",
        "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", *a_webm, str(webm))
    run("ffmpeg", "-v", "error", "-y", "-i", str(src), *scale, "-c:v", "libx264", "-crf", "30", "-preset", "slow",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", *a_mp4, str(mp4))
    ow, oh, _, _ = probe(mp4)
    print(f"{name}: {ms} ms, webm {webm.stat().st_size // 1024} KB, mp4 {mp4.stat().st_size // 1024} KB")
    return {"webm": f"media/cine/{name}.webm", "mp4": f"media/cine/{name}.mp4", "ms": ms, "w": ow, "h": oh, "audio": audio}


def still(src: Path, name: str) -> str:
    out = PUBLIC / "art/shell" / f"{name}.webp"
    if not out.exists():
        im = Image.open(src).convert("RGB")
        im = im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
        im.save(out, "WEBP", quality=80, method=6)
    return f"art/shell/{name}.webp"


def vfx(src: Path, name: str) -> dict:
    img = Image.open(src).convert("RGBA").resize((3 * VFX_CELL, 2 * VFX_CELL), Image.Resampling.LANCZOS)
    out = PUBLIC / "art" / f"vfx-{name}.webp"
    img.save(out, "WEBP", quality=86, alpha_quality=90, method=6)
    alpha = img.getchannel("A").point(lambda v: 255 if v >= ALPHA_MIN else 0)
    cells = []
    for r in range(2):
        for c in range(3):
            box = alpha.crop((c * VFX_CELL, r * VFX_CELL, (c + 1) * VFX_CELL, (r + 1) * VFX_CELL)).getbbox()
            cells.append(None if box is None else {"x0": box[0], "y0": box[1], "x1": box[2], "foot": box[3]})
    return {
        "url": f"art/vfx-{name}.webp",
        "sheet": {"cols": 3, "rows": 2, "cell": VFX_CELL, "ground": VFX_CELL // 2, "cells": cells},
        "provenance": {"source": f"vfx/{src.name}", "tool": "Codex image generation", "edits": "scaled to 50 %"},
    }


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    base = Path(sys.argv[1]).resolve()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    story = base / "story/stage1"
    for key, (clip_file, still_file, note) in CLIPS.items():
        name = f"s1-{key.replace('.', '-')}"
        meta = clip(story / clip_file, name)
        edits = f"{note}; " if note else ""
        assets[f"cine.stage1.{key}"] = {
            "url": meta["webm"],
            "video": meta,
            "provenance": {
                "source": f"story/stage1/{clip_file}",
                "tool": "Google Flow (Veo)",
                "edits": f"{edits}{WIDTH} px, VP9 CRF 42 + Opus / H.264 CRF 30 + AAC",
            },
        }
        assets[f"story.stage1.{key}"] = {
            "url": still(story / still_file, name),
            "provenance": {"source": f"story/stage1/{still_file}", "tool": "Codex image generation"},
        }
    for v in VFX:
        assets[f"vfx.{v.lower()}.sheet"] = vfx(base / "vfx" / f"VFX-{v}.png", v.lower())
    if len(sys.argv) > 2:
        src = Path(sys.argv[2]).resolve()
        out = PUBLIC / "media/music"
        out.mkdir(parents=True, exist_ok=True)
        dst = out / "river-returned-victory.mp3"
        run("ffmpeg", "-v", "error", "-y", "-i", str(src), "-map", "0:a", "-c:a", "libmp3lame", "-b:a", "160k", str(dst))
        ms = round(float(json.loads(run("ffprobe", "-v", "error", "-show_format", "-of", "json", str(dst)))["format"]["duration"]) * 1000)
        assets["mus.stage1.river-returned.victory"] = {
            "url": "media/music/river-returned-victory.mp3",
            "audio": {"ms": ms},
            "provenance": {"source": f"audio/{src.name}", "tool": "Google Flow Music (Lyria)", "edits": "cut to 19 s; MP3 160 kbps"},
        }
    manifest["assets"] = dict(sorted(assets.items()))
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")


if __name__ == "__main__":
    main()

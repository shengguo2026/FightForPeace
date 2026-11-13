#!/usr/bin/env python3
"""M22: builds the Stage 2 score (Prosperity Under Siege) from the approved Flow Music cues.

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/audio/build_stage2_score.py ../pictures/FightForPeace/music/stage2

Spec §16: candidate generated audio needs human editing, loop construction, transition
authoring, loudness normalization and browser export. For every state below this script:

  * finds the cue's beat grid (librosa beat tracker; the bar is four tracked beats),
  * cuts a loop of whole bars starting on a tracked beat and blends the bar *before* the
    loop start into the loop's last bar (equal-power), so the wrap is as smooth as any bar
    line; `once` states are a section played once with a short fade-out; stingers are two
    bars of the cue grid cut on a strong onset, with a fade-out tail,
  * applies one linear gain per source file so every cue sits at -16 LUFS integrated (peaks
    kept under -1 dBFS; no dynamic processing, so loop seams stay continuous),
  * writes 44.1 kHz stereo MP3 (160 kbps) to apps/game/public/media/music/s2-*.mp3 and the
    manifest entries `mus.stage2.<cue>.<state>` (length, loop bars, provenance).

Approved files (APPROVED_VARIANTS.md): 05 v1, 06B v1, 06D v2; every other cue has one file.
The `--plan` flag prints the chosen sections without writing anything. Requires numpy,
librosa, soundfile and ffmpeg.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps/game/public/media/music"
MANIFEST = ROOT / "packages/platform/src/assets/manifest.json"
SR = 44100
TARGET_LUFS = -16.0

FILES = {
    "01": "01_Water Became a Future.mp3",
    "02": "02_Roadside Vigil.mp3",
    "03": "03_Glass and Green.mp3",
    "04": "04_Alarm Through the Channels.mp3",
    "05": "05_Protect the Living System.mp3",
    "06A": "06A_Mounted pursuit.mp3",
    "06B": "06B_Armed command.mp3",
    "06C": "06C_Predator Unbound.mp3",
    "06D": "06D_Scorched Claim and surrender_v2.mp3",
    "07": "07_What We Protected.mp3",
}

# The tempo each cue was written at (the music prompts' targets, checked by ear); the beat
# tracker starts from it, so it cannot lock onto half or double time.
TEMPO = {"01": 89, "02": 80, "03": 92, "04": 116, "05": 117, "06A": 124, "06B": 120,
         "06C": 128, "06D": 129, "07": 80}

# The cue grid (bpm) of the Gilded Jackal family: 06C and 06D v2 share it; stingers are
# two bars of it so the director's bar arithmetic matches the file.
JACKAL_BPM = 129.2

# id suffix -> (source, kind, start s, bars or None)
#   loop: whole bars from the first beat at or after `start`, end blended into the start
#   once: from `start` for `bars` bars (None: to the end), faded out
#   sting: two bars of the jackal grid from the strongest onset after `start`
PLAN: dict[str, tuple[str, str, float, int | None]] = {
    "water-became-a-future.interlude": ("01", "once", 0.0, None),
    "roadside-vigil.vigil": ("02", "loop", 10.0, 24),
    "roadside-vigil.suspicion": ("02", "loop", 70.0, 24),
    "glass-and-green.explore": ("03", "loop", 12.0, 32),
    "alarm-through-the-channels.combat": ("04", "loop", 12.0, 48),
    "alarm-through-the-channels.elite": ("04", "loop", 50.0, 32),
    "protect-the-living-system.danger": ("05", "loop", 50.0, 32),
    "gilded-jackal.mounted": ("06A", "loop", 20.0, 32),
    "gilded-jackal.armed": ("06B", "loop", 20.0, 32),
    "gilded-jackal.unbound": ("06C", "loop", 20.0, 32),
    "gilded-jackal.scorched": ("06D", "loop", 40.0, 32),
    "gilded-jackal.surrender": ("06D", "once", 140.0, None),
    "gilded-jackal.sting-armed": ("06B", "sting", 15.0, 2),
    "gilded-jackal.sting-unbound": ("06C", "sting", 15.0, 2),
    "gilded-jackal.sting-scorched": ("06D", "sting", 35.0, 2),
    "gilded-jackal.sting-surrender": ("06D", "sting", 120.0, 2),
    "what-we-protected.ending": ("07", "loop", 6.0, 16),
    "what-we-protected.victory": ("07", "once", 60.0, 8),
    "what-we-protected.coda": ("07", "once", 0.0, None),
}


def loudness(path: Path) -> tuple[float, float]:
    """Integrated loudness (LUFS) and true peak (dBTP) via ffmpeg's loudnorm analysis."""
    err = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    data = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", err, re.S).group(0))
    return float(data["input_i"]), float(data["input_tp"])


def analyse(y: np.ndarray, bpm: float) -> tuple[float, np.ndarray, np.ndarray]:
    mono = librosa.to_mono(y)
    tempo, frames = librosa.beat.beat_track(y=mono, sr=SR, start_bpm=bpm, tightness=400)
    beats = librosa.frames_to_time(frames, sr=SR)
    onset = librosa.onset.onset_strength(y=mono, sr=SR)
    return float(np.atleast_1d(tempo)[0]), beats, onset


def fade(n: int, out: bool) -> np.ndarray:
    t = np.linspace(0, np.pi / 2, n)
    return np.cos(t) if out else np.sin(t)


def build(code: str, kind: str, start: float, bars: int | None, y: np.ndarray, beats: np.ndarray, onset: np.ndarray):
    n = y.shape[1]
    beat_s = float(np.median(np.diff(beats)))
    bar_s = 4 * beat_s
    if kind == "sting":
        lo, hi = librosa.time_to_frames([start, start + 25], sr=SR)
        f = lo + int(np.argmax(onset[lo:hi]))
        t0 = librosa.frames_to_time(f, sr=SR)
        # Snap to the nearest tracked beat at or before the onset (attack kept whole).
        t0 = float(beats[beats <= t0 + 0.02].max(initial=t0)) if len(beats) else t0
        length = 2 * 4 * 60 / JACKAL_BPM
        a, b = int(t0 * SR), int((t0 + length) * SR)
        seg = y[:, a:b].copy()
        tail = int(0.4 * SR)
        seg[:, -tail:] *= fade(tail, True)
        seg[:, :64] *= fade(64, False)
        return seg, {"start": round(t0, 3), "ms": round(length * 1000)}
    i0 = int(np.searchsorted(beats, start))
    t0 = float(beats[i0]) if i0 < len(beats) else start
    if kind == "once":
        t1 = n / SR if bars is None else min(n / SR, t0 + bars * bar_s)
        if bars is None and start == 0.0:
            t0 = 0.0
        a, b = int(t0 * SR), int(t1 * SR)
        seg = y[:, a:b].copy()
        tail = int(min(3.0, (t1 - t0) / 4) * SR)
        if bars is not None or t1 < n / SR:
            seg[:, -tail:] *= fade(tail, True)
        return seg, {"start": round(t0, 3), "ms": round((t1 - t0) * 1000)}
    # Loop: `bars` bars from beat i0 (end on the tracked beat 4*bars later when there is
    # one), the bar before t0 blended into the loop's last bar.
    i1 = i0 + 4 * bars
    t1 = float(beats[i1]) if i1 < len(beats) else t0 + bars * bar_s
    if t1 * SR > n or t0 - bar_s < 0:
        raise SystemExit(f"{code}: loop {t0:.2f}-{t1:.2f} s does not fit")
    a, b = int(t0 * SR), int(t1 * SR)
    seg = y[:, a:b].copy()
    x = int(bar_s * SR)
    pre = y[:, a - x : a]
    seg[:, -x:] = seg[:, -x:] * fade(x, True) + pre * fade(x, False)
    return seg, {"start": round(t0, 3), "ms": round((t1 - t0) * 1000), "bars": bars,
                 "bpm": round(60 * 4 * bars / (t1 - t0), 2)}


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__)
    src = Path(args[0]).resolve()
    plan_only = "--plan" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    cache: dict[str, tuple] = {}
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    report = {}
    for key, (code, kind, start, bars) in PLAN.items():
        if code not in cache:
            path = src / FILES[code]
            y, _ = librosa.load(path, sr=SR, mono=False)
            y = np.atleast_2d(y)
            if y.shape[0] == 1:
                y = np.vstack([y, y])
            tempo, beats, onset = analyse(y, TEMPO[code])
            lufs, _tp = loudness(path)
            gain = 10 ** ((TARGET_LUFS - lufs) / 20)
            peak = float(np.abs(y).max())
            gain = min(gain, 10 ** (-1 / 20) / max(peak, 1e-6))
            cache[code] = (y * gain, tempo, beats, onset, lufs, gain)
            print(f"{code}: {tempo:.1f} BPM, {lufs:.1f} LUFS -> gain {20 * np.log10(gain):+.1f} dB")
        y, tempo, beats, onset, lufs, gain = cache[code]
        seg, info = build(code, kind, start, bars, y, beats, onset)
        info["kind"] = kind
        report[key] = info
        print(f"  {key}: {info}")
        if plan_only:
            continue
        name = f"s2-{key.replace('.', '-')}"
        dst = OUT / f"{name}.mp3"
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / "x.wav"
            sf.write(wav, seg.T, SR, subtype="PCM_16")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "160k", str(dst)], check=True)
        if kind == "loop":
            edits = f"{info['bars']} bars from {info['start']} s, the bar before blended into the last bar"
        elif kind == "once":
            edits = f"section from {info['start']} s, faded out"
        else:
            edits = f"two bars at {JACKAL_BPM} BPM from the onset at {info['start']} s, faded out"
        assets[f"mus.stage2.{key}"] = {
            "url": f"media/music/{name}.mp3",
            "audio": {"ms": info["ms"]},
            "provenance": {
                "source": f"music/stage2/{FILES[code]}",
                "tool": "Google Flow Music (Lyria)",
                "edits": f"{edits}; {20 * np.log10(gain):+.1f} dB to {TARGET_LUFS:.0f} LUFS; MP3 160 kbps",
            },
        }
    if plan_only:
        return
    manifest["assets"] = dict(sorted(assets.items()))
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""M28: builds the Stage 3 score (Mist and Resolve) from the approved Flow Music cues.

Usage (from the repository root, with the pictures repository checked out beside it):

    python3 tools/audio/build_stage3_score.py ../pictures/FightForPeace/music/stage3

The same method as tools/audio/build_stage2_score.py (spec §16): loops of whole tracked
bars with the bar before blended into the last bar, `once` sections faded out, two-bar
stingers on the 06A grid for Garran's state changes, one linear gain per source file to
-16 LUFS. Garran's cue *Chief of the Broken Ridge* has the states Hookstaff Control (06A),
Clinch and Cast (06B, the approved two-semitone shift), Winch Pressure (06C, the approved
five-semitone shift) and the capture ending (06D), all on 06A's 120 BPM grid. The six
event stingers (08-1 ... 08-6) were cut and normalized when approved and are only
converted; the Highland Bed (09) is the quiet ambience loop under the hamlet and shelter.

Writes apps/game/public/media/music/s3-*.mp3 and the manifest entries
`mus.stage3.<cue>.<state>`. `--plan` prints the sections without writing. Requires numpy,
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
    "01": "01_Silver Veins in Morning Mist.mp3",
    "02": "02_The Empty Gathering Trail.mp3",
    "03": "03_Hooves above the Ravine.mp3",
    "04": "04_Quarry of Echoes.mp3",
    "05": "05_Captives in the High Camp.mp3",
    "06A": "06A_Hookstaff Control.mp3",
    "06B": "06B_Clinch and Cast.mp3",
    "06C": "06C_Winch Pressure.mp3",
    "06D": "06D_Capture.mp3",
    "07": "07_Paths through the Mist.mp3",
    "09": "09_Highland Bed.mp3",
}

# Starting tempo of the beat tracker (as measured by the tracker on the approved files).
TEMPO = {"01": 76, "02": 74, "03": 125, "04": 120, "05": 120, "06A": 120, "06B": 120,
         "06C": 120, "06D": 120, "07": 80, "09": 76}

# Garran's grid: stingers are two bars of it so the director's bar arithmetic matches.
JACKAL_BPM = 120.0

# id suffix -> (source, kind, start s, bars or None); kinds as in the Stage 2 script.
PLAN: dict[str, tuple[str, str, float, int | None]] = {
    "silver-veins-in-morning-mist.title": ("01", "loop", 8.0, 16),
    "silver-veins-in-morning-mist.intro": ("01", "once", 0.0, None),
    "the-empty-gathering-trail.explore": ("02", "loop", 12.0, 24),
    "hooves-above-the-ravine.ride": ("03", "loop", 12.0, 32),
    "quarry-of-echoes.combat": ("04", "loop", 12.0, 32),
    "captives-in-the-high-camp.danger": ("05", "loop", 12.0, 32),
    "chief-of-the-broken-ridge.hookstaff": ("06A", "loop", 20.0, 32),
    "chief-of-the-broken-ridge.clinch": ("06B", "loop", 20.0, 32),
    "chief-of-the-broken-ridge.winch": ("06C", "loop", 20.0, 32),
    "chief-of-the-broken-ridge.capture": ("06D", "once", 60.0, None),
    "chief-of-the-broken-ridge.sting-clinch": ("06B", "sting", 12.0, 2),
    "chief-of-the-broken-ridge.sting-winch": ("06C", "sting", 12.0, 2),
    "chief-of-the-broken-ridge.sting-capture": ("06D", "sting", 40.0, 2),
    "paths-through-the-mist.ending": ("07", "loop", 8.0, 16),
    "paths-through-the-mist.victory": ("07", "once", 60.0, 8),
    "paths-through-the-mist.coda": ("07", "once", 0.0, None),
    "highland-bed.bed": ("09", "loop", 50.0, 16),
}

# Event stingers, delivered cut and normalized (5 s, 1.2 s fade, -16 LUFS): converted only.
STINGERS = {
    "checkpoint": "stingers/08-1_Checkpoint.mp3",
    "person-freed": "stingers/08-2_Person freed.mp3",
    "person-sheltered": "stingers/08-3_Person sheltered.mp3",
    "branch-complete": "stingers/08-4_Branch complete.mp3",
    "evidence-found": "stingers/08-5_Evidence found.mp3",
    "horse-calmed": "stingers/08-6_Horse calmed.mp3",
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
        name = f"s3-{key.replace('.', '-')}"
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
        assets[f"mus.stage3.{key}"] = {
            "url": f"media/music/{name}.mp3",
            "audio": {"ms": info["ms"]},
            "provenance": {
                "source": f"music/stage3/{FILES[code]}",
                "tool": "Google Flow Music (Lyria)",
                "edits": f"{edits}; {20 * np.log10(gain):+.1f} dB to {TARGET_LUFS:.0f} LUFS; MP3 160 kbps",
            },
        }
    if plan_only:
        return
    for key, rel in STINGERS.items():
        name = f"s3-sting-{key}"
        dst = OUT / f"{name}.mp3"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src / rel), "-ac", "2", "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "160k", str(dst)], check=True)
        ms = round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(dst)], capture_output=True, text=True, check=True).stdout) * 1000)
        assets[f"mus.stage3.sting.{key}"] = {
            "url": f"media/music/{name}.mp3",
            "audio": {"ms": ms},
            "provenance": {
                "source": f"music/stage3/{rel}",
                "tool": "Google Flow Music (Lyria)",
                "edits": "cut, faded and normalized at approval; MP3 160 kbps",
            },
        }
    manifest["assets"] = dict(sorted(assets.items()))
    MANIFEST.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    subprocess.run(["npx", "prettier", "--write", str(MANIFEST)], cwd=ROOT, check=False, shell=sys.platform == "win32")
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()

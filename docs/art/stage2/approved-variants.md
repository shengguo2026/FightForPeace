# Fight For Peace — Stage 2: which file the game uses

**Status:** 2026-11-13, M22 (all approved Stage 2 art, clips and music ingested).
**Source of truth:** `FightForPeace/APPROVED_VARIANTS.md` in the Pictures repository. Its **Use** column names the file the game imports; this page only records how M22 brought those files into the game. When an approval changes there, re-run the importer below.

## How the files are imported

`python tools/art/import_stage2.py <Pictures>/FightForPeace` (options `--only=clips,stills,env,sheets,shell` and `--keep-existing`) writes the files under `apps/game/public/` and their entries in `packages/platform/src/assets/manifest.json`, with provenance:

| Delivered | In the game | Manifest ids |
|---|---|---|
| 32 story clips (`story/stage2/<code>-*.mp4`, the approved version and trim per clip) and the title loop | MP4 (H.264, 960 px, CRF 30) **without the Flow soundtrack** | `cine.stage2.<code>` (`video.audio: false`) |
| Approved start frames, the C01/C03 flourishing and damaged inserts, the briefing pictures, the documents and the seal | WebP stills, also the fallback for every clip | `story.stage2.<code>` |
| 12 environments × FAR, MID, FLOOR (`_tiled`), FG (PLATEs are reference paintings) | WebP layers, loaded when a run first enters the area | `bg.stage2.<area>.<layer>` |
| Hero weapon sheets (lance A/B, revolver, heavy) | 3x2 sheets; Fire, Mountain and River shown at 0.92/0.90/0.92 to match their idle height | `hero.<hero>.sheet.<lance-a\|lance-b\|revolver\|heavy>` |
| Hero mounted sheets (ride, attack, defense, special, ultimate, stability) | 2x2 sheets with 576 px wide cells | `hero.<hero>.sheet.mount-*` |
| Road Rider and Marek mounted sheets | re-cut in M22 as 2x2 sheets (M19 had cut them as 3x2) | `enemy.rider.sheet.mount-*`, `enemy.marek.sheet.mounted*` |
| Stage 2 villagers, parked and downed bikes, props, effect sheets | sprite sheets | `npc.s2-*.sheet`, `prop.s2-*`, `vfx.s2-*.sheet` |
| Key art, menu and Museum backgrounds, outfit pictures, portraits, artifacts, badges, Museum icons | shell pictures | `art/shell/*.webp` |

`python tools/audio/build_stage2_score.py <Pictures>/FightForPeace/music` cuts the seven cues (06A–06D become Marek's states) into whole-bar loops, once sections and two-bar stingers on the 129 BPM grid, normalized to −16 LUFS with peaks at −1 dBFS, MP3 160 kbit/s: `mus.stage2.<cue>.<state>` and `mus.stage2.gilded-jackal.sting-*`.

## Not delivered yet (placeholders in the game)

| Layer | What plays now |
|---|---|
| Ambience beds | synthesized loops per area (`amb.stage2.*`); a file with the same id replaces one |
| New SFX (weapons, firearm warning, pursuit) | synthesized placeholders (`sfx.weapon.*`, `sfx.warn.*`, `sfx.ride.*`) |
| Narration voice | none: subtitles always; optional system voice (Windows TTS) as a prototype aid. A file `vo.<locale>.<line id>` replaces it |

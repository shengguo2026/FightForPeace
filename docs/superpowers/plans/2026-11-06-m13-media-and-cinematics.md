# M13 Media Integration and Cinematics Implementation Plan

**Goal:** Stage 1 plays with its delivered media: the six-shot intro cinematic from the Flow clips with localized subtitles and a still-picture fallback, a state-chosen ending cinematic before the results, the seamless title loop behind the village menu, the seven-cue **Water Held Back** score driven by a music state machine, a priority-aware sound mix, and layered effects from the delivered VFX sheets scaled by spectacle tier.

**Spec:** spec §17, F&D Module 17 (subtitle-first cinematics, still fallback, language change at the next cue boundary) and Module 18 (Authored Adaptive Score, Priority-Aware Combat Mix, Layered Scalable Spectacle, Versioned Modular Asset Graph); `docs/production/campaign_music_direction.md` (Stage 1 suite); roadmap row M13 and its guardrails (stable logical ids for the Stage 2 Museum; state-chosen clip variants and a shared motif library; more than two music states per cue with authored stingers).

## Architecture

| Layer | Where | What |
|---|---|---|
| Cinematic player | `packages/platform/src/media/cinematic.ts` | Shots (clip id, still id, length, subtitle cues), shared motifs, conditions on story state (`is`, `atLeast`, `below`, `sameAs`, `notSameAs`); the player keeps its own clock (advance, pause, next, skip) and latches each subtitle's language when it appears. |
| Music state machine | `packages/platform/src/media/music.ts` | Cues with any number of declared states and authored stingers; a state change waits for the next bar or plays its stinger first; a new cue crossfades over one bar; silence fades. Time is passed in; the game only executes its commands. |
| Priority mix | `packages/platform/src/media/mixer.ts` | Eight categories with priorities, voice limits and repeat windows; essential cues always play (stealing a voice) and briefly duck music and ambience; a reduced mode halves cosmetic voices. |
| Spectacle | `packages/platform/src/media/spectacle.ts` | Tier per action (ordinary 0, heavy/weapon/launcher 1, Exact Block/Counter/Breaker 2, Ultimate/team/boss transition 3); a per-screen cosmetic budget by quality level; every core stays; overlaps merge; flash, shake and particle settings apply. |
| Presentation events | `packages/platform/src/media/events.ts` | Snapshot diff → hit, defense, grab, dash, land, knockdown, Ultimate, team finisher, boss phase and run events, each with a stable id so a frame never plays twice. |
| Stage 1 media data | `packages/platform/src/media/stage1.ts` | Intro, ending, motifs, title loop, the seven cues (Keeper of the Gate has four states and three stingers), beat → cue map, `stage1MediaIds()` (snapshot-tested). |
| Import | `tools/art/import_media.py` | Flow clips → 960 px WebM (VP9/Opus) + MP4 (H.264/AAC); end stills; VFX sheets at 256 px cells; the victory stinger as MP3; manifest entries with length, size and provenance. `import_art.py` keeps media entries. |
| Game | `apps/game/src/media/` | Web Audio engine (buses, mixer, scheduled music, placeholder synthesis for ids without a file), `Cinematic.tsx`, the music director (`musicFor`), event sounds; `scenes/effects.ts` draws effect cores, sparks, flash and shake. |

## Tasks

- [x] Media core modules and unit tests (`packages/platform/test/media.test.ts`).
- [x] Import the delivered clips, stills, VFX sheets and the victory stinger; manifest fields `video`, `audio`, `provenance`.
- [x] Intro cinematic (video or stills, subtitles, pause, next, skip), ending cinematic before the results, title loop.
- [x] Music: menus (title), cinematics in still mode (their state), beats (explore/combat/danger), boss phases and surrender, results (victory stinger); pause holds the score quieter.
- [x] Sounds and effects from presentation events; Settings: Ambience and Interface volumes, now playing, Cinematics (video / stills), Sparks and particles; EN/ZH-CN/DE.
- [x] Browser tests (`apps/game/e2e/m13.spec.ts`); M11 tests skip the new ending.

## Known limits

- Only the victory stinger of the Stage 1 score is delivered. The other states play quiet synthesized placeholders in each cue's tempo; dropping a file with the same logical id into the manifest replaces one (no code change).
- Gameplay sounds are synthesized placeholders until CC0 or ElevenLabs files arrive under the same ids.
- Clips carry Flow's own ambience; while a clip plays, the score stays silent. In still mode the cinematic's score state plays.
- Wi-Fi games skip the ending (each player would skip on their own); the results open directly.
- The Museum itself is M21; M13 fixes the ids it will index.

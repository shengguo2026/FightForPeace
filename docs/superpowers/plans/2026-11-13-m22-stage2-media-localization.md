# M22 · Stage 2 media and localization (0.22.0)

Roadmap row M22, Stage 2 spec §16 (and §4 for the story). Goal: Stage 2 with all delivered art, clips and music in three languages.

## Delivered

1. **Ingest** (`tools/art/import_stage2.py`): 32 clips and the title loop without their generated audio, every still and insert, the twelve environments, hero weapon and mounted sheets, villagers, bikes, props, effect sheets, shell pictures (key art, menu and Museum backgrounds, outfits, portraits, artifacts, badges). The Road Rider's and Marek's mounted sheets were re-cut as 2x2 grids. See `docs/art/stage2/approved-variants.md`.
2. **Score** (`tools/audio/build_stage2_score.py`, `packages/platform/src/media/stage2.ts`): seven cues; the Gilded Jackal has mounted, armed, Predator Unbound, Scorched Claim and surrender states with stingers cut on its grid; per-state tempo in `MusicDirector`. The director (`apps/game/src/media/director.ts`) picks explore, combat and danger per beat, Marek's state in the intercept and the Dispatch Yard, and the ending and victory states.
3. **Six motion chapters** (`STAGE2_INTRO`, `STAGE2_ENDING`): every shot is a silent clip with its still fallback and subtitle cues with stable ids (`s2.line.*`). Community Recovery picks inserts and its closing line from the Preservation grade. The intro plays after What's New and before the briefing; the ending plays after the in-engine epilogue cards and before the results. Skip, Skip all, pause, still-picture mode; the Museum Cinema plays each chapter.
4. **Narration pipeline** (`packages/platform/src/media/voice.ts`, `apps/game/src/media/narration.ts`): text and voice language chosen separately; a voice file `vo.<locale>.<line>` in the chosen language, then English, then the optional system voice, then subtitles only. Settings: voice language and system voice.
5. **Ambience and SFX layers**: an ambience bus with a crossfaded bed per area; synthesized placeholders for beds, weapons, the firearm warning and pursuit events; the firearm warning plays at critical priority with a localized caption.
6. **In-stage art**: area backdrops in rooms and corridors (lazy-loaded; the greybox stays for interactive pieces), mounted riders and bikes (`packages/platform/src/assets/mounted.ts`), Stage 2 weapon poses and stances, loose weapon pictures, objective, container, breakable, shutter, rack and food pictures by state, villager sheets for the annex worker and the researcher, Store outfit pictures, the Stage 2 title loop and menu picture.
7. **Text**: `apps/game/src/text/strings.m22.ts` (EN, ZH-CN, DE): all lines, speakers, chapter titles, cue titles, settings, captions and Museum entries.
8. **Tests**: `packages/platform/test/m22.test.ts`, `apps/game/e2e/m22.spec.ts`; M21's spec now passes through the intro chapters.

## Known limits

- No ambience, SFX or voice recordings were delivered: placeholders as above. Windows TTS stays a prototype and accessibility aid (spec §16).
- Narration wording was written for M22 from the spec and clip descriptions; open for Guo's edits.
- The Stage 2 effect sheets are imported but not yet drawn; effects use the M13 art.
- Outfits are still tints in the stage; the Store shows the delivered pictures.

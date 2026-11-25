# M28 · Stage 3 journey, campaign and media (0.28.0)

Roadmap row M28. Spec: Stage 3 §4 (story), §5 (route), §6 (research record), §7 (rescues),
§9 (horse allocation), §12 (capture sequence), §14 (branches, Museum, Store), §15 (teaching),
§16 (presentation and music), §17 (checkpoint state), §22 (names, IDs, grade, achievements,
shot list). Systems from M27 (`2026-11-17-m27-stage3-systems.md`), objectives from M25,
packaging from M26. Like M20 + M21 + M22 did for Stage 2, in one milestone. Rules version
`m28`, version 0.28.0.

## Scope

### The stage as data (`packages/data/stages/stage3.yaml`)

*Shadows over the Herb Mountain*, content ID `story.stage3.herb-mountain` (kebab-case,
lesson I1; spec §22.1 writes `herb_mountain`). Seventeen beats in six areas and two
branches; every beat names its area for the backdrop.

| Area | Beats (encounter names §22.4) | Checkpoint |
| --- | --- | --- |
| Lower Switchback | Switchback ride (horse corridor, safe introduction), 1 Hoofprints in the Mud (pursuit evidence), 2 Rope across the Trail | 1 at the stage start |
| Qinglan Hamlet | 3 Empty Drying Racks → *Signal Hut: The Silent Antenna* (branch, Wei Shan, radio repair) → 4 The Watch Path | 2 at the hamlet (after the mounted introduction) |
| Moonbell Basin | 5 Mist over the Beds (the research record case; Tomas's radio intercept), 6 Two Voices in the Mist (Gao Wen and Tao Min) | — |
| Echo Quarry | 7 Loose Scaffold → *Herbalist Shelter: Baskets Left Behind* (branch, gathering equipment, the camp meal) → 8 Hammer Line, 9 Cart Rails (An Bo) | 3 at the quarry (after the basin rescue) |
| Broken Ridge Camp | Ridge pursuit (horse corridor, replacement horses after An Bo), 10 Outer Fence, 11 Lantern Row, 12 Ren Xia's Enclosure (Tomas sighted in the cabin, then his escape) | 4 at the pursuit (after An Bo) |
| High Winch Terrace | Chief of the Broken Ridge (Garran), then his private case | 5 at the terrace (after Ren) |

- **Engine (generic):** a new beat kind `arena: <id>` runs an arena with its scenery,
  weapons, food, waves, devices and M25 objectives (protected units, evidence cases,
  hostile channels) inside the run, like M20's room beat. Its exit opens when the waves are
  cleared, no captive is still bound and no case is still lying uncollected. Stage 3
  arenas live in `packages/data/encounters/stage3.yaml`, loaded after every Lab file, and
  stage files after the first two load last (lesson G1: arena and stage indices only ever
  append).
- **Rescues on the M25 ladder:** Gao Wen, Tao Min, An Bo and Ren Xia (and Wei Shan in the
  Signal Hut) are protected units on the `rescue` ladder with hostile channels in their
  zones (rope pulled taut, lantern kicked over, crate dragged against the enclosure). The
  run keeps each rescue's condition the moment the person is safe; continues never erase or
  repeat it (a rescued person waits at the shelter when the beat restarts).
- **Research record:** the documented sample case in Mist over the Beds is an M25 evidence
  case on the `record` outcome (Documented, Recovered, Disturbed); its exit needs it
  collected, so the minimum continuity can never be skipped. Sealed state is kept the same
  way as rescues.
- **Tomas:** the run records the radio intercept (entering Mist over the Beds), the cabin
  sighting (entering Ren Xia's Enclosure) and the escape (Ren's beat cleared) as story
  flags. None is an objective; there is no chase prompt and nothing is lost by rescuing Ren.
- **Garran in the flow:** his capture record (route, how the Hookstaff was lost, winch
  redirects) is kept when the terrace is cleared; then his private case appears (the
  stage's evidence); examining it ends the stage with the damaged invoice.
- **Horses:** the two corridors ride the mountain horse; the run counts Stability breaks
  (crashes) for *Steady on the Switchback*.
- **Grade (§22.2, shared M25 module):** Rescue condition 35 (per group: Secure full,
  Strained half, Critical none), Research record 15, Garran capture and counterplay 20,
  Combat quality 20, Optional branches 10. Any group Critical caps at A; Cheat-Assisted
  runs get no grade.
- **Epilogue cards:** Garran's capture, one card per rescue by its condition, the research
  record, each completed branch, the invoice, Tomas reaching the lowland shelter.
- **Difficulty:** Medium about 30 ordinary enemies; Easy fewer; Hard more objective
  pressure; Extreme adds Ridge Stalkers; Ultimate adds Pack Captains; co-op adds about a
  third. Weapons per spec §10.1 (Easy adds a staff and a hammer); food per §10.2 with the
  camp meal only in the Herbalist Shelter.

### Campaign and progression (`progression.yaml`, `missions.yaml`)

- Stage 3 in the campaign list, opening after Stage 2 is completed; its title screen (F01
  loop, key art, menu picture, *Paths through the Mist*).
- Eight achievements with the §22.3 names in three languages: *Mist Lifts* (clear,
  narrative), *Every Voice Home*, *Signal Restored*, *Shelter Remembered*, *Both Paths
  Walked*, *Steady on the Switchback*, *Hook Unhooked*, *Paper Trail* (examine the invoice and
  open its Dossier page).
- Museum: the **Silvermist Ecology Folio** (upgraded when both branches are done), the
  three artifacts (Qinglan Rescue Bell, Gao Wen's Trail Ledger, The Broken Hookstaff), story
  pictures, the Stage 3 chapters, the *Mist and Resolve* cues; locked entries show their
  clue. Sponsor Dossier: the damaged invoice page `dossier.stage3.damaged_invoice` with its
  facts and the new theory. Research: the second milestone's inputs.
- Store: the Mountain Rescue Outfit and the Highland Gathering Festival Attire per hero as
  **Coming soon** previews without a price (decision 2026-11-17); the free default
  evolution is the Stage 3 outfit worn in Stage 3 (M27 sheets), listed in the wardrobe.
- What's New for Stage 3 and an Academy package that opens the M27 rooms as drills.

### Media

- Import (`tools/art/import_stage3_media.py`): the eight Stage 3 areas as parallax layers,
  the story stills (start and end frames, inserts, briefing), the F01 title loop (audio
  stripped), the shell art (key art, menu background, Museum folio and artifacts, badges,
  achievement and menu icons, outfit previews, portraits) and the captive and Tomas sheets.
- **Still sequences** (lesson C3): the cinematic player gains a shot with an end picture:
  the start still with a slow zoom, a one-second cross-fade to the end still, subtitles in
  the calm bottom fifth. Chapters: *Silvermist* (H01–H05) before the briefing, *The
  Prepared Route* (T01–T03) shown in the stage at its moments as a picture-in-picture with
  subtitles (the fight never stops, so co-op and Wi-Fi stay in step), and *Paths through
  the Mist* (E01–E06, E03 chooses the Secure or Critical insert) after the epilogue cards.
- **Score** (`tools/audio/build_stage3_score.py`): the seven cues of *Mist and Resolve*,
  Garran's three states plus the capture ending on the 06A grid, the six stingers and the
  Highland Bed; the director picks cue and state per beat and Garran's phase.
- Text: `strings.m28.ts` in English, Chinese and German.

## Deferred (M29 or later)

- Stage 3 hardening against §19 (balance harness, all pairs, Wi-Fi recovery cases).
- Final dialogue wording (written for M28 from the spec; open for Guo's edits), voice files,
  ambience recordings.
- Store outfits stay previews until the DLC unlock.

## Tests

- `packages/sim/test/m28.test.ts`: data and route, arena beats, rescues and their
  conditions, the record case, branches, checkpoints keeping rescues, Tomas flags, Garran
  capture and the case, grade (weights, caps, cheat), epilogue, determinism.
- `packages/sim/test/m28-journey.test.ts`: a bot run of the whole stage solo and in co-op.
- `packages/platform/test/m28.test.ts`: campaign unlock, achievements, Museum, Dossier,
  Store previews, still sequences.
- `apps/game/e2e/m28.spec.ts`: Stage 3 from stage select, an area backdrop, a captive, the
  ending and results, in German and Chinese.
- Every golden replay keeps its hash.

## Tasks

- [x] Plan (this file).
- [x] Generator: arena beats, Stage 3 areas, late stage files; encounters/stage3.yaml.
- [x] Sim: arena beats, Stage 3 run record, grade measures, epilogue, results.
- [x] stage3.yaml, corridors, achievements, Museum, Dossier, Store, campaign, Academy.
- [x] Media import, still sequences, chapters, score, director, backdrops, captive art.
- [x] Shell: stage select, briefing, What's New, intro and ending, results, Store previews.
- [x] Strings EN/ZH-CN/DE.
- [x] Tests, rules `m28`, version 0.28.0, README, Guo_tests M28.

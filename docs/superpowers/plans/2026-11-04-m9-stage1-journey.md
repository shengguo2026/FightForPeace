# M9 Stage 1 Greybox Journey Implementation Plan

**Goal:** Stage 1, "The Broken Water Pact", is playable from the fields to the Sluice Commander as one journey: eight beats on the delivered Stage 1 areas, camera locks with their encounters per difficulty and player count, checkpoints at beats 3, 5 and before the boss, continues and the co-op revive (review decision D8), the worker rescue, the investigation clue, the sponsor evidence and a results screen. The portable build reaches v1: README, third-party licence notices, the version on screen, an unzip-and-start smoke test in CI (Linux and Windows), the zip attached to every CI run and a GitHub Release when a `v*` tag is pushed.

**Architecture:** `packages/data` gains `stages/stage1.yaml`. The generator compiles each beat into a base arena and one arena per camera lock (reusing the arena schema pieces: waves, `minDifficulty`, `coop`, substitutions, devices, surge, weapon spot), checks that every lock fits its view and its enemies start inside it, and emits `STAGE_DATA`. `packages/sim` grows `stage/run.ts`: the `StageRun` state on the world (beat, phase, locks done, floor, continues, checkpoint, workers, pickups, clue, evidence, hold channels, stats, last event), stepped before and after the encounter each frame. Holding Interact is the new move state `Channel`. The world encoding (STATE_FORMAT 12) covers the run, so replays and hashes include it. `apps/game` adds the stage HUD (per-player hold prompts from each player's bindings, progress bar, story text, notices), the stage drawing (title, objective, GO arrow, fades, workers, pen, cache, food, clue, evidence), the results overlay and the version tag; the Lab's Arena panel lists the stage first with a "Start at beat" practice choice, and `?stage=1` starts it directly. `tools/release.mjs` writes THIRD-PARTY-NOTICES.txt and the versioned README; `tools/smoke-portable.mjs` unzips into a path with a space, runs the zip's own start script and checks the page, the game script's version and the server's id answer.

**Spec:** spec Module 19, §13, Appendix D.3; review decision D8; roadmap row M9 and its guardrails: stage flow reads a stage file (Stage 2 is a second file), the results screen takes a list of grades, a stage can declare several rescues (and later a locked roster, branches and guests), no key letters in player-facing text, deterministic simulation.

## Global constraints

- Everything from M0–M8 still applies (60 Hz integer simulation, no float maths, `Math.random` or `Date` in `packages/sim`, data-driven kits, Windows-safe tests).
- **The stage is data.** Beats, locks, waves, checkpoints, workers, pickups, clue and evidence come from the stage file; the runner has no Stage 1 knowledge.
- **Grades are a list.** `stageResults` returns `{ id, value, grade }[]` and an overall grade; the screen renders whatever it gets.
- **Prompts name actions, not keys.** Every hold prompt is `{action:Interact}` text, resolved per player from their own bindings and device.
- No rig: delivered art (workers, food, barricade sheet) where it exists, placeholders otherwise.
- All numbers are **candidates** for the Combat Lab.

## Candidate rules

| Item | Candidate value | Source |
|---|---|---|
| Beats | 1 Dry Fields, 2 Occupied Bridge, 3 Worker Rescue, 4 Working Mill, 5 Investigation, 6 Canal Route, 7 Gate Courtyard, 8 Sluice Commander | spec D.3 |
| Camera lock | starts when the heroes' centre reaches `at`; heroes and camera held in the 1920 px view until its waves are cleared; co-op tether keeps both heroes in view | Module 19 |
| Checkpoints | taken when beats 3, 5 and 8 begin: beat, meter and stats | Module 19 |
| Continues | Easy 5, Medium 3, Hard 2, Extreme 1, Ultimate 0; a defeat shows DEFEATED for 2 s, spends one and restores the checkpoint with full Health; none left: the stage restarts from beat 1 | D8 |
| Co-op down | a defeated hero is downed; the partner holds Interact next to them for 2 s (interruptible by a hit or by letting go) and they return with 40 % Health; otherwise they rejoin at the next lock clear with 30 %; a team continue is spent only when both are down | D8 |
| Worker rescue | hold Interact 0.75 s next to a bound worker; freed workers cheer, then walk home; the exit opens when every lock is clear and every worker is free; all freed opens the recovery cache | Module 19 |
| Food | walking over it while hurt heals 250–300 Health | Module 19 |
| Clue and evidence | hold 0.5 s (clue) or 0.75 s (evidence); the evidence appears when the Commander surrenders and the river flows again, and securing it ends the stage | Module 19 |
| Grades | rescue (workers freed), investigation (clue + evidence), continues used, time against 10 / 14 / 19 min on Medium; S/A/B/C, overall is the rounded mean | Module 19 |
| Practice | the Lab can start at any beat; the results then say "practice run from beat N" | Module 19 |
| Courtyard substitution | one recruit becomes an enforcer from Hard | spec D.3 |

## Tasks

- [x] Stage file, generator schema and checks (`loadStage`), `STAGE_DATA`, stage arenas hidden from the trial list.
- [x] Stage runner: beat entry, locks, exit and fade, checkpoints, continues and restart, downs, revive, rejoin, workers, cache, food, clue, evidence, stats and grades; `Channel` move state.
- [x] World integration: options `stage` and `beat`, joining hero placed beside the partner, STATE_FORMAT 12, RULES_VERSION m9.1, replays re-recorded, a stage-rescue golden replay.
- [x] Game: stage HUD, stage drawing, results overlay, version tag, Lab stage entry and practice beat, `?stage=1`, tiled background fix.
- [x] Guardrail data: optional locked `roster` and `guests` (validated hero ids; a locked roster replaces other picks and blocks hero switches during the stage) and per-beat `next` branches (two choices taken by the exit lane; every beat must be reachable and every final beat ends on the evidence). Stage 1 uses none of them.
- [x] Art import: worker sheets, food and barricade props.
- [x] Tests: sim rules (`m9.test.ts`), data checks, browser tests (`e2e/m9.spec.ts`).
- [x] Portable v1: version 0.9.0, README, THIRD-PARTY-NOTICES.txt, smoke test (`pnpm smoke:portable`), CI zip artifact and Windows smoke job, `release.yml` on tags.

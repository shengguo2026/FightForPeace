# M23 · Stage 2 hardening and acceptance (0.23.0)

Roadmap row M23. Spec: Stage 2 §18 (Risk-Tiered Complete-Path Acceptance), with §17 (save,
checkpoint, replay and synchronization state), §16 (localization, captions, fallbacks) and
§19 D (encounter balancing). The Stage 1 counterpart is M14 (`2026-11-06-m14-slice-hardening.md`,
acceptance record `docs/review/08-slice-acceptance.md`); M23 reuses its harnesses and extends
them to the four heroes, the six pairs, the mounted pursuits, the rooms and Marek.

**Goal:** every line of §18 has automated evidence or a named manual step, the audits find
what they can and the findings are fixed (data first, code where data can't), and the result
is written down in `docs/review/09-stage2-acceptance.md` together with the release package
(coverage matrix, known issues, performance, localization/accessibility, provenance, hashes).

The roadmap's cut option 1 is taken: the six-pair **Wi-Fi** coverage is automated (two
simulated peers with latency, jitter, rollback and disconnects); Guo plays three
representative pairs over real Wi-Fi by hand.

## What the bot can and can't prove

The stage bot (`packages/sim/test/stageBot.ts`) is a deterministic stand-in, not a human. A
bot clear proves the route is completable and the difficulty has the right *shape*; it can't
prove "fun" or "beginner-completable". The harness therefore checks ordering, spikes and
completion, and Guo's manual steps judge feel. Exact balance values stay production data
(§19 E).

## Architecture

| Layer | Where | What |
|---|---|---|
| Complete paths | `packages/sim/test/m23-paths.test.ts` | The whole stage from the pursuit to the crate with no cheats, continues allowed as a player would use them: the four heroes solo and the six pairs on Medium; the four heroes solo and three representative pairs (founders, twins, one mixed) on Easy, Hard, Extreme and Ultimate. Records continues used, restarts, time, Preservation and Response grades; Easy and Medium must finish without a stage restart. |
| Progression sweep | `packages/sim/test/m23-progression.test.ts` | Stage 2 from every one of its 14 beats × 5 difficulties × 4 solo heroes and 6 pairs, heroes kept alive (route, not fight), on the spine and with every branch taken; stall detector as M14 (nothing advances for 60 s outside a fight). |
| Balance harness | `packages/sim/test/m23-balance.test.ts` | Each Stage 2 beat from its own checkpoint, six bot variants, the four heroes solo and two pairs, all five difficulties. Invariants as M14: Medium harder than Easy; each step above Medium costs cleared beats and Health; co-op never harder than solo; no ordinary Medium beat is a spike; Marek is the hardest fight. Snapshot table → acceptance record. Data tuning only where an invariant fails. |
| Outcome coverage | `packages/sim/test/m23-outcomes.test.ts` | One test per §18 outcome not already pinned by M20: clean and Cheat-Assisted runs and their result flags, both Marek capture presentations, each branch completed / failed / skipped, each of the four Preservation grades, every Marek phase transition reached from the intercept outcome. Existing M19/M20 tests are referenced, not copied. |
| Checkpoint and save | `m23-outcomes.test.ts`, `packages/platform/test/m23.test.ts` | Each of Checkpoints 1–4: a continue and a snapshot/restore give the checkpoint's Ledger, branches, response, carried weapon and rounds, and the same hash on replay. Profile side: a Stage 2 completion awards Credits, records, Museum, Dossier and research exactly once (repeat, resume, re-entry); backup → import (merge and replace) keeps Stage 2 progress. |
| Wi-Fi | `packages/platform/test/m23-net.test.ts` (harness moved from `net.test.ts` to `netHarness.ts`) | Each of the six pairs plays a Stage 2 room and the pursuit through two `RollbackSession`s over a simulated link with latency and jitter; both peers end on the same hash as an offline run of the same inputs. Soak: a long jittery session with no desync. Disconnect and rejoin mid-room and mid-pursuit; host migration; rewards and weapons not duplicated or lost. |
| Anti-infinite and stress | `packages/sim/test/m23-stress.test.ts` | Each hero, each pair (handoffs, Twin Accord), each Stage 2 weapon and the grenade return run looping inputs against Stage 2 enemies and Marek: no target is held in hit-stun or juggled past the combo budget's cap. Headless step budget for the crowded rooms, mounted co-op, grenade return and every Marek phase. |
| Controls | `tests/lint/prompt-matrix.test.ts`, `apps/game/e2e/m23.spec.ts` | Prompt matrix covers every Stage 2 catalogue (riding, weapons, Stage 2 lessons, twins' moves). German QWERTZ and a remapped Stage 2 action resolve in the riding move list; a Stage 2 cheat (`STEADYRIDE`) is chosen with the gamepad only. |
| Localization and accessibility | `apps/game/e2e/m23.spec.ts`, `tests/lint/localization-qa.test.ts` | Stage 2 screens in English, German and Chinese: stage select, the mounted HUD and move list, a room HUD with the Ledger, the epilogue, results with Preservation and Response, Museum Stage 2 sections, Sponsor Dossier, Store. No overflow, no fallback text, axe without serious or critical issues. Reduced motion, still fallbacks, the firearm-warning caption and steering assistance. |
| Performance | `apps/game/e2e/m23.spec.ts` | Throttled Chromium in the most crowded Stage 2 room and in the co-op pursuit: the simulation stays in real time with Auto Quality. |
| Release package | `tools/release-manifest.mjs`, `release/manifest.json` (also in the zip) | Game, rules, content, cheat registry and state-format versions; content hash; golden replay hashes; the provenance table from `docs/art/stage2/approved-variants.md`; links to the acceptance record (coverage matrix, known issues, performance, localization/accessibility). |
| Enemy approach walks | `tests/art/art.test.ts`, review by eye | EW01–EW08 (imported on main) checked against lesson A5: cell 1 and cell 4 have different legs in front. A sheet that fails goes back to the Pictures repo as a prompt fix. Done last. |

## Tasks

- [x] Complete-path harness; find and fix what stops a clean run.
- [x] Progression sweep (spine and every branch); fix blockers.
- [x] Balance harness and Stage 2 balance table; tune data where an invariant fails.
- [x] Outcome coverage: clean / Cheat-Assisted, both captures, every branch outcome, every grade, every Marek phase.
- [x] Checkpoint, profile rewards once, backup and import with Stage 2 progress.
- [x] Wi-Fi: six pairs, soak, disconnect/rejoin, host migration.
- [x] Anti-infinite and stress; headless step budget.
- [x] Controls: prompt matrix for Stage 2, QWERTZ and gamepad-only cheat in e2e.
- [x] Localization and accessibility sweep of Stage 2 screens; fix findings.
- [x] Throttled performance in a crowded room and the co-op pursuit.
- [x] Release manifest and its test.
- [x] EW01–EW08 walk check (A5).
- [x] Acceptance record `docs/review/09-stage2-acceptance.md`, version 0.23.0, README, `lessons_learned.md` for every new finding, `Guo_tests.md` M23 section.

## Manual part (Guo_tests M23)

Things CI can't cover: real Wi-Fi between two PCs for three pairs, a disconnect by pulling
the cable, a real gamepad picking a cheat, German keyboard, a real low-end laptop, a human
Easy run without cheats, and a look at Medium, Hard and Ultimate for readability.

## Out of scope

- Final production values (§19 E), real ambience, SFX and voice recordings.
- Fine Hard+ tuning of the Stage 1 courtyard (left open in M14) unless the Stage 2 harness
  changes shared enemy data.
- Stage 3 and later.

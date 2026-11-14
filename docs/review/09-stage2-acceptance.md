# 09 · Stage 2 (Prosperity Greenhouses): acceptance record (M23)

**Status:** automated part complete with M23 (version 0.23.0, rules `m23`). The manual part (two real PCs over Wi-Fi, a pulled cable, a real gamepad, a German keyboard, a low-end laptop, a human Easy run) is Guo's checklist in `Guo_tests.md`, section M23. This record maps Stage 2 spec §18 (risk-tiered complete-path acceptance) and §17 (save and resume) to the evidence, then lists what the harnesses found and what stays open.

## 1. Coverage matrix

| §18 / §17 requirement | Evidence (automated) | Manual (Guo_tests M23) |
|---|---|---|
| All four heroes complete Medium solo | `packages/sim/test/m23-paths.test.ts`: the whole stage from the pursuit to the crate, no cheats, continues and stage restarts as a player would use them | step 6 (a human run on Easy) |
| All six pairs complete Medium (hot-seat) | `m23-paths.test.ts`, all six pairs on Medium | — |
| All six pairs over local Wi-Fi | `packages/platform/test/m23-net.test.ts`: each pair rides the pursuit and fights into the rooms through two rollback sessions over a simulated jittery link; both end on the offline replay's hash, rollbacks inside the window, no resync | step 3 (three pairs on two PCs) |
| Easy, Hard, Extreme, Ultimate: solo and representative co-op | Easy: 4 solo + 3 pairs complete paths; Hard: 3 pairs complete paths; every difficulty × every hero and pair: `m23-progression.test.ts` (every beat to the results) and `m23-balance.test.ts` (every beat cleared by some bot variant). Extreme, Ultimate and Hard solo in one sitting are beyond the bot | step 7 (Medium, Hard, Ultimate look) |
| Every beat reachable, every branch | `m23-progression.test.ts`: 14 beats × 5 difficulties × 4 solo + 6 pairs, stall detector; one lane-700 run takes all three branches | — |
| Clean and Cheat-Assisted paths, their result flags | clean: `m23-paths.test.ts` (`cheatAssisted false`, capture, evidence 1, four grades); Cheat-Assisted: `m20.test.ts`, `packages/platform/test/m23.test.ts` (no one-time rewards) | step 5 |
| Both Marek captures; every phase | `m19.test.ts` (Resolve surrender, forced capture; every phase at every difficulty) | — |
| Each branch completed / failed / skipped; four Preservation grades | `m20.test.ts` (optional branches; stage-wide Preservation and Response) | — |
| Checkpoints 1–4 resume deterministically | `m23-outcomes.test.ts`: snapshot/restore at each checkpoint (solo and co-op) gives the same hash 900 frames later; a continue later in each segment returns to its checkpoint with its records; the last continue restarts at the pursuit (D8) and still reaches the results | step 4 |
| Rewards once; backup and import | `packages/platform/test/m23.test.ts`: repeat clear, resumed run, later branch and Cheat-Assisted clear award only what they should; merge and replace imports keep Stage 2 progress | — |
| Disconnect, rejoin, host migration | `m23-net.test.ts`: guest drop and rejoin in a room (proxy, no duplicate items), pulled cable with host migration and hand-back, 150 s jittery soak | step 3 |
| No infinites | `m23-stress.test.ts`: each hero and three pairs with full meter loop offence against every Stage 2 role and Marek; no target held past 6 s (worst measured: Wind on Marek, about 4.4 s) | — |
| Controls | `tests/lint/prompt-matrix.test.ts` (every token of every catalogue, including the riding move list and Stage 2 lessons, × 3 layouts × 4 pad families × rebinding × players); `apps/game/e2e/m23.spec.ts`: German first launch on QWERTZ, STEADYRIDE chosen with the gamepad only | steps 5, 8 |
| Localization and accessibility | `m23.spec.ts` in German and Chinese: stage select (Stage 2), Museum (all sections), Store, Records; the pursuit, a room, the epilogue and the results in play. No overflow, no fallback text, axe without serious or critical issues; `tests/lint/localization-qa.test.ts`, `catalogues.test.ts` | step 8 |
| Performance | headless: `tests/perf/stage2-step-cost.test.ts` (crowded Ultimate co-op rooms, co-op pursuit, intercept, every Marek phase: under 4 ms per step); browser: `m23.spec.ts`, Filtration Control on Ultimate with Chromium throttled ×2 and the Canvas renderer | step 9 |
| Release package | `docs/release/manifest.json` in the zip, checked by `tests/release/manifest.test.ts` | step 1 |
| Approach walks (lesson A5) | EW01–EW08 checked by eye, cell 1 against cell 4 (section 6) | step 7 |

## 2. Complete paths (bot, no cheats)

The bot plays the whole stage; when its continues run out it starts the stage again, as a player would. "Habit" is which of the four bot styles finished first. Minutes are game time.

| Difficulty | Line-up | Habit | Last run (min) | Total (min) | Continues used | Stage restarts |
|---|---|---|---|---|---|---|
| Medium | Mountain | 0 | 6 | 20 | 3 | 3 |
| Medium | River | 0 | 6 | 40 | 3 | 7 |
| Medium | Wind | 0 | 6 | 83 | 3 | 16 |
| Medium | Fire | 0 | 6 | 19 | 3 | 3 |
| Medium | Mountain + River | 0 | 6 | 6 | 3 | 0 |
| Medium | Mountain + Wind | 0 | 7 | 7 | 3 | 0 |
| Medium | Mountain + Fire | 0 | 5 | 5 | 1 | 0 |
| Medium | River + Wind | 0 | 5 | 5 | 2 | 0 |
| Medium | River + Fire | 0 | 5 | 5 | 1 | 0 |
| Medium | Wind + Fire | 0 | 5 | 12 | 2 | 1 |
| Easy | Mountain | 0 | 6 | 6 | 4 | 0 |
| Easy | River | 1 | 7 | 7 | 4 | 0 |
| Easy | Wind | 1 | 8 | 19 | 5 | 2 |
| Easy | Fire | 0 | 9 | 9 | 5 | 0 |
| Easy | Mountain + River | 0 | 6 | 6 | 2 | 0 |
| Easy | River + Fire | 0 | 5 | 5 | 2 | 0 |
| Easy | Wind + Fire | 0 | 5 | 5 | 2 | 0 |
| Hard | Mountain + River | 1 | 6 | 13 | 2 | 2 |
| Hard | River + Fire | 0 | 6 | 18 | 2 | 3 |
| Hard | Wind + Fire | 0 | 6 | 82 | 2 | 16 |

The bot is a weak player (it guards late and never uses the environment on purpose), so restarts measure the bot more than the stage. Solo Wind needs the most: its short reach against Marek. Easy Wind restarted twice; a human run on Easy is Guo_tests step 6.

## 3. Balance (harness snapshot)

Each cell: beats cleared by the 12 bot variants · mean Health left (of 1000). Founders = Mountain + River, twins = Wind + Fire. Full table: `packages/sim/test/__snapshots__/m23-balance.test.ts.snap`. Invariants that hold: Medium is harder than Easy; each step above Medium costs Health and cleared beats; co-op on Medium is never harder than solo; no ordinary Medium beat is cleared by fewer than 3 of 12; Marek is the hardest Medium fight and never a wall.

| Line-up | Loading Yard | Aquaculture | Crop Channels | Medicinal Wing | Filtration | Production Hall | Dispatch Yard (Marek) |
|---|---|---|---|---|---|---|---|
| Mountain medium | 9 · 317 | 9 · 402 | 8 · 281 | 9 · 553 | 10 · 439 | 9 · 474 | 6 · 131 |
| Mountain hard | 1 · 13 | 8 · 389 | 9 · 365 | 10 · 483 | 4 · 196 | 6 · 194 | 2 · 52 |
| Mountain ultimate | 3 · 123 | 0 · 0 | 7 · 225 | 0 · 0 | 3 · 67 | 5 · 158 | 2 · 76 |
| Wind medium | 10 · 430 | 8 · 291 | 7 · 246 | 9 · 589 | 10 · 405 | 11 · 542 | 4 · 116 |
| Wind ultimate | 0 · 0 | 1 · 8 | 5 · 121 | 0 · 0 | 3 · 55 | 2 · 50 | 4 · 92 |
| Founders medium | 12 · 680 | 10 · 558 | 11 · 644 | 12 · 851 | 12 · 614 | 12 · 786 | 11 · 683 |
| Founders ultimate | 9 · 390 | 5 · 215 | 8 · 356 | 7 · 287 | 6 · 283 | 8 · 431 | 9 · 454 |
| Twins medium | 12 · 692 | 12 · 747 | 12 · 646 | 12 · 894 | 12 · 784 | 12 · 589 | 12 · 751 |
| Twins ultimate | 10 · 601 | 4 · 222 | 10 · 570 | 4 · 207 | 10 · 459 | 7 · 333 | 8 · 472 |

## 4. What the harnesses found and what changed

| Finding | Caught by | Fix | Lesson |
|---|---|---|---|
| An enemy knocked into the end wall stood idle in the no-attack strip forever (Marek on Hard) | progression sweep, stall detector | ring spot clamped inside the safe zone, walk tolerance included (`enemies/ai.ts`); rules version `m23`, golden replays re-recorded | F1 |
| Ultimate easier than Extreme | balance harness | one Ultimate-only enemy in six rooms, two more in co-op | F2 |
| Hard Enforcer a wall in five rooms | balance, complete paths | stays in Loading Yard, Filtration, Production Hall; Extreme+ in Aquaculture and Medicinal Wing | F2 |
| Medium Marek's two Claim Hands beat every solo hero | complete paths | one Claim Hand below Hard | F2 |
| Room names in English in German and Chinese | browser sweep | `arenaName()` uses the room and beat names | F3 |
| Museum Investigation panel not reachable by keyboard (axe) | browser sweep | scrolling panels are focusable named regions | F4 |
| D-pad skipped the cheat "I understand" button | gamepad-only cheat test | navigation measures the gap between boxes | F4 |
| Test bot: turned on the spot over a target, walked into warned lines | complete paths | bot only (`arenaBot.ts`): no turn at dx 0, steps out of a telegraphed line | — |

## 5. Performance

| Situation | Measured | Budget |
|---|---|---|
| Simulation step, crowded Ultimate co-op rooms, co-op pursuit, intercept, all Marek phases (headless, CI machine) | under the 4 ms budget in every case | 4 ms per 60 Hz step |
| Filtration Control, Ultimate, Chromium throttled ×2, Canvas renderer (local run) | simulation 59.7 steps/s, 0.58 ms per step; drawing about 54 ms per frame, Auto Quality fell to Minimal | simulation in real time (> 50 steps/s), step < 4 ms |

The simulation keeps real time; drawing on a throttled software renderer is slow (about 18 frames per second), which is what Auto Quality is for. A real low-end laptop is Guo_tests step 9.

## 6. Approach walks EW01–EW08 (lesson A5)

All eight sheets checked by eye, cell 1 against cell 4 (lower body enlarged): Claim Hand, Reaver, Marauder, Saboteur, Enforcer, Signalman, Marek and Marek Unbound each have the near leg forward in one of the two cells and the far leg forward in the other (the near leg is drawn over the far one and lit; knee pads and greaves show which is which). Cells 2 and 5 (the passing poses) also lift opposite legs. No sheet goes back to the Pictures repo. The swap is carried by overlap and shading, not by the silhouette, so it is subtle at game size: Guo_tests step 7 looks at it in motion.

## 7. Open points for Guo (not changed in M23)

1. **Stage length and D8.** A full Stage 2 run takes a bot about 5–9 minutes, a human longer. After the last continue the whole stage starts again from the pursuit (rule D8), which on Medium can mean replaying 20+ minutes. M23 keeps D8 as decided; Guo decides after the human run whether the restart should go to the last checkpoint instead.
2. **Hard Loading Yard.** The Enforcer plus a Marauder clears in only 1–6 of 12 bot variants solo on Hard. Kept as Hard's first wall; flagged for the manual look.
3. **Stage 1 feel.** The F1 AI fix applies to Stage 1 too: Stage 1 got slightly harder for the bot (for example Mountain on Medium clears the courtyard in 3 of 12). Guo_tests step 10 checks it by hand.
4. **Throttled co-op pursuit in the browser** is covered headless (step cost) rather than by its own throttled browser test.
5. **Out of scope** (spec §19 E): final ambience, SFX and narration recordings remain placeholders (see `docs/art/stage2/approved-variants.md`).

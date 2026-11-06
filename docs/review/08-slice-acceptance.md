# 08 · Stage 1 Representative Vertical Slice: acceptance record (M14)

**Status:** automated part complete with M14 (version 0.14.0). The manual part (real hardware, real Safari, real gamepads, two PCs) is Guo's checklist in `Guo_tests.md`, section M14. This record maps every line of spec §19 to the evidence that covers it, then lists the M14 audits and what they found.

## 1. Spec §19, line by line

| §19 requirement | Evidence (automated) | Manual check |
|---|---|---|
| Full Stage 1 journey: intro, briefing, ending, results, saved progression | `apps/game/e2e/m10.spec.ts` (play flow), `m13.spec.ts` (intro and ending cinematics), `m11.spec.ts` (results, Credits once, records), `packages/sim/test/m14-progression.test.ts` (to the results from every checkpoint) | Guo_tests M14 step 2 |
| All three play modes | Solo and same-device co-op: `m8.spec.ts`, `m10.spec.ts`; local Wi-Fi: `m12.spec.ts` (two browsers in lockstep) | M12 steps on two PCs |
| Both founders and their approved core actions | `packages/sim/test/combat.test.ts`, `m3`–`m5` tests, replays `combo-routes.json`, `specials-grabs.json`, `academy-recipes.json` | — |
| Both Stage 1 weapons acquired during play | `m6.test.ts`, replay `weapons-environment.json`, `m6.spec.ts` | — |
| Environmental slice: impact surface, multi-state breakable with fragment, active hazard, co-op redirect, Resolve-gated boss interaction | `m6.test.ts`, `m6.spec.ts` (boards, cog, pillar), `m8.test.ts` (co-op redirect), `m7.test.ts` (Resolve) | — |
| Five core enemies, Hard+ Enforcer, multi-phase Commander | `m7.test.ts`, `m7.spec.ts`, stage data `packages/data/stages/stage1.yaml` (courtyard substitution) | — |
| Combat, defense, anti-infinite, co-op, weapon, scoring, Credits, profile, save, loadout, remapping, Guide, Cheat-Assisted foundations | `m1`–`m11` unit and browser tests; `tests/replays/*.json` golden replays | — |
| One representative Academy route | `m11-academy.test.ts`, `m11.spec.ts` (lessons certify) | — |
| EN / ZH-CN / DE narrative presentation | `tests/lint/catalogues.test.ts` (complete catalogues, same tokens), `m13.spec.ts` (subtitles), **M14** `m14.spec.ts` localization sweep | Guo_tests M14 step 6 |
| EN / ZH-CN / DE Guide and cheat cards, keyboard and gamepad-only activation | `m11.spec.ts` (Guide follows rebinding, cheats by keyboard and pad), **M14** `tests/lint/prompt-matrix.test.ts` | Guo_tests M14 step 5 |
| Generated-media pilot and still-art fallback | `m13.spec.ts`; **M14** capability gate: no playable video → stills (`m14.spec.ts`) | — |
| Data-driven content and deterministic replay | `tests/replays/replay.test.ts`, `tests/lint/determinism-lint.test.ts`, `determinism.spec.ts` (browser = headless hash) | — |
| Tier 1 capability/performance checks, no progression-blocking defects | **M14**: capability gates and System check, CI browser matrix, throttled performance test, progression sweep (sections 2–4) | Guo_tests M14 steps 1, 3, 4, 7 |

## 2. Browser matrix (Tier 1)

| Browser | Engine in CI | What runs | Where |
|---|---|---|---|
| Chrome | Chromium (Playwright) | every browser test (M0–M14) | Linux, `check` job |
| Firefox | Firefox (Playwright) | every browser test | Linux, `check` job |
| Safari | WebKit (Playwright) | every browser test | Linux, `check` job |
| Edge | Microsoft Edge (installed on the Windows runner) | portable zip unzipped into a path with a space, started with `start.bat`, first launch played, System check recorded | Windows, `portable-windows` job |
| Portable zip | Chromium | the same against `start.sh` on Linux | Linux, `check` job |

Each run uploads its capability table (`m14-capabilities-<browser>.json`, `system-check-<browser>.json`) and a System check screenshot. Real Safari on a Mac is the one engine that only a manual test covers.

## 3. Capability gates (spec §2)

| Capability | Required | Without it |
|---|---|---|
| Drawing (WebGL, else Canvas 2D) | yes | an explanation page instead of the game |
| Physical key codes | yes | an explanation page |
| Saving (IndexedDB or the game folder) | no | temporary profile, the village says progress is not kept |
| Sound (Web Audio) | no | silent; subtitles and visual warnings stay |
| Video cinematics (WebM or MP4) | no | still pictures with the same subtitles; no title clip |
| Gamepads | no | keyboard only |
| Wi-Fi co-op (WebSocket) | no | the Wi-Fi mode is disabled with the reason |
| Full screen | no | the setting is hidden; the game fills the window |
| Window focus (Page Visibility) | no | no automatic focus pause |

Settings → System check shows all of them, plus the drawing level and the last measurements. Test builds simulate a missing capability with `?caps=-video,-audio` (ignored in release builds).

## 4. Audit results

| Audit | How | Found and fixed in M14 |
|---|---|---|
| Progression blockers | Stage 1 from each of the 8 checkpoints × 5 difficulties × Mountain / River / co-op (120 runs), heroes kept alive, stall detector | None in the game. The sweep caught a stall caused by the test bot (it kept jabbing away from an enemy idling at the edge of the view); the bot was fixed. |
| Balance on Medium | Each beat from its checkpoint, 12 stage-bot variants, solo and co-op, every difficulty (`m14-balance.test.ts`) | The gate courtyard exam was harder than the Sluice Commander on Medium (Mountain cleared it in 3 of 12 variants, the boss in 5). Its five enemies now arrive in two groups (Runner and Lookout join when one of the first group is left); Mountain 4/12 with more Health left, River unchanged at 5/12 with more Health left. |
| Button prompts | 3 languages × 3 layouts × 4 pad families × default and rebound × 4 players × every prompt token × both facings (`prompt-matrix.test.ts`) | Player 2 on the keyboard had no key for Pause/Back, so "{Pause} to change" read "Not assigned" in hero select and P2 could not take back a confirmed hero. P2 now has Num + (numpad set) or Backspace (laptop set). Screen-reader text of prompts and "Not assigned" were English in every language; now localized. Key names follow the language (Leertaste, Strg; 空格). |
| Accessibility | axe-core (WCAG 2.1 A/AA) on 17 shell screens in English and German; first-launch defaults | Prompts carried `aria-label` on elements where screen readers ignore it (now `role="img"`); the decorative title clip is hidden from screen readers; first launch follows the system's "reduce motion" setting. Colour contrast over pictures stays a manual check (axe cannot measure it). |
| Localization | Catalogue completeness, likely-untranslated text, every shell screen in German and Chinese checked for clipped or overflowing labels, fallback diagnostics | No overflow or fallback found; the new M14 text is in all three languages. |
| Performance | Crowded courtyard beat, Chromium, Canvas 2D, CPU throttled 2× (≈ low-end laptop) | Before: 65 ms per frame, the simulation fell behind (58 steps/s, catch-up cap hit). Auto Quality gained a last step, **Lowest**: internal resolution two thirds (44 % of the pixels). After: 40 ms per frame, 60 steps/s, no catch-up cap. Unthrottled software WebGL went from about 98 to 45 ms per frame. Simulation cost: about 0.2–0.5 ms per step. |

## 5. Balance table (harness snapshot, every difficulty)

Cleared beats out of 12 bot variants · average Health left (of 1000). Snapshot: `packages/sim/test/__snapshots__/m14-balance.test.ts.snap`.

| Line-up | fields | bridge | rescue | mill | investigation | canal | courtyard | sluice |
|---|---|---|---|---|---|---|---|---|
| Mountain, Easy | 12 · 903 | 10 · 647 | 10 · 750 | 9 · 658 | 12 · 1000 | 9 · 509 | 8 · 382 | 4 · 105 |
| Mountain, Medium | 11 · 752 | 9 · 637 | 8 · 594 | 8 · 595 | 12 · 1000 | 9 · 519 | 4 · 206 | 5 · 169 |
| Mountain, Hard | 4 · 165 | 6 · 358 | 4 · 289 | 4 · 182 | 12 · 1000 | 7 · 419 | 4 · 121 | 3 · 72 |
| Mountain, Extreme | 2 · 75 | 6 · 345 | 3 · 213 | 3 · 144 | 12 · 1000 | 4 · 160 | 3 · 115 | 4 · 69 |
| Mountain, Ultimate | 0 · 0 | 3 · 134 | 2 · 139 | 1 · 28 | 12 · 1000 | 4 · 95 | 0 · 0 | 4 · 81 |
| River, Easy | 12 · 852 | 10 · 572 | 12 · 918 | 9 · 585 | 12 · 1000 | 8 · 532 | 6 · 570 | 9 · 271 |
| River, Medium | 9 · 539 | 9 · 649 | 11 · 859 | 4 · 271 | 12 · 1000 | 9 · 633 | 5 · 345 | 4 · 97 |
| River, Hard | 4 · 175 | 7 · 531 | 7 · 519 | 5 · 247 | 12 · 1000 | 7 · 451 | 3 · 159 | 3 · 49 |
| River, Extreme | 6 · 270 | 5 · 494 | 6 · 442 | 2 · 120 | 12 · 1000 | 5 · 216 | 1 · 48 | 3 · 78 |
| River, Ultimate | 2 · 53 | 2 · 143 | 4 · 311 | 5 · 274 | 12 · 1000 | 6 · 280 | 1 · 35 | 2 · 31 |
| Co-op, Easy | 12 · 908 | 12 · 866 | 12 · 985 | 11 · 799 | 12 · 1000 | 12 · 848 | 12 · 808 | 10 · 528 |
| Co-op, Medium | 10 · 544 | 12 · 964 | 12 · 992 | 12 · 871 | 12 · 1000 | 12 · 866 | 10 · 581 | 11 · 577 |
| Co-op, Hard | 10 · 622 | 11 · 668 | 12 · 922 | 11 · 780 | 12 · 1000 | 9 · 500 | 9 · 428 | 9 · 491 |
| Co-op, Extreme | 8 · 443 | 11 · 735 | 10 · 759 | 6 · 336 | 12 · 1000 | 8 · 332 | 4 · 215 | 12 · 582 |
| Co-op, Ultimate | 2 · 141 | 7 · 519 | 11 · 625 | 4 · 292 | 12 · 1000 | 7 · 378 | 4 · 170 | 11 · 525 |

Cleared beats in total (of 96): Mountain 74 / 66 / 44 / 37 / 26, River 78 / 63 / 48 / 40 / 34, co-op 93 / 91 / 83 / 71 / 58 (Easy to Ultimate). Before the M14 follow-up, Hard to Ultimate sat at 69–74 (Mountain) and 63–68 (River), the same as Medium (66, 63) or easier.

### M14 follow-up: Hard and above

Why they were not harder: the larger Hard+ budgets were never used (each enemy waited out its authored attack cooldown, so budget, attackers and projectiles limits never bound); higher `guardScale` made enemies guard more, which made them passive and got their guard crushed more often (the Commander on Ultimate guarded about twice as often as on Medium and was crushed three times as often); and Hard+ added no enemies except the courtyard Enforcer. What changed (all spec §12.4 / D.2 levers: behaviour, decision quality, roster variants, resources; hero controls, damage and defensive windows unchanged):

| Lever | Easy | Medium | Hard | Extreme | Ultimate |
|---|---|---|---|---|---|
| Attack pace (percent of each enemy attack's cooldown) | 100 | 100 | 85 | 72 | 62 |
| Answer after a block (no turtling) | — | — | yes | yes | yes |
| No guard chance below 40 Defense (avoids a Guard Crush) | — | — | yes | yes | yes |
| Food restores (percent) | 100 | 100 | 85 | 70 | 60 |
| Extra enemies per beat (stage data) | — | — | +1 solo, +1–2 co-op | +1 more, co-op +1 | +1 more |
| Commander's phase-2 support pair | 2 Recruits | 2 Recruits | Runner + Shield | Runner + Shield | Runner + Shield |

The harness now also requires that every step from Medium up costs both cleared beats and Health left for every line-up, and that the solo courtyard and boss are no easier above Medium.

## 6. Open points (not slice blockers)

- ~~Hard and above are not measurably harder than Medium for the stage bot.~~ Fixed in the M14 follow-up (section 5). Remaining: in co-op the bot pair still beats the Commander as often on Extreme and Ultimate as on Medium (two jab bots keep him in hitstun); the Hard+ Enforcer makes the courtyard only slightly harder for the bot, which interrupts its Anvil Pin telegraph. Fine Hard+ tuning stays M23 scope; human play decides.
- **River Scout at the mill** is the weakest Medium pairing for the bot (4/12). The bot only jabs, which suits the Mountain Guardian; worth a human check before any data change.
- Real Safari, a physical low-end laptop and real gamepad families are manual (Guo_tests M14).

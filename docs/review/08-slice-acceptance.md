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
| Balance on Medium | Each beat from its checkpoint, 12 stage-bot variants, solo and co-op, Easy and Medium (`m14-balance.test.ts`) | The gate courtyard exam was harder than the Sluice Commander on Medium (Mountain cleared it in 3 of 12 variants, the boss in 5). Its five enemies now arrive in two groups (Runner and Lookout join when one of the first group is left); Mountain 4/12 with more Health left, River unchanged at 5/12 with more Health left. |
| Button prompts | 3 languages × 3 layouts × 4 pad families × default and rebound × 4 players × every prompt token × both facings (`prompt-matrix.test.ts`) | Player 2 on the keyboard had no key for Pause/Back, so "{Pause} to change" read "Not assigned" in hero select and P2 could not take back a confirmed hero. P2 now has Num + (numpad set) or Backspace (laptop set). Screen-reader text of prompts and "Not assigned" were English in every language; now localized. Key names follow the language (Leertaste, Strg; 空格). |
| Accessibility | axe-core (WCAG 2.1 A/AA) on 17 shell screens in English and German; first-launch defaults | Prompts carried `aria-label` on elements where screen readers ignore it (now `role="img"`); the decorative title clip is hidden from screen readers; first launch follows the system's "reduce motion" setting. Colour contrast over pictures stays a manual check (axe cannot measure it). |
| Localization | Catalogue completeness, likely-untranslated text, every shell screen in German and Chinese checked for clipped or overflowing labels, fallback diagnostics | No overflow or fallback found; the new M14 text is in all three languages. |
| Performance | Crowded courtyard beat, Chromium, Canvas 2D, CPU throttled 2× (≈ low-end laptop) | Before: 65 ms per frame, the simulation fell behind (58 steps/s, catch-up cap hit). Auto Quality gained a last step, **Lowest**: internal resolution two thirds (44 % of the pixels). After: 40 ms per frame, 60 steps/s, no catch-up cap. Unthrottled software WebGL went from about 98 to 45 ms per frame. Simulation cost: about 0.2–0.5 ms per step. |

## 5. Balance table (Medium harness snapshot)

Cleared beats out of 12 bot variants · average Health left (of 1000). Snapshot: `packages/sim/test/__snapshots__/m14-balance.test.ts.snap`.

| Line-up | fields | bridge | rescue | mill | investigation | canal | courtyard | sluice |
|---|---|---|---|---|---|---|---|---|
| Mountain, Easy | 12 · 903 | 10 · 647 | 10 · 750 | 9 · 658 | 12 · 1000 | 9 · 509 | 8 · 382 | 4 · 105 |
| Mountain, Medium | 11 · 752 | 9 · 637 | 8 · 594 | 8 · 595 | 12 · 1000 | 9 · 519 | 4 · 206 | 5 · 169 |
| River, Easy | 12 · 852 | 10 · 572 | 12 · 918 | 9 · 585 | 12 · 1000 | 8 · 532 | 6 · 570 | 9 · 271 |
| River, Medium | 9 · 539 | 9 · 649 | 11 · 859 | 4 · 271 | 12 · 1000 | 9 · 633 | 5 · 345 | 4 · 97 |
| Co-op, Easy | 12 · 908 | 12 · 866 | 12 · 985 | 11 · 799 | 12 · 1000 | 12 · 848 | 12 · 808 | 10 · 528 |
| Co-op, Medium | 10 · 544 | 12 · 964 | 12 · 992 | 12 · 871 | 12 · 1000 | 12 · 866 | 10 · 581 | 11 · 577 |

## 6. Open points (not slice blockers)

- **Hard and above** are not measurably harder than Medium for the stage bot (its damage taken is flat from Medium to Ultimate). The bot fights one enemy at a time, so it may not feel the extra concurrency; human play on Hard decides. Hard+ balance is M23 scope.
- **River Scout at the mill** is the weakest Medium pairing for the bot (4/12). The bot only jabs, which suits the Mountain Guardian; worth a human check before any data change.
- Real Safari, a physical low-end laptop and real gamepad families are manual (Guo_tests M14).

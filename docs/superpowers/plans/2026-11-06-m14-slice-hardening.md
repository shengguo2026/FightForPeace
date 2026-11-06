# M14 Slice Hardening Implementation Plan

**Goal:** The Stage 1 Representative Vertical Slice is checked against spec §19 as a whole: the game tests the browser it runs in and turns off only what that browser cannot do, it is measured on a throttled "low-end laptop" profile, every button prompt resolves in every language, layout, gamepad family and rebinding, the menus pass an automated accessibility audit, the three languages pass a localization QA sweep, Medium is checked by a repeatable balance harness, and a progression-blocker sweep plays Stage 1 to the end from every checkpoint at every difficulty. The results are written down in an acceptance record that maps each §19 line to its evidence.

**Spec:** spec §2 (Tier 1 browsers and capability gates: "a missing optional capability disables only its dependent feature"), §18.3 (fixed simulation, adaptive presentation), §19 (slice acceptance); review 06 §1.5 and §2.7 (the M14 rows: prompt matrix, the portable zip in the test matrix); review 02 (performance on a reference low-end laptop); roadmap row M14.

## Architecture

| Layer | Where | What |
|---|---|---|
| Capability gates | `packages/platform/src/system/capabilities.ts` | A pure evaluator over a probe result: required capabilities (module scripts, a renderer, keyboard events, a save store) and optional ones (Web Audio, WebM or MP4 video, gamepads, WebSocket for Wi-Fi co-op, fullscreen, Page Visibility, Web Locks). Each optional capability names the features it switches off and the fallback (no video → still pictures, no Web Audio → silent with subtitles, no WebSocket → Wi-Fi co-op unavailable with a reason, no visibility events → no focus pause). |
| Browser probe | `apps/game/src/system/probe.ts` | Reads the real browser once at start; the e2e build accepts `?caps=-video,-webaudio` to simulate a missing capability. |
| System check | `apps/game/src/shell/screens/SystemCheck.tsx`, `system/blocked.ts` | Settings → System check: browser, every capability with its state and what it affects, the drawing level, smoothed frame time and the simulation's real-time ratio. A missing *required* capability opens a blocking screen instead of the game. |
| Performance probe | `packages/platform/src/system/perf.ts` | Render frame times, simulation step cost, catch-up caps hit, simulation frames per wall second (60 means real time); read by the System check and by the e2e performance test. |
| Prompt matrix | `tests/lint/prompt-matrix.test.ts` | Every `{action:…}` / `{dir:…}` token in every catalogue × 3 languages × 3 keyboard layouts × 4 gamepad families × default and rebound bindings × both keyboard players: resolves, is never empty, the rebinding shows, the spoken (`aria-label`) text is in the player's language. |
| Localization QA | `tests/lint/localization-qa.test.ts`, `apps/game/e2e/m14.spec.ts` | Likely-untranslated text (Chinese with no Chinese characters, German identical to English) against an allowlist of names; every screen in German and Chinese with no clipped or overflowing labels and no fallback diagnostics. |
| Accessibility audit | `apps/game/e2e/m14.spec.ts` (axe-core) | The village, every Settings category, the System check, play flow screens, HUD, pause and results in English and German: no serious or critical axe violations; first launch follows the operating system's "reduce motion" preference. |
| Balance harness | `packages/sim/test/m14-balance.test.ts` | Each Stage 1 beat from its own checkpoint with the stage bot, both heroes and co-op, Easy/Medium/Hard: damage taken, time and Health left per beat. Invariants: Medium sits between Easy and Hard on every beat, co-op never costs more than solo, no single beat takes more than its share of the stage. The table is written to the acceptance record. |
| Progression sweep | `packages/sim/test/m14-progression.test.ts` | Stage 1 from every checkpoint beat × 5 difficulties × Mountain / River / co-op, with the hero kept alive (testing the route, not the fight): reaches the results within a frame cap; a stall detector fails the test when nothing progresses for 60 s outside a fight. |
| Auto Quality | `packages/platform/src/render/quality.ts`, `StageScene.applyRenderScale` | A fourth level, **Lowest**, after the decorative steps: the internal resolution drops to two thirds (spec §18.3 reduction order ends with internal resolution). |
| Browser matrix | CI, `tools/smoke-portable.mjs` | Chromium, Firefox and WebKit (Safari's engine) run every e2e test on Linux; `FFP_SMOKE_BROWSER=msedge` plays the first launch in Microsoft Edge against the zip unzipped on Windows and records its System check. |

## Tasks

- [x] Capability evaluator + unit tests; browser probe; feature switches (video → stills, no audio, no Wi-Fi, no gamepads); blocking screen; System check screen; EN/ZH-CN/DE.
- [x] Performance probe and readout; e2e test with 6× CPU throttling (Chromium) in a crowded beat: the simulation stays real time and Auto Quality steps down; headless crowded-encounter step budget.
- [x] Prompt matrix test; spoken prompt text localized.
- [x] Localization QA lint and e2e overflow sweep; fix what they find.
- [x] axe-core audit in e2e; fix what it finds; first launch follows `prefers-reduced-motion`.
- [x] Balance harness on Medium; tune data only if an invariant fails.
- [x] Progression-blocker sweep; fix any blocker.
- [x] Edge on Windows in CI against the portable zip.
- [x] Acceptance record `docs/review/08-slice-acceptance.md`; version 0.14.0.

## Findings fixed in M14

- Gate courtyard harder than the boss on Medium → two arrival groups (data only).
- Player 2 on the keyboard had no Pause/Back key → Num + (numpad set), Backspace (laptop set).
- Spoken prompt text, "Not assigned" and key names were English in every language → localized.
- Prompt `aria-label`s on generic elements → `role="img"`; decorative title clip hidden from screen readers; first launch follows "reduce motion".
- A throttled CPU fell behind real time in a crowded beat → Auto Quality **Lowest** (two-thirds resolution).
- Settings → Display offered no Medium quality → Medium and Lowest added; Full screen setting where the browser supports it.

- M14 follow-up (0.14.1): Hard and above were no harder than Medium for the stage bot → faster attack pace, an answer after a block, no guard chance on an almost empty Defense bar, Hard/Extreme/Ultimate extra enemies per beat, an elite Commander support pair and less food on Hard+; the balance harness now runs all five difficulties and checks that each step from Medium up is harder.

Details and numbers: `docs/review/08-slice-acceptance.md`.

## Known limits

- Co-op on Extreme/Ultimate: the bot pair still beats the Commander as often as on Medium; the Enforcer makes the courtyard only slightly harder for the bot. Fine Hard+ tuning is M23.
- Real Safari on macOS and a physical low-end laptop are not in CI: WebKit stands in for Safari and CPU throttling for the laptop. Both are on Guo's manual test list.
- The stage bot is a deterministic stand-in, not a human player, so the balance harness checks ordering and spikes, not "fun". Exact balance values stay production data (F&D).

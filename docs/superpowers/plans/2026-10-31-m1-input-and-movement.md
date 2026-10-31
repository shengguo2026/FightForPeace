# M1 Input and Movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two placeholder heroes that walk, dash and jump on the greybox stage, driven by keyboard, split keyboard or gamepad, next to two training dummies that occupy space. Every key or button shown on screen comes from one binding-aware prompt system, and the Lab shows each player's own inputs, device, movement state, speed, collision shapes and buffered action.

**Architecture:** Builds on M0 without changing its layering. `packages/platform` grows from "keyboard → FrameInput" into an input layer: device sources (keyboard cluster, split-keyboard half, gamepad), player-to-device assignment, and the `PromptResolver`. `packages/sim` grows a data-driven movement controller (walk, dash, jump, air correction, facing), a collision pass (soft between allies, solid-with-sliding against enemies) and a one-slot offensive input buffer. `apps/game` adds `<InputPrompt>`, a Lab settings panel and the controller-disconnect pause.

**Tech Stack:** unchanged from M0 (Node.js 24, pnpm 10, TypeScript strict, Vite, Phaser 4, Preact + signals, Vitest, Playwright).

**Spec:** `Features_Decisions.md` §5 and §10.1 (Module 1) and §13 (D6, D7, D11, the 2026-10-29 gamepad and split-keyboard defaults); `docs/review/06-input-prompts-and-portable-build.md` §1; roadmap row M1 and "Small changes inside the slice milestones" (movement profiles are data).

## Global Constraints

- Everything from the M0 plan still applies (60 Hz integer simulation, 1/256 px units, no floating-point trigonometry or `Math.random` in `packages/sim`, physical key codes, no fixed port).
- **Movement profiles are data.** Walk speed, dash, jump and air-correction numbers live in one `MovementProfile` object (`onFoot` in M1). M17's mounted corridor adds a second profile, not a second movement system.
- **Inputs reach the simulation only as `FrameInput` integers.** Analog sticks, dead zones and device switching are resolved in `packages/platform`; the simulation never sees a float or a device name. Double-tap detection runs inside the simulation from frame-stamped direction edges, so replays and later network play see the same dashes.
- **No player-facing string contains a key letter.** Text uses tokens (`{action:Jump}`, `{dir:Forward}`) and `<InputPrompt>` draws the current binding. A unit test scans the text files for raw key names.
- **Jump is the physical key `KeyY`.** It is labelled with the printed character: `Z` on German QWERTZ, `Y` on US QWERTY. Labels come from `navigator.keyboard.getLayoutMap()` (Chrome, Edge), else the character of the first real press of that key, else the layout picked in the Lab (QWERTY / QWERTZ / AZERTY; first-launch setup takes this over in M10).
- **Dashing grants no invulnerability.** There is no invulnerability flag anywhere in M1 state.
- **Movement is never buffered.** Only offensive actions (Attack, Jump, Special, Ultimate) use the buffer, one slot, newest valid press wins. Guard, exact block and counter are not buffered (they arrive in M4 with real timestamps).
- All new tuning numbers below are **candidates** for the Combat Lab, kept in data, not decisions.

## Candidate tuning values

| Item | Value (60 Hz frames, pixels) | Notes |
|---|---|---|
| Walk | 3 px/f across, 2 px/f depth, diagonals × 181/256 | unchanged from M0 |
| Double-tap window | second press within **12 f** (200 ms) of the first press of the same direction | any of the 4 directions; diagonal dash when the other axis is held, or when both keys are double-tapped together |
| Dash | **14 f** at 9 px/f across, 6 px/f depth, diagonals normalized; then back to walk | the `Dash` action dashes in the held direction, or forward when neutral |
| Jump | launch 16 px/f upward, gravity 1 px/f², about 32 f in the air, apex ≈ 136 px | landing recovery is M3 (Module 4); M1 uses 0 f |
| Directional jump | takeoff speed = walk speed in the held direction | neutral jump has no horizontal speed |
| Air correction | ± 0.125 px/f² towards the held direction, speed capped at walk speed; against the takeoff direction it can only brake and then drift at most 0.75 px/f the other way | "limited correction, no instant reversal" |
| Offensive buffer | **9 f** (150 ms), one slot | inside the spec's 100–150 ms range |
| Attack stub | 18 f "attack pose" with no hitbox, movement locked | stands in for M2's real attacks so facing and buffering can be tested |
| Body footprint | ellipse-like box 72 × 28 px in the floor plane | drawn by the Lab collision view |
| Ally soft collision | overlapping allies are pushed apart by up to 1 px/f each; movement and dashes are never blocked | |
| Enemy collision | solid; the hero slides along the dummy on the free axis; dummies yield 1/4 of the push; after 30 f of continuous blocked overlap the pair turns soft until separated | "occupy space, no immovable wall, no permanent trap" |
| Assisted Facing range | nearest enemy within 480 px across and 160 px depth | only for neutral Attack; explicit left/right always wins; no retarget while an attack chain continues |
| Gamepad stick | radial dead zone 0.30; 8-way sectors of 45° | d-pad and stick are equivalent |

## Default bindings

| Action | Keyboard P1 | Split keyboard P2 (numpad) | Laptop P2 (no numpad, proposed) | Gamepad |
|---|---|---|---|---|
| Move | `W A S D` | Arrow keys | Arrow keys | Left stick, d-pad |
| Attack | `T` | `Num 4` | `I` | West (Xbox X / PS □) |
| Jump | `Z` (physical `KeyY`) | `Num 5` | `O` | South (Xbox A / PS ✕) |
| Special | `U` | `Num 6` | `P` | North (Xbox Y / PS △) |
| Guard | `G` | `Num 1` | `K` | RB / R1 |
| Ultimate | `H` | `Num 2` | `L` | RT / R2 |
| Grab / Interact | `J` | `Num 3` | `;` (prints `Ö` on QWERTZ) | East (Xbox B / PS ○) |
| Team Attack | `B` | `Num 0` | `.` | LB / L1 |
| Dash (optional) | — | — | — | LT / L2 |
| Low Attack (optional) | — | — | — | — |
| Pause | `Esc` | — | — | Start / Options |

**Laptop preset proposal.** D7's `IJKL` idea collides with Player 1's `U`, `H` and `J`. The proposal keeps P2 on the arrow keys and puts the actions on `I O P` / `K L ;` (mirroring P1's `T Z U` / `G H J`, top row then home row) with Team Attack on `.`. No key is shared with P1. P2's left hand covers `I O P K L ;`, the right hand the arrows. Laptop keyboards often ghost, so the Lab gets a held-keys readout (Task 9) for the ghosting check; the full live tester stays in M10.

## Review Focus

1. **Double-tap vs. walking back and forth:** tapping D, then A, then D quickly must not dash; only the same direction twice within 12 f dashes. A held direction plus a fresh press of the *other* axis must not dash either. → Task 4.
2. **Dash key and double-tap are the same dash:** identical state, distance and frames, and neither sets any invulnerability. → Task 4.
3. **Air correction cannot reverse a jump:** a right jump with Left held for the whole flight still lands to the right of where a neutral jump would, and never faster leftwards than 0.75 px/f. → Task 5.
4. **Buffer queues one action:** pressing Jump then Attack during the last 9 frames of an attack stub performs only Attack; a press 10 frames early is dropped. → Task 6.
5. **No trapping:** a hero pinned between two approaching dummies and the stage edge can always walk out within one second. → Task 7.
6. **Device rules:** in single-player the last-used device controls P1; once P2 has joined, a newly connected pad never takes over anyone; an assigned pad's disconnect pauses the simulation (frame counter stops) and resumes on reconnect or reassignment. → Tasks 2 and 10.
7. **Prompts follow everything:** rebinding, device switch, pad family, keyboard layout and facing each re-resolve the visible prompt without a reload. → Tasks 8 and 9.
8. **Determinism still holds:** the new golden replays reproduce on Chromium, Firefox and WebKit at 30, 60 and 144 Hz render rates. → Task 11.

---

## File structure

```
packages/platform/src/input/
  actions.ts             + Dash, LowAttack, Pause; Bindings gains device kinds 'keyboard' | 'gamepad'
  defaults.ts            P1 keyboard, split-keyboard P2, laptop P2, gamepad defaults (tables above)
  keyboard.ts            KeyboardState (now one per keyboard binding set) + direction edges + held mask
  gamepad.ts             GamepadReader: standard-mapping buttons, dead zone, 8-way, edges; family detection
  devices.ts             DeviceHub + PlayerSlots: join, single-player auto-switch, assignment, disconnect
  layout.ts              KeyLabelSource: layout map → first press → picked layout
  prompts.ts             PromptResolver: (player, input) → Prompt (keycap / pad glyph / chord / unassigned)
packages/sim/src/
  world/types.ts         FrameInput v2, Fighter state, MovementProfile, Team
  movement/profile.ts    ON_FOOT profile (candidate values)
  movement/controller.ts walk, dash, jump, air correction, facing, attack stub
  movement/doubleTap.ts  per-direction double-tap detector
  combat/buffer.ts       one-slot offensive buffer
  collision/collide.ts   soft ally separation, enemy slide, anti-trap timer
  world/world.ts         heroes + dummies, step order, encode v2
apps/game/src/
  input/browserInput.ts  window keyboard + navigator.getGamepads polling → DeviceHub
  text/en.ts             tokenized player-facing strings
  ui/InputPrompt.tsx     keycap or glyph (CSS-drawn placeholders, logical IDs ui.prompt.*)
  ui/LabOverlay.tsx      per-player panels; settings panel (F2)
  ui/PauseOverlay.tsx    controller-disconnected / paused prompt
  scenes/StageScene.ts   two heroes, dummies, collision view, shadows for jumps
tests/replays/           walk-square (re-recorded), dash-jump, crowd (new)
tests/lint/prompt-text.test.ts
```

---

### Task 1: FrameInput v2 and action set

**Files:** Modify `packages/sim/src/world/types.ts`, `packages/platform/src/input/actions.ts`, `packages/platform/src/input/keyboard.ts`; Create `packages/platform/src/input/defaults.ts`.

**Interfaces:**
- `FrameInput = { moveX: -1|0|1; moveZ: -1|0|1; pressed: number; held: number; dirPressed: number }`. `held` is the mask of action buttons down at the sample; `dirPressed` is a mask of directions newly pressed since the last sample (`DIR_UP = 1, DIR_DOWN = 2, DIR_LEFT = 4, DIR_RIGHT = 8`), latched like `pressed`.
- `Action` gains `Dash = 128`, `LowAttack = 256`, `Pause = 512`.
- `Bindings = { device: 'keyboard' | 'gamepad'; codes: Record<BindableInput, string[]> }`. Gamepad codes are standard positions (`'South'`, `'West'`, `'RB'`, `'LT'`, `'DpadUp'`, `'Start'`, …). An empty list means "not assigned".

- [ ] Tests first: a tap of `KeyD` shorter than a frame sets `dirPressed & DIR_RIGHT`; holding `KeyG` sets `held & Guard` on every sample; the defaults tables match the confirmed decisions exactly (one table test per preset); no two actions in one preset share a code; P1 and both P2 presets share no code.
- [ ] Implement, then `pnpm test && pnpm typecheck && pnpm lint`.
- [ ] Commit `feat(input): FrameInput v2 with held and direction edges, binding presets`.

### Task 2: Gamepad reader and device hub

**Files:** Create `packages/platform/src/input/gamepad.ts`, `packages/platform/src/input/devices.ts`, tests.

**Interfaces:**
- `readPad(snapshot: PadSnapshot, prev: PadState, bindings: Bindings): { input: FrameInput; state: PadState; active: boolean }`. `PadSnapshot` is a plain copy of `Gamepad` (`id`, `index`, `mapping`, `buttons[].pressed`, `axes[]`) so tests need no browser. Stick → 8-way with a radial dead zone of 0.30; d-pad and stick merge.
- `padFamily(id: string): 'xbox' | 'playstation' | 'nintendo' | 'generic'` (vendor `045e`/"xinput"/"xbox" → Xbox, `054c` → PlayStation, `057e` → Nintendo).
- `DeviceHub` with `PlayerSlots`: device IDs `kb:p1`, `kb:p2`, `pad:<index>`. Rules: P1 exists from the start; while only P1 has joined, P1 follows the last device that produced input (keyboard P1 cluster or any pad). A press of Attack or Start/Pause on an unassigned device joins P2 (max two players in M1). After P2 joins, assignments are fixed and new pads stay unassigned. Disconnecting an assigned pad marks that slot `waiting`; the hub reports `paused = true` until the same pad (matching `id`) reconnects or the waiting player presses Attack on an unassigned device.
- [ ] Tests first: dead zone, diagonals at 45° ± 22.5°, d-pad equals stick, family detection for the three vendor strings and an unknown pad, single-player switching, join, "new pad never takes over", disconnect → paused → reconnect, disconnect → reassign to another pad.
- [ ] Commit `feat(input): gamepad reader, pad family detection and device assignment`.

### Task 3: Movement profile and controller (walk, facing, state)

**Files:** Create `packages/sim/src/movement/profile.ts`, `packages/sim/src/movement/controller.ts`; Modify `packages/sim/src/world/types.ts`, `packages/sim/src/world/world.ts`.

**Interfaces:**
- `Fighter extends Body { team: 'hero' | 'enemy'; slot: number; vx; vz; vy; state: 'idle'|'walk'|'dash'|'air'|'attack'; stateFrame: number; facingMode: 'manual'|'assisted'; ... }`. Facing modes are per player and passed in through `WorldOptions`, not baked in.
- `ON_FOOT: MovementProfile` holds every number in the candidate table.
- `createWorld(seed, options?: { players?: 1|2; dummies?: number; facing?: ('manual'|'assisted')[] })`. Default stays one hero, so M0 behaviour is unchanged until options are passed.
- [ ] Tests first: walking speed and normalized diagonals per M0; walking left/right turns facing in both modes; depth-only walking keeps facing.
- [ ] Commit `feat(sim): data-driven movement profile and fighter state`.

### Task 4: Dash (double-tap and Dash action)

**Files:** Create `packages/sim/src/movement/doubleTap.ts`; Modify controller.
- [ ] Tests first (Review Focus 1, 2): D-tap-D within 12 f dashes right; at 13 f it does not; D, A, D does not; holding W then double-tapping D dashes up-right at normalized speed; double-tapping W dashes up; Dash action while holding S dashes down, while neutral dashes forward; double-tap dash and Dash-action dash produce identical position after 14 f; no dash while airborne or during the attack stub; the encoded state has no invulnerability field.
- [ ] Commit `feat(sim): eight-way dash from double-tap or Dash action`.

### Task 5: Jump with limited air correction

- [ ] Tests first (Review Focus 3): neutral jump lands on the takeoff spot after the computed air time; directional jump carries walk speed; air correction cannot exceed walk speed; holding against the takeoff direction brakes and then never exceeds 0.75 px/f backwards; facing does not flip in the air; a jump pressed during a dash cancels the dash into a directional jump in the dash direction.
- [ ] Commit `feat(sim): neutral and directional jumps with limited air correction`.

### Task 6: Attack stub, facing modes and the offensive buffer

**Files:** Create `packages/sim/src/combat/buffer.ts`; Modify controller.
- [ ] Tests first (Review Focus 4): Attack starts an 18 f stub; Attack held with Left turns the hero left first (Manual); in Assisted mode a neutral Attack turns towards the nearest dummy in range, an explicit Right overrides, and the chosen target is kept while chained stubs continue; Jump then Attack inside the last 9 f performs Attack only; a press 10 f before the stub ends is dropped; movement during the stub is ignored, not buffered; Guard is never buffered.
- [ ] Commit `feat(sim): attack stub, Manual/Assisted Facing and one-slot input buffer`.

### Task 7: Collision (soft allies, sliding enemies, no trapping)

**Files:** Create `packages/sim/src/collision/collide.ts`; Modify world step order to: inputs → movement → collision → bounds clamp.
- [ ] Tests first (Review Focus 5): two overlapping heroes separate by ≤ 1 px/f each and either can walk through the other; a hero walking diagonally into a dummy slides along it; a dummy yields a quarter of the push; a hero pinned between two dummies and the left edge escapes within 60 f by walking up or down, and the anti-trap timer turns the pair soft after 30 f of blocked overlap; collision order is stable (sorted by id), so swapping array order gives the same hash.
- [ ] Commit `feat(sim): soft ally collision and sliding enemy collision`.

### Task 8: Key labels and the PromptResolver

**Files:** Create `packages/platform/src/input/layout.ts`, `packages/platform/src/input/prompts.ts`; replace `describeBinding()` internals so existing callers keep working.

**Interfaces:**
- `KeyLabelSource`: `setLayoutMap(map)`, `observe(code, key)`, `setPickedLayout('qwerty'|'qwertz'|'azerty')`, `label(code): string`, and a `version` counter that changes whenever any label could change.
- `resolvePrompt(ctx: { bindings; device; family; labels; facing }, input: PromptInput): Prompt` where `PromptInput` is an action, a direction (`Forward`/`Backward`/`Up`/`Down`, resolved against facing) or a chord. `Prompt = { kind: 'key', label, a11y } | { kind: 'pad', family, button, a11y } | { kind: 'chord', parts: Prompt[] } | { kind: 'gesture', name: 'doubleTap', dir: Prompt } | { kind: 'unassigned' }`.
- Rules from review 06 §1.2: Low Attack falls back to the chord *Dash + Attack + Guard*; Dash falls back to *double-tap Forward*; unbound actions return `unassigned`; `Forward` maps to the right-direction binding when facing right and to left when facing left.
- [ ] Tests first: `KeyY` labels `Z` with the QWERTZ pick and `Y` with QWERTY; an observed press overrides the pick; a layout map overrides both; `Numpad4` → `Num 4`; `Space`/`ArrowLeft` named keys; `Forward` flips with facing; Xbox West → `X`, PlayStation West → `□`, Nintendo West → `Y`, generic West → a position glyph; Low Attack chord and Dash gesture fallbacks; unassigned.
- [ ] Commit `feat(input): layout-aware key labels and the prompt resolver`.

### Task 9: `<InputPrompt>`, tokenized text and the Lab panels

**Files:** Create `apps/game/src/ui/InputPrompt.tsx`, `apps/game/src/text/en.ts`, `tests/lint/prompt-text.test.ts`; Modify `apps/game/src/ui/LabOverlay.tsx`.
- `<InputPrompt player input />` renders a keycap (rounded box, label) or a pad glyph (CSS-drawn placeholder per family under logical IDs `ui.prompt.pad.<family>.<button>`; Kenney CC0 art can replace them through the asset registry from M2) with `aria-label` text, in the player's colour.
- `formatText("Press {action:Jump} to jump")` splits tokens into prompts.
- Lab: one panel per player with device, facing mode, movement state, speed, buffered action and input history drawn with `<InputPrompt>`; a held-keys readout for the ghosting check; settings panel on **F2** (pointer-enabled) with per-player facing mode, button prompt style (Automatic / Xbox / PlayStation / Nintendo / Generic), keyboard layout pick, P2 keyboard preset (numpad / laptop), and a "rebind Attack" test button that waits for the next key. **F3** shows collision shapes; **F4** makes the dummies walk towards the nearest hero.
- [ ] Tests first: the text lint fails on `"Press T"`, `"KeyT"`, `"Numpad4"`, `"[Z]"`, passes on token strings; e2e: rebinding Attack to `K` changes the Attack hint from `T` to `K` without reload; picking QWERTZ shows Jump as `Z`.
- [ ] Commit `feat(game): InputPrompt, tokenized hints and per-player Lab panels`.

### Task 10: Browser input wiring, join and disconnect pause

**Files:** Create `apps/game/src/input/browserInput.ts`, `apps/game/src/ui/PauseOverlay.tsx`; Modify `apps/game/src/main.ts`, `apps/game/src/game.ts`, `apps/game/src/debug.ts`.
- Polls `navigator.getGamepads()` once per render frame, before the simulation steps; listens to `gamepadconnected`/`gamepaddisconnected`; feeds `DeviceHub`. Esc / Start toggles pause. While paused, the accumulator is not advanced (the frame counter stops). The pause overlay says which player lost their controller and uses `<InputPrompt>` for "press {action:Attack} on another device".
- Debug hook adds `fakePad(snapshot | null)` so Playwright can plug, press and unplug a virtual pad.
- [ ] Tests first (e2e): pressing Num 4 joins P2 and a second hero appears; a fake pad's South button makes P1 jump in single-player and the history shows the South glyph; with two players a newly plugged pad does not move anyone; unplugging P2's pad stops the frame counter and shows the prompt; plugging it back resumes.
- [ ] Commit `feat(game): gamepad polling, co-op join and controller-disconnect pause`.

### Task 11: Golden replays, screenshots, README

- Bump `REPLAY_FORMAT` to 2, `STATE_FORMAT` to 2 and `RULES_VERSION` to `m1.1`. Re-record `walk-square` (same inputs with the new fields) and add `dash-jump` (dashes in 8 directions, neutral/directional jumps with correction, buffered attacks) and `crowd` (two heroes, two approaching dummies, pinned-and-escape). Each runs at 30/60/144 Hz render rates and in all three CI browsers.
- e2e screenshots: two heroes with collision view, a mid-air jump, the pause prompt, the Lab with a pad.
- README: M1 controls table (through the same defaults data), split-keyboard and laptop presets, gamepad, Lab keys, M1 test checklist.
- [ ] Commit `test: M1 golden replays, screenshots and README`.

## M1 creator test checklist (posted with the PR)

1. Walk with W/A/S/D: unchanged from M0.
2. Double-tap D: a short dash right. Try A, W, S, and W held + double-tap D (diagonal). D-A-D quickly does not dash.
3. Press Jump (the key printed `Z` on your German keyboard): neutral jump. Hold D and jump: you travel right; holding A in the air only slows you down.
4. Press T: a short attack pose. Mash T then Z near the end of it: the next action comes out without a gap.
5. Walk into a grey dummy: you slide around it. F4 makes the dummies chase you; you can always walk out.
6. Press Num 4: Player 2 joins and walks with the arrows. Walk through each other: you separate gently.
7. Plug in a gamepad (single-player): it controls Player 1 at once and the Lab shows its buttons (Xbox letters, PlayStation shapes).
8. With two players joined, unplug the pad: the game pauses and asks for the controller; plug it back to continue.
9. F2 settings: switch the layout to QWERTY and see Jump become `Y`; rebind Attack to K and see the hint change; switch Facing to Assisted and attack near a dummy.

## Carried forward from the M1 review (2026-10-31)

- **Creator request:** aerial attacks get their own pose, visibly different from the standing attack and the low attack (low attack: crouch plus floor sweep, added in M1). In M1, Attack pressed in the air is only buffered for landing; the aerial attack stub and its pose arrive with the aerial suites (`Air T`, `Forward + T`, `Up/Down + T`), at the latest in M2/M3.

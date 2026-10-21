# M0 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A locally runnable browser build in which one greybox body moves on a belt-scrolling stage under a deterministic 60 Hz simulation, with a Lab overlay, golden replay tests and CI screenshots.

**Architecture:** A pnpm monorepo. `packages/sim` is a framework-free deterministic core (integer fixed-point maths, seeded RNG, canonical encoding and hashing, fixed-step world update). `packages/platform` converts browser keyboard events into abstract actions. `apps/game` is a Vite + Phaser + Preact client that only renders snapshots of the simulation.

**Tech Stack:** Node.js 22 LTS, pnpm 10, TypeScript 5 (strict), Vite, Phaser (latest stable), Preact + @preact/signals, Vitest, Playwright (Chromium locally; Chromium, Firefox and WebKit in CI), ESLint (flat config) + Prettier, GitHub Actions.

**Spec:** `2026-10-18-fight-for-peace-game-specification.md` §6, §18.1; `Features_Decisions.md` §4 (fixed simulation), §5, §10.1, §11 Module 20, §13; `docs/review/02-technical-evaluation.md` §2–§4.

## Global Constraints

- Fixed simulation rate: **60 Hz**; rendering is independent and may interpolate.
- `packages/sim` must not import Phaser, Preact, DOM types or any browser API, and must not use `Math.sin`, `Math.cos`, `Math.tan`, `Math.pow`, `Math.exp`, `Math.log`, `Math.sqrt`, `Math.random` or `Date`.
- All simulation positions and speeds are integers in **1/256 pixel** units (`FX_ONE = 256`).
- World logical playfield: **1920 × 1080**.
- Default bindings are **physical key codes**: `KeyW` up (depth), `KeyS` down (depth), `KeyA` left, `KeyD` right, `KeyT` attack, `KeyY` jump, `KeyU` special, `KeyG` guard, `KeyH` ultimate, `KeyJ` grab/interact, `KeyB` team attack.
- Keyboard direction ties favour the **most recently pressed** direction on each axis.
- Movement uses one consistent walking speed with **normalized diagonals**.
- `favicon.svg` is used only as the browser-tab icon.
- The game runs on `localhost`; no hosting configuration.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.

## Review Focus

1. **Tab hidden for minutes, then shown:** the first animation frame reports a huge elapsed time. The loop must run at most `maxSteps` (5) simulation steps and drop the remaining debt, not freeze or fast-forward. → test in Task 5.
2. **A and D held together:** the most recently pressed key wins; releasing it hands control back to the still-held key. → test in Task 6.
3. **Window loses focus while a key is held:** the key must not stay stuck "down" when focus returns. → test in Task 6.
4. **Non-US keyboard layout:** a German player pressing printed `Z` sends `KeyY` and must get Jump. → test in Task 6.
5. **High-refresh monitor (144 Hz) versus 60 Hz:** the same input log must produce the same simulation hash regardless of render rate. → test in Task 7.

---

## File structure

```
package.json                     root scripts: dev, build, test, lint, typecheck, e2e
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js                 includes sim determinism rules
.prettierrc
.nvmrc                           22
.github/workflows/ci.yml
README.md                        Windows setup and run instructions
packages/sim/
  src/math/fixed.ts              fixed-point helpers + trig LUT
  src/math/rng.ts                xoshiro128** + splitmix32 seeding
  src/state/encode.ts            canonical byte writer
  src/state/hash.ts              xxHash32
  src/world/types.ts             World, Body, FrameInput
  src/world/world.ts             createWorld, step, snapshot, hashWorld
  src/loop/fixedStep.ts          accumulator
  src/index.ts
  test/*.test.ts
packages/platform/
  src/input/actions.ts           AbstractAction enum + default bindings
  src/input/keyboard.ts          KeyboardState: press/release/blur → FrameInput
  src/index.ts
  test/*.test.ts
apps/game/
  index.html                     links /favicon.svg
  public/favicon.svg             copy of repo-root favicon.svg
  src/main.ts                    boots Phaser + Preact overlay, owns the loop
  src/scenes/StageScene.ts       draws greybox floor + body rectangles from snapshots
  src/ui/LabOverlay.tsx          frame, hash, fps, input history
  src/debug.ts                   window.__ffp test hook
  e2e/smoke.spec.ts
  playwright.config.ts
tests/replays/
  walk-square.json               golden input log + expected hash
  replay.test.ts
```

---

### Task 1: Workspace scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.nvmrc`, `.gitignore`, `packages/sim/package.json`, `packages/sim/tsconfig.json`, `packages/sim/src/index.ts`, `packages/platform/package.json`, `packages/platform/tsconfig.json`, `packages/platform/src/index.ts`
- Test: `packages/sim/test/smoke.test.ts`

**Interfaces:**
- Produces: workspace packages `@ffp/sim` and `@ffp/platform`; root scripts `pnpm test`, `pnpm lint`, `pnpm typecheck`.

- [ ] **Step 1: Write the failing test** `packages/sim/test/smoke.test.ts`:

```ts
import { SIM_HZ } from '../src/index';
test('simulation rate is 60 Hz', () => { expect(SIM_HZ).toBe(60); });
```

- [ ] **Step 2: Run** `pnpm test`. Expected: FAIL (no workspace or `SIM_HZ` missing).
- [ ] **Step 3: Create the scaffold.** Root `package.json` with `"packageManager": "pnpm@10"`, `"engines": {"node": ">=22"}`, scripts `test: vitest run`, `lint: eslint .`, `typecheck: tsc -b`. Export `export const SIM_HZ = 60;` from `packages/sim/src/index.ts`. Vitest globals enabled.
- [ ] **Step 4: Run** `pnpm install && pnpm test && pnpm typecheck && pnpm lint`. Expected: all pass.
- [ ] **Step 5: Commit** `chore: scaffold pnpm monorepo with sim and platform packages`.

### Task 2: Fixed-point maths and deterministic lint rule

**Files:**
- Create: `packages/sim/src/math/fixed.ts`, `packages/sim/test/fixed.test.ts`, `packages/sim/test/fixtures/forbidden-math.ts`
- Modify: `eslint.config.js`

**Interfaces:**
- Produces: `FX_ONE = 256`; `fx(n: number): number` (integer pixels → fx); `fxMul(a: number, b: number): number`; `fxDiv(a: number, b: number): number` (truncate toward zero; throws on `b === 0`); `ANGLE_UNITS = 4096`; `fxSin(angle: number): number`; `fxCos(angle: number): number` (return fx, angle wraps modulo 4096); `isqrt(n: number): number` (integer square root); `fxToPixels(v: number): number` (presentation only).

- [ ] **Step 1: Write failing tests:**

```ts
expect(fx(3)).toBe(768);
expect(fxMul(fx(3), fx(2))).toBe(fx(6));
expect(fxDiv(fx(7), fx(2))).toBe(896);       // 3.5 px
expect(fxDiv(fx(-7), fx(2))).toBe(-896);
expect(() => fxDiv(1, 0)).toThrow();
expect(fxSin(0)).toBe(0);
expect(fxSin(1024)).toBe(256);                // 90°
expect(fxCos(2048)).toBe(-256);               // 180°
expect(fxSin(4096 + 1024)).toBe(256);         // wraps
expect(isqrt(65536)).toBe(256);
expect(isqrt(65535)).toBe(255);
```

Plus `test('eslint rejects Math.sin in sim')`, which runs ESLint's Node API on `test/fixtures/forbidden-math.ts` (containing `Math.sin(1); Math.random();`) and expects 2 errors from `no-restricted-properties`.

- [ ] **Step 2: Run** `pnpm test`. Expected: FAIL.
- [ ] **Step 3: Implement.** The sine table is a **literal array of 1,025 integers** (quarter wave, values `round(256·sin(i·π/2048))`), generated once by a script in `tools/gen-sin-table.mjs` and committed, so the runtime never calls `Math.sin`. Add an ESLint `no-restricted-properties` rule for `Math.{sin,cos,tan,pow,exp,log,sqrt,random}` and `no-restricted-globals` for `Date` and `performance`, scoped to `packages/sim/**`.
- [ ] **Step 4: Run** `pnpm test && pnpm lint`. Expected: PASS (the fixture is excluded from the normal lint run but checked by the test).
- [ ] **Step 5: Commit** `feat(sim): integer fixed-point maths and determinism lint rule`.

### Task 3: Seeded RNG

**Files:**
- Create: `packages/sim/src/math/rng.ts`, `packages/sim/test/rng.test.ts`

**Interfaces:**
- Produces: `type RngState = [number, number, number, number]` (uint32 each); `rngFromState(s: RngState): RngState` (copy); `createRngState(seed: number): RngState` (SplitMix32 expansion); `nextU32(s: RngState): number` (mutates `s`, xoshiro128**); `nextInt(s: RngState, maxExclusive: number): number` (unbiased rejection sampling).

- [ ] **Step 1: Write failing tests:**

```ts
const s = rngFromState([1, 2, 3, 4]);
expect([nextU32(s), nextU32(s), nextU32(s), nextU32(s)]).toEqual([11520, 0, 5927040, 70819200]);
```

Also: `createRngState(42)` called twice produces identical first 100 outputs; `nextInt(s, 6)` is always within `[0, 5]` over 10,000 draws; a copied state continues the identical sequence.

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with `Math.imul` and `>>> 0` for uint32 arithmetic.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(sim): xoshiro128** seeded RNG`.

### Task 4: Canonical encoding and xxHash32

**Files:**
- Create: `packages/sim/src/state/encode.ts`, `packages/sim/src/state/hash.ts`, `packages/sim/test/hash.test.ts`

**Interfaces:**
- Produces: `class ByteWriter { i32(v: number): void; u32(v: number): void; u8(v: number): void; bytes(): Uint8Array }` (little-endian, growable); `xxh32(data: Uint8Array, seed?: number): number` (unsigned).

- [ ] **Step 1: Write failing tests:**

```ts
const enc = (s: string) => new TextEncoder().encode(s);
expect(xxh32(enc(''))).toBe(0x02cc5d05);
expect(xxh32(enc('abc'))).toBe(0x32d153ff);
expect(xxh32(Uint8Array.from({ length: 16 }, (_, i) => i))).toBe(0xb72837f4);
const w = new ByteWriter(); w.i32(-1); w.u8(7);
expect([...w.bytes()]).toEqual([255, 255, 255, 255, 7]);
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** xxHash32 per the reference algorithm (primes `0x9E3779B1, 0x85EBCA77, 0xC2B2AE3D, 0x27D4EB2F, 0x165667B1`) using `Math.imul`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(sim): canonical byte writer and xxHash32`.

### Task 5: World model, movement step and fixed-step loop

**Files:**
- Create: `packages/sim/src/world/types.ts`, `packages/sim/src/world/world.ts`, `packages/sim/src/loop/fixedStep.ts`, `packages/sim/test/world.test.ts`, `packages/sim/test/fixedStep.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces:
  - `type Facing = 1 | -1`
  - `interface Body { id: number; x: number; z: number; y: number; facing: Facing }` (fx units; `z` = stage depth, `y` = height)
  - `interface FrameInput { moveX: -1 | 0 | 1; moveZ: -1 | 0 | 1; pressed: number }` (`pressed` = bitmask of abstract actions newly pressed this frame)
  - `interface World { frame: number; rng: RngState; bodies: Body[]; bounds: { minX: number; maxX: number; minZ: number; maxZ: number } }`
  - `createWorld(seed: number): World` (one body, id 1, at `x = fx(400)`, `z = fx(800)`, facing 1; bounds `x ∈ [fx(0), fx(1920)]`, `z ∈ [fx(620), fx(1000)]`)
  - `step(world: World, inputs: FrameInput[]): void` (index = player slot)
  - `encodeWorld(world: World): Uint8Array`; `hashWorld(world: World): number`
  - `WALK_SPEED_X = 768` (3 px/frame), `WALK_SPEED_Z = 512` (2 px/frame) as candidate values
  - `createAccumulator(opts: { hz: number; maxSteps: number }): { advance(elapsedMs: number): { steps: number; alpha: number } }`

- [ ] **Step 1: Write failing tests** (`world.test.ts`):

```ts
const w = createWorld(1);
step(w, [{ moveX: 1, moveZ: 0, pressed: 0 }]);
expect(w.bodies[0]!.x).toBe(fx(400) + WALK_SPEED_X);
expect(w.frame).toBe(1);

// Diagonal is normalized: per-axis displacement is speed × 181/256 (≈ 1/√2), truncated.
const d = createWorld(1);
step(d, [{ moveX: 1, moveZ: -1, pressed: 0 }]);
expect(d.bodies[0]!.x - fx(400)).toBe(Math.trunc((WALK_SPEED_X * 181) / 256));
expect(fx(800) - d.bodies[0]!.z).toBe(Math.trunc((WALK_SPEED_Z * 181) / 256));

// Facing follows horizontal input; bounds clamp.
step(w, [{ moveX: -1, moveZ: 0, pressed: 0 }]);
expect(w.bodies[0]!.facing).toBe(-1);
const edge = createWorld(1);
for (let i = 0; i < 2000; i++) step(edge, [{ moveX: -1, moveZ: 1, pressed: 0 }]);
expect(edge.bodies[0]!.x).toBe(edge.bounds.minX);
expect(edge.bodies[0]!.z).toBe(edge.bounds.maxZ);

// Determinism: same seed + same inputs → same hash; different input → different hash.
```

`fixedStep.test.ts`:

```ts
const acc = createAccumulator({ hz: 60, maxSteps: 5 });
expect(acc.advance(1000 / 60).steps).toBe(1);
expect(acc.advance(8).steps).toBe(0);              // accumulates
expect(acc.advance(9).steps).toBe(1);
expect(acc.advance(10 * 60 * 1000).steps).toBe(5); // Review Focus 1: capped
expect(acc.advance(1000 / 60).steps).toBe(1);      // debt was dropped, not carried
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The accumulator stores the remainder in milliseconds (presentation side, not in the simulation state); after hitting `maxSteps` it resets the remainder to 0. `alpha = remainder / stepMs` for render interpolation. `encodeWorld` writes `frame`, the 4 RNG words, the body count, then each body's fields in ascending `id` order.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(sim): world model, normalized belt movement and fixed-step accumulator`.

### Task 6: Keyboard adapter with physical-key bindings

**Files:**
- Create: `packages/platform/src/input/actions.ts`, `packages/platform/src/input/keyboard.ts`, `packages/platform/test/keyboard.test.ts`

**Interfaces:**
- Consumes: `FrameInput` from `@ffp/sim`.
- Produces:
  - `enum Action { Attack = 1, Jump = 2, Special = 4, Guard = 8, Ultimate = 16, Interact = 32, TeamAttack = 64 }`
  - `type Bindings = { up: string; down: string; left: string; right: string } & Record<keyof typeof Action, string>`
  - `DEFAULT_KEYBOARD_P1: Bindings` (codes from Global Constraints)
  - `class KeyboardState { constructor(b: Bindings); keyDown(code: string): void; keyUp(code: string): void; blur(): void; sample(): FrameInput }`. `sample()` returns the current directions and clears the newly-pressed bitmask. Auto-repeat `keyDown` events for an already-held key are ignored.

- [ ] **Step 1: Write failing tests:**

```ts
const k = new KeyboardState(DEFAULT_KEYBOARD_P1);
k.keyDown('KeyA'); k.keyDown('KeyD');
expect(k.sample().moveX).toBe(1);        // Review Focus 2: most recent wins
k.keyUp('KeyD');
expect(k.sample().moveX).toBe(-1);       // falls back to the held key
k.keyDown('KeyW');
expect(k.sample().moveZ).toBe(-1);       // up = toward the back of the stage
k.blur();
expect(k.sample()).toEqual({ moveX: 0, moveZ: 0, pressed: 0 }); // Review Focus 3

const g = new KeyboardState(DEFAULT_KEYBOARD_P1);
g.keyDown('KeyY');                        // German printed "Z" (Review Focus 4)
expect(g.sample().pressed & Action.Jump).toBeTruthy();
expect(g.sample().pressed).toBe(0);       // pressed is edge-triggered
g.keyDown('KeyY');                        // auto-repeat while held
expect(g.sample().pressed).toBe(0);
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with a per-axis press-order stack.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(platform): keyboard adapter with physical-key defaults`.

### Task 7: Golden replay test

**Files:**
- Create: `packages/sim/src/replay.ts`, `tests/replays/walk-square.json`, `tests/replays/replay.test.ts`

**Interfaces:**
- Produces: `interface ReplayLog { version: 1; seed: number; frames: FrameInput[][] }`; `runReplay(log: ReplayLog): number` (final `hashWorld`).

- [ ] **Step 1: Write the failing test.** `walk-square.json` holds 240 frames: 60 right, 60 up, 60 left, 60 down for player 0, with `expectedHash` filled in from the first run of Step 3. The test asserts `runReplay(log) === log.expectedHash`. It also asserts that running the same log through `createAccumulator` with simulated render intervals of 1000/144 ms and 1000/30 ms reaches the same hash once 240 steps have run (Review Focus 5).
- [ ] **Step 2: Run.** Expected: FAIL (`runReplay` is missing).
- [ ] **Step 3: Implement `runReplay`**, run it once, write the resulting hash into the JSON as `expectedHash`, and record that value in the commit message.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `test: golden replay for belt movement`.

### Task 8: Phaser greybox client with Lab overlay and favicon

**Files:**
- Create: `apps/game/package.json`, `apps/game/index.html`, `apps/game/vite.config.ts`, `apps/game/public/favicon.svg`, `apps/game/src/main.ts`, `apps/game/src/scenes/StageScene.ts`, `apps/game/src/ui/LabOverlay.tsx`, `apps/game/src/debug.ts`, `apps/game/playwright.config.ts`, `apps/game/e2e/smoke.spec.ts`
- Modify: root `package.json` (scripts `dev`, `build`, `preview`, `e2e`)

**Interfaces:**
- Consumes: `createWorld`, `step`, `hashWorld`, `createAccumulator` (`@ffp/sim`); `KeyboardState`, `DEFAULT_KEYBOARD_P1` (`@ffp/platform`); `fxToPixels`.
- Produces: `window.__ffp = { frame(): number; body(id: number): { x: number; z: number } | undefined; hash(): number }` (present in dev and e2e builds only).

- [ ] **Step 1: Write the failing e2e test** `smoke.spec.ts`:

```ts
test('greybox body moves right while D is held', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await page.waitForFunction(() => window.__ffp?.frame() > 10);
  const x0 = await page.evaluate(() => window.__ffp.body(1)!.x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  const x1 = await page.evaluate(() => window.__ffp.body(1)!.x);
  expect(x1).toBeGreaterThan(x0);
  await expect(page.getByTestId('lab-frame')).toBeVisible();
  await expect(page.getByTestId('lab-hash')).toHaveText(/^[0-9a-f]{8}$/);
  await page.screenshot({ path: 'test-results/m0-greybox.png' });
});
```

- [ ] **Step 2: Run** `pnpm e2e`. Expected: FAIL.
- [ ] **Step 3: Implement.** Phaser `Scale.FIT` at 1920×1080 with letterboxing. The floor band covers z ∈ [620, 1000] px. Each body is drawn as a 90×300 rectangle anchored bottom-centre at `(x, z − y)`, sorted by `z`, with a facing notch. The render position interpolates between the previous and current snapshot using `alpha`. The loop runs in `requestAnimationFrame` and steps the simulation via the accumulator. Window `blur` and `visibilitychange` call `KeyboardState.blur()`. The overlay (`data-testid` `lab-frame`, `lab-hash`, `lab-fps`, `lab-input`) is a Preact component toggled with `F1`. `index.html` links `/favicon.svg`, and the copy in `public/` is byte-identical to the repo root `favicon.svg`.
- [ ] **Step 4: Run** `pnpm e2e && pnpm build`. Expected: PASS; the screenshot exists.
- [ ] **Step 5: Commit** `feat(game): Phaser greybox stage with Lab overlay`.

### Task 9: CI with cross-browser determinism and screenshots, plus README

**Files:**
- Create: `.github/workflows/ci.yml`, `apps/game/e2e/determinism.spec.ts`, `README.md`

**Interfaces:**
- Consumes: `runReplay` (exposed in the dev build as `window.__ffp.runReplay(log)`), `walk-square.json`.

- [ ] **Step 1: Write the failing test** `determinism.spec.ts`: load the page, call `window.__ffp.runReplay(log)` with the golden log, and expect it to equal `log.expectedHash`. Playwright config projects: `chromium` (always), plus `firefox` and `webkit` when `CI=true`.
- [ ] **Step 2: Run** `pnpm e2e`. Expected: FAIL (`runReplay` is not exposed).
- [ ] **Step 3: Implement.** Expose `runReplay` in `debug.ts`. The CI workflow runs on push and PR with Node 22 and pnpm 10, in this order: `pnpm install --frozen-lockfile`, `typecheck`, `lint`, `test`, `npx playwright install --with-deps`, `e2e`, then uploads `test-results/**/*.png` as an artifact. The README covers installing Node.js 22 LTS on Windows (`winget install OpenJS.NodeJS.LTS`), `corepack enable`, `pnpm install`, `pnpm dev`, and opening `http://localhost:5173`, then lists the M0 test checklist.
- [ ] **Step 4: Run** `pnpm e2e` locally (Chromium). Expected: PASS. Then push and confirm CI is green on all three browsers.
- [ ] **Step 5: Commit** `ci: cross-browser determinism and screenshot artifacts`.

## M0 creator test checklist (posted with the PR)

1. `pnpm dev`, open `http://localhost:5173`: the tab shows your favicon, and a grey floor band shows one box.
2. W/A/S/D move the box. Diagonals are not faster than straight lines, and the box stops at the stage edges.
3. On a German keyboard nothing changes for movement. (Jump has no visible effect until M1.)
4. Press F1: the overlay shows a climbing frame counter, an 8-character state hash and the frame rate.
5. Switch to another tab for a minute and come back: the box has not drifted and keys are not stuck.

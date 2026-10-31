# Fight For Peace

A belt-scrolling brawler for the browser. This repository holds the game code and its design documents (`docs/`, plus the specifications in the repository root).

## Run it on Windows

You need **Node.js 24** and **pnpm 10** (both are already installed on the creator's machine).

1. Open PowerShell in this folder.
2. Install dependencies (first time, and whenever `pnpm-lock.yaml` changes):

   ```powershell
   pnpm install
   ```

3. Start the game:

   ```powershell
   pnpm dev
   ```

4. Open the address Vite prints, normally `http://localhost:5173`. If that port is busy, Vite picks the next free one and prints it.

Stop the server with `Ctrl+C`.

If `node --version` shows something older than 24, install Node.js 24 LTS from nodejs.org. If `pnpm` is missing, run `corepack enable` once in an administrator PowerShell.

## Controls (M1)

Keys are physical positions, so they stay in the same place on QWERTZ and AZERTY keyboards. The screen always shows the character printed on your key (for example Jump is `Z` on a German keyboard, `Y` on a US one), and a gamepad shows its own buttons.

| Action | Player 1 keyboard | Player 2 split keyboard (numpad) | Player 2 laptop preset | Gamepad |
| --- | --- | --- | --- | --- |
| Move (8 directions) | W A S D | Arrow keys | Arrow keys | Left stick or d-pad |
| Dash | double-tap a direction | double-tap a direction | double-tap a direction | double-tap, or LT / L2 |
| Jump | Z on QWERTZ (Y on QWERTY) | Num 5 | O | A / ✕ |
| Attack (M1: attack pose only) | T | Num 4 | I | X / □ |
| Special | U | Num 6 | P | Y / △ |
| Guard | G | Num 1 | K | RB / R1 |
| Ultimate | H | Num 2 | L | RT / R2 |
| Grab / Interact | J | Num 3 | ; (Ö on QWERTZ) | B / ○ |
| Team Attack | B | Num 0 | . | LB / L1 |
| Pause | Esc | — | — | Start / Options |

Special, Guard, Ultimate, Grab and Team Attack have no visible effect yet (M2 onwards).

**Joining and devices.** Player 1 plays alone on the keyboard or on any gamepad: the device you touch last takes over. Player 2 joins by pressing Num 4 (Attack) on the split keyboard, or Start on a second gamepad. Once two players are in, a newly plugged-in gamepad does not take over anybody. Unplugging a player's gamepad pauses the game until it is plugged back in, or until that player presses Attack on another device.

**Lab keys.**

| Key | What it does |
| --- | --- |
| F1 | Show or hide the Lab panels (frame, hash, per-player device, state, speed, buffered action, input history, held keys) |
| F2 | Lab settings: facing mode per player (Manual / Assisted), button prompt style, keyboard layout, Player 2 keyboard preset, rebind Player 1 Attack |
| F3 | Show collision footprints (green; red while the anti-trap rule lets a pinned hero pass through) |
| F4 | Training dummies walk towards the nearest hero |

## Developer commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build into `apps/game/dist` |
| `pnpm test` | Unit tests and golden replay tests (Vitest) |
| `pnpm e2e` | Browser tests (Playwright; Chromium locally, Chromium + Firefox + WebKit in CI) |
| `pnpm typecheck` | TypeScript, strict |
| `pnpm lint` | ESLint, including the simulation determinism rules |

The first `pnpm e2e` on a new machine needs the browsers: `pnpm --filter @ffp/game exec playwright install chromium`.

## Layout

| Path | Contents |
| --- | --- |
| `packages/sim` | Deterministic 60 Hz simulation: integer fixed-point maths (1/256 px), seeded RNG, canonical state encoding and xxHash32, world update, replays. No browser APIs, no floating-point trigonometry, no `Math.random` or `Date` (enforced by ESLint). |
| `packages/platform` | Input layer: keyboard (two binding sets for split keyboard), gamepads (standard mapping, dead zone, pad family), player-to-device assignment, layout-aware key labels and the `PromptResolver` that turns an abstract action into the key or button a player has to press. |
| `apps/game` | Vite + Phaser + Preact client. It only renders snapshots of the simulation. Player-facing text lives in `src/text/` and uses `{action:…}` tokens, never key letters (checked by `tests/lint/prompt-text.test.ts`). |
| `tests/replays` | Golden replays. Each records an input log and the expected final state hash. `scripts.ts` holds the input scripts; `RECORD=1 pnpm vitest run tests/replays/record.test.ts` re-records them. |

When a change alters simulation results on purpose, bump `RULES_VERSION` in `packages/sim/src/replay.ts` and re-record the golden replays in the same commit (see above). A replay recorded under another rules version fails loudly instead of silently producing a different hash.

## M1 test checklist

1. Walk with W/A/S/D: unchanged from M0. Diagonals are not faster.
2. Double-tap D: a short dash to the right. Also try A, W, S, and holding W while double-tapping D (diagonal). Tapping D, A, D quickly does not dash.
3. Press Jump (the key printed `Z` on a German keyboard): a neutral jump. Hold D and jump: you travel right. Holding A in the air only slows you down; it cannot turn the jump around.
4. Press T: a short attack pose (yellow arm). Press T again, or Jump, just before it ends: the next action comes out without a gap. Dash, then press T and G together (within 3 frames, either order): the low attack, where the hero crouches and a cyan sweep runs along the floor.
5. Walk into a grey dummy: you slide around it, and walking straight in pushes it slowly. F4 makes the dummies chase you; you can always walk out.
6. Press Num 4: Player 2 joins and walks with the arrow keys. Walk through each other: you separate gently.
7. Plug in a gamepad while playing alone and press A: it controls Player 1 at once, and the hints at the bottom show its buttons.
8. With two players joined, unplug Player 2's gamepad: the game pauses and asks for the controller. Plug it back in to continue.
9. F2: switch the keyboard layout to QWERTY and see Jump become `Y`; rebind Attack to K and see the hint change; switch Facing to Assisted and attack next to a dummy without holding a direction.

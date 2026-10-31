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

## Controls (Player 1, M0)

Keys are physical positions, so they stay in the same place on QWERTZ and AZERTY keyboards.

| Key | Action |
| --- | --- |
| W / S | Move up / down (stage depth) |
| A / D | Move left / right |
| T, Y, U, G, H, J, B | Attack, Jump, Special, Guard, Ultimate, Grab/Interact, Team attack (no visible effect until M1) |
| F1 | Show or hide the Lab overlay |

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
| `packages/platform` | Keyboard adapter: physical key codes → abstract actions, with bindings stored as data. |
| `apps/game` | Vite + Phaser + Preact client. It only renders snapshots of the simulation. |
| `tests/replays` | Golden replays. Each records an input log and the expected final state hash. |

When a change alters simulation results on purpose, bump `RULES_VERSION` in `packages/sim/src/replay.ts` and re-record the golden replays in the same commit. A replay recorded under another rules version fails loudly instead of silently producing a different hash.

## M0 test checklist

1. Run `pnpm dev` and open the printed address. The tab shows your favicon and the title "Fight For Peace", and a grey floor band shows one box with a red notch on the side it faces.
2. W/A/S/D move the box. Diagonals are not faster than straight lines, and the box stops at the stage edges. Holding A and D together moves towards whichever you pressed last.
3. On a German keyboard nothing changes for movement. (Jump has no visible effect until M1.)
4. The Lab overlay in the top-left corner shows a climbing frame counter, an 8-character state hash, the frame rate and your recent inputs. F1 hides and shows it.
5. Switch to another tab for a minute and come back: the box has not drifted and keys are not stuck.

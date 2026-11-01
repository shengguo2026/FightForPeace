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

## Controls (M2)

Keys are physical positions, so they stay in the same place on QWERTZ and AZERTY keyboards. The screen always shows the character printed on your key (for example Jump is `Z` on a German keyboard, `Y` on a US one), and a gamepad shows its own buttons.

| Action | Player 1 keyboard | Player 2 split keyboard (numpad) | Player 2 laptop preset | Gamepad |
| --- | --- | --- | --- | --- |
| Move (8 directions) | W A S D | Arrow keys | Arrow keys | Left stick or d-pad |
| Dash | double-tap a direction | double-tap a direction | double-tap a direction | double-tap, or LT / L2 |
| Jump | Z on QWERTZ (Y on QWERTY) | Num 5 | O | A / ✕ |
| Attack (with a direction for the hero's directional moves) | T | Num 4 | I | X / □ |
| Special | U | Num 6 | P | Y / △ |
| Guard | G | Num 1 | K | RB / R1 |
| Ultimate | H | Num 2 | L | RT / R2 |
| Grab / Interact | J | Num 3 | ; (Ö on QWERTZ) | B / ○ |
| Team Attack | B | Num 0 | . | LB / L1 |
| Pause | Esc | — | — | Start / Options |

Guard is only used in the dash low-attack chord so far (defense arrives in M4). Special and Ultimate show a placeholder pose (M5). Grab and Team Attack have no effect yet.

**Heroes.** Player 1 is the Mountain Guardian (blue, wide), Player 2 the River Scout (orange, slim); the Lab settings (F2) switch either one. Each has 15 normal attacks: a three-hit neutral string (Attack, Attack, Attack), Forward/Backward/Up/Down + Attack routes, aerial attacks (jump, then Attack with or without a direction), a dash attack (dash, then Attack) and a low attack (dash, then Attack + Guard together, or the optional Low Attack binding). Forward and Backward count from the way the hero is facing when you press Attack: holding the opposite direction performs the Backward move, it does not turn you around. F5 lists every move with its input, frame data and combo links.

**Joining and devices.** Player 1 plays alone on the keyboard or on any gamepad: the device you touch last takes over. Player 2 joins by pressing Num 4 (Attack) on the split keyboard, or Start on a second gamepad. Once two players are in, a newly plugged-in gamepad does not take over anybody. Unplugging a player's gamepad pauses the game until it is plugged back in, or until that player presses Attack on another device.

**Lab keys.**

| Key | What it does |
| --- | --- |
| F1 | Show or hide the Lab panels (frame, hash, per-player device, state, speed, buffered action, input history, held keys) |
| F2 | Lab settings: facing mode per player (Manual / Assisted), button prompt style, keyboard layout, Player 2 keyboard preset, rebind Player 1 Attack |
| F3 | Hitboxes (red, only on active frames), hurtboxes (blue) and collision footprints (green; red while a hero passes through enemies) |
| F4 | Training dummies walk towards the nearest hero |
| F5 | Move list for each joined hero: input, startup/active/recovery frames, damage, combo links and their conditions |
| F6 | Slow motion (a quarter speed; the simulation itself is unchanged) |

The Lab also shows, per player, the hero, the current move and its phase, the last combo-link verdict (and the reason a press was rejected), the attack meter and the dash bridge; and for the last dummy hit: health, hits, damage, damage scale, hit-stun budget, meter-gain budget, juggle budget (enforced from M3), dash bridge and ground tag. F2 adds hero selection, infinite attack meter, counter-hit dummies and health refill.

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
| `packages/data` | Hero action data: one YAML file per hero in `heroes/`, a TypeBox schema and a generator. `pnpm gen:heroes` validates the YAML and writes `packages/sim/src/combat/heroes.gen.ts` (committed; a test fails if it is out of date). A new hero is a new YAML file, not new code. |
| `tests/replays` | Golden replays. Each records an input log and the expected final state hash. `scripts.ts` holds the input scripts; `RECORD=1 pnpm vitest run tests/replays/record.test.ts` re-records them. |

When a change alters simulation results on purpose, bump `RULES_VERSION` in `packages/sim/src/replay.ts` and re-record the golden replays in the same commit (see above). A replay recorded under another rules version fails loudly instead of silently producing a different hash.

## M2 test checklist

1. Walk up to Dummy 1 and press T three times: three hits (Mason's Touch, Brace Elbow, Gatepost Hammer); the third knocks the dummy back. The target panel at the top right shows 3 hits and the damage.
2. Try each direction + T as the first hit: D + T advances (Stone Shoulder), A + T retreats while still facing right (Anchor Hook), W + T launches (High Bank Lift), S + T knocks down (Low Bank Sweep). F5 lists every route.
3. W + T on the dummy, then Jump right after the hit, then T in the air, then D + T: the launcher, jump chase and aerial follow-ups.
4. Jump anywhere and press T, D + T, A + T, W + T and S + T in the air: every aerial attack uses the tucked body with the **magenta strike angled down**, never the yellow arm of standing attacks or the cyan floor sweep of the low attack.
5. Dash (double-tap D), then T: the dash attack. Dash, then T and G together: the low attack (crouch + cyan sweep). F2, "Counter-hit dummies": the low attack now trips the dummy, and it shows "ground window (M3)".
6. F2, "Infinite attack meter". Do the three-hit string, then double-tap D right after the third hit: the premium dash bridge (25 % meter), then T for the dash attack. The target panel shows "dash bridge used".
7. F3: red hitboxes appear only on active frames; F6 slows everything down to see them. During the low attack the blue hurtbox is lower.
8. Press T at the wrong moment inside a string (too early, after a miss, or a direction with no link): the Player 1 panel names the reason.
9. F2: switch Player 1 to the River Scout and repeat 1–5; its moves are faster and lighter (Reed Tap, Turning Current, Open Channel Kick).
10. Press Num 4 to join Player 2 and attack the same dummy together: one shared hit counter and damage scale.

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

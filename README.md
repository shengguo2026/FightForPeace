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

## Controls (M4)

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

Guard (hold) blocks in the direction you face; Guard + Ultimate is the Combo Breaker (see Defense below). Special and Ultimate on their own show a placeholder pose (M5). Grab and Team Attack have no effect yet.

**Heroes.** Player 1 is the Mountain Guardian (blue, wide), Player 2 the River Scout (orange, slim); the Lab settings (F2) switch either one. Each has 15 normal attacks: a three-hit neutral string (Attack, Attack, Attack), Forward/Backward/Up/Down + Attack routes, aerial attacks (jump, then Attack with or without a direction), a dash attack (dash, then Attack) and a low attack (dash, then Attack + Guard together, or the optional Low Attack binding). Forward and Backward count from the way the hero is facing when you press Attack: holding the opposite direction performs the Backward move, it does not turn you around. F5 lists every move with its input, frame data and combo links.

**Aerial and ground combat (M3).** Launches and juggles spend the dummy's juggle budget; as it runs low, hits lift less, and when it runs out the dummy drifts down and lands protected. Each combo allows one wall rebound (Gatepost Hammer, Open Channel Kick or Current Chase into a stage edge) and one ground bounce (Stonefall Knee). A knockdown that opens a ground window (Low Bank Sweep, or a low attack's counter-trip) marks the downed dummy with "▼ ground window"; standing close and facing it puts a green ring under it, and then Attack and Forward/Backward + Attack use your hero's ground moves: one extension (Settling Palm, Skipping Current), then one finisher (Lockgate Press, Foundation Rise, Rising Eddy). A dummy in protected recovery is drawn translucent and cannot be hit. A plain jump now lands with 4 frames of landing recovery.

**Defense (M4).** Hold Guard to block attacks from the front (a 150° arc); a held guard drains the Defense meter (the bar above your hero) and takes 20 % chip damage. The meter refills after 1.5 s without defending. If it runs out while you block, you suffer a **Guard Crush** (a long stagger). **Exact Block**: press Guard at most 4 frames before the hit lands (a 5-frame window): no damage, no meter loss, +15 Defense, and the attacker staggers. **Predictive Counter**: press a direction towards the attacker and Guard together (either order, within 3 frames) at most 2 frames before contact (a 3-frame window): your hero dodges and answers with a counter move (Bedrock Return for the Mountain Guardian, Eddy Return for the River Scout). A counter that meets nothing leaves you open for a moment. **Combo Breaker**: Guard + Ultimate while you are being hit, juggled or lying in a ground window: costs 75 % Defense, pushes enemies within 260 px away and protects you for half a second; once per combo. Pressing too early, too late or against the wrong attack is explained in the F8 panel in frames.

**Training enemy.** The dummies use a training kit: Straight Jab (counterable), Overhead Club (guard pressure: drains Defense fast), Piercing Thrust (goes through a held guard: Exact Block it), Two-Step (two hits), Pummel Barrage (five hits, practise the Combo Breaker) and Bell Hammer (unblockable: move away). The attack's name and profile appear above the dummy when it starts. F2 sets which dummies attack, which attack (or cycle through all), how many frames between attacks (40 / 70 / 100) and whether they walk into range.

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
| F8 | Defense panel: per player the Defense meter, guard state, counts (exact, counter, guard, early, late, hit, crush, breaker) and a log of the last defensive results with timing in frames; below it the training enemy's attacks with their frame data and profile |
| F7 | Academy recipes (spec §8.3) for each joined hero, ticked off step by step on the dummy you are hitting, with a "performed" count and a **Practise** button that puts your hero in front of Dummy 1 (and turns on counter-hit dummies when the recipe needs them) |

The Lab also shows, per player, the hero, the current move and its phase, the last combo-link verdict (and the reason a press was rejected), the attack meter and the dash bridge; and for the last dummy hit: health, hits, damage, damage scale, hit-stun budget, meter-gain budget, juggle budget and lift band, wall rebound and ground bounce, dash bridge, knockdown tag, ground route (window frames, extension, finisher), recovery (protected, and why the combo ended) and the route of moves that connected. F2 adds hero selection, infinite attack meter, infinite Defense meter, the training enemy settings, counter-hit dummies, health refill and "Dummy 1 to the wall".

## Portable build (no installation)

`pnpm release` builds the game and packs it into `release/FightForPeace-<version>.zip`. To play it on any Windows PC:

1. Unzip the file anywhere (a folder with spaces in its name is fine).
2. Double-click `start.bat`. The game opens in your default browser at `http://localhost:6006` (or the next free port up to 6105).
3. Keep the black window open while you play; close it to stop the game.

If Node.js 24 is not installed, the first start downloads a pinned Node.js 24 into the `runtime` folder next to `start.bat` and checks its SHA-256 checksum (internet needed once). Starting again while the game runs just opens the browser on the running copy. Problems are written to `logs/server.log`. On macOS or Linux run `./start.sh` instead.

## Developer commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build into `apps/game/dist` |
| `pnpm release` | Production build packed as the portable zip in `release/` |
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

## M4 test checklist

Press F8 for the Defense panel if it is hidden. By default Dummy 1 walks up and throws a Straight Jab every 70 frames.

1. Hold G: the jab is guarded ("Guarded Straight Jab (guard held)"), you take a little chip damage and the Defense bar shrinks. Let go and wait: after about 1.5 s the bar refills.
2. Tap G just as the jab lands: "Exact Block ✓ … pressed N f before contact (window 5 f)", no damage, the dummy staggers back. Tap a little earlier: "too early for Exact Block". Tap after the hit: "Too late … after the contact".
3. Press D + G together (towards the dummy) just before the jab lands: "Counter ✓", your hero performs Bedrock Return and hits the dummy. Press it far too early: "Counter ✗ no contact inside the 3 f window" and a short vulnerable pause.
4. F2, Attack: Overhead Club. Hold G through several clubs: the bar empties and "GUARD CRUSH" shows, with a long stagger.
5. F2, Attack: Piercing Thrust. Holding G does not stop it ("pierces a held guard"), an Exact Block tap does.
6. F2, Attack: Bell Hammer. Guard does nothing ("unblockable: move away"); dash away when "Bell Hammer · UNBLOCKABLE" appears above the dummy.
7. F2, Attack: Pummel Barrage. Let the first hits land, then press G + H: "Combo Breaker ✓ 75 % Defense spent", the dummy is pushed away and you flash protected. Press it again in the same combo, or with less than 75 % Defense: "Combo Breaker ✗" with the reason.
8. Hold A + G so your guard faces away from the dummy: the jab hits you ("came from outside the guard arc").
9. F2: "all dummies" makes both dummies attack, "none" stops them; "Frames between attacks" changes the rhythm; untick "Walk into range" and they only attack when you come close. F2 "Infinite Defense meter" keeps the bar full.
10. Switch Player 1 to the River Scout (F2) and repeat step 3: the counter is Eddy Return.
11. Portable build: run `pnpm release`, unzip `release\FightForPeace-0.4.0.zip` somewhere else, double-click `start.bat`: the game opens in the browser and plays the same as `pnpm dev`. Double-click `start.bat` again: it says the game is already running and opens the same page.

## M3 test checklist

1. Press F7: the Academy recipes for the Mountain Guardian. Press **Practise** next to "Foundation" and press T three times: every step gets a tick and "performed" becomes 1.
2. **Practise** "Aerial conversion": W + T (High Bank Lift), Jump right after the hit, T in the air (Rafter Palm), then D + T (Stonefall Knee). The dummy bounces off the floor once (target panel: "ground bounce used") and then lies down translucent: protected get-up. Juggle budget in the target panel drops (100 → 70 → 60 → 35 → 20).
3. **Practise** "Low to ground" (this turns on counter-hit dummies): double-tap D, then T + G together (Faultline Reap). The dummy trips and shows "▼ ground window"; a green ring appears under it while you face it. Press T (Settling Palm), then D + T (Lockgate Press, three hits) or A + T (Foundation Rise, a relaunch). The panel shows "ground route … extension used · finisher used".
4. In the ground window, press T twice: the second press is rejected with "ground route already used" (Player 1 panel). Walk away or turn around: the ring disappears and T is Mason's Touch again. Let the window run out: "ground window missed", the dummy gets up protected.
5. Mason's Touch → S + T (Low Bank Sweep) also opens a ground window, without counter-hit dummies.
6. F2, "Dummy 1 to the wall", then T three times: Gatepost Hammer slams the dummy into the stage edge and it rebounds into the air ("wall rebound used"). Repeat the string in the same combo: no second rebound.
7. F2: switch Player 1 to the River Scout and do its three recipes the same way (Reed Tap string; W + T, Jump, T, D + T; dash, T + G, T, D + T for Rising Eddy, which switches sides).
8. Join Player 2 (Num 4). Player 1 launches the dummy with W + T, Player 2 jumps (Num 5) and hits it (Num 4): the juggle budget keeps falling in one shared combo (it never resets when the other player hits); if it reaches 0, the dummy recovers in the air and lands protected.
9. Jump on the spot: a short landing pause after touching down. Attack pressed during that pause comes out right after it.

## M2 test checklist

1. Walk up to Dummy 1 and press T three times: three hits (Mason's Touch, Brace Elbow, Gatepost Hammer); the third knocks the dummy back. The target panel at the top right shows 3 hits and the damage.
2. Try each direction + T as the first hit: D + T advances (Stone Shoulder), A + T retreats while still facing right (Anchor Hook), W + T launches (High Bank Lift), S + T knocks down (Low Bank Sweep). F5 lists every route.
3. W + T on the dummy, then Jump right after the hit, then T in the air, then D + T: the launcher, jump chase and aerial follow-ups.
4. Jump anywhere and press T, D + T, A + T, W + T and S + T in the air: every aerial attack uses the tucked body with the **magenta strike angled down**, never the yellow arm of standing attacks or the cyan floor sweep of the low attack.
5. Dash (double-tap D), then T: the dash attack. Dash, then T and G together: the low attack (crouch + cyan sweep). F2, "Counter-hit dummies": the low attack now trips the dummy, and it shows "▼ ground window".
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

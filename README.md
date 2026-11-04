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

## Controls (M7)

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

Guard (hold) blocks in the direction you face; Guard + Ultimate is the Combo Breaker (see Defense below). Special and Ultimate (with or without a direction) fire the moves in your loadout; Grab / Interact grabs. Team Attack has no effect yet.

**Heroes.** Player 1 is the Mountain Guardian (blue, wide), Player 2 the River Scout (orange, slim); the Lab settings (F2) switch either one. Each has 15 normal attacks: a three-hit neutral string (Attack, Attack, Attack), Forward/Backward/Up/Down + Attack routes, aerial attacks (jump, then Attack with or without a direction), a dash attack (dash, then Attack) and a low attack (dash, then Attack + Guard together, or the optional Low Attack binding). Forward and Backward count from the way the hero is facing when you press Attack: holding the opposite direction performs the Backward move, it does not turn you around. F5 lists every move with its input, frame data and combo links.

**Aerial and ground combat (M3).** Launches and juggles spend the dummy's juggle budget; as it runs low, hits lift less, and when it runs out the dummy drifts down and lands protected. Each combo allows one wall rebound (Gatepost Hammer, Open Channel Kick or Current Chase into a stage edge) and one ground bounce (Stonefall Knee). A knockdown that opens a ground window (Low Bank Sweep, or a low attack's counter-trip) marks the downed dummy with "▼ ground window"; standing close and facing it puts a green ring under it, and then Attack and Forward/Backward + Attack use your hero's ground moves: one extension (Settling Palm, Skipping Current), then one finisher (Lockgate Press, Foundation Rise, Rising Eddy). A dummy in protected recovery is drawn translucent and cannot be hit. A plain jump now lands with 4 frames of landing recovery.

**Defense (M4).** Hold Guard to block attacks from the front (a 150° arc); a held guard drains the Defense meter (the bar above your hero) and takes 20 % chip damage. The meter refills after 1.5 s without defending. If it runs out while you block, you suffer a **Guard Crush** (a long stagger). **Exact Block**: press Guard at most 4 frames before the hit lands (a 5-frame window): no damage, no meter loss, +15 Defense, and the attacker staggers. **Predictive Counter**: press a direction towards the attacker and Guard together (either order, within 3 frames) at most 2 frames before contact (a 3-frame window): your hero dodges and answers with a counter move (Bedrock Return for the Mountain Guardian, Eddy Return for the River Scout). A counter that meets nothing leaves you open for a moment. **Combo Breaker**: Guard + Ultimate while you are being hit, juggled or lying in a ground window: costs 75 % Defense, pushes enemies within 260 px away and protects you for half a second; once per combo. Pressing too early, too late or against the wrong attack is explained in the F8 panel in frames.

**Specials, Ultimates and the attack meter (M5).** Special plus a direction (neutral, Forward, Backward, Up, Down) fires the Special in that loadout slot; Ultimate plus a direction fires an Ultimate and needs a full attack meter (the orange bar under the Defense bar; "ULTIMATE READY" shows when it is full), which it spends completely. Landing hits fills the meter by each move's authored amount; within one combo the gain drops in bands (100 %, 60 %, 25 %, 0 %) as the combo's meter-gain budget runs down, a guarded hit earns a quarter, and Ultimates earn nothing. Mountain Guardian: Stonewake Palm (neutral, wall rebound), Gatebreaker Advance (Forward, armored: absorbs a hit without flinching, "ARMOR"), Rising Rampart (Backward, briefly invulnerable launcher) and the Ultimate Rivergate Oath. River Scout: Current Crescent (neutral, a projectile; a new one replaces the old), Gale Wheel (Forward, multi-hit), Ebbstep Return (Backward, evasive) and the Ultimate Tempest Crossing. The Up and Down slots start empty: an empty slot does nothing (it never falls back to another move). F2 → Loadout fills them from the catalogue (Skybreak Column, Waterspout Rise, the catalogue Ultimates Still Mountain and Floodline Passage); the neutral slots hold the fixed signature moves.

**Grabs (M5).** Grab / Interact grabs the nearest enemy in front of you (with a direction, the enemy in that direction; your hero turns to it). While you hold, the bottom of the screen shows your options: Attack for one extension and then Attack again for the release strike, Interact to throw forward, Backward + Interact to throw behind you, or Special for the grab finisher. Choose within 45 frames or your hero shoves the enemy away. A thrown enemy flies as a body projectile and hits other enemies it crosses (never your partner). Grabbing nobody leaves you open for a moment; if both heroes grab the same enemy on the same frame, one gets it and the other recovers quickly. A hit on your hero while you hold breaks the grab.

**Grab escape (M5).** The training enemy has two grabs: Collar Grab and Rope Snare. When it holds you, "GRABBED" shows over your hero; press Guard while "ESCAPE!" shows (an 11-frame window) to break free with no damage. You get one attempt per grab: pressing too early or too late fails and the throw lands. Rope Snare restrains you instead ("RESTRAINED" with a countdown): wait it out, or let Player 2 stand next to you and press Interact to free you. Player 2 can also break any enemy grab by hitting the grabber. F9 shows the hold, the escape window and every grab outcome in frames.

**Weapons (M6).** The Lab is a working mill corner with two weapons on the floor: the Canal Workstaff (two-handed) and the Iron Gate Handwheel (one-handed). Walking over a weapon never takes it: press Interact (the Grab key) next to it to pick it up. With the staff, Attack and its directions use the staff's own moves (thrust, sweep, overhead, lunge, hook that pulls the target in, rising launch, low sweep, air swing, ground strike, dash strike); each founder has one affinity move on Forward + Attack (Mountain: Weir Brace, armored; River: Vault Kick, passes through and switches sides). Two hands on the staff lock your Specials and Ultimates. The Handwheel keeps your normal moves and Specials. Interact while holding throws the weapon; Down + Interact drops it at your feet. Weapons wear down with use (the bar and the word over your hero: Ready, Worn, Critical) and break after the move that empties them, never in the middle of it. A thrown weapon can be guarded, deflected with an Exact Block, struck aside by the staff's sweep, and a Handwheel can be sent back with a Counter. Some hits knock a weapon out of the holder's hands ("DISARMED"); the holder gets 45 frames, from the moment it lands, to take it back before anyone else may (a green ring under it). Two weapon swings that meet clash ("CLASH"): equal strength, both recoil; otherwise the stronger one goes through.

**Scenery (M6).** The stone pillar on the right is an impact surface: a strong hit (the staff overhead, Weir Brace, a knockback) that drives a dummy into it deals one extra environmental impact per combo ("IMPACT"), then the dummy rebounds or drops. The sluice boards on the left break in stages (loosened, critical, broken) under weapon strikes and thrown weapons; when they break, one timber board falls out and can be picked up as a weapon. The mill cog at the bottom right is an active hazard: its floor zone glows amber as a warning, then red while it turns; it hits anyone standing there (heroes and enemies), a Guard facing it blocks it, and after a hit there is no second cog hit for two seconds. Weapons never land inside scenery: a landing spot inside the pillar or the boards moves to the nearest free spot.

**Art (M6).** The founders, the training dummies (the Pressed Recruit), the two weapons and the mill scenery are now drawn with their real sprite sheets; moves without a sheet of their own use a shared pose. F3 still shows the boxes on top.

**Arena mode (M7).** The Lab's **Arena** panel picks an arena and a difficulty (Easy, Medium, Hard) and starts it; **Restart** (or the Home key) starts it again, **Back to Lab** (or End) returns to the training room. Press F1 after starting to hide the Lab panels. Each arena is drawn on a Stage 1 area (fields, bridge, mill, canal, courtyard) with parallax layers, and the camera follows you across it; the Sluice Commander fights on the Sluice plate. Arenas: one trial per enemy type (Pressed Recruits, Bridge Shield, Canal Runners, Rope Overseer, Sling Lookouts, Black-Iron Enforcer), four mixed beats (Bridge, Mill, Canal, Courtyard; at Hard one courtyard recruit becomes an Enforcer) and the boss. At the top: the arena, the difficulty, the wave and how many enemies are left; a red bar over each enemy is its Health. Enemies never all attack at once: a director lets only a few commit at a time (the Arena panel shows the threat budget, each hero's pressure, and why the last attack was allowed or held back). Shields guard and Exact Block, runners evade and flank, overseers rope and drag you, lookouts keep their distance and sling stones (from off screen only after a warning: an arrow at the screen edge, INCOMING and a beep). Beaten enemies flee while their friends still fight, and the last one surrenders. The Enforcer keeps punching through light hits (ARMOR), and with a partner it announces a TEAM ATTACK. The **Sluice Commander** has a Health bar with phase ticks and a blue Resolve bar: while Resolve lasts he only flinches; empty it for a **STAGGER BREAK**, when full combos work. At two thirds he changes phase (the bar pauses at the tick; extra damage is kept, shown light red, and applied in the next phase), takes the Iron Gate Handwheel and calls two recruits; at one third he goes for the sluice winch: three completed cranks (the pips above the winch) release a water surge across the floor. Hitting him interrupts a crank.

**Training enemy.** The dummies use a training kit: Straight Jab (counterable), Overhead Club (guard pressure: drains Defense fast), Piercing Thrust (goes through a held guard: Exact Block it), Two-Step (two hits), Pummel Barrage (five hits, practise the Combo Breaker), Bell Hammer (unblockable: move away), Collar Grab and Rope Snare (grabs: practise the Grab escape), and Disarming Swipe (knocks a held weapon away; chosen in F2 only, never in the cycle). The attack's name and profile appear above the dummy when it starts. F2 sets which dummies attack, which attack (or cycle through all), how many frames between attacks (40 / 70 / 100) and whether they walk into range.

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
| F9 | Grab panel: per player the grab state (hold time left, Grab escape window, restraint countdown) and a log of grab outcomes (throws, escapes with their timing in frames, rescues) |
| F10 | Weapons and scenery panel: what each hero holds (condition, integrity, ammunition) and a log of weapon events; every weapon on stage (where, who holds it, reclaim time); the pillar, the sluice boards and the cog; the last environment event in words. Buttons: Dummy 1's weapon, Reset weapons, Reset scenery, Dummy to pillar |
| F7 | Academy recipes (spec §8.3) for each joined hero, ticked off step by step on the dummy you are hitting, with a "performed" count and a **Practise** button that puts your hero in front of Dummy 1 (and turns on counter-hit dummies when the recipe needs them) |

The Lab also shows, per player, the hero, the current move and its phase, the last combo-link verdict (and the reason a press was rejected), the attack meter and the dash bridge; and for the last dummy hit: health, hits, damage, damage scale, hit-stun budget, meter-gain budget, juggle budget and lift band, wall rebound and ground bounce, dash bridge, knockdown tag, ground route (window frames, extension, finisher), recovery (protected, and why the combo ended) and the route of moves that connected. F2 adds hero selection, the Special and Ultimate loadout per player, infinite attack meter, infinite Defense meter, the training enemy settings, counter-hit dummies, health refill and "Dummy 1 to the wall".

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
| `packages/data/weapons` | Weapon data: one YAML file per weapon (lifecycle numbers, throw responses, its moves and the founders' affinity moves), compiled by `pnpm gen:heroes` with the heroes. |
| `apps/game/public/art`, `tools/art` | Imported sprite sheets (WebP, 3x2 cells of 384 px) and the importer. With the pictures repository checked out next to this one, `python3 tools/art/import_art.py ../pictures/FightForPeace` re-imports every sheet and rewrites `packages/platform/src/assets/manifest.json` (needs Pillow). |
| `packages/data/enemies`, `packages/data/encounters` | Enemy kits with their AI profile (role, defenses, morale, attack list, boss phases), the difficulty table and the arena scenarios (waves, substitutions, devices). New enemies, phases and arenas are data. |
| `tests/replays` | Golden replays. Each records an input log and the expected final state hash. `scripts.ts` holds the input scripts; `RECORD=1 pnpm vitest run tests/replays/record.test.ts` re-records them. |

When a change alters simulation results on purpose, bump `RULES_VERSION` in `packages/sim/src/replay.ts` and re-record the golden replays in the same commit (see above). A replay recorded under another rules version fails loudly instead of silently producing a different hash.

## M7 test checklist

The numbered steps are in [`Guo_tests.md`](Guo_tests.md) (section M7).

## M6 test checklist

Press F10 for the Weapons and scenery panel. Player 1 is the Mountain Guardian; keys below are the Player 1 keyboard (QWERTY letters).

1. Look at the stage: both heroes, the dummies, the staff and the Handwheel on the floor, the sluice boards, the stone pillar and the cog are drawn with the real art. Walk left and right: your hero turns and walks with the walk cycle.
2. Walk onto the staff: nothing happens. Stand next to it and press J: your hero picks it up (F10: "Canal Workstaff · Ready 120/120 · two-handed").
3. Walk to Dummy 1 and press T, T, T: Lock-Pole Thrust, Millrace Sweep, Weirpost Drop. Press A + T near the dummy: Canal Hook pulls it towards you. Press U: nothing happens (the P1 panel says "both hands are on the weapon").
4. Press D + T: Weir Brace. Switch to the River Scout (F2) and do the same: Vault Kick passes through the dummy.
5. Keep hitting until the bar over your hero turns yellow (Worn), then red (Critical). When it empties, the staff breaks after that swing ("WEAPON BREAK"). F10 → Reset weapons puts it back.
6. Stand next to the Handwheel and press J, then walk away from Dummy 1 and press J again: the wheel flies, hits the dummy once and lands as a pickup. Press U while holding it: your Special still works.
7. Hold the staff, then press S + J: it drops at your feet.
8. F10 → Dummy 1 weapon: Iron Gate Handwheel, and F2 → Attacking dummies: Dummy 1. It throws the wheel at you: hold G to guard it, press G just before it arrives for "DEFLECT", or D + G towards it just before it arrives to send it back ("RETURNED") into the dummy. The dummy walks back to pick its wheel up.
9. F10 → Dummy 1 weapon: Canal Workstaff. Pick up the other staff and swing into its swing: "CLASH". F2 → Attack: Disarming Swipe, let it hit you while you hold a staff: "DISARMED"; the staff lands with a green ring and only you can take it back for 45 frames.
10. Hit the sluice boards with staff swings: F10 shows loosened, critical, broken; a timber board falls out. Pick it up with J and swing it.
11. F10 → Dummy to pillar, then D + T (Weir Brace) or T, T, T into the pillar: "IMPACT" and the damage, once per combo; the pillar shows a crack.
12. Stand on the cog's floor zone: it glows amber, then red and hits you once, then leaves you alone for two seconds. Hold G facing it: it is blocked.
13. Portable build: run `pnpm release`, unzip `release\FightForPeace-0.6.0.zip` somewhere else, double-click `start.bat` and repeat step 1.

## M5 test checklist

Press F9 for the Grab panel. Player 1 is the Mountain Guardian; keys below are the Player 1 keyboard (QWERTY letters).

1. Walk up to Dummy 1 and press U: Stonewake Palm. Hit it into the stage edge (F2 → "Dummy 1 to the wall") and it rebounds.
2. Press D + U: Gatebreaker Advance. F2, Attack: Straight Jab, and use it into the jab: "ARMOR" shows, you take the damage but keep going.
3. Press A + U (away from the dummy): Rising Rampart; a jab during its first frames passes through you.
4. Land a few hits: the orange meter bar fills and the P1 panel shows the meter in %. Keep one long combo going and watch the gain shrink (the target panel's meter-gain budget drops). F2 → "Infinite attack meter", then press H: Rivergate Oath plays its multi-hit Ultimate and the bar empties; the dummy gets up protected. Turn the setting off again: with less than a full bar, H does nothing (the P1 panel says why).
5. Press W + U: nothing happens (empty Up slot). F2 → Loadout → P1 Specials up: Skybreak Column. Press W + U again: Skybreak Column.
6. Stand next to the dummy and press J: your hero holds it and the option line appears at the bottom. Press J: Sluicegate Toss throws it forward ("THROW"). Grab again and press A + J: Turning Weir throws it behind you. Grab again and press T, then T: Keystone Knee, then Lintel Drop. Grab and wait: after 45 frames your hero shoves it away.
7. Grab Dummy 1 and throw it into Dummy 2: Dummy 2 is hit by the flying body.
8. Press J with nobody in front: a short whiff. Press T twice near the dummy, then J as the second hit (Brace Elbow) lands: the combo continues into the grab.
9. F2, Attack: Collar Grab. Let the dummy grab you, wait for "ESCAPE!" and press G: "ESCAPED", no damage (F9: "Grab escape ✓ pressed on frame N of the 11 f window"). Press G right away when grabbed instead: "too early", and the throw lands. Turn on F6 slow motion to see the window clearly.
10. F2, Attack: Rope Snare. Get caught: "RESTRAINED" counts down and you are freed when it ends. Join Player 2 (Num 4), stand next to Player 1 while restrained and press Num 3: "FREED" / "RESCUE". With Collar Grab, Player 2 can also hit the grabbing dummy to free Player 1.
11. Switch Player 1 to the River Scout (F2): U shoots Current Crescent across the stage, D + U is the spinning Gale Wheel, H with a full bar is Tempest Crossing. J then A + J throws behind (Eddy Swing).
12. Portable build: run `pnpm release`, unzip `release\FightForPeace-0.5.0.zip` somewhere else, double-click `start.bat` and repeat step 1.

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

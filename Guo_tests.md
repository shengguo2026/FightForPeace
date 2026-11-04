# Guo's manual tests

One section per milestone. Run the commands in PowerShell. When you find a problem, tell me the milestone number, the step number and what you saw.

## M7 · Enemies, the Sluice Commander and Stage 1 backgrounds

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173` in the browser (if Vite prints another port, use that one). Stop the server with `Ctrl+C`.

Optional, the portable build: `pnpm release`, then unzip `release\FightForPeace-0.7.0.zip` in another folder and double-click `start.bat`.

### Keys

Player 1 on a QWERTY keyboard: move W A S D, Attack T, Jump Y, Guard G, Grab and pick up J, Special U, Ultimate H, dash = tap a direction twice. On a German keyboard Jump is Z. In the arenas: Home restarts the arena, End goes back to the Lab, F1 shows or hides the Lab panels.

### Steps

1. Start the game. The Lab looks like in M6 (mill corner, dummies, staff and Handwheel). In the Lab panels there is a new **Arena** panel with Arena, Difficulty, Start.
2. Arena: **Trial: Pressed Recruits**, Difficulty: **Easy**, press **Start**, then press F1 to hide the panels. The dry-fields background appears (sky, village, floor, grass in front). At the top: "Trial: Pressed Recruits · Easy · Wave 1/1 · 2 left". The recruits walk in from the right with a red Health bar each.
3. Walk right: the camera follows you and the background layers move at different speeds (far sky slowest). Fight: only one or two recruits attack at the same time, the others circle. Their attack names appear above them.
4. Bring one recruit low while another still fights: it **flees** off the screen ("flees"). Bring the last one low: it **surrenders** and kneels ("surrenders"). When none are left: "ARENA CLEARED".
5. Press Home: the same arena starts again. F1, Difficulty: **Medium**, Restart: now three recruits. Then **Hard**: they attack more often and guard more.
6. **Trial: Bridge Shield** (bridge background), Medium: the shield blocks hits from the front ("guard"), sometimes perfectly; hit it from behind, or after its guard breaks. With F8 (Defense panel) you see your own defense; the shield's guard shows in its pose.
7. **Trial: Canal Runners** (canal), Medium: runners sidestep and backflip away, slide in low (jump or guard low) and try to get behind you.
8. **Trial: Rope Overseer** (mill, with the M6 weapons and scenery), Medium: the overseer throws a rope ("RESTRAINED", escape with the Grab escape) and drags and flings you. The Workstaff and Handwheel can be picked up as in M6.
9. **Trial: Sling Lookouts** (wide canal), Medium: lookouts keep their distance and sling stones. When a lookout is outside the screen, an orange arrow with "INCOMING" appears at the screen edge and you hear a short beep **before** the stone comes. Guard, Exact Block (G just before it hits) or move out of the lane.
10. **Trial: Black-Iron Enforcer** (courtyard), Easy, Medium and Hard: the Enforcer is slow and strong, its punch goes through light hits ("ARMOR"), Anvil Slam is unblockable (move away). At Hard a recruit joins; when both are near you, "TEAM ATTACK" appears over both and they attack together from two sides.
11. The mixed beats at Easy, Medium and Hard: **Beat 2: Occupied Bridge** (two waves: the second arrives when the first is almost done), **Beat 4: Working Mill**, **Beat 6: Canal Route**, **Beat 7: Gate Courtyard**. At Hard, one courtyard recruit is replaced by the Black-Iron Enforcer.
12. With F1 visible during any arena, the Arena panel shows: "threat x/68 · attackers · projectiles · hard CC", your pressure, and the last decision in words (for example "over the pressure cap" or "not visible (off screen)"). The threat number never goes above the budget.
13. **Beat 8: Sluice Commander**, Easy first: the Sluice plate background (the sluice gate). At the top his Health bar with two white ticks (phase changes) and a blue Resolve bar.
14. Hit him: while Resolve lasts, he only flinches briefly and cannot be launched or grabbed. Empty Resolve: "STAGGER BREAK" (the bar turns yellow and counts down); now full combos and launches work. When it ends he refills Resolve and recovers protected.
15. Bring his Health to the first tick: the bar stops at the tick (extra damage shows light red and is applied in the next phase); "phase change queued", then "phase change": he tears off his coat, you are pushed away, stones in the air vanish. Phase 2: an Iron Gate Handwheel appears on the floor, he picks it up and throws it; two recruits join.
16. Second tick: phase 3 "Open the Sluice". An orange ring appears under the winch on the right with three pips above it. When nobody hits him, he walks to the winch and cranks; each finished crank lights a pip. Hit him during a crank: the crank stops and the pip does not light. After three cranks the floor glows (warning) and a water surge hits everything on the floor.
17. Bring his Health to zero: he surrenders and kneels; "ARENA CLEARED". Let yourself be beaten once: "DEFEATED".
18. Repeat steps 13–17 at Medium and Hard (more pressure, faster decisions, more guarding).
19. Optional, two players: Player 2 joins with Num 4 in an arena and appears next to Player 1; the budget switches to the co-op numbers in the Arena panel.
20. End returns to the Lab, which works as in M6.

## M8 · Same-device co-op, focus pause and Auto Quality

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173` in the browser (if Vite prints another port, use that one). Stop the server with `Ctrl+C`.

Optional, the portable build: `pnpm release`, then unzip `release\FightForPeace-0.8.0.zip` in another folder and double-click `start.bat`.

Optional, the automated checks (they also run on GitHub):

```powershell
pnpm typecheck
pnpm lint
pnpm test
```

### Keys

Player 1 (keyboard, QWERTY): move W A S D, Attack T, Jump Y, Guard G, Grab and Interact J, Special U, Ultimate H, **Team Attack B**, Pause Esc. On a German keyboard Jump is Z.

Player 2 (numpad): move with the arrow keys, Attack Num 4, Jump Num 5, Special Num 6, Guard Num 1, Ultimate Num 2, Grab and Interact Num 3, **Team Attack Num 0**. Player 2 on a gamepad: Attack X (West), Jump A (South), Interact B (East), **Team Attack LB**, Pause Start.

"Up + Attack" means: hold the up direction and press Attack.

### Steps

1. Start the game. In the Lab panels there is a new **Co-op** panel: "invitation: none", "handoff: none open", "last bundle: none yet", the counters, a **Quality** list (auto) and "focus pause off". The control hints at the bottom now end with "Team B".
2. Press Num 4: Player 2 joins next to Player 1 (orange). The P2 hint bar shows "Team Num 0". Walk both heroes into each other: they push each other a little but never hurt each other. Attack each other: no hit, no damage.
3. **Handoff, airborne:** P1 Up + T (High Bank Lift) on Dummy 1. An **orange** pulsing ring (P2's colour) appears under the dummy while it is in the air and shrinks as the window runs out. P2 jumps (Num 5) and attacks in the air (Num 4), or Up + Num 4: "HANDOFF" appears and the Co-op panel counts "handoffs 1". The other way round works too (P2 Up + Num 4 launches, the ring is **blue**, P1 takes over).
4. **Handoff, stagger and down:** P1 forward + T (Stone Shoulder): the ring appears for a short time; P2 Num 4 takes over. P1 Down + T (Low Bank Sweep) knocks the dummy down: the ring appears under the lying dummy; P2 hits it on the ground (Num 4 next to it).
5. **Combined hit:** both attack the dummy at the same moment (P1 T and P2 Num 4 together, several tries). In the Co-op panel "last bundle: 2 hits on Dummy …, dominant …" appears: both hits count (damage and meter), but the dummy reacts only once.
6. **Team Attack:** F2 settings, switch on **Infinite attack meter** (or fill both meters to at least 50 % by hitting). Stand on both sides of Dummy 1, P1 hits it (T), and during the stagger P1 presses **B**. A green ring with "TEAM? 30" appears over the dummy and counts down; in the middle of the screen "P2 Team Attack! Press Num 0 to join in" with the countdown, and "P1 Team Attack: waiting for your partner".
7. P2 presses **Num 0** within half a second: both heroes jump to both sides of the dummy and strike together: "CONFLUENCE STRIKE", the dummy falls. Without infinite meter, both meters dropped by 50 % at the same moment. Co-op panel: "team finishers 1".
8. Repeat step 6 but P2 does **not** press Num 0: the countdown runs out, the Co-op panel says "invitation ran out: nothing spent", both meters are unchanged.
9. Press B with no partner in range, or without meter, or with nothing hit: nothing happens and the Co-op panel says why (for example "not enough meter (both need it)" or "no target in a team state in range").
10. Both press Team Attack in the same moment (B and Num 0 together) during a stagger: one Team Attack starts at once (no invitation).
11. P2 can also invite (Num 0 first) and P1 confirms with B. With a gamepad for P2: LB invites or confirms.
12. **Grab assist:** P1 grabs Dummy 1 (J) and holds it. P2 hits the held dummy with Num 4: "ASSIST", the dummy takes damage but stays in P1's hold. Co-op panel: "assists 1".
13. **Rescue:** F1, Arena **Trial: Rope Overseer**, Medium, Start, with both players. When the overseer's rope catches a hero ("RESTRAINED"), the other walks next to them and presses Interact without a direction (P1 J, P2 Num 3): "RESCUE", the caught hero is free. When an enemy holds a hero in a grab, the partner hits the enemy: the grab breaks, "RESCUE". Co-op panel: "rescues" counts both.
14. **Boss in co-op:** **Beat 8: Sluice Commander**, Medium, both players. The Arena panel shows the co-op budget. While his Resolve lasts, a Team Attack is refused on him; during the **Stagger Break** handoffs and Team Attack work on him. Play the whole fight to "ARENA CLEARED".
15. **Focus pause:** during a fight, click into another window or press Alt+Tab. The game freezes at once with "Paused: the game window lost focus. Press Esc to continue." Come back: it stays paused (also when you click into the game). Press Esc: it continues, and no key you held before is stuck.
16. Switch to another browser tab and back: the same pause and message. A gamepad player resumes with Start.
17. **Controller unplug:** P2 on a gamepad (press Start to join). Unplug it: "Player 2 lost their controller" pauses the game. Plug it back in and press a button: the game continues (as in M1).
18. **Auto Quality:** in the Co-op panel the line "drawing high · frame 16.7 ms". Set Quality to **low** in an arena: the grass in front disappears and the far and middle backgrounds stop scrolling, but heroes, enemies, warnings and the HUD are unchanged. **medium**: only the front grass is gone. **auto** switches by itself when the frame time stays high (for example with the browser window very large on a slow PC) and goes back up when it is fast again.
19. The frame and hash in the Lab panel keep counting normally in every quality setting (the game logic is never slowed or skipped).

## M9 · Stage 1 greybox journey and portable build v1

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173/?stage=1` in the browser: Stage 1 starts at once on Medium (if Vite prints another port, use that one). `http://localhost:5173` without `?stage=1` opens the Lab as before. Stop the server with `Ctrl+C`.

Useful addresses: `?stage=1&difficulty=easy` (also `hard`, `extreme`, `ultimate`) and `?stage=1&beat=3` (a practice run from beat 3).

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-yisv4g
git checkout claude/project-thread-yisv4g
pnpm install
pnpm dev
```

The portable build:

```powershell
pnpm release
pnpm smoke:portable
```

`pnpm release` writes `release\FightForPeace-0.9.0.zip`; `pnpm smoke:portable` unzips it into a temp folder and starts it with `start.bat` the way you would (it prints "Portable smoke test passed"). Then unzip the zip yourself into a folder **with a space in its name** (for example `C:\Games\Fight For Peace`) and double-click `start.bat`. Every CI run on GitHub also has the zip under **Artifacts** ("FightForPeace-portable").

Optional, the automated checks (they also run on GitHub):

```powershell
pnpm typecheck
pnpm lint
pnpm test
```

### Keys

As in M8. Player 1: move W A S D, Attack T, Jump Y, Guard G, **Grab and Interact J**, Special U, Ultimate H, Team Attack B, Pause Esc. Player 2 (numpad): arrows, Attack Num 4, Jump Num 5, **Interact Num 3**, joins with Num 4. "Hold J" means keep J pressed without a direction.

### Steps

1. Open `?stage=1`. Top left: "Stage 1 · Beat 1/8: Dry Fields · Medium · Continues 3" and the objective "Cross the dry fields toward the bridge". Bottom right a small "Fight For Peace v0.9.0".
2. **Camera lock:** walk right. After a few steps the camera stops and recruits come in from the right; you cannot leave the screen. Beat them: "CLEAR", the camera follows again. The second lock further on adds a shield. A green "GO →" points right when the way is open.
3. Walk over the food bundle while hurt: Health goes up and "Food" appears. At full Health it stays on the floor.
4. Walk off the right edge: the screen fades and **Beat 2: Occupied Bridge** starts (a lock with two waves: a runner comes in after the first wave).
5. **Beat 3, Worker Rescue (checkpoint):** "Checkpoint saved" appears. Clear the lock with the Rope Overseer. Two bound workers stand next to a rope pen. Stand next to one: at the bottom "P1 Hold J to free the worker" (the key comes from your bindings; rebind Interact in the Lab and it changes). Hold J: a bar fills, "Worker freed", the worker cheers and runs off to the left. Letting go early, or being hit, stops the bar.
6. The GO arrow does not appear until **both** workers are free. When both are free: "Recovery cache opened" and two food bundles appear at the basket on the right.
7. **Beat 4, Working Mill:** the fight starts at once among the mill pillars (shield, runner, overseer).
8. **Beat 5, Investigation (checkpoint):** no enemies. Near the water buckets in the middle: "Hold J to look closer". Hold J: a story text in the middle of the screen ("The canal is bone dry …").
9. **Beat 6, Canal Route** (a lookout, then an overseer as a second wave) and **Beat 7, Gate Courtyard** (five enemies). On **Hard** one of the recruits in the courtyard is an enforcer (start with `?stage=1&difficulty=hard&beat=7` to see it quickly).
10. **Beat 8, Sluice Commander (checkpoint):** the boss fight from M7. When he surrenders: "THE RIVER FLOWS AGAIN" and water flows on the plate; a gear crate appears. Stand next to it: "Hold J to secure the evidence". Hold J: the story text about the machined brass gears, then "STAGE COMPLETE".
11. **Results:** after a moment the results screen lists four grades (Rescue, Investigation, Continues used, Time, each S/A/B/C) and an Overall grade, the enemies beaten, surrendered and fled, the clear time, and the line about who is paying the faction. "Play again" restarts the stage; "Back to the Lab" opens the Lab.
12. **Continues and checkpoint:** start `?stage=1&beat=3`, let the enemies beat you. "DEFEATED", then "Continue from the checkpoint · 2 left": you are back at the start of beat 3 with full Health, the top line shows "Continues 2".
13. With `?stage=1&difficulty=ultimate&beat=3` (no continues) a defeat says "No continues left: the stage starts again" and Beat 1 starts again.
14. **Co-op down and revive:** press Num 4 to add Player 2 (appears next to Player 1). Let Player 2 be beaten: "P2 is down" and P2's prompt says they can be helped up. Player 1 stands next to P2: "Hold J to help your partner up". Hold J for about two seconds: "P2 is back up" with part of their Health. If nobody helps, P2 comes back when the current fight ends ("P2 rejoins"). The team only spends a continue when **both** are down.
15. In co-op, Player 2 can free workers and inspect the clue too (hold Num 3); the two heroes cannot walk out of the locked screen away from each other.
16. **Practice beats:** F1 opens the Lab. In the Arena panel "Stage 1: The Broken Water Pact (full journey)" is first, with a difficulty and **Start at beat** (1–8). Start at beat 5: the stage starts there; the results later say "practice run from beat 5". End returns to the Lab; the trials from M7 are still in the list.
17. **Portable:** start the unzipped `start.bat`. The browser opens on `http://localhost:6006`, the version tag shows v0.9.0, and `?stage=1` works there too. In the folder: `README.txt` (explains Stage 1 and the options) and `THIRD-PARTY-NOTICES.txt` (Phaser, Preact and Preact Signals with their MIT licence texts, and a note on Node.js).

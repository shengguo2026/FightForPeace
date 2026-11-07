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

## M10 · Village menu, play flow, settings, saves and three languages

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173` (if Vite prints another port, use that one). The game now opens on the **first-launch setup** instead of the Lab. `?lab` opens the Lab directly as before, `?stage=1` starts Stage 1 directly. Stop the server with `Ctrl+C`.

To start again as a brand-new player (first launch), open the browser's developer tools (F12) → Application → Storage → **Clear site data**, then reload. In the portable build, delete the `saves` folder instead.

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-shb2ul
git checkout claude/project-thread-shb2ul
pnpm install
pnpm dev
```

The portable build:

```powershell
pnpm release
pnpm smoke:portable
```

`pnpm release` writes `release\FightForPeace-0.10.0.zip`. Unzip it into a folder with a space in its name (for example `C:\Games\Fight For Peace`) and double-click `start.bat`.

Optional, the automated checks (they also run on GitHub):

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

### Keys

In the game as in M9 (Player 1: W A S D, Attack T, Jump Y, Guard G, Interact J, Special U, Ultimate H, Team Attack B, Pause Esc). In the **menus**: arrows or W A S D move, Enter / Space / T confirm, Esc / Backspace go back. A gamepad works too (D-pad or stick, A/Cross confirms, B/Circle goes back), and so does the mouse.

### Steps

1. **First launch:** "Welcome to Fight For Peace", step 1 of 4. Pick **简体中文**: the whole setup switches to Chinese at once. (You can switch back later in Settings → Language.)
2. Step 2: subtitle size and background, reduced flashing, reduced camera shake, high contrast, HUD size. Change one with the arrow keys left/right. Next.
3. Step 3: keyboard layout (QWERTY, QWERTZ, AZERTY). Pick yours.
4. Step 4: "Press any key or button". Press a key (or a gamepad button): it shows Keyboard (or Gamepad). Type a profile name and finish.
5. **Village:** the illustrated village with the title (和平之战 in Chinese, "Fight For Peace" in English and German), the menu Play, Academy, Village Store, Collection and Records, Guide, Settings with painted icons, and a detail panel on the right. Bottom right: your profile name, where saves are kept ("this browser", or "game folder" in the portable build) and Version 0.10.0. Move through the menu with the arrows only; Enter opens.
6. **Store and Guide** say they open in a later update; Esc returns. **Records** shows Stage 1 "Not cleared yet".
7. **Play → Solo:** the players screen shows Player 1 with your profile and Keyboard. Press T: ready, and it moves on by itself.
8. **Stage and difficulty:** Stage 1 · The Broken Water Pact; change the difficulty with left/right (the continues change: Easy 5 … Ultimate 0). Next.
9. **Heroes:** the two heroes with their art (in Chinese 山神 and 河神). A/D switch, T confirms.
10. **Intro:** six painted story pictures with subtitles (Narrator). T goes to the next one, Esc skips. **Briefing:** the elder speaks line by line (his pose changes); Esc jumps to the summary with the objective, your loadout with your own keys, and the full transcript. Next.
11. **Ready?** Press T: Stage 1 starts with the hero you picked.
12. **HUD:** top left your portrait, name, Health, Defense and Attack bars and "Continues". The objective stays in the top banner. In co-op Player 2's cluster appears top right.
13. **Pause menu:** press Esc. Left: Resume, Move List, How to Play, Controls, Accessibility and Audio, Current Objective, Restart from Checkpoint, Return to Village. Moving down shows each one's details on the right (How to Play uses your own keys). Controls and Accessibility open the settings and come back to the pause menu with Esc. Esc resumes.
14. **Checkpoint and Continue:** play to Beat 3 ("Checkpoint saved"), Esc → Return to Village → Yes. The village now shows **Continue** at the top with "Stage 1 · beat 3 · …" in the detail panel. Continue starts at Beat 3.
15. **Results:** finish the stage (the Continue from step 14 is the quickest way). The results show "Play again" and "Return to Village"; after a Continue the line says "continued from beat 3". Back in the village, Records shows the clear, best grade, time and highest difficulty, and the run under Recent runs.
16. **Co-op:** Play → Same-device co-op. Player 2 joins by pressing Num 4 (or a gamepad button), picks a profile or Guest with left/right, and both press Attack to be ready. On the hero screen each player picks their own hero (the same hero cannot be taken twice). In the pause menu, Restart and Return to Village need both players to confirm.
17. **Settings:** the category rail on the left, each setting shows its scope (Profile or Device). Language switches everything at once, including stage names, objectives, results, banners and move names; after a reload the language stays. Display → Interface size asks "Keep this size?" and changes back after 10 seconds unless you press Keep. Accessibility → Reduced flashing: hits no longer flash the figure white. Audio → Sound effects at 0 % silences the warning beeps.
18. **Remap:** Settings → Controls → Remap controls. Pick Attack, press Y (Jump's key): "Y is already used for Jump" with Replace / Swap / Cancel. Swap, Apply ("Saved."). Turn on the Live tester and hold Y: it shows "Attack". In the game Y now attacks and T jumps. Reset everything restores the defaults. The Player 2 keyboard tab has the numpad and laptop presets.
19. **Profile Data:** rename the profile, create a second profile, switch between them. **Export** downloads a `.ffpsave` file; **Import a backup** with that file first shows what it holds, then "Add them" adds a copy (nothing is overwritten). Daily backups can be restored.
20. **Two tabs:** open the game in a second tab: the village says this profile is open in another tab and changes there are not saved.
21. **Portable:** in the unzipped portable game, finish the setup, then look in the game folder: a `saves` folder with `profile.….json`, `device.json` and a daily backup. Close the console, start again: the village opens with your profile.

## M11 · Progression, Academy, Guide and Elder's Secrets

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173` (if Vite prints another port, use that one). Stop the server with `Ctrl+C`. M11 moves saves to version 2: an M10 profile is upgraded automatically on first load and starts with 0 Credits.

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-1k7hdh
git checkout claude/project-thread-1k7hdh
pnpm install
pnpm dev
```

The portable build:

```powershell
pnpm release
pnpm smoke:portable
```

`pnpm release` writes `release\FightForPeace-0.11.0.zip`.

Optional, the automated checks (they also run on GitHub):

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

### Keys

As in M10 (Player 1: W A S D, Attack T, Jump Y, Guard G, Interact J, Special U, Ultimate H, Team Attack B, Pause Esc). Menus: arrows, Enter, Esc, or a gamepad.

### Steps

1. **Village:** bottom right now shows **Credits: 0** next to your profile name. The menu detail panel describes the Store and the Guide (they are no longer "later").
2. **Earn Credits:** Play → Solo → Stage 1 (any difficulty) → finish the stage. The results now show **Grade points … / 100**, **Score …** and **Standard Loadout**, then a payout block: "Credits earned", one line each for Stage completed (300), the difficulty bonus, the rank bonus, **First clear (1000)** and achievements such as "The River Flows Again" (150), your Hero Mastery points, and "New best score for this category!".
3. Return to Village: the Credits at the bottom right match the payout. Play the stage again: the first-clear bonus is **not** paid a second time.
4. **Records:** Collection and Records now also lists best scores by category (Standard/Open · Solo/Co-op · difficulty), Hero Mastery levels, all achievements (✓ earned, ○ open with progress) and the Credits history.
5. **Village Store → Techniques:** Mountain's **Skybreak Column** and River's **Waterspout Rise** for 800 each, with their input in your own keys on the right and "Also granted free at … Mastery level 3". After your first clear the two **Ultimates** (Still Mountain, Floodline Passage, 1500) appear too. Buy one (Enter), press Enter again to **equip** it: the status changes Owned → Equipped.
6. **Wardrobe:** buy and equip Millwright's Coat (Mountain) or Reed Courier (River): in the stage the hero is drawn in a different colour (placeholder for the outfit art). **Training Hall** says "No combat styles yet". **Collection:** buy the Village Lantern badge and equip it: the village shows it after your name. Open Sluice stays **Locked** until you have earned "The River Flows Again". With too few Credits the store says how many you still need; "Mark as goal" puts a ★ on an item.
7. **Briefing with owned moves:** Play the stage with the hero whose technique you equipped. The briefing summary shows **Open Loadout** and the bought move in its slot with your key. The results then say **Open Loadout**, and Records keeps it apart from Standard.
8. **Academy:** Village → Academy now opens the Academy (the old Combat Lab is the last item). Pick the hero with left/right. Route **First Steps** has four lessons, each marked New / Practised / Certified / Mastered.
9. **Lesson "Your first chain":** the demonstration plays by itself (your hero performs the chain on the dummy). The panel at the top lists the three moves with **your current keys**. Press T (Attack) to start the guided practice; perform the chain to tick it off, then the independent trial (3 times), then the optional mastery goal (3 times within 15 seconds). "Certified! +100 Credits" and "Mastered! +150 Credits" appear as toasts, once only.
10. **Rebind and see the lesson change:** Esc → Leave lesson. Settings → Controls → Remap controls → Attack → press R → Apply. Back to Academy → "Your first chain": the panel now shows **R** everywhere instead of T.
11. **Gamepad prompts:** during a lesson, press any button on a gamepad: the lesson panel switches to the gamepad's buttons at once; press a key again and it switches back to the keyboard.
12. **Other lessons:** "Move, jump and dash" (walk back from the dummy, jump, dash with a double tap); "Guard and Exact Block" (the trainer attacks: guard once, then two Exact Blocks, mastery: a Counter); "Special and Ultimate" (the attack bar is kept full). The first certificate also earns the achievement "First Lesson" (+100).
13. **Free Practice and My Combos:** Academy → Free Practice → Start practice. Hit the dummy with a chain of 2 or more moves: the panel top left shows the recorded moves with your keys, hits and damage. Esc → **Save last combo** → Leave practice. Academy → My Combos: the combo is there as "Combo 1". Rename it, then **Watch and practise**: your hero plays it back, then "Your turn" and a ✓ when you perform it yourself. Delete removes it.
14. **Technique trials and Cheat Practice:** Free Practice set-up lists the hero's store techniques; tick one you don't own and try it in practice (nothing is paid). Tick Elder's Secrets cards under Cheat Practice: the practice panel says "Cheat Practice".
15. **Guide:** Village → Guide. Sixteen chapters on the left; type in the search box (e.g. "counter") to filter them. Each chapter has text and control cards drawn with your current keys (change a binding and they change).
16. **Elder's Secrets:** Guide → chapter "Elder's Secrets" lists the 4 presets and all 12 cards (Steady Ride and Safe Passage say they have no effect yet). Choose Elder's Secrets: type `safe hart` → "That is not a code the elder knows" (no guessing). Type ` strong-hands ` → Strong Hands gets a ✓ (case, spaces and hyphens do not matter). Click the preset **Calm Battle**: its codes are selected. Done → "Every player has to accept…"; press "Player 1: I understand", then Done.
17. **A Cheat-Assisted run:** play Stage 1. The HUD shows **Cheat-Assisted** under your portrait, the readiness screen and the pause menu show it too. Finish the stage: the results show the Cheat-Assisted line, the payout lines are struck through and **Credits earned: 0**; Records shows "Highest Cheat-Assisted clear" separately.
18. **Cheats from the pause menu:** start a normal run, Esc → **Elder's Secrets** → pick Safe Heart → Player 1: I understand → Done. The pause menu now says Cheat-Assisted, and the hero takes no damage. Return to Village: the next run starts without cheats again (session cheats are chosen per run; hero cheats are remembered as "Use my saved choices for this hero").
19. **Co-op:** with two players, the Elder's Secrets screen shows a column per player; both players have to press their "I understand" before Done works.
20. **Languages:** switch to 简体中文 and Deutsch: the store, Academy, lessons, Guide, Elder's Secrets and results texts are translated.
21. **Not enough Credits:** with fewer than 800 Credits, pick Skybreak Column in the store: a message says how many Credits are missing, nothing is bought. "Mark as goal" puts a ★ next to the price, and it is still there after a reload.
22. **Guide follows your keys:** Guide → "Attacks and chains": the control cards show T for Attack. Rebind Attack (Settings → Controls) and open the chapter again: the cards show the new key. Switch the language to 简体中文: the chapter title is 攻击与连招 and the Elder's Secrets cards are in Chinese.
23. **Technique trial without buying:** Free Practice set-up → tick Skybreak Column ("Not owned: trial only") → Start practice → Up + Special fires it. Leave practice: the store still shows it as not owned, and your Credits are unchanged.
24. **Hero Mastery grant:** keep playing Stage 1 with one hero. When that hero reaches Mastery level 3 (Records → Hero Mastery), the results say "Hero Mastery unlocked: …" and the store shows the Special as Owned without spending Credits.
25. **Continue keeps the mark:** start a Cheat-Assisted run, play to Beat 3 (checkpoint), Return to Village, then Continue. The HUD still shows Cheat-Assisted, and finishing pays 0 Credits.
26. **Guest:** play as Guest (co-op Player 2, or a Guest profile): the results show what the run would pay, but the Guest keeps nothing, and the store says Guests cannot buy items.

## M12 · LAN co-op (lockstep) over your home Wi-Fi

You need two computers on the same home network (not a guest network). PC 1 is your development PC with the repository; PC 2 only needs the portable zip.

### Get and start the build

On PC 1:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm release
```

`pnpm release` writes `release\FightForPeace-0.12.0.zip`. Copy that zip to PC 2 (USB stick or a shared folder), unzip it anywhere there, and double-click `start.bat`.

On PC 1 either start the same zip (unzip `release\FightForPeace-0.12.0.zip` and double-click `start.bat`) or run the development server:

```powershell
pnpm dev
```

and open `http://localhost:5173`. Both ways host rooms. Both computers must run the same version (0.12.0), otherwise the lobby refuses to join (that is test step 10).

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-aaru51
git checkout claude/project-thread-aaru51
pnpm install
pnpm release
```

Optional, the automated checks (they also run on GitHub):

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm smoke:portable
```

### Keys

As in M10 on each computer (W A S D, Attack T, Jump Y, Guard G, Interact J, Special U, Ultimate H, Team Attack B, Pause Esc). Each computer's player uses that computer's keyboard or gamepad. Menus: arrows, Enter, Esc, or the mouse.

### Steps

1. **Host:** on PC 1, Village → Play → **Wi-Fi co-op** (it is no longer greyed out) → **Host a game**. The screen shows **Address** (for example 192.168.1.23), **Port** (7350) and a four-letter **Room code**, plus the Windows Firewall hint. If the computer has more than one network address, the others are listed underneath.
2. **Firewall:** the first time, Windows shows "Windows Defender Firewall has blocked some features of Node.js". Tick **Private networks** and press **Allow access**. (If you pressed Cancel by mistake: Windows Security → Firewall → Allow an app → Node.js → tick Private.)
3. **Join:** on PC 2, Play → Wi-Fi co-op → **Join a game**. Type PC 1's address, the port and the code (lower case and spaces are fine) → **Join**. Both computers now show the **Wi-Fi lobby**: Player 1 · Host and Player 2 · Guest with both names.
4. **Lobby:** each player changes only their own hero (click the Hero line or use left/right). You cannot pick the hero the other player has. Only the host can change the difficulty; when the host changes it, both "Ready" marks are cleared. The guest sees the difficulty and "The host chooses the difficulty."
5. **Start:** both press **Ready**. Stage 1 starts on both computers at the same moment. Both heroes appear on both screens, both HUD clusters (Player 1 left, Player 2 right) show, and under the stage title a small line says **Wi-Fi · input delay 2 frames · … ms** (2 or 3 frames on a normal home network).
6. **Play together:** walk, fight and free a worker together through Beat 1 and Beat 2. Each player controls only their own hero. Both screens should show the same thing (same enemy positions, same health bars). The game should feel like same-device play with a tiny delay.
7. **Courtesy hold:** on PC 2 click another window (or Alt+Tab). Both games stop at once. PC 1 shows "Player 2 left the game window.", "✓ Player 1: ready", "Player 2: not ready yet" and after 3 seconds "Waiting for Player 2 to come back: 60 s, then the session ends." Coming back to the game window on PC 2 does **not** start play by itself: PC 2 shows "You left the game window." and **Ready to continue**. Press it (or Esc): both show "Play resumes in 3, 2, 1", then play continues on both from the same moment.
8. **Pause:** press Esc on PC 1. Both games pause: "Player 1 paused the game." Open **Settings (this computer only)**, change the volume or the HUD size, go back. Press **Ready to continue** on PC 1: PC 1 now shows "✓ Player 1: ready" and waits; press it on PC 2 too, then the countdown starts.
9. **End session:** pause again, then **End session** on PC 2. PC 2 returns to the village; PC 1 shows "Session ended · Player 2 left the session." and "Wi-Fi games keep no checkpoint…". Back to the village: **Continue** is not offered for this run.
10. **Wrong code / other version:** host again on PC 1; on PC 2 type a wrong code → "That room code is not right…". Type a wrong address (for example 192.168.1.250) → after a few seconds "No game answered at that address and port…". (If you still have the 0.11.0 zip, a 0.11.0 game cannot join at all; the version check itself is covered by the automated test.)
11. **Firewall blocked (optional):** if PC 2 cannot reach PC 1 at all, check step 2 and that both are on the same Wi-Fi. "AP isolation" or a guest network blocks computers from seeing each other.
12. **Finish the stage together:** play all of Stage 1 to the results. Each computer shows the results; each computer's player gets their Credits and records on their own profile (look at the Credits in each village). Back to the village on one computer ends the session on the other ("Player 1 returned to the village.").
13. **Lost connection:** start a new Wi-Fi game, then close the black server window on PC 1 (or turn off PC 1's Wi-Fi). Within about 10 seconds PC 2 shows "Session ended · The connection to the other computer was lost."
14. **Languages:** switch PC 2 to 简体中文 or Deutsch: the Wi-Fi screens, lobby and hold panels are translated.
15. **Solo and same-device co-op still work:** Play → Solo and Play → Same-device co-op behave exactly as in M11.

## M13 · Media integration and cinematics

Stage 1 now plays with the delivered media: the six Flow clips as the intro cinematic (with subtitles), the ending cinematic before the results, the seamless title loop behind the village menu, the Stage 1 music "Water Held Back" (only the victory stinger is a real recording; the other states are quiet placeholder loops in each cue's tempo), placeholder sounds for hits, blocks and Ultimates through the priority mix, and the delivered effect sheets (hit sparks, guard flashes, dust, Ultimate auras, breaker and team bursts). Use headphones or speakers.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173`. For the portable build instead: `pnpm release`, unzip `release\FightForPeace-0.13.0.zip` and double-click `start.bat` (the zip is about 20 MB bigger: the clips).

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-pw6v3u
git checkout claude/project-thread-pw6v3u
pnpm install
pnpm dev
```

Optional, the automated checks (they also run on GitHub):

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm smoke:portable
```

### Keys

As in M10 (W A S D, Attack T, Jump Y, Guard G, Interact J, Special U, Ultimate H, Team Attack B, Pause Esc). In a cinematic: Attack (T or Enter) next shot, S (Down) pause and resume, Esc skip; or the Pause, Skip and Next buttons top right.

### Steps

1. **Title loop and menu music:** start the game. Behind the village menu the title clip moves (river, mill, bridge) and loops without a jump. After your first click or key press a quiet music loop starts (placeholder for "River Before Silence"). Settings → Audio shows "Now playing: River Before Silence · title".
2. **Intro cinematic:** Play → Solo → Stage 1 → a hero. The intro plays the six clips, each with its English subtitle at the bottom ("Narrator: …"), and the clips' own sound (Flow ambience, at the Music volume). The counter top right shows "Next (1/6)". The menu music is silent while the clips play.
3. **Pause, next, skip:** press S: the clip and the subtitle freeze, the button says Resume; press S again. Press T: the next shot starts at once. Press Esc: the elder's briefing opens.
4. **Still pictures:** Settings → Accessibility → **Cinematics → Still pictures with subtitles**. Go back: the title clip is replaced by the still menu picture. Start Stage 1 again: the intro shows the same six shots as pictures with "Still pictures" top right, the same subtitles at the same pace, and now the intro music plays underneath. Set it back to **Video clips** afterwards.
5. **Languages:** set Settings → Language → 简体中文 or Deutsch and start Stage 1 again: the intro subtitles, speaker labels, buttons and the new settings are translated. (A language change in the middle of a cinematic applies from the next subtitle line, never inside one; the automated tests cover this.)
6. **Stage music:** in Beat 1 (dry fields) a new loop plays ("Fields Without Water"). When enemies lock the camera it changes to a busier combat loop on the next bar, and back after the wave. Bridge, mill and canal each have their own loop; Settings → Audio (from the pause menu) shows the cue and state. The pause menu makes the music quieter, not silent.
7. **Effects and sounds:** fight. Ordinary hits show a small gold spark and a short tap; heavy hits, wall bounces and weapon hits a bigger spark with a few flecks and a slight shake; an Exact Block or Counter a pale-blue ring or chevron with a distinct chime; an Ultimate a tall ochre (Mountain) or teal (River) aura, a brief white flash and a rising sweep; dashes and knockdowns a dust puff. In a crowded fight the screen should not turn into a wall of sparks: the hit marks always show, the extra flecks are limited.
8. **Effect settings:** Settings → Accessibility → **Sparks and particles: Reduced / Off**: the flecks shrink or disappear but every hit mark stays. **Reduced flashing: On** removes the white flash; **Reduced camera shake: On** removes the shake.
9. **Boss music:** at the Sluice Commander a faster loop plays; at each phase change you hear a short rising sting before the next phase's loop, and when he surrenders a closing sting.
10. **Ending and victory:** secure the evidence. Before the results the ending plays: the gate opening, the village by the water (if you freed every worker: "Every worker came home…"; otherwise: "…still waiting for those not yet home."), and the sponsor's seal (with a second line if you found every clue). Skip or let it finish: the results open and the real victory music (MUS-STINGER-VICTORY) plays once.
11. **Volumes:** Settings → Audio has Master, Music, Sound effects, Voices, **Ambience** and **Interface sounds**. Music at 0 silences the loops and the clips' sound; Sound effects at 0 silences hits and warnings.
12. **Portable zip:** `pnpm release`, start the zip with `start.bat`: the intro clips and title loop play there too (also when you press Next quickly).
13. **Wi-Fi co-op** (if you have PC 2 at hand): a Wi-Fi game ends straight on the results (no ending cinematic), everything else as in M12.

## M14 · Slice hardening (final Stage 1 acceptance)

M14 checks the whole slice: the game tests your browser and says what it can do (Settings → **System check**), a new lowest Auto Quality step keeps slow laptops in real time, every button prompt follows language, layout, gamepad and rebinding (and is read out in your language by screen readers), Player 2 on the keyboard now has a Back/Pause key (**Num +**, or **Backspace** with the laptop set), and the gate courtyard's five enemies now arrive in two groups (it was harder than the boss on Medium). The evidence for every line of spec §19 is in `docs/review/08-slice-acceptance.md`.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173`. For the portable build: `pnpm release`, unzip `release\FightForPeace-0.14.0.zip` and double-click `start.bat`.

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-qcmrgs
git checkout claude/project-thread-qcmrgs
pnpm install
pnpm dev
```

Optional, the automated checks (they also run on GitHub; `pnpm e2e` now includes the accessibility audit, the German/Chinese layout sweep and a throttled performance test):

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm release
$env:FFP_SMOKE_BROWSER = "msedge"; pnpm smoke:portable; Remove-Item Env:FFP_SMOKE_BROWSER
```

The last line unzips the release, starts it with `start.bat` and plays the first launch in Microsoft Edge; it writes `release\system-check-msedge.json` and a screenshot.

### Keys

As in M10 (W A S D, Attack T, Jump Y, Guard G, Interact J, Special U, Ultimate H, Team Attack B, Pause Esc). Player 2 on the numpad: arrows, Num 4/5/6, Num 1/2/3, Num 0, **Pause Num +** (new).

### Steps

1. **System check in each browser:** in Chrome, Edge and Firefox (and Safari on a Mac if you have one), open the game, Settings → **System check**. Every line should say *Available*; Drawing says *WebGL*, Video *WebM* (Safari: *MP4*), Saving *in this browser* (portable zip: *in the game folder*). Note any *Missing* line and the browser.
2. **Full Stage 1 on Medium, solo:** play the whole stage from the intro to the results with either founder. Nothing should stop you from progressing. At the **gate courtyard** (beat 7) two Recruits and a Shield come first; a Runner and a Lookout join when one of them is left. Tell me if the courtyard or the Sluice Commander feels too hard or too easy on Medium.
3. **Low-end laptop (if you have one):** play the courtyard on the slowest PC. Then Settings → System check → *Performance*: the simulation line should say about **60 steps per second**. On a slow PC the drawing level goes down by itself, at worst to *Lowest (lower resolution)*: the picture gets a little softer, the fight stays the same speed. Settings → Display → Presentation quality now also offers *Medium* and *Lowest*; *Full screen* switches full screen on and off.
4. **Measure again:** in System check press *Measure again*, play a minute, come back: the numbers are from that minute.
5. **Player 2 on the keyboard:** Play → Same-device co-op, Player 2 joins with Num 4. In hero selection both confirm, then Player 2 presses **Num +**: Player 2's hero is unconfirmed again and the hint shows the Num + key (before M14 it said "Not assigned"). In the stage Num + pauses for both.
6. **German and Chinese:** Settings → Language → Deutsch, then 简体中文: walk through the village, Settings (all categories, including System check), Play → stage and hero selection. No label should be cut off or run out of its box, and nothing should be in English except names. With Deutsch, a key such as Space now shows as **Leertaste**.
7. **Reduce motion:** in Windows Settings → Accessibility → Visual effects, switch **Animation effects** off, then start the game with a new profile (Settings → Profile → New profile, or a private browser window): the first-launch page already has *Reduced flashing* on. Switch Animation effects back afterwards.
8. **Screen reader (optional):** with Windows Narrator (Ctrl + Win + Enter) on the Guide page, the key prompts are read as "T key" in English and "Taste T" in German.

## M14 follow-up · Hard and above are harder than Medium (0.14.1)

Before this fix, Hard, Extreme and Ultimate played no harder than Medium for the test bot (sometimes easier). Now, from Hard up, enemies attack sooner after each attack, answer straight after blocking one of your hits instead of hiding behind their guard, stop guarding when their Defense bar is almost empty, food restores less, and each fight gets one more enemy per step (Hard, Extreme, Ultimate; co-op gets extra ones). On Hard the Sluice Commander's helpers are a Runner and a Shield instead of two Recruits. Easy and Medium are unchanged. Numbers: `docs/review/08-slice-acceptance.md`, section 5.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173`. To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-qcmrgs
git checkout claude/project-thread-qcmrgs
pnpm install
pnpm dev
```

Optional, the automated checks (the balance check now plays every beat on all five difficulties and takes about 40 seconds):

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

### Steps

1. **Medium is unchanged:** play the gate courtyard on Medium as in M14 step 2: two Recruits and a Shield, then a Runner and a Lookout. It should feel the same as before.
2. **Hard, solo:** Play → Solo → Stage 1 on **Hard**, either founder, and play from the start to at least the bridge. The first fight has one enemy more (a Runner); after you block or hit into an enemy's guard, it hits back quickly instead of standing in its guard. It should feel clearly harder than Medium, but still fair.
3. **Hard courtyard and boss:** press **F1** for the Lab panel, pick *Stage 1* with difficulty **Hard** and the courtyard beat, start. The second group now brings a Shield as well as the Runner and Lookout, and one Recruit is the Black-Iron Enforcer. Then pick the **sluice** beat: when the Commander picks up the Handwheel (phase 2), a **Runner and a Shield** come in, not two Recruits.
4. **Extreme and Ultimate (F1 panel, they are still locked in the normal menu):** same panel, difficulty **Extreme**, then **Ultimate**, the dry fields beat: each step has one more enemy (a Lookout in the second fight on Extreme, a Shield on Ultimate) and enemies come back faster. Ultimate should feel very hard.
5. **Food:** on Hard, get hurt in the dry fields, then walk over the food at the end of the beat: it restores less Health than on Medium (85 %; Extreme 70 %, Ultimate 60 %).
6. **Co-op on Hard (optional):** Same-device co-op on Hard: each fight has one extra enemy compared to solo Hard. Tell me if the Commander still feels too easy in co-op on Extreme (the test bots still beat him as often as on Medium).

## M14 follow-up 2 · Co-op boss on Extreme and Ultimate (0.14.2)

Before this fix, two players beat the Sluice Commander on Extreme about as often as on Medium. He kept raising his guard toward one player while the other hit him in the back, and in the first phase he fought both players alone. Now, from Hard up, an enemy standing between the two players no longer guards (it attacks or moves instead). In co-op on **Extreme** and **Ultimate**, a Runner and a Recruit come in with the Commander at the start, and on Ultimate another Runner joins when he goes to the winch (phase 3). Solo play and Easy/Medium are unchanged. The test bots now beat the co-op boss 11 / 10 / 7 / 6 times out of 12 on Medium / Hard / Extreme / Ultimate (before: 11 / 9 / 12 / 11).

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173`. To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-qcmrgs
git checkout claude/project-thread-qcmrgs
pnpm install
pnpm dev
```

Optional, the automated checks:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

### Steps

You need two players on one keyboard (Player 2 on the numpad, joins with **Num 4**) or a gamepad for Player 2.

1. **Co-op boss on Medium (unchanged):** open the Combat Lab (Village → Academy → Combat Lab, the last item), Player 2 joins with **Num 4**. Press **F1** for the Lab panel, pick *Stage 1*, difficulty **Medium**, **Start at beat 8** (the sluice), Start; both players should be in the fight. The Commander starts alone; two Recruits join in phase 2.
2. **Co-op boss on Extreme:** same F1 panel, difficulty **Extreme**, sluice beat, with both players in. A **Runner and a Recruit** come in with the Commander right at the start; in phase 2 a Runner and a Shield join. It should be clearly harder than on Medium.
3. **Stand on both sides of him:** on Extreme, one player in front of the Commander and one behind. He should not just stand and block one of you; he turns and attacks, or steps away.
4. **Co-op boss on Ultimate:** same panel, **Ultimate**, sluice beat. As on Extreme, and when he goes to the winch (phase 3) another Runner joins.
5. **Solo check:** with only Player 1 on Extreme, the sluice beat: the Commander starts alone (the extra start supports are co-op only).

## M15 · Network phase 2: no input delay, recovery, host takeover and rejoin (0.15.0)

Wi-Fi co-op now shows your own moves at once (no input delay); the other player's moves that arrive late are corrected by a short rollback. A pulled cable, a closed window or a player who stays away no longer ends the session: the missing player's hero first holds its guard, then a restricted "survival proxy" keeps it safe (it follows the other hero, blocks and uses basic attacks; it never uses meter, items, weapons or makes choices) until the player is back. If the host drops out, the guest's computer takes over and the host rejoins through it. You need two computers on the same home network, as in M12.

### Get and start the build

On PC 1:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm release
```

`pnpm release` writes `release\FightForPeace-0.15.0.zip`. Copy it to PC 2, unzip it there and double-click `start.bat`. On PC 1 either start the same zip or run `pnpm dev` and open `http://localhost:5173`. Both computers must run 0.15.0 (a 0.14 copy is refused in the lobby).

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-6rrgxj
git checkout claude/project-thread-6rrgxj
pnpm install
pnpm release
```

Optional, the automated checks:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm smoke:portable
```

### Steps

1. **Start as in M12:** PC 1 Play → Wi-Fi co-op → Host a game; PC 2 Join a game with PC 1's address, port and code; both pick a hero and press Ready.
2. **No input delay:** the line under the stage title now reads **Wi-Fi · input delay 0 · rollbacks … · … ms**. Walk and attack on both computers: your own hero answers at once, like solo play. The other hero may very rarely jump a few pixels when its moves arrive late (that is the rollback). The rollbacks number grows; the delay should stay 0 on a home network (it can rise to 1–3 only if one computer keeps waiting).
3. **Same game on both screens:** fight through Beat 1 together. Enemy positions and health bars must match on both screens.
4. **Pull the cable on PC 2** (or switch off PC 2's Wi-Fi) for about 5 seconds, then plug it back in. PC 1 keeps playing without waiting; after about 1.5 s it shows "Player 2 is disconnected. Their hero holds its guard." and after 3 more seconds "…follows you, guards and uses basic attacks until they return." PC 2 shows "The connection to Player 1 was lost. Reconnecting…" with a countdown. After the cable is back, PC 2 jumps to PC 1's game and Player 2 controls their hero again within a second or two. Both screens show the same thing again.
5. **Long cable pull on PC 2 (optional):** as step 4 but for about 15 seconds. After 6 seconds PC 2 continues on its own ("this computer leads") with Player 1's hero on the proxy. When the cable is back, PC 1's game wins: PC 2 jumps back to PC 1's game and both play on together.
6. **Stay away (courtesy hold):** on PC 2 click another window and stay there. Both games stop; PC 1 shows "Player 2 left the game window." and "If Player 2 is not back in 3 s, play continues…". After 3 s PC 1 counts down and plays on with Player 2's hero guarding, then on the proxy. Go back to PC 2: it shows **You are out of the game** with **Rejoin**. Press it: PC 2 jumps to the current game and Player 2 takes the hero over at the next safe moment (not in the middle of a proxy attack).
7. **Close the guest's window:** close the browser tab (or the whole zip) on PC 2. PC 1 plays on, Player 2's hero on guard and then on the proxy. Start the game again on PC 2, Wi-Fi co-op → Join a game with the **same** address, port and code: PC 2 goes straight into the running game as Player 2 (no lobby).
8. **Close the host's window:** close the browser tab on PC 1 (leave the black server window open, or close it too). PC 2 takes over at once and keeps playing; the line under the title reads "Wi-Fi · this computer leads …", and a note shows "They can rejoin with Wi-Fi co-op → Join: address … · port … · code …". (The first time, Windows Firewall on PC 2 may ask about Node.js: allow private networks.) On PC 1 open the game again, Wi-Fi co-op → Join a game, and type PC 2's address, port and code from that note: PC 1 goes into the running game as Player 1, and PC 2 stays the leading computer.
9. **Pause and End session still work:** Esc on either computer pauses both, both confirm, countdown, play on. End session on one computer still ends it on the other ("Player N left the session.").
10. **Results once:** play a session to the Stage 1 results (it can include a reconnect from step 4). Each computer's player gets the Credits and records once (check the Credits in each village before and after). Rejoining or a takeover never gives them twice.
11. **Languages:** switch PC 2 to 简体中文 or Deutsch and repeat step 4 or 6: the new notices, the away panel and the badge are translated.
12. **Solo and same-device co-op:** Play → Solo and Same-device co-op behave exactly as in M14.

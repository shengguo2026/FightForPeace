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

## M16 · Four heroes: Wind Sentinel and Fire Warden (0.16.0)

The twins join the roster. **Wind Sentinel** is a fast, mobile guard: quick jabs, a whiff-punish follow-up, wide sweeps and launchers. **Fire Warden** is a planted bruiser: some of his moves turn into a takedown when they connect ("contact-confirmed"), and big enemies (the Black-Iron Enforcer and the Commander) resist those takedowns unless they are staggered or guard-crushed. Every hero can now pair with every other one (six pairs, never the same hero twice). The twins together get two extra handoffs, **Crosswind Temper** (Wind → Fire) and **Rising Ember Relay** (Fire → Wind), and their own team finisher, **Twin Guardians' Accord**. Any pair that includes a founder (Mountain or River) uses Confluence Strike, as before.

Two readings I chose (tell me if you want them different): mixed pairs (a founder with a twin) use Confluence Strike, and Wind's Clear-Sky Return only follows Slipstream Backfist when the backfist hits an enemy in the recovery of its own attack (a whiff punish), or when the Lab's "Counter-hit dummies" option is on.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173/?lab` for the Combat Lab (or Village → Academy → Combat Lab). If Vite prints another port, use that one. Stop the server with `Ctrl+C`.

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-8zvpuk
git checkout claude/project-thread-8zvpuk
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

Keys as before. Player 1: move W A S D, Attack T, Jump Y, Guard G, Grab J, Special U, Ultimate H, Team Attack B. Player 2 joins with Num 4 (Attack Num 4, Jump Num 5, Special Num 6, Ultimate Num 2, Team Attack Num 0). F2 opens the Lab settings, F5 the move list. Player 1 starts on the left facing right, so "forward" is D and "backward" is A.

### Steps

1. **Pick the twins in the Lab:** open the Lab, press **F2**, set *Player 1 hero* to **wind**. The panel says "hero Wind Sentinel", F5 lists Windmark Jab, Crossline Reverse, Horizon Heel and the rest. In F2 also tick **Infinite attack meter**. Close F2.
2. **Wind Sentinel basics:** next to Dummy 1: T T T (three-hit string), W + T (Northwind Rise launches), then Y and T in the air. The low attack (D D, then T + G together) is Grass-Cutter Sweep and knocks the dummy down; T on the downed dummy is Skimming Palm. Each hit shows the Wind sprite, not a placeholder.
3. **Wind Specials and Ultimate:** U (Windbreak Combination), D + U (Gale Passage, she slides through), A + U (Skyward Sentinel, a rising guard that launches), H (Four-Wind Vigil, with its own effect burst). Grab with J, then T for strikes and J to throw.
4. **Whiff punish:** A + T (Slipstream Backfist) then D + T right after the hit. With the default settings the second press does **not** become Clear-Sky Return (the Lab may show the reason "needs a whiff punish"). Now press F2 and tick **Counter-hit dummies**. Repeat: A + T, D + T now gives **Clear-Sky Return**. Untick the option again.
5. **Fire Warden basics:** F2, set *Player 1 hero* to **fire**. T T T (Spark Jab, Hammer Cross, Furnace Heel), W + T (Rising Brand launches), the low attack (D D, then T + G: Ashline Reap) knocks the dummy down, and D + T on the downed dummy is **Rising Cast**: it lifts the dummy back onto its feet in a short stagger.
6. **Contact-confirmed takedowns:** D + U (Flashpoint Clinch) next to the dummy: when it connects, it turns by itself into **Flashpoint Takedown** (the dummy goes down). From too far away it whiffs and nothing follows. H (Warden's Crucible) next to the dummy: on contact it becomes **Crucible Takedown**.
7. **Large enemies resist:** press **F1** for the Arena panel, pick *Stage 1* on **Hard**, start at the **courtyard** beat, as Fire Warden. Against the Black-Iron Enforcer, Flashpoint Clinch hits but does **not** turn into the takedown, and Warden's Crucible becomes the shorter **Crucible Braced Strike** instead. In the boss fight (start at beat 8, the sluice) the Commander resists the same way until its resolve breaks ("STAGGER"); then Warden's Crucible becomes the full takedown again. End returns to the Lab.
8. **Hero selection:** open `http://localhost:5173`, Play → Solo → ready → pick a stage → on the hero screen press D (or A) to cycle: Mountain Guardian, River Scout, Wind Sentinel, Fire Warden, and back. Each has its own portrait. In same-device co-op the second player cannot pick the hero the first player already has (the four heroes give six possible pairs).
9. **Every pair, ordinary handoff and Confluence Strike:** in the Lab with Player 2 joined (Num 4), try for example Mountain + Wind, River + Fire. P1 W + T launches the dummy, P2 W + Num 4 (or jump and attack) takes over: "HANDOFF", the Co-op panel counts handoffs. Then P1 T to stagger the dummy, B to invite and P2 Num 0 to confirm: **Confluence Strike** lands.
10. **Twin handoffs:** set P1 to **wind** and P2 to **fire** in F2. P1 W + T launches the dummy: the Co-op panel line reads "handoff on Dummy 1: airborne (Crosswind Temper) …". P2 W + Num 4 (Rising Brand) takes it: "handoffs 1 (reciprocal 1)". Then P2's backward Special (Player 2 faces left, so right arrow + Num 6: Furnace Rising) launches the dummy: the line names **Rising Ember Relay**; P1 jumps in with Y and D + T: "reciprocal 2".
11. **Twin Guardians' Accord:** still Wind + Fire, both meters full. P1 T to stagger, B to invite, P2 Num 0: the finisher is **Twin Guardians' Accord** (its own effect burst, not Confluence Strike). The Accord is also allowed against the resisting Commander in the boss fight, where Confluence Strike is refused.
12. **Languages:** switch to 简体中文 in Settings: the twins are 风神 and 火神, and their moves, the Accord and the two handoff routes are translated. Deutsch keeps the English hero names with German move names.
13. **Founders unchanged:** Mountain Guardian and River Scout play exactly as in M15 (the old golden replays were re-recorded only because the save state now carries the new fields; their results did not change).

## M17 · Mounted system: the greybox pursuit corridor (0.17.0)

The heroes can now ride. Each player gets a **civil-protection bike** (same bike, different plate: P1 **CP-07**, P2 **CP-12**) on a guided pursuit road: the bike always rolls forward at a safe speed, you steer freely across the road (soft lanes pull you back gently when you let go), and you can ride a bit faster or slower. Each hero has **Health** and a visible **Stability** bar. Hits from **Road Riders** and riding into barriers cost Stability; at 0 the bar flashes (**critical, warned**) and the next hit is a **safe crash**: the hero slides off and comes back at the last recovery gate (solo), or, in co-op, waits for a **rescue** (the partner rides alongside and presses Team Attack). Stability slowly refills when you are not hit. A mounted hit never takes the last Health point.

Every hero has six mounted moves: Attack (alongside), Up/Down + Attack (a kick into the next lane), Jump (hop over barriers; on a ramp it is a long ramp hop), Guard (lean: dodges an attack at the right moment and gives a little Stability back), Special (free) and Ultimate (needs a full Attack Bar). Road Riders come in warned (they ride beside you for a moment first), never more than one attack at a time on Medium (two on Hard and above, never both on one hero), and some go after the **equipment** by the road (valve, irrigation pump, signal mast): hit them during their wind-up to save it. At the gate you get the **Civil-Protection Response Record** (Response, Protection, Control, Stability, Assistance, each S/A/B/C, plus Mounted Mastery). The new cheat **STEADYRIDE** keeps Stability full (hits still shake you; the run is marked Cheat-Assisted).

Readings I chose (tell me if you want them different): the pursuit is in the **Lab only** for now (it comes into the stage flow later); a Road Rider knocked off its bike stays at the road edge (fighting on foot comes in M19); the rescue button is **Team Attack** (B / Num 0) next to the downed partner.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173/?pursuit=perimeter-pursuit` to start the pursuit directly (add `&difficulty=hard`, for example, for another difficulty), or `http://localhost:5173/?lab` and pick it in the Arena panel. If Vite prints another port, use that one. Stop the server with `Ctrl+C`.

To test the branch before it is merged instead of `main`:

```powershell
git fetch origin claude/project-thread-hli672
git checkout claude/project-thread-hli672
pnpm install
pnpm dev
```

Optional, the automated checks:

```powershell
pnpm typecheck
pnpm test
pnpm e2e
```

Keys on the bike: **P1** W / S steer, D faster, A slower, T attack (W/S + T kick), Y hop, G lean, U Special, H Ultimate, B rescue. **P2** ↑ / ↓ steer, → faster, ← slower, Num 4 attack, Num 5 hop, Num 1 lean, Num 6 Special, Num 2 Ultimate, Num 0 rescue. The hint bar at the bottom shows each hero's move names.

### Test steps

1. **Start the pursuit:** open `http://localhost:5173/?lab`, press **F1**, pick **Perimeter Pursuit (mounted pursuit, greybox)** on **Medium**, and start it. You ride Mountain Guardian on the CP-07 bike. The top shows the goal, a progress bar with the recovery gates, and "…% to the gate".
2. **Riding:** let go of every key: the bike keeps rolling and settles into a lane. Hold W or S: it steers smoothly and stops at the road edge (also where the road narrows and bends). Hold D: faster; hold A: slower, but never stopped.
3. **Obstacles:** ride into an orange barrier: the bike shakes and Stability drops (Health does not). Next time press **Y** just before it: you hop over it with no loss. Hop on a ramp: a longer, higher hop.
4. **Road Riders:** the first one appears after the first obstacles and rides beside you before it attacks (its wind-up is shown). Hit it with **T** when it is right beside you, or **W/S + T** when it is one lane away (a missed kick makes your steering sluggish for a moment). Hit it until its bar is empty (critical): the next hit knocks it off its bike and it stays at the road edge.
5. **Lean:** when a Road Rider winds up, press **G** at the right moment: "EVADED" and a little Stability back.
6. **Crash and recovery (solo):** let Road Riders hit you until Stability is 0: the bar flashes and "CRITICAL" appears. The next hit is a safe crash: you slide off and restart at the last recovery gate with full Stability and a short protection. Nothing else is lost.
7. **Equipment:** near the valve (top of the road) a Road Rider heads for it. Hit it while it winds up: "INTERCEPT", and the valve stays whole. If you let it kick, the valve is shown damaged and Protection in the record goes down.
8. **Special and Ultimate:** U uses Rampart Escort (no bar needed). Fill the Attack Bar by hitting riders, then H: Open Gate Convoy clears the riders around you and empties the bar.
9. **Response Record:** ride to the greenhouse gate. The Civil-Protection Response Record shows the five lines with S/A/B/C. Home rides again, End goes back to the Lab.
10. **All four heroes:** repeat a short ride with River Scout, Wind Sentinel and Fire Warden (F2, *Player 1 hero*). Each has its own six mounted moves (the hint bar names them). Fire Warden's lean is shorter and his missed kick costs more than Wind Sentinel's.
11. **Co-op:** press **Num 4** to join Player 2 on the CP-12 bike. The camera follows both; if one rides far ahead, that bike slows down and the other gets a little boost, so nobody leaves the screen. The bikes can overlap and never hit each other.
12. **Co-op rescue:** let P2 crash (Stability 0, then one more hit). "RESCUE!" appears over P2 with a short countdown. Ride P1 next to it and press **B**: "RESCUED", P2 rides on with a little Stability. Try again and do not rescue: P2 waits and rejoins at the next recovery gate. If both crash, both restart at the last recovery gate.
13. **Difficulties:** try Easy (fewer riders, softer hits, slower wind-ups) and Hard (two riders can attack at once, but never both the same hero). The warnings and the rescue time stay the same on every difficulty.
14. **STEADYRIDE:** in the Arena panel tick **STEADYRIDE** and start again (or tick *Steering assistance* for a stronger lane pull). Hits still shake the bike but Stability stays full. At the gate the Response Record says "Cheat-Assisted: story progress only, no records".
15. **Languages:** switch to 简体中文 and Deutsch in Settings: the HUD, the move names, the Road Rider moves, the equipment and the Response Record are translated.

## M18 · Advanced weapons, containers and the Preservation Ledger (0.18.0)

There's a new **Greenhouse Test Room**. It is greybox (simple shapes, no final art) and is where all the new Stage 2 systems come together.

**Preservation Ledger.** This is the panel at the top right. It tracks crop beds, a medicinal bed, seedlings on a rack, fish and shrimp tanks, an aeration line, a circulation pump, filtration, glazing and the loading shutter. Each one shows:

- a condition bar
- its state in words: sound, damaged, critical, safe fallback or lost

Above the list is a grade: Flourishing, Sustained, Strained or Damaged.

**Damage.** Enemy strikes, bodies knocked into things, a falling rack and a grenade blast all cost condition. Damage is bounded: each hit takes at most a fixed amount, and a short pause follows before the next one counts. Essential systems never drop below **safe fallback**. Hold **Interact** (J) next to anything damaged to repair it.

**Containers.**

- *Protected* containers (tote, meal carrier, cabinets, locker) open with **Interact** and never take damage.
- *Breakable* ones (Raider Case, Stolen Cargo Crate, Damaged Irrigation Housing) open only when you hit them.

They hold greenhouse food and weapons.

**Pantry.** You eat food by walking over it:

- Wrap and Rice Bowl restore Health.
- Broth restores Defense.
- Rice Cake fills the Attack Bar.
- The rare Harvest Stew gives a bit of all three.

A hero who is already full leaves the food for the partner.

**New weapons.**

- **Service Lance:** two-handed, long reach. Its hook pulls enemies. Press Interact next to a fallen rack while holding it to right the rack at once.
- **Six-Round Sidearm:** exactly 6 shots. Each shot shows a red warning line first, locks you in place and costs Defense. When it's empty, the same button does a pistol-whip.
- **Support Gun:** 24 rounds, shoots 3-round bursts with recoil. When it's empty you strike with the stock.
- **Breaching Grenade:** see the drill below.

**Room pieces.**

- **Seedling rack:** hits make it loose, then it topples onto enemies and drops a support rail you can use as a weapon.
- **Purge-jet valve:** a warned water jet along a marked lane. It pushes everyone and hurts only enemies.
- **Redirect wheel:** hold Interact to swing the jet to the other lane and stabilise the tanks. It's faster with two players.
- **Cargo strap:** ties up the enemy nearest to it inside the marked cargo bay.
- **Grenade drill:** a thrower on the right visibly removes, arms, aims and throws a grenade. Each step has a caption and a sound.

**Choices I made (tell me if you want them different):**

- Heroes' own strikes never damage crops or systems. Only enemies, knocked bodies, the rack and blasts do.
- The purge jet pushes heroes but never hurts them.
- If you interrupt the thrower before it arms the grenade, the grenade drops unarmed and is made safe as soon as you pick it up.
- The grade thresholds are candidates: 90 / 70 / 45.
- Until M19 adds the Stage 2 enemies, the room's enemies are Recruits and Runners standing in for the Claim-Hands.
- The room lives only in the Lab for now.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173/?greenhouse=greenhouse-test-room` to go straight into the room. Add `&difficulty=hard` for another difficulty. You can also open `http://localhost:5173/?lab`, press F1 and pick **Greenhouse Test Room (Preservation Ledger, greybox)** in the Arena panel. If Vite prints another port, use that one. Stop the server with `Ctrl+C`.

To test the branch before it is merged, instead of `main`:

```powershell
git fetch origin claude/project-thread-mh263l
git checkout claude/project-thread-mh263l
pnpm install
pnpm dev
```

Optional, the automated checks:

```powershell
pnpm typecheck
pnpm test
pnpm e2e
```

**Interact** is **J** for P1 and **Num 3** for P2 (the same key as Grab).

### Test steps

1. **Open the room:** go to `http://localhost:5173/?greenhouse=greenhouse-test-room`. You see the greybox greenhouse with every object labelled. The Ledger panel at the top right shows **Flourishing · 100%**, circulation running, and every asset as *sound*.
2. **Protected container:** walk to the **Clinic Cabinet** (back left). The prompt says "Interact: open". Press **J**: the cabinet opens and the Community Harvest Stew appears. Walk over the stew to eat it once you've taken some damage.
3. **Maintenance Locker:** open it the same way. Pick up the **Service Lance** with J and try its moves: Attack, the long Forward Attack, the hook (Back Attack), and air, dash, low and throw.
4. **Breakable containers:** hit the **Raider Case** (middle) until it breaks open. It holds the **Six-Round Sidearm** and a Rice Cake. Try to hit a protected container: nothing happens to it.
5. **Sidearm:** pick it up and attack. A red line flashes first, then the shot fires, and Defense goes down a little. Fire all 6 shots: the weapon tag counts down to 0/6. After that the same button does a pistol-whip. With too little Defense, the shot is refused ("not enough Defense to fire").
6. **Pantry:** take some hits, then walk over the **Fresh Greenhouse Wrap** (left): Health goes up and the wrap is gone. With full Health you walk over food without eating it.
7. **Ledger damage and repair:** let the enemies fight near the crop beds or tanks. When a strike reaches an asset, its bar drops and its state word changes (damaged, critical). The grade in the panel follows. Stand next to the damaged asset and **hold J**: "Hold Interact: repair", and the bar refills step by step. If you let go, the repair stops.
8. **Safe fallback:** keep letting enemies hit the **Circulation Pump** (right). It stops at *safe fallback*, never *lost*. While it's down, the panel says "Circulation: DOWN: tanks draining" and the fish and shrimp tanks slowly lose condition (never below a floor).
9. **Redirect wheel:** hold J at the wheel (middle back) until the bar fills. "FLOW REDIRECTED": the jet lane switches and the tanks are stabilised for a while. In co-op (Num 4 to join P2), with both heroes holding, it fills about three times faster.
10. **Purge jet:** press J at the **Purge valve**. The current lane flashes (warning) and then the jet fires along it. Enemies in the lane are pushed and hurt; heroes are only pushed.
11. **Seedling rack:** knock enemies into the rack (left) or let them hit it. It shows **LOOSE**, then **TOPPLED**: enemies under it are knocked down, the seedlings take damage, and a **Support Rail** drops (pick it up as a weapon). Hold J next to the fallen rack to right it, or press J once while holding the Service Lance ("Interact: fit the coupling hook").
12. **Cargo strap:** pull an enemy into the orange cargo bay (bottom right) and press J at the strap anchor. "STRAPPED": the enemy is held for a few seconds.
13. **Grenade drill:** after a few seconds the thrower on the right starts. Each step gets a warning caption near the bottom of the screen: the grenade is drawn, then armed ("Interrupt now!"), then aimed at you, then thrown. The aim line and blast circle are drawn, and once it's armed a fuse ring and "fuse 2.1 s" count down.
    - Hit the thrower **before it arms**: the grenade drops unarmed; pick it up to make it safe ("GRENADE SECURED").
    - Let it land and **pick the live grenade up with J and throw it back**: the fuse doesn't reset.
    - Or just get clear: the blast pushes everyone in the circle and does limited damage to nearby assets.
14. **Support Gun:** in the Lab (`?lab`), F2, set *Dummy 1 weapon* to **Finite Burst-Command Support Gun**. Its bursts fire 3 rounds with recoil. Disarm it and pick it up: you get exactly the rounds that were left. When it's empty, the button does a stock strike.
15. **Arena panel:** press **F1** in the room. The Arena panel lists the Ledger (every asset with its condition and state) and the record: containers opened or broken, food eaten, repairs, asset hits, rack, jet, redirects, lashes and grenades.
16. **Languages:** switch to 简体中文 and Deutsch in Settings. The Ledger panel, asset and container names, prompts, captions and callouts are translated.

## M19 · Stage 2 enemies and Marek Vane (0.19.0)

What's new: eight Stage 2 enemy roles with Elite and Master versions per difficulty, one trial room per role, two Stage 2 beats (Loading Yard, Filtration Control), the River Road mounted intercept, and Marek Vane's fight in the Dispatch Yard with Tomas Rell as a story character.

Choices you may want changed (all candidates):

- **Difficulty:** Elite versions from Hard, Master versions at Ultimate. The Escort Enforcer appears from Hard, the Signalman from Extreme. At most one firearm aim at a time up to Hard, two from Extreme.
- **Intercept opening:** if you crash Marek's bike, he starts the yard knocked down with half his Resolve. If he is still riding at the finish, he only starts knocked down.
- **Marek's summon:** a hit does not cancel Command Pressure. His supports arrive once per phase.
- **Scorched Claim** starts below about 30% Health in his unarmed phase. Interrupting it costs him Resolve; if he finishes it, the research cargo is left Critical, never lost.
- **Capture:** breaking his Resolve at 30% Health or less is the clean surrender. Taking his Health to 0 while he still has Resolve is the forced capture.
- Tomas's lines are short placeholder story text.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

To test the branch before it is merged, instead of `main`:

```powershell
git fetch origin claude/project-thread-lbfhn9
git checkout claude/project-thread-lbfhn9
pnpm install
pnpm dev
```

Optional, the automated checks:

```powershell
pnpm typecheck
pnpm test
pnpm e2e
```

Every room below also opens from the Lab: `http://localhost:5173/?lab`, press **F1**, and pick it in the Arena panel. Add `&difficulty=easy|medium|hard|extreme|ultimate` to any room URL.

### Test steps

1. **Claim Hand:** open `http://localhost:5173/?greenhouse=trial-claimhand`. They walk in with the Claim-Hand art. When their quick jab connects, it chains into a heavier cross.
2. **Glasshouse Runner:** `?greenhouse=trial-glassrunner`. Fast runners that dart in and out between the crop beds.
3. **Cargo Reaver:** `?greenhouse=trial-reaver`. Let one grab you: the Aisle Turn swings you round to its other side before the hit.
4. **Revolver Marauder:** `?greenhouse=trial-marauder`. Each one starts with a revolver (3 rounds on Easy up to 6 on Extreme). A red line flashes before each shot. On Medium only one Marauder aims at a time. When the gun is empty, they throw it away (Empty Cast) and fight by hand. Knock the gun out of their hands: they never pick up another firearm.
5. **Systems Saboteur:** `?greenhouse=trial-saboteur`. The Saboteur walks to a control and works on it in three steps (Access, Tamper, Commit), each with a caption. Hit it during a step: the step is lost and it backs away (Exit Route). Leave it alone: the control goes to *safe fallback* (repairable with J, never lost). Two Saboteurs never sabotage at the same time.
6. **Filtration beat:** `?greenhouse=beat-filtration`. Here the Saboteur is the grenade thrower. Hit it before it arms the grenade: it drops it and is shaken.
7. **Road Rider on foot:** `?greenhouse=trial-rider`. They arrive knocked down off their bikes and get up protected.
8. **Stage 2 Enforcer:** `?greenhouse=trial-enforcer2&difficulty=hard`. It walks in front of a Marauder as a shield (Lockstep Escort). Hit the Enforcer to break the escort.
9. **Jackal Signalman:** `?greenhouse=trial-signalman&difficulty=extreme`. It calls orders with a caption. **Crossfang**: two allies come at you from above and below in depth. Hit the Signalman during its call: "Signal break" and it has to wait before calling again. With `&difficulty=ultimate`, it can also pull a wounded ally out: an arrow warns at the edge where the replacement will enter.
10. **Loading Yard beat:** `?greenhouse=beat-loading-yard`. Mixed Stage 2 group in one room.
11. **Mounted intercept:** `?pursuit=marek-intercept`. Ride right with **D**. Marek appears on his own dark bike with the orange name tag and never rides away. Break his Stability (attacks when it is critical) to crash him: the result says so, and after a moment the Dispatch Yard opens with Marek knocked down and only half his Resolve. If you reach the gate while he is still riding, he starts knocked down with full Resolve.
12. **Marek, phase 1 (Armed Command):** `?greenhouse=boss-marek` (or `&intercept=1` for the crashed opening). Tomas stands at the left with a subtitle line. The boss bar shows "Phase 1: Armed Command", his Resolve and "24 rounds". He fires three-round Jackal Bursts after a red warning line, and once in the phase calls his supports (Claim Hands on Easy and Medium, Elite Claim Hand and Elite Marauder on Hard).
13. **Disarm transition:** break his Resolve. He drops the support gun. Pick it up with **J**: "Disarmed" and the fight changes to phase 2. If he empties the gun first, he throws it aside and the phase changes too.
14. **Predator Unbound and Scorched Claim:** in phase 2 he fights unarmed and faster. When his Health is low, he runs to the **Research Cargo**: the asset shows THREATENED. Hit him during it to stop it (his Resolve drops). If he finishes, the cargo goes to Critical.
15. **Capture:** break his Resolve when he is at 30% Health or less: he kneels and surrenders, and the supports lose their nerve. In another run, take his Health to 0 while his Resolve still has some left: he is pinned for the forced capture. Each ending has its own caption and art.
16. **Every difficulty:** repeat steps 12 to 15 with `&difficulty=easy` and `&difficulty=ultimate`. Ultimate has Master supports and stronger numbers.
17. **Languages:** switch to 简体中文 and Deutsch in Settings. Enemy names, room names, captions, Tomas's lines and the intercept text are translated.

## M20 · Stage 2 greybox journey (0.20.0)

What's new: Stage 2 "Prosperity Under Siege" plays as one journey of 14 beats, from the Perimeter Pursuit through the greenhouse rooms to Marek's Dispatch Yard. Three rooms are optional branches, the Preservation Ledger now counts across the whole stage, and the stage ends with epilogue cards and a results screen with Preservation, Response, the branches, Marek's capture and the Ledger.

Choices you may want changed (all candidates):

- **Preservation grades** use the approved names: Flourishing, Secure, Strained, Recovered.
- **Branches by lane:** at a two-way exit, leave on the upper half of the floor for the optional branch, on the lower half for the main route. Signs at the exit name both.
- **Branch goals:** Aeration Annex = free the worker and keep the backup aeration at least damaged; Seed Reserve Bay = keep both seed reserves at least damaged; Medicinal Preparation Room = free the researcher and read the provenance ledger.
- **Weapons carry** from beat to beat with their exact durability and rounds (never a grenade).
- **Results weights:** Preservation 35, Response 20, Continues 20, Time 25. Time targets on Medium: 25, 35 and 45 minutes for S, A and B.
- **The epilogue** is text cards for now (Next, or Skip to the results).
- Stage 2 opens only from the Lab or the URL until the shell's stage select in M21.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

To test the branch before it is merged, instead of `main`:

```powershell
git fetch origin claude/project-thread-jyfped
git checkout claude/project-thread-jyfped
pnpm install
pnpm dev
```

Optional, the automated checks:

```powershell
pnpm typecheck
pnpm test
pnpm e2e
```

Stage 2 also opens from the Lab: `http://localhost:5173/?lab`, press **F1**, and pick "Stage 2: Prosperity Under Siege (full journey)" in the Arena panel (with a start beat). Add `&difficulty=easy|medium|hard|extreme|ultimate` to any URL below.

### Test steps

1. **Full journey:** open `http://localhost:5173/?stage=2&difficulty=easy`. The top line reads "Stage 2 · Beat 1/14: Perimeter Pursuit". Ride right with **D** and stop the raiders. When the pursuit completes, the stage moves on by itself to the Loading Yard (Checkpoint 1).
2. **Room beats:** in the Loading Yard, the Preservation Ledger panel is at the top right. Clear the raiders, then walk right past "GO →" into the Aquaculture Hall.
3. **Branch choice:** after clearing the Aquaculture Hall, two signs appear at the right edge. Leave on the **upper** lane: you enter the Emergency Aeration Annex (Beat 4). Free the maintenance worker (hold **J**) and stop the Saboteur, then leave: the banner says "BRANCH COMPLETE". The results later list it as completed with its museum artifact (Early Aerator Impeller).
4. **Skip a branch:** start again with `?stage=2&beat=6&difficulty=easy` (Crop Channels). Leave on the **lower** lane: you go straight to the Medicinal Wing and the Seed Reserve Bay counts as skipped.
5. **Fail a branch:** `?stage=2&beat=7&difficulty=easy` (Seed Reserve Bay). Let the raiders break both seed reserves, then leave: the banner says "BRANCH GOAL MISSED", and the stage still goes on.
6. **Weapon carry:** pick up a weapon in one room and walk into the next: the hero still holds it with the same durability.
7. **Checkpoints and continues:** get knocked out after the Hygiene Vestibule (Checkpoint 2). A continue puts you back at the vestibule with the Ledger and branch results as they were there.
8. **Intercept:** `?stage=2&beat=13&difficulty=easy`. Ride the dispatch bikes and crash Marek's bike. The Dispatch Yard then opens with Marek knocked down and half his Resolve.
9. **Capture and evidence:** in the Dispatch Yard, capture Marek (break his Resolve at low Health, or take his Health to 0). The banner says "MAREK CAPTURED · SECURE THE CRATE"; hold **J** at the weapon crate.
10. **Epilogue:** the epilogue cards come one by one: the capture, the Ledger lines per system, one card per completed branch, the community recovery by Preservation grade, and the empty depot. Use **Next**, or **Skip to the results**.
11. **Results:** the Stage 2 results show Preservation, Civil-Protection Response, Continues and Time with grades, the Preservation and Response lines, Marek's capture line, "Optional branches" with each outcome, and the itemised Preservation Ledger.
12. **Co-op:** repeat step 1 with two players (P2 joins as usual). Both ride in the pursuit and both carry weapons between rooms.
13. **Every difficulty:** play a few beats with `&difficulty=hard` and `&difficulty=ultimate`.
14. **Languages:** switch to 简体中文 and Deutsch in Settings. Beat names, lane signs, branch names, artifacts, the epilogue and the results are translated.

## Fix · Hero size with weapons and armed walking (after M20)

Findings from the M7 tests: a hero holding a weapon was drawn smaller than without it, and walking heroes slid without visible steps.

- **Size:** some hero sheets were drawn at another figure size than the hero's idle sheet (Mountain's staff sheets about 12 % smaller, several of his other sheets and River's walk larger). Each such sheet now carries a draw scale, so a hero keeps one size across poses.
- **Walking:** the delivered walk sheets repeated half a walk cycle, so the arms and legs never swapped. All four heroes now have redrawn walk sheets (Mountain, Wind, Fire v2; River v3) with a full two-step cycle.
- **Walking with a weapon:** Mountain and River have new staff and handwheel walk sheets. Wind and Fire have no weapon sheets yet (as before).

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

### Test steps

1. Open `http://localhost:5173/?lab` and press **F1** to hide the panels. Mountain stands next to the workstaff on the floor.
2. **Mountain's walk:** without a weapon, walk left and right (**A**, **D**). His arms and legs swap every step (left arm forward with the right leg, then the other way round), and he is the same size walking and standing.
3. **Staff size and walk:** note Mountain's head height against the barricade, then pick up the staff (**J**). He stays the same size. Walk: a real walk cycle with the staff held steady across the body, legs swapping every step. Drop or throw the staff (as in your M7 test): still the same size.
4. **Handwheel:** pick up the handwheel. Same size as without it; walking is a real walk cycle with the wheel held in front of the chest.
5. **Other poses:** without a weapon, guard (**G**), dash (**D D**), grab the dummy (**J**) and get hit: Mountain keeps one size in every pose.
6. **River:** press **Num 4** so Player 2 (River) joins. Walk her with the arrow keys: arms and legs swap every step, same size walking and standing. She picks up the staff, then the handwheel (**Num 3**), and walks with each: same size, a real walk cycle with the weapon held steady.
7. **Wind and Fire:** in the Lab press **F2**, set *Player 1 hero* to **wind**, close F2 and walk: arms and legs swap every step, same size walking and standing. Repeat with **fire**.

## Fix · Weapon size on the floor and Wind and Fire holding weapons (after the M10 tests)

Findings from the M10 tests:

- **Handwheel size:** the handwheel on the floor was drawn about twice as wide as the one in a hero's hands. Loose and flying weapons are now drawn at the size the hero sheets show them in hand: the handwheel is much smaller on the floor, and the workstaff on the floor is now about as long as a hero is tall (it was shorter than in the hands).
- **Wind and Fire with a weapon:** they have no Stage 1 weapon sheets yet, so their hands looked empty. Until those sheets are drawn (prompts in `art/prompts/codex_m10_findings.md` in the project files), they hold the weapon's prop picture in front of the chest. When the sheets are imported, the real poses replace it automatically.
- **River's walk:** a new walk sheet (v4) with relaxed arms is requested in the same prompt file; the game keeps v3 until it is delivered.
- **Move Preview for complex moves:** added to the roadmap under M21.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

### Test steps

1. Open `http://localhost:5173/?lab` and press **F1** to hide the panels. The handwheel on the floor is now small (about the size Mountain holds it in his hands); the workstaff on the floor is long.
2. Pick up the handwheel with Mountain (**J**): it looks the same size in his hands as on the floor. Throw it (**J** next to nothing) and watch it spin and land: same size all the way.
3. Drop it and pick up the staff: about as long on the floor as in his hands.
4. **Wind:** press **F2**, set *Player 1 hero* to **wind**, close F2 and F1. Pick up the handwheel: she holds it in front of her chest, and it follows her when she walks and turns. Pick up the staff: she holds it slanted in front of her.
5. **Fire:** repeat step 4 with **fire**.
6. **Academy:** Village → Academy → Free Practice with Wind or Fire; pick up the weapons there: the same as in step 4.

## Fix · River's walk with relaxed arms (v4) and Wind's and Fire's weapon sheets

River's walk sheet v4 replaces v3: her arms now hang and swing loosely at hip height instead of one forearm staying raised. Same size and stride as v3.

Wind now has her own Stage 1 weapon sheets (staff A and B, handwheel, staff walk, handwheel walk), so she holds and swings the weapons in her own poses instead of the placeholder. Fire has the same five sheets. The placeholder prop from the previous fix is no longer used by any hero.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

### Test steps

1. Open `http://localhost:5173/?lab`, press **Num 4** so Player 2 (River) joins, and press **F1** to hide the panels.
2. Walk River left and right with the arrow keys: both arms swing low and relaxed, no forearm raised in front of the chest; legs and arms still swap every step.
3. She is the same size walking as standing, and next to Mountain looks as before.
4. **Wind:** press **F2**, set *Player 1 hero* to **wind**, close F2 and F1. Pick up the handwheel (**J**): she holds it in both hands at chest height; walk: a real walk cycle with the wheel held steady. Throw it (**J**): wind-up and release poses.
5. Pick up the staff: she holds it across her body; walk with it; attack (**T**, forward + **T**, up + **T**, in the air): her own staff poses. Wind keeps one size with and without a weapon.
6. Repeat steps 4 and 5 with **fire**: his own weapon poses, one size with and without a weapon.

## Fix · M11 visual findings (chest marker, co-op hints, water, hero size, P2 hero, hit flash)

Six fixes from the M11 tests:

1. Beat 8: after the boss gives up, the orange winch ring and its three pips disappear, so the only floor marker left is the glow on the evidence chest.
2. The hold prompts (chest, door, winch) sit above the controls bar at the bottom, also in co-op where both players' bars are shown.
3. The blue water triangle on the left side of Stage 1 is removed.
4. Heroes no longer grow when they attack: about 40 action poses that were drawn larger (or smaller) than the idle sheet are now scaled to the idle size, mostly Mountain and River, and a few of Wind and Fire.
5. One hero per player: in a solo start, Player 2 joining later gets a different hero from Player 1 (the first one in the roster Player 1 is not playing).
6. The white hit flash shows at most once every 12 frames per enemy, so an enemy hit by both heroes in a row no longer stays white (it looked like a grey ghost under the dimmed view).

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

### Test steps

1. Open `http://localhost:5173/`, start Stage 1 solo with **River**. On the left of the start area there is no blue triangle of water any more.
2. Press **Num 4** so Player 2 joins: Player 2 is **not** River (it is Mountain). Start again solo with **Mountain**: Player 2 joins as River.
3. With both players on the field, walk to an item or door with a hold prompt: the prompt sits above both control bars and is fully readable.
4. Attack with every hero (jabs, specials, dashes, grabs): the hero keeps the same size as when standing. River and Mountain were the most visible before.
5. In co-op, both heroes hit the same enemy at once: the enemy flashes white briefly, but never stays white or grey for a second.
6. Play to beat 8 and beat the boss: after the surrender, the winch ring and its pips are gone, and the evidence chest has the only glow. Walk to it: the hold prompt is visible, also in co-op.

## Fix · Kneeling ghosts, leftover names, localized labels and title music (after the M11 fix tests)

Five fixes from the second round of M11 tests:

1. Kneeling ghosts in co-op: a new camera lock started its enemy numbering again, so a new enemy could get the same number as a recruit still kneeling from the lock before. The two then shared one picture, which flickered between the kneeling recruit and the new enemy. New enemies now skip numbers that are still in use.
2. The controls bar at the bottom and the pause line use the chosen language.
3. Names of enemies who fled or were cleared are removed, and an enemy who flees, kneels or is defeated no longer carries its name.
4. The words over the fighters use the chosen language: "P1 · River" (P1 · 河神), enemy names, enemy move names and their defense words, "Ultimate ready", ESCAPE / GRABBED / RESTRAINED and the weapon names with their condition.
5. Title music: browsers allow sound only after the first key press or click. The title music was asked for before that and was lost; it now starts with your first key press or click.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

### Test steps

1. Open `http://localhost:5173/` in a fresh tab and press any key or click: the title music starts right away.
2. In Settings choose **中文**. Start Stage 1 solo and let Player 2 join with **Num 4**: the controls bar at the bottom is in Chinese for both players, and the names over the heroes read "P1 · 河神" and "P2 · 山神". Click outside the game window: the pause line is in Chinese.
3. Fill the Ultimate bar: "奥义就绪" shows under the hero. Enemy names over their heads are Chinese.
4. Play beat 1 in co-op on Easy. In the first fight one recruit kneels. In the second fight (shield enemy) no grey figure flickers over the enemies.
5. After each fight, no enemy names stay floating where the enemies were.

## M21 · Campaign, Museum, Store and research (0.21.0)

What's new: Stage 2 now opens from the normal Play flow once Stage 1 has been completed on the profile, with its own What's New cards and briefing. The village has a Museum (pictures, cinema, music, sounds, collection, and an Investigation page with the Sponsor Dossier and formula research). The Store has two Stage 2 outfits per hero and three bought moves each for Wind Sentinel and Fire Warden, every technique with its tactical purpose and a Preview. The Academy has a Move List with a Move Preview (watch a route, pause, step, half speed, then Try it) and a Stage 2 route of twelve lessons. Twelve Stage 2 achievements count from Stage 2 runs. Saves move to version 3: an existing profile that cleared Stage 1 opens Stage 2 automatically.

Choices you may want changed (all candidates):

- **Twins' move names:** Wind Sentinel: Crosswind Arc (Up + Special), Low Gust Sweep (Down + Special), Eye of the Storm (Backward + Ultimate). Fire Warden: Kindling Uppercut (Up + Special), Hearth Sweep (Down + Special), Banked Coals (Backward + Ultimate). Crosswind Arc and Kindling Uppercut are visible from the start; the others appear after a Stage 1 clear. Prices and Hero Mastery levels follow the slice moves.
- **Stage 2 unlock:** any full Stage 1 run that reaches the end opens Stage 2, Cheat-Assisted included (story progress is narrative). A Lab run from a later beat does not.
- **What's New** shows once per profile before the first Stage 2 run; the Academy has a button to read it again.
- **The Stage 1 intro and ending** stay Stage 1 only. Stage 2 has a five-line briefing; its chapters and cinematics are M22.
- **Museum:** pages of a stage that is not open are hidden; locked entries of an open stage show as "Undiscovered". Collection objects use a colour card until their art exists. Music plays the existing Stage 1 cues.
- **Seize the Moment** (achievement) counts as "support gun disarmed with at least one round left"; whether the hero then used or secured the gun is not tracked yet.
- **Stage 2 outfits** use the same placeholder colour treatment as the slice outfits.
- **My Combos** keeps its existing Watch playback; the Preview buttons are in the Move List and the Store.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-2c2k3w
git checkout claude/project-thread-2c2k3w
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

Optional, the automated checks:

```powershell
pnpm typecheck
pnpm test
pnpm e2e
```

### Test steps

Open `http://localhost:5173/` (the shell). Your saved profile is migrated to save version 3 when it loads.

1. **Migration:** with your existing profile (which cleared Stage 1), open **Play → Solo**. On the stage screen, the Stage choice now offers "Prosperity Under Siege" as well as Stage 1. Your Credits, outfits, techniques, Hero Mastery and records are unchanged (check **Records**).
2. **Locked stage on a new profile:** create a new profile (Settings → Profiles), go to **Play → Solo**. Only Stage 1 can be picked; a line under it reads "🔒 Prosperity Under Siege · opens after you complete The Broken Water Pact once".
3. **Unlock:** with that new profile, play Stage 1 to the end (or with Elder's Secrets to make it quicker). On the results, a green line says "New stage open: Prosperity Under Siege" and how many Museum entries are new.
4. **Stage 2 from the shell:** **Play → Solo**, change the Stage choice to "Prosperity Under Siege", pick a hero. The What's New cards appear (six: twins, mounted pursuit, Ledger, weapons, containers, enemy roles); use **Next** or **Skip**. Then the elder's Stage 2 briefing and the objective, then readiness and the stage starts on the Perimeter Pursuit. Play it a second time: What's New does not show again.
5. **Co-op and Wi-Fi:** repeat step 4 in same-device co-op. Over Wi-Fi, the host now has a Stage choice in the network lobby (only stages open on the host's profile).
6. **Museum:** from the village choose **Museum** (it shows "· n new" when there is something unseen). Try each section: a picture opens large; Cinema → Play shows the Stage 1 intro or ending (Esc or Skip returns); Music → Listen plays the cue (Stop ends it, leaving the Museum stops it); Sounds → Play; Collection shows the brass gears with its text. Undiscovered entries are greyed out with no name.
7. **Investigation:** Museum → Investigation shows the Sponsor Dossier (confirmed facts and the current theory) and Formula research with four milestones. After you finish Stage 2, Quarantine and Provenance is complete, the theory changes to one supplier, and the sealed weapon crate appears in the Collection. Completed branches add their artifacts (for example the Early Aerator Impeller).
8. **Stage 2 outfits:** **Store → Wardrobe** lists two new outfits per hero (Greenhouse Builder, Harvest Heritage, Channel Patrol, Lantern Festival, Greenhouse Response, Prosperity Festival, Pump-House Response, Ember Heritage). Buy one, wear it, and start a stage: the hero has its colour.
9. **Technique Library:** **Store → Techniques**: focus a move to see its input, slot and tactical purpose. Press **Preview**: the move plays on a training dummy; **Back** returns to the Store.
10. **Move List and Preview:** **Academy → Move List and Preview**. Pick a hero, then a showcase route (for Fire Warden, "Furnace to Crucible"). The route plays on a dummy and loops; the steps are listed in your keys and the current step is highlighted in yellow, landed steps get a ✓.
11. **Preview controls:** click **Pause**, **Step** (plays to the next step and pauses), **Half speed**. With the keyboard, press **Esc** for the same controls in the pause menu.
12. **Try it:** press **Try it** (or your Attack key while watching). Now you play: perform the steps and watch them tick off; "Route complete!" shows at the end. **Watch again** returns to the demonstration.
13. **Pair route:** Wind Sentinel → "Crosswind Temper (with Fire Warden)": Fire Warden joins as the demonstration partner and answers your hit. Try it and land the Reciprocal Handoff with the partner.
14. **Stage 2 Academy:** in the Academy, the "Stage 2 Academy" route lists twelve lessons (locked with a note on a profile without Stage 2). Try "Reciprocal Handoffs" (demonstration with the partner, then practise) and "Return the breaching grenade" (opens the filtration room on Easy). The lesson's goal shows at the top.
15. **Achievements:** **Records** lists the twelve Stage 2 achievements once Stage 2 is open. "Peace in the Glasshouse" is earned by finishing Stage 2 (also Cheat-Assisted, without Credits); branch achievements by completing that branch.
16. **Languages:** switch to 简体中文 and Deutsch in Settings. Stage select, What's New, the Museum, the Dossier, research, the Move List, Preview controls, the new moves, outfits, achievements and lessons are translated.

### Fix · M21 findings (Guo, 13 Nov)

1. **Fleeing enemies:** play Stage 2 and defeat the claimhands, glassrunners and reavers. When they flee, each one faces the way it runs (left when running left). The same check holds in Stage 1.
2. **Museum icon:** in the village menu, **Museum** now has its own icon (a small museum building).
3. **Museum menu:** **Museum** opens a list of sections (Picture, Cinema, Music, Sounds, Collection, Investigation), each with "· n new" when something is unseen. Pick one: the title reads "Museum · Picture" and only that section's entries are listed; focusing an entry shows it on the right. **All sections** (or Esc) goes back to the section list; Esc again returns to the village.
4. **Store previews:** **Store → Wardrobe**: focus an outfit; the right panel shows the hero in the standard colours and in this outfit, side by side. **Store → Collection**: focusing a badge shows how it appears in the village footer next to your name.
5. **Next lesson:** start any Academy lesson, press **Esc**: the pause menu has **Next lesson**, which starts the following lesson of the route at once. When a lesson is mastered, the lesson panel also names the next lesson.
6. **Lab panels:** open the Training Lab (the panels with "F1 hide · F2 settings" show), go back and start an Academy lesson: the Lab panels no longer show over the lesson. The F keys belong to the Lab and work there as before.

### Fix · rescued workers run the way they move (Guo, 13 Nov)

1. Play Stage 2 to the Emergency Aeration Annex (or Stage 1's fields) and free a worker. After cheering, the worker runs home to the left: the body and legs now run left (the head looks back over the shoulder, as drawn).

## M22 · Stage 2 media and localization (0.22.0)

What's new: all approved Stage 2 art, clips and music are in the game. Stage 2 now opens with four story chapters (Prosperity Interlude, Roadside Deception, Guest Under Observation, The Night Signal) and ends with two (Community Recovery, Justice and Mystery), all subtitled in English, Chinese and German. The score Prosperity Under Siege plays through the stage, including Marek's four states with short transition stingers. The twelve Stage 2 areas have their backgrounds; the pursuit shows the riders on their bikes; the heroes hold the lance, sidearm and support gun in their own poses; the greenhouse objectives, containers, food, villagers and loose weapons use their art. Settings has a voice language and an optional system voice. The Museum has Stage 2 pictures, the six chapters and the seven cues.

Choices you may want changed (all candidates):

- **Narration text:** I wrote the subtitle lines for all 33 clips from the spec and the clip descriptions (the elder narrates the Interlude; the twins, Tomas and a narrator speak in the other chapters). Change any wording and I will update all three languages.
- **Clip audio:** every clip plays silent with the chapter's music under it (the Flow soundtrack is removed).
- **Voice:** there are no recorded voice files yet, so lines are subtitles only. "System voice for narration" (off by default) reads the line with the Windows voice as a prototype; it is never saved as a file and is not for the commercial release.
- **Ambience and sound effects:** no recordings were delivered, so the area beds (night road, night yard, aeration, ventilation, irrigation, pumps) and the new weapon, warning and pursuit sounds are synthesized placeholders. A raised firearm plays a priority warning and shows a caption ("[a firearm is raised]").
- **Stage 2 ending order:** the in-game epilogue cards (capture, Ledger, branches) come first, then the two chapters, then the results. Community Recovery shows the "flourishing" inserts for Flourishing and Secure and the "damaged but recoverable" inserts for Strained and Recovered, and its last line names the grade.
- **Outfits:** the Store shows the delivered outfit pictures; in the stage the outfit is still a colour tint of the standard sheets.
- **Visual effects sheets** (wind, fire, gunfire, grenade, water, mount, warnings) are imported but the effects still use the M13 effect art.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-phmsb9
git checkout claude/project-thread-phmsb9
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

Optional, the automated checks:

```powershell
pnpm typecheck
pnpm test
pnpm e2e
```

### Test steps

Open `http://localhost:5173/` (the shell), with your profile that has Stage 2 open.

1. **Title loop:** the village plays the Stage 2 title loop over the Stage 2 menu picture.
2. **Intro chapters:** **Play → Solo**, choose "Prosperity Under Siege", pick a hero (skip What's New if it shows). The chapter name "Prosperity Interlude" shows at the top; the twelve Interlude clips play with the elder's subtitles and the music "Water Became a Future". No Flow soundtrack plays.
3. **Skip:** **Skip** ends the current chapter and starts the next (Roadside Deception, then Guest Under Observation, then The Night Signal). **Skip all chapters** goes straight to the briefing. Esc pauses.
4. **Still pictures:** Settings → Accessibility → Cinematics: **Still pictures**. Start Stage 2 again: the same chapters play as still pictures at the same pace with the same subtitles.
5. **Speakers:** with Speaker labels on, the lines name Wind Sentinel, Fire Warden, Tomas Rell, the Elder or the Narrator.
6. **Pursuit:** on the Perimeter Pursuit, the road background shows (night road, glasshouses). Your hero rides the bike from the art: steering up or down tilts the bike, attacks, the hop and the lean have their own poses, a crash and a downed rider too. The raiders and, in the Intercept, Marek ride their own bikes. Music: "Roadside Vigil", then Marek's "Gilded Jackal" mounted state.
7. **Rooms:** every Stage 2 room has its background (yard, aquaculture hall, annex, vestibule, crop channels, seed bay, medicinal wing, prep room, filtration, production hall, dispatch yard). Objectives (aeration line, filtration, pump, medicinal beds, seed reserve, dispatch control), containers, the shutter and the seedling rack use their pictures and change when damaged, opened or broken; labels and bars still show the state in words.
8. **Music in the rooms:** exploring plays "Glass and Green", a fight switches to "Alarm Through the Channels", and when a Ledger asset turns Critical "Protect the Living System" takes over. Each area has its ambience bed under the music (quiet placeholder sounds).
9. **Villagers:** the maintenance worker in the Aeration Annex and the researcher in the Prep Room are drawn with the Stage 2 villager art (trapped or hiding, helped up, walking to safety).
10. **Weapons:** pick up the lance, the sidearm and the support gun: the hero holds each in its own stance and attacks with the weapon's poses (Wind and Fire use both lance sheets; Mountain and River the shared one). Weapons on the floor use their pictures (a bent lance when it is worn, an open cylinder when the sidearm is empty).
11. **Firearm warning:** when Marek or a hero raises a firearm, a warning sound plays and a caption "[a firearm is raised]" shows at the bottom; the shot or burst follows with its own caption.
12. **Marek's music:** in the Dispatch Yard the armed phase plays "Gilded Jackal" armed, Predator Unbound switches with a stinger, Scorched Claim and the surrender each have their own state.
13. **Ending:** finish Stage 2. The epilogue cards come first, then "Community Recovery" (its inserts and last line follow your Preservation grade), then "Justice and Mystery", then the results with "What We Protected".
14. **Voice settings:** Settings → Accessibility: **Voice language** (Same as text, English, 简体中文, Deutsch, Off) and **System voice for narration**. Turn the system voice on and play a chapter: the lines are read aloud by Windows in the chosen language (if Windows has that voice installed); turn it off: subtitles only.
15. **Museum:** Picture has the Stage 2 key art, story pictures and the portraits of Tomas and Marek; Cinema plays the six chapters (the intro chapters after a Stage 2 start, the ending chapters after a clear); Music lists the seven cues and plays them.
16. **Store:** **Store → Wardrobe**: the Stage 2 outfits show their delivered picture above the colour preview.
17. **Languages:** switch to 简体中文 and Deutsch: chapter names, every subtitle, the voice settings, the captions and the Museum entries are translated.

### Fixes after the first test

Pull the branch again (`git pull`), then `pnpm install` and `pnpm dev` as above.

1. **Walking with a weapon:** in Stage 2, pick up the lance, the sidearm and the support gun in turn and walk. The legs step through the walk cycle and the weapon is drawn in the hero's hand; standing still shows the weapon's ready stance as before. (Dedicated armed walk sheets were never delivered; see the reply in the thread.)
2. **Museum collection:** **Museum → Collection**: each unlocked piece shows its picture above the description: the brass gears (after Stage 1), the aerator impeller, the seed tin and the field card (by branch) and the sealed weapon crate (after Stage 2).
3. **Riding move list in your language:** switch to 简体中文 (or Deutsch) and start the Perimeter Pursuit. The control list at the bottom names each riding move in that language (for Wind: 掠身掌, 横风踢, 风道跃, 横风侧倾, 守护切入, 通途守望).

### Walk and flee sheets (AW01–AW25)

Pull the branch again (`git pull`), then `pnpm install` and `pnpm dev` as above.

1. **Armed walks:** in Stage 2, pick up the lance, the sidearm and the support gun in turn and walk, with each of the four heroes. The hero walks with the weapon in hand, drawn on the walk sheet (no floating weapon), and keeps the same size as when standing.
2. **Enemy flee runs:** beat a Claim Hand, Reaver, Marauder, Saboteur, Glasshouse Runner, Signalman or Enforcer until it flees (or let the Road Rider lose its bike): it runs away on a six-pose run.
3. **Extra walks:** the Road Rider on foot, the Revolver Marauder after losing its revolver and Marek in Scorched Claim step through a walk instead of sliding.
4. **Villagers:** free the worker in the Aeration Annex and the botanist in the Prep Room: each walks out on a walk cycle.
5. **Stage 1 runs (S1W01–S1W03):** in Stage 1, beat a Pressed Recruit until it flees: it runs away on a six-pose run instead of the old two poses. Free the workers: both kinds run home on a six-pose run, facing the way they go.

### Fixes after the M22 test on main (14 Nov)

1. **Title screen follows the latest beaten stage:** with a profile that has Stage 2 open but not yet completed, the village shows the Stage 1 title loop and the Stage 1 menu picture. Complete Stage 2 once (any difficulty; Cheat-Assisted counts) and go back to the village: it now shows the Stage 2 dawn loop (glasshouses on the terraces, no fence or boat in front) over the Stage 2 menu picture, and the music changes from River Before Silence to What We Protected. A new profile shows Stage 1.
2. **Stage 2 enemy walk (EW01–EW08):** in Stage 2, let a Claim Hand, Reaver, Revolver Marauder, Saboteur, Enforcer and Signalman walk toward your hero, and Marek in the Dispatch Yard (before and in Predator Unbound). Each one steps with the legs swapping on every step, keeps the same size as when standing, and still flees on its run.
3. **Continue from a checkpoint counts:** start Stage 2, reach a checkpoint, quit to the village and pick **Continue**, then finish the stage. **Collection and Records → Profile data** now lists Stage 2 as completed and the village shows the Stage 2 title screen. (Before this fix a continued run did not complete the stage.)
4. **Profile data:** **Collection and Records → Profile data** shows the loaded profile: name, dates, language, Credits, each stage's state (locked, open, started, completed), which title screen the village uses, the saved checkpoint, the stage records, unlock counts and the last heroes. **Show raw data** shows the whole save as text. Check it in 简体中文 and Deutsch too.
5. **Joining midway (no change, for reference):** in a solo Stage 2 run, Player 2 joins with Numpad 4 (or Start on a free pad). More enemies attack at once right away; the extra co-op enemies come from the next wave. Finishing the run completes Stage 2 on your profile.


## M23 · Stage 2 hardening and acceptance (0.23.0)

What's new: the automated Stage 2 acceptance (every hero and pair, every difficulty, every beat and branch, checkpoints, Wi-Fi for all six pairs, controls, German and Chinese screens, performance) and the fixes it found. The record with all numbers is `docs/review/09-stage2-acceptance.md`.

What changed in play:

- **Enemies no longer freeze at the room's end wall.** An enemy knocked into the strip at the edge (where enemies may not attack) used to stand there for good; it now walks back in. This applies to Stage 1 too, so Stage 1 fights can feel slightly busier.
- **Difficulty:** Ultimate now adds one enemy in six Stage 2 rooms (two more in co-op), so it is harder than Extreme again. On Hard the Enforcer is in the Loading Yard, Filtration and Production Hall only (the Aquaculture Hall and Medicinal Wing get it from Extreme). On Easy and Medium, Marek calls one Claim Hand instead of two.
- **German and Chinese:** room names in the top bar of a Stage 2 room (and Stage 1 locks) are now translated.
- **Keyboard and gamepad:** the Museum Investigation panel can be reached and scrolled with Tab and the arrow keys; in Elder's Secrets, D-pad down from the last cheat now reaches the "I understand" button.
- **Release zip** contains `manifest.json` (versions, hashes, golden replays and the source of every approved file).

Decisions (Guo, 2026-11-14: keep all three as they are):

- **After the last continue the whole stage starts again from the pursuit** (rule D8). Stage 2 is long, so on Medium this can mean 20 minutes again. If after your Easy run you would rather go back to the last checkpoint, say so.
- **Hard Loading Yard** (Enforcer plus a Marauder) is the hardest early room on Hard solo. Kept as is unless it feels unfair.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-gmw83a
git checkout claude/project-thread-gmw83a
git pull origin claude/project-thread-gmw83a
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

For the Wi-Fi steps, build the zip on this PC and copy it to the second PC:

```powershell
pnpm release
explorer release
```

Optional, the automated checks (the browser tests take about an hour):

```powershell
pnpm typecheck
pnpm test
pnpm e2e
```

### Test steps

Open `http://localhost:5173/` (the shell), with your profile that has Stage 2 open.

1. **Version and zip:** the corner of the village shows 0.23.0. Unzip `release\FightForPeace-0.23.0.zip`: it has `manifest.json` next to `VERSION`, and its `"game"` is `0.23.0`.
2. **Stage 1 feel:** play the Stage 1 courtyard and the sluice on Medium. Knock an enemy hard into the right-hand wall: it gets up and walks back into the fight instead of standing at the wall. Say if Stage 1 now feels too hard.
3. **Wi-Fi with three pairs (two PCs):** start the zip on both PCs (`start.bat`); host on one, join on the other. Play Stage 2 on Medium as Mountain + River, then Wind + Fire, then River + Wind, each at least to the Aquaculture Hall. Then, in a room, **pull the network cable or switch Wi-Fi off** on the host for about 10 seconds and back on: the guest takes over, then the host rejoins with the code shown; nothing is duplicated (no second weapon, no extra enemy).
4. **Checkpoints:** start Stage 2 on Medium, reach the Loading Yard checkpoint and a later room, quit to the village, pick **Continue**: you are back at the checkpoint with the same Ledger and continues. Lose all continues once: the stage starts again at the Perimeter Pursuit.
5. **Gamepad only:** with a real controller, start Stage 2 solo, press **A** once (the pad becomes Player 1), then **Start** → **Elder's Secrets**, choose **Steady Ride** with the D-pad and A, go down to **I understand** (it is reached now) and **Done**. The pause menu shows the Cheat-Assisted mark.
6. **A human run on Easy:** play Stage 2 on Easy from the pursuit to the crate without cheats. Note how long it took, how many continues you used and whether anything felt stuck or unfair.
7. **Medium, Hard and Ultimate look:** play the Loading Yard, Filtration Control and the Dispatch Yard on each (`http://localhost:5173/?stage=2&beat=2&difficulty=hard`, `beat=10`, `beat=14`; change `difficulty=` to `medium` or `ultimate`). Ultimate should feel harder than Hard; attacks stay readable. Watch the enemies walk in: the legs swap on every step (EW01–EW08).
8. **German keyboard and languages:** switch to Deutsch with the QWERTZ layout: the riding move list in the pursuit names the right keys (Y and Z swapped). In Deutsch and 简体中文, the room name in the top bar of the Aquaculture Hall is translated, and the Museum Investigation panel can be scrolled after pressing Tab.
9. **Low-end laptop:** start the zip on the oldest laptop you have and play Filtration Control on Ultimate in co-op (`?stage=2&beat=10&difficulty=ultimate`, join Player 2 with Numpad 4). The game stays at normal speed (Auto Quality may lower the picture); **Settings → System check** shows the measured frame time.

## M24 · Combat Constitution audit and shared engine features (0.24.0)

What's new: M24 checked every mechanic in the Stage 3 to Stage 8 specs, the four Curated Missions and the expanded modes against the engine (`docs/review/10-combat-constitution-audit.md`) and built the 17 that were missing, as general features that later stages fill with their own data. It also contains the Stage 3 builder review (`docs/review/11-stage3-builder-review.md`). Stages 1 and 2 play exactly as before (all saved test replays give the same result).

Everything new is in **test scenes with placeholder art** (existing enemies and props, names marked "(test)"). Final Stage 3 art comes with the Stage 3 content milestones.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-wjh5dy
git checkout claude/project-thread-wjh5dy
git pull origin claude/project-thread-wjh5dy
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

### Test steps

Every scene opens from the Lab: `http://localhost:5173/?lab`, press **F1**, pick the scene in the Arena panel (all start with "M24 Lab:") and start it. Keys: move **W A S D**, attack **T**, jump **Y** (Z on QWERTZ), guard **G**, pick up / use **J**.

1. **Version:** the corner of the village shows 0.24.0.
2. **Moving Hazards and Tools:** a mine cart rolls along its rail with a "Warning" label before each run; holding **G** in its path blocks it, and you are never knocked off the floor. Hit the cart during its warning: it shows "Redirected" and turns back. The hanging cargo on the right can only be redirected with the **Hook Pole (test)** (pick it up with **J**). Pick up the **Pry Bar (test)** and hit the crate: it opens at once. Hit the two stalls at the front: the property counter goes up by one only (they are one cluster).
3. **Moving Platform:** step onto the moving wagon bed: it carries you along; you can fight and jump off it.
4. **Finite Gear:** the **Shield Escort (test)** blocks hits from the front and its Gear bar goes down. When it breaks, the escort staggers once and the shield does not come back.
5. **Mounted Shield Boss:** the **Marshal (test)** starts mounted. Its first phase does not end on Health alone: it ends when it is dismounted. The second phase ends only when its gear breaks. Then it fights on foot.
6. **Mounted Raiders:** a rider shows "Lane pass" and a warning, then crosses the arena. Dodge or guard. Hit it to lower its Stability: at zero it dismounts safely, lies down briefly, then fights on foot.
7. **Rivals, Feints and Disguises:** the **Rival (test)** cannot be defeated: when its Resolve runs low it shows "Withdraws" and leaves. The **Feinter (test)** sometimes starts an attack and stops it (the tell is still shown). The **False Merchant (test)** cannot be hit until you walk close; then it reveals itself and fights. The **Noncombatant (test)** never fights and cannot be hit.
8. **Heavy Weapons and Provisions:** pick up the **Restricted Heavy Gun (test)**: you walk slower and cannot jump. Fire it until it shows "Overheated", then wait for it to cool. Throw a **Concussion Device (test)** at enemies: its area is shown, then they are pushed back and stunned; your partner is not hurt. Pick up a **Field Ration (test)** with **J**, take some damage, then press **W + J** to eat it.
9. **Hand-over and Support:** pick up the workstaff, take some damage, then press **Hand over to the other hero** in the Lab panel (F1). Control switches to another hero with the same (not higher) Health share and empty hands. Press **Claim the cache**: the workstaff comes back, once only. With Player 2 joined (**Num 4**), press **Player 2 becomes supporter**: P2 stands still, and each **Num 4** uses one of four actions (heal, guard, delay the next wave, stagger nearby enemies).
10. **Support Robot:** step onto a marked station: it shows "approaching", then "active" (cover appears, or the next wave is delayed), then "consumed". If an enemy stands on the station during the approach, it shows "disrupted", cools down and can be used one more time.
11. **Mount Catalogue (pursuit):** in the Arena panel pick **M24 Lab: Mount Catalogue** on **Easy**. You ride a horse placeholder. Let it crash until Stability is 0: you dismount safely and finish on foot instead of losing.
12. **Stage 1 and 2 still the same:** play the Stage 1 courtyard and the Stage 2 Loading Yard on Medium (`?stage=2&beat=2`). Nothing should feel different from 0.23.0.
13. **Languages:** switch to Deutsch and 简体中文 and open two of the scenes above: the labels (Warning, Gear, Heat, Stability, robot states) and the "(test)" names are translated.

## M25 · Objective and grade framework (0.25.0)

What's new: M25 builds the three shared modules every later stage uses for its objectives (campaign review G13): **protected units** (a person or group with a condition ladder that only changes when an enemy completes a visible, interruptible hostile action, and that locks when they reach safety), **evidence cases** (collected, sealed, disturbed, recovered, never lost) and **one 100-point grade** with caps. The Stage 1 and Stage 2 results screens now use the same grade module and give exactly the same numbers as before.

Everything new is in **one Lab test room with placeholder art**: the captive and the evidence case are labelled boxes; every state is written out in text.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-rub661
git checkout claude/project-thread-rub661
git pull origin claude/project-thread-rub661
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

### Test steps

Open the Lab: `http://localhost:5173/?lab`, press **F1**, pick **M25 Lab: Captive and Evidence** in the Arena panel and start it on **Medium**. Press **F1** again to hide the Lab panels. Keys: move **W A S D**, attack **T**, guard **G**, interact **J** (hold it to free, collect, seal or recover). The grade panel is at the top left.

1. **Version:** the corner of the village shows 0.25.0.
2. **Start state:** walk left. The **Lab captive** is bound inside a dashed **Protected zone** and shows "Secure" with a diamond icon and "Hostile actions: 0". The grade panel shows Rescue condition 70/70, Research record 0/30 (the case is not collected yet), total 70/100, rank B.
3. **Enemies act, condition worsens:** do nothing. An enemy walks to a marked **Hostile action spot** and works it: a red bar fills under the spot with the action written out ("Pulling the rope line taut", "Kicking over the lantern"). When the bar is full: "Hostile action completed", the captive shows **Strained** and "Hostile actions: 1", and Rescue condition drops to 35/70. After the second action: **Critical**, "Hostile actions: 2", Rescue condition 0/70. Nothing changes from waiting alone; only completed actions count.
4. **Interrupt an action:** restart the room. When an enemy starts working a spot, hit it once. The bar empties, "Hostile action stopped" shows and the count does not go up. After a pause another enemy (or the same one) tries again.
5. **Robot pauses an action:** restart. When an enemy is working a spot, stand on the **Robot: interference** circle at the bottom. After it becomes "active", the working bar turns blue and shows "Paused by the robot" until the robot is consumed.
6. **Free the captive, the count locks:** restart. Walk to the captive and hold **J** ("Hold Interact: free" shows above you). It shows "Freed", then walks to the **Hand-off point**. If an enemy is inside its zone there, it shows "Waiting for a safe hand-off" until the enemy leaves or is beaten. At the **Shelter** it shows "Safe" and the count is marked "locked"; the hostile action spots by the captive show "Closed" and the count never changes again.
7. **Evidence case:** walk to the **Evidence case** in the middle and hold **J**: "Collected" (Research record 30/30, Documented). Hold **J** again: "Sealed"; the crate spot next to it closes.
8. **Disturbed and recovered:** restart. Collect the case but do not seal it, and let an enemy finish "Dragging a crate against the case": the case shows **Disturbed** with scattered papers and Research record 9/30 (one third). Hold **J** on it: "Recovered (seal it)", then **J** again: sealed, Research record 19/30 (two thirds).
9. **Checkpoint:** restart. Press **F1**, then **Take checkpoint**. Free the captive and let it reach safety; let the case be disturbed. Press **Restore checkpoint**: the captive stays **Safe** with its locked count, the case goes back to "Not collected". Then restart, take a checkpoint, let one hostile action complete (Strained) and restore: the captive is **Secure** again.
10. **Cheat-Assisted:** this room gives a Cheat-Assisted run no grade (as Stage 3 will): with any cheat active the panel shows "No grade (Cheat-Assisted)" instead of the rank. (The Stage 1 and 2 results still grade Cheat-Assisted runs as before.)
11. **Stage 1 and 2 results unchanged:** play Stage 1 from the menu on Easy to its results screen (and Stage 2 if you have time): the results screen shows the same categories, points and rank rules as in 0.24.0. (An automatic test also compares both stages' grades with the 0.24.0 formulas on hundreds of runs.)
12. **Languages:** switch to Deutsch and 简体中文 and open the room: the condition names (Sicher / Angespannt / Kritisch, 安稳 / 吃力 / 危急), the case states and the grade panel are translated.

## M26 · Mission Hub, packaging and Run Archive (0.26.0)

What's new: the village has a **Mission Hub** with the four Mission Mode destinations: **Character Chronicles**, **Mission Remix**, **Curated Missions** and **Random Operations**, each with its own frame. Every entry is a content package with a stable ID and a version (`packages/data/missions/missions.yaml`). An entry stays **locked** (sealed title plus a spoiler-safe clue) until its story stage is completed; then it is **open**, or **Not installed** when its content is not built yet (the real Curated Missions come from M30, the Chronicles with Stages 5 and 6, the operation generator with M41). **Collection and Records** now has the full **Run Archive** (every finished run with its labels, pin, and **Replay** with the same difficulty and heroes) and **Personal Paths** (the story choice record).

Because no real mission content exists yet, the **M26 Lab profiles** open the Hub on a temporary profile (nothing is saved, your own profiles are not touched) with story progress already set and four **Lab test packages** that replay the M25 test room.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-b4zqy4
git checkout claude/project-thread-b4zqy4
git pull origin claude/project-thread-b4zqy4
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

### Test steps

Lab profiles: `http://localhost:5173/?hublab=stage2` (Stages 1–2 completed), `?hublab=fresh`, `?hublab=stage3`, `?hublab=stage6`, `?hublab=all`. The same links are in the Lab: `http://localhost:5173/?lab`, press **F1**, panel **M26 Mission Hub Lab**. Menu keys: arrows or **W A S D** move, **Enter** or **T** confirms, **Esc** goes back.

1. **Version and village entry:** open `http://localhost:5173/` with your own profile. The corner shows 0.26.0 and the village menu has **Mission Hub** under Play. Open it: Chronicles and Curated entries are locked with clues (your profile has no Stage 3 yet); Random Operations shows Defeat and Safeguard as **Not installed** if you have completed Stage 1, else locked. Back with **Esc**.
2. **Four destinations:** open `?hublab=stage2`. The Hub opens with "M26 Lab profile: nothing is saved". Move through the four destination buttons on the left: each has its own frame (gold Archive record, dashed violet reconstruction, double teal case file, orange board) and the list on the right changes.
3. **Locked entries with clues:** in Character Chronicles, *The Bell Before Dawn* and *The Road Between* show "Sealed Archive record", 🔒 Locked and a clue ("… Complete Stage 5." / "Complete Stage 6."). Open one: the card shows only the sealed title, its canon label, "After …" and the clue; Play solo is disabled and says why.
4. **Open and Legacy entries:** in Curated Missions, *Lab Case: Captive Drill* shows ▶ Open and **Legacy record** (the sample archive has a run on its older version 1); *Storm over Qinglan* and *No Escape at Reedwater* are locked with their clues. Open the Lab case: canon label "Canon-compatible Side Story", era, objective "Rescue and Evacuation", players Solo · Co-op, heroes, difficulties Easy/Medium/Hard, record "Not played yet".
5. **Story gate beyond the built stages:** open `?hublab=stage3`. Storm over Qinglan and No Escape at Reedwater are now ○ **Not installed** (their content comes with M30/M33); *Lab Case: Sealed Case* is open; The Medicine Road and The Vanishing Survey stay locked. Open `?hublab=stage6`: The Medicine Road and The Vanishing Survey and *The Bell Before Dawn* are Not installed too. Open `?hublab=fresh`: everything is locked, including the operations board.
6. **Play a Chronicle, Record Authenticated:** back on `?hublab=stage2`, Mission Remix shows *Lab Remix: Founders' Record* locked ("Authenticate the Lab Chronicle first"). In Chronicles open *Lab Chronicle: Founders' Record* → **Play solo** → ready up in the lobby (**T**) → the set-up shows the mission and its difficulty → **Next** → the hero screen offers only **Mountain Guardian** (left/right does not change it: fixed participant) → confirm (**T**) → **Start**. The M25 test room starts; beat the three waves (W A S D, T). About a second and a half after the last enemy falls, **Mission results** show Cleared, the points and rank, **✓ Record Authenticated** and "Now open: Lab Remix: Founders' Record".
7. **Remix opens, separate records:** press **Mission Hub**. Mission Remix now shows the Lab Remix ▶ Open; Chronicles shows the Lab Chronicle with "Clears 1 · best rank …". Play the Remix solo: the hero screen now lets you pick any of the four heroes. After the results its own record shows; the Chronicle's record is unchanged.
8. **Failed run:** play the Lab case and let the heroes be beaten (or leave through the pause menu, which records nothing). A beaten run shows "Not cleared", "No grade", and appears in the Run Archive as Not cleared.
9. **Run Archive:** in the Hub press **Run Archive** (also in Collection and Records). Every run shows its content, mode chip (Story, Chronicle, Remix, Curated), canon label, date, difficulty, heroes, points and rank, time, and labels: the sample Stage 1 Hard run says **Cheat-Assisted**, the Stage 2 co-op run says **Continued** and **📌 Pinned**, the Lab case run says "Legacy: played on package version 1". The **Show** choice filters by mode.
10. **Pin:** press **Pin** on a run: it shows 📌 Pinned; **Unpin** removes it (the archive keeps the newest 100 runs and every pinned one).
11. **Replay a stage from the Archive:** on the Cheat-Assisted *The Broken Water Pact* run (Hard, River Scout) press **Replay**: the lobby opens; ready up and the stage screen shows *The Broken Water Pact* on **Hard**; **Next** puts **River Scout** on the hero screen. You can play it (a new run under the current version) or press **Esc** to leave. Replay on the Legacy Lab case run opens that mission on the current version.
12. **Random Operations board:** in Random Operations open Defeat: the board shows Defeat and Safeguard, the content pool (cleared stages, combat spaces, enemy families without Story bosses, heroes) and the flow; **Generate operation** is disabled ("arrives in a later update").
13. **Personal Paths:** open `?hublab=all`, go back to the village (**Esc**) and open **Records**: **Personal Paths** shows "Fight for Peace · Kael's reunion with his mother: **Reply and Meet Later**" and "Personal choices never change the campaign." On your own profile it says "No personal choices recorded yet."
14. **Your own runs are archived:** with your own profile play Stage 1 on Easy to its results, then open Records → **Run Archive**: the run is the newest entry, mode Story, Canonical, with its points and rank. A Cheat-Assisted run is labelled Cheat-Assisted. (Older archive entries from before 0.26.0 are kept as clean Story runs.)
15. **Languages:** in Settings switch to Deutsch and 简体中文 and open the Hub, a card, the Run Archive and the board: everything is translated (Missionszentrale / 任务中心).

## Stage 3 sound effects made in code (before M27)

What's new: all **89 Stage 3 sound effects** are made in code (`packages/platform/src/media/stage3sfx.ts`), in seven groups: **horse** (mount, trot, gallop on trail and on quarry stone, whinny, snort, mounted strike, stumble, low-Stability warning, safe disengage, replacement horse), **weapons** (Hiking Staff, Wood Axe, Quarry Hammer, five-round revolver: aim warning, shot with mountain echo, empty click, ricochet; pick up and drop), **enemies** (Trail Ambusher, Quarry Bruiser, Rope Trapper, Mounted Raider, Ridge Stalker, Pack Captain), **garran** (Hookstaff sweep, thrust, hooked pull, clash, disarm, break; clinch, shoulder throw, trip, roar, Resolve break, restraint, radio), **environment** (scaffold creak, crack, collapse, hit; winch warning, crank, release, redirect; cargo, cart, loose stone, timber, wall), **rescue** (hostage warning, interrupt, freed, condition drop; research documented, disturbed, recovered; Qinglan Rescue Bell; Signal Hut static and restored; invoice; objective alert and done) and **food** (pickup, trail rice parcel, warm broth, seed cake, camp meal). Each sound has a stable id (`sfx.horse.gallop` …); a delivered sound file with the same id would replace it later. The game does not trigger them yet (that comes with the Stage 3 systems in M27); until then the Lab plays them.

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-o9zr9m
git checkout claude/project-thread-o9zr9m
git pull origin claude/project-thread-o9zr9m
pnpm install
pnpm dev
```

To write every sound as a WAV file you can open in any player (in a second PowerShell window, same folder):

```powershell
cd C:\AI\Claude\FightForPeace
node tools/audio/render_stage3_sfx.mjs
explorer out\stage3-sfx
```

### Test steps

1. **Lab panel:** open `http://localhost:5173/?lab` (if Vite prints another port, use that one). The Lab shows a panel **Stage 3 sounds (89)** with a **group** list (horse is selected).
2. **Horse:** press each button. Listen for: hooves (trot two-beat, gallop three-beat; *gallop-stone* clackier with a short echo), a whinny, a snort, the low-Stability warning (two falling tones then a snort), and *disengage* (whinny, then hooves running away).
3. **Weapons:** choose **weapons**. The three swings get heavier from staff to axe to hammer; hits sound like wood (staff), a blunt axe with a short ring, and a heavy hammer. *revolver.aim* is two cock clicks plus a short two-note warning; *revolver.shot* is a bang with a mountain echo; *revolver.empty* a dry click.
4. **Enemies:** choose **enemies**. The ambusher's flank whistle, the bruiser's grunt before the slam, the trapper's three lasso twirls, the raider's shout and charge, and the Pack Captain's two-note order whistle should each be easy to tell apart.
5. **Garran:** choose **garran**. *hookstaff.disarm* is the staff clattering away plus two rising chime notes; *garran.roar* is a deep voice with echo; *garran.cast* a grunt, a swing and a body fall.
6. **Environment:** choose **environment**. *scaffold.creak* creaks slowly, *scaffold.collapse* is timber falling with an echo, *winch.warn* ratchet clicks speeding up then two bell strikes, *cart.roll* rolls with rail clacks.
7. **Rescue and food:** choose **rescue**, then **food**. Warnings (*hostage.warn*, *objective.alert*) are short high beeps; confirmations are soft chimes in the village-motif scale; *bell.rescue* is a long bronze bell. Each food sounds different (paper and chewing, broth bubbles, crunch, bowl clink).
8. **Hover:** hover a button: the tooltip says where the game will use the sound and its mix category.
9. **WAV files (optional):** run the `render_stage3_sfx.mjs` command above. `out\stage3-sfx` has one folder per group with the 89 WAV files and `index.csv` (id, group, category, length, use).
10. **Nothing else changed:** Stage 1 and 2 sound as before (their sounds are untouched).

Write down any sound that is wrong, too loud, too quiet or unclear, with its name (for example `horse.whinny: too robotic`); each one is a small recipe that is quick to retune.

## Stage 1 and 2 sound effects made in code

What's new: the 56 sound effects of Stages 1 and 2 and the fight sounds all stages share are now made in code too, under the same names, so the game plays them wherever it played the old beeps. **Shared fights:** light, medium and heavy hits, guard, armor, Exact Block, Counter, Combo Breaker, Guard Crush, grab, throw, escape or rescue, dash, landing, knockdown, Ultimate, Team Attack, boss phase. **Stage 1:** checkpoint, worker freed, cache, food, clue, evidence, river restored, downed, revived. **Stage 2:** firearm warning, shot and burst; the motorbike chase (engine, crash, impact, hit, ramp, brace, critical warning); the greenhouse (containers, breaking glass cases, repair, fallback, lost asset, toppling rack, purge jet warning, firing and redirect, straps, and the grenade drill: draw, arm, aim, throw, drop, live drop, secured, returned, blast). The Lab panel is now **Sound effects (145)** with every stage, and the WAV tool is `tools/audio/render_sfx.mjs` (it replaces `render_stage3_sfx.mjs`). From now on every sound effect is coded (lessons learned J1).

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-o9zr9m
git checkout claude/project-thread-o9zr9m
git pull origin claude/project-thread-o9zr9m
pnpm install
pnpm dev
```

WAV files (second PowerShell window, same folder):

```powershell
node tools/audio/render_sfx.mjs
explorer out\sfx
```

### Test steps

1. **Lab panel:** open `http://localhost:5173/?lab`. The panel **Sound effects (145)** opens on *all stages · combat*. The group list has all stages · combat, Stage 1 · stage1, Stage 2 · stage2, pursuit, greenhouse, and the seven Stage 3 groups.
2. **Fight sounds:** press each button in *combat*. The three hits get heavier, guard is a short muffled block, Exact Block a bright ring, Counter a swish, thump and two notes, Combo Breaker a burst outward, Ultimate a rising swell with drums, boss phase a drum roll and a gong.
3. **Stage 1:** choose *Stage 1 · stage1*. Checkpoint, clue, evidence, cache and food each sound different now; *river-restored* is rushing water with bubbles and a rising melody; *downed* falls, *revived* rises.
4. **Stage 2:** choose *stage2*, *pursuit* and *greenhouse*. The firearm warning is two metal clicks and three short beeps; the bike engine revs; the crash skids and clatters; the grenade drill steps are each distinct; the blast is a deep boom with breaking glass.
5. **In play, Stage 1:** start Stage 1 on Easy from the menu and fight the first enemies: hits, guard, dash, landing and knockdown use the new sounds; reach a checkpoint and eat food.
6. **In play, Stage 2:** play the motorbike chase (`?pursuit`) for a minute: engine, hits and impacts use the new sounds. Open a greenhouse room (`?greenhouse`) and break a case, run the grenade drill and fire the purge jet.
7. **Stage 3 unchanged:** the Stage 3 groups still play the same 89 sounds as in the last PR.
8. **WAV files (optional):** run the `render_sfx.mjs` command above: `out\sfx` has one folder per group with all 145 WAV files and `index.csv`.

Write down any sound that is wrong, too loud, too quiet or unclear, with its name (for example `hit.heavy: too soft`).

## M27 · Stage 3 systems: horse, weapons, bandits and Garran Voss (0.27.0)

What's new: everything Stage 3 fights with, playable in the Lab (the Stage 3 journey, story and areas come with M28). **Weapons:** Hiking Staff (quick thrusts and sweeps), Wood Axe (slow chops, strong disarm, opens timber barriers at once), Quarry Hammer (slowest, wall bounce, breaks scaffolds fastest, you walk slower while carrying it), Bandit Revolver (exactly 5 rounds, never reloaded, then a pistol whip and a throw) and Garran's Quarry Hookstaff (loose only after he is disarmed). **Food:** Trail Rice Parcel (Health), Warm Vegetable Broth (Defense), Spiced Seed Cake (Attack Bar), Mountain Camp Meal (some of all three): pick up with **J**, eat with **W + J**. **Bandits:** Trail Ambusher, Quarry Bruiser, Rope Trapper, Mounted Raider (on a horse, then on foot), Ridge Stalker (feints) and Pack Captain (Flank Order). **Garran Voss** in three phases: *Hookstaff Control*, *Clinch and Cast* (from 65 %) and *Winch Pressure* (from 30 %), then capture. **Quarry scenery:** scaffolds with four states, mine carts on rails, timber barriers, loose stone, a retaining wall and the winch's swinging cargo. **Horse Test Track:** the mountain horse in a pursuit, solo or co-op; at zero Stability you get off safely and go on foot. The Stage 3 art (enemy, Garran, horse, weapon and prop sheets) and the Stage 3 sounds are now used in play.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-ki456e
git checkout claude/project-thread-ki456e
git pull origin claude/project-thread-ki456e
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

### Test steps

Every room opens from the Lab: `http://localhost:5173/?lab`, press **F1**, pick the room in the **Arena** list (all start with "M27") and press **Restart**. The M27 rooms offer all five difficulties. **F1** hides the panels again. Keys: move **W A S D**, attack **T**, jump **Y** (Z on QWERTZ), guard **G**, pick up / grab / throw **J**, Special **U**. Player 2 joins with **Num 4**.

1. **Trail Ambusher** (*M27 Trial: Trail Ambusher*): they sprint in, dash to your side and lunge low; when hurt they flee on a run cycle with a look back. Their sprint and flank have their own whistle sounds.
2. **Quarry Bruiser** (*M27 Trial: Quarry Bruiser*): slow, heavy swings with a grunt before each one, a charge that knocks you into the wall on the right, and long tired recoveries. A Quarry Hammer lies in the room: they may pick it up. Pick it up yourself (**J**): you walk slower; hit the scaffold: it creaks, cracks and collapses (labels *Scaffold: damaged / critical / broken*).
3. **Rope Trapper** (*M27 Trial: Rope Trapper*): a lasso twirl (tell) before the throw. When the rope catches you, press **G** when *ESCAPE* shows to break free, or let Player 2 hit the Trapper to free you; you are never held for long.
4. **Mounted Raider** (*M27 Trial: Mounted Raider*): a bandit on a black horse warns its lane (amber band, *Lane pass*) and rides through. Hitting it only lowers its **Stability** bar; at zero it slides off safely and fights on foot (ochre coat, baton).
5. **Ridge Stalker** (*M27 Trial: Ridge Stalker*, try **Extreme**): it sometimes starts a strike and stops (the feint): the tell always shows, the real strike follows.
6. **Pack Captain** (*M27 Trial: Pack Captain*, try **Ultimate**): it whistles **Flank Order**: two Ambushers take opposite sides of you. Hit the Captain while it whistles: *Whistle Dropped* and the order breaks.
7. **Weapons and food** (*M27 Lab: Cart Rails* and *M27 Lab: Outer Fence*): pick up the **Bandit Revolver**: five shots with a red warning line, then the attack becomes a pistol whip (empty click); it can still be thrown. Pick up the **Wood Axe** and hit a **Timber barrier**: it opens with one strike. Take some damage, pick up each food and eat it with **W + J**: rice raises Health, broth Defense, the seed cake the Attack Bar, the camp meal a little of each. Each has its own sound.
8. **Mine carts** (*Cart Rails*): a cart warns its rail before each run (amber band, *Mine cart*). Hit it during the warning: *Redirected*, and it then only hits bandits.
9. **Loose Scaffold** and **Hammer Line**: mixed rooms with scaffolds, loose stone and the retaining wall on the right (wall bounces); the second wave arrives when the first is down.
10. **Garran: Hookstaff Control** (*M27 Lab: Garran, Hookstaff Control*): he fights with the long hookstaff (sweep, thrust, hooked pull that drags you in, low line, descending strike). The boss bar names the Quarry Hookstaff. Disarm him (Wood Axe or the Hiking Staff's hook, or a Stagger Break): the staff lies loose (boss bar: *loose, any hero may take it*) and Phase 2 starts; he never gets it back. Pick it up yourself and use it.
11. **Garran: Clinch and Cast** (starts at 65 %, unarmed): collar tie, shoulder throw, ridge trip, body blows, shove and charge; his grabs always let you escape (**G** when *ESCAPE* shows) and Player 2 can interrupt them. He blocks and counters.
12. **Garran: Winch Pressure** (starts at 30 %): he cranks the terrace winch on the right (crank sound, progress pips); each completed crank releases one **Winch cargo** or **Sliding cover** along its path with a warning first. Hit it during the warning: it turns against him and costs him Resolve (the Resolve bar drops). Interrupt his cranking by hitting him.
13. **Chief of the Broken Ridge** (*M27 Lab: Chief of the Broken Ridge*): the whole fight. A Resolve break at or below 30 % Health is the clean surrender (he kneels, raises his hands, is restrained); Health 0 with Resolve left is the forced capture. Try it in co-op too.
14. **Horse Test Track** (Arena list: *Horse Test Track (mounted pursuit, greybox)*): each hero rides their own horse (Stage 3 riding art: walk, turn, halt, kicks and hops). The bandit riders are on black horses. Let the Stability bar run out: the horse stops, you get off safely and finish on foot (Health is not lost). Try it with Player 2 too.
15. **Sounds:** in the rooms above you hear the Stage 3 sounds in play: staff, axe and hammer swings and hits, the revolver's cock, shot and empty click, the Ambusher whistle, Bruiser grunt, rope twirl and bind, Raider charge, Stalker feint, Captain whistle, Garran's clinch, throw, roar and winch, the winch warning and release, carts rolling, scaffolds creaking and collapsing, food, and on the horse track hooves, whinny and the safe dismount.
16. **Languages:** switch to Deutsch and 简体中文: the enemy, weapon, food and room names are translated; Garran's phases read 钩杖制敌 / 缠抱摔投 / 绞盘压迫 and *Hakenstab-Kontrolle / Klammern und Werfen / Seilwinden-Druck*.
17. **Stage 1 and 2 unchanged:** play the Stage 1 courtyard and the Stage 2 Loading Yard (`?stage=2&beat=2`) on Medium: nothing should feel different from 0.26.0, and Marek's fight still has Tomas's lines.
18. **Stage 3 outfit (fix after the first test):** in every M27 room and on the Horse Test Track the heroes wear their Stage 3 outfit (dark weatherproof jacket, trail boots). Pick up and drop the axe, the hammer, the hiking staff and the revolver with each hero: the clothes must stay the same. Walking with the revolver shows the Stage 3 walk with the revolver in hand. Stage 1 and 2 rooms keep the old outfit.
19. **Horse legs (interim):** the black raider horse in *M27 Trial: Mounted Raider* and the hero horses on the Horse Test Track now step between two poses while riding. A proper four-frame gallop comes with the GALLOP sheets (prompts in `codex_prompts_stage3_gallop.md` in the pictures repository).

Write down anything that looks too big or too small (the Stage 3 sheets use the scales recorded at approval), any pose that looks wrong, and any sound that is wrong or too loud.

## Dash and run patch (after M27)

What's new: the **dash sound** is now a gust of wind with a thin whistle (no more grit or clash). The **dash** goes further, about 197 px across or 127 px in depth (was 126 and 84): fast at the start, then easing out. A dash **away from the nearest enemy is a backstep**: the hero keeps facing the enemy. Backsteps and up/down **sidesteps** cannot be hit on dash frames 3 to 8; a forward dash can always be hit. After a dash the next dash waits 8 frames. **Double tap and hold** a direction: the hero dashes, then keeps running at twice the walking speed until you release that direction. Attack while running is the dash attack, a jump keeps the running speed, Guard stops the run. Heavy weapons (that slow your walk) do not run. Until the run sheets arrive (`codex_prompts_hero_run.md` in the pictures repository), the run plays the walk cycle faster.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-je7yle
git checkout claude/project-thread-je7yle
git pull origin claude/project-thread-je7yle
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

### Test steps

Use the Lab: `http://localhost:5173/?lab`, press **F1**, pick a room in the **Arena** list and press **Restart**. Keys: move **W A S D**, attack **T**, jump **Y** (Z on QWERTZ), guard **G**. Player 2 joins with **Num 4**.

1. **Sound:** double-tap **D**. The dash sounds like rushing wind with a soft whistle, not like two things clashing. It should not drown out hits nearby.
2. **Distance:** in an empty room, double-tap **D** and let go: the hero slides clearly further than before (about one and a half times), quickly at first, then slowing down. Double-tap **W** or **S**: the depth dash is longer too.
3. **Backstep:** in *M27 Trial: Quarry Bruiser* (or any trial room), stand in front of the enemy facing it and double-tap the direction away from it. The hero slides back **still facing the enemy**. Do it when the enemy starts a swing: the swing misses (the evade window is short, so time it as the swing starts).
4. **Sidestep:** when an enemy swings, double-tap **W** or **S**: the hero steps out of the lane and is not hit.
5. **Forward dash is still hittable:** dash into an enemy that is swinging: you get hit.
6. **No spam:** double-tap repeatedly: there is a short pause after each dash before the next one starts.
7. **Run:** double-tap **D** and keep holding **D**: the hero dashes, then runs (faster legs, about twice the walking speed) until you let go. While running, hold **W** or **S** too to steer. Let go of **D**: back to walking or standing.
8. **Run attack and jump:** while running, press **T**: the hero does the dash attack. While running, press **Y**: the jump carries the running speed.
9. **Run back:** with no enemy near, double-tap **A** and hold: the hero turns and runs left. Near an enemy on the right, the same input backsteps first and then turns and runs left.
10. **Gamepad:** double-tap the stick or D-pad and hold, or hold a direction and press **LT** (Dash): the same dash, backstep and run.
11. **Co-op:** Player 2 (Num 4 to join) can dash, backstep and run independently of Player 1.
12. **Heavy weapon:** pick up the Quarry Hammer (**J**) and double-tap and hold: the hero dashes but walks afterwards (no run).
13. **Stage 3 outfit:** in the M27 rooms the run uses the Stage 3 clothes (the walk cycle played faster), never the old outfit.

Write down if the dash still feels too short or now too long, if the evade window feels too small or too generous, and if the run speed feels right.

## Run and gallop art, guard picture (after the dash and run patch)

What's new: the **8 run sheets** (both outfits) are in the game as an interim version: their second half repeats the legs of the first, so the run may look a little like a skip; the `_v2` redo prompts are in `codex_prompts_hero_run.md`. The **5 gallop sheets** replace the two-pose horse stepping with a four-frame canter (hero horses and the bandit horse). **G + W / G + S** now shows the normal guard pose instead of the crouch (the guard blocks by direction; plain **G** already blocks enemy low attacks).

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-je7yle
git checkout claude/project-thread-je7yle
git pull origin claude/project-thread-je7yle
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

### Test steps

Use the Lab: `http://localhost:5173/?lab`, press **F1**, pick the room in the **Arena** list and press **Restart**.

1. **Run, Stage 1 and 2 outfit:** in an empty Stage 1 or 2 room, double-tap **D** and hold: after the dash the hero runs with the new run cycle (forward lean, both feet off the ground in the air frames). Try all four heroes. Note how much the repeated legs bother you.
2. **Run, Stage 3 outfit:** in any M27 room, the same run in the Stage 3 clothes. The size should match the walk.
3. **Run with a weapon:** pick up a light weapon (Hiking Staff) and run: the weapon walk plays faster (no run sheet with weapons).
4. **Gallop:** *Horse Test Track*: each hero's horse canters with four leg poses; steering and halting keep their own poses.
5. **Bandit horse:** *M27 Trial: Mounted Raider*: the black horse canters with four leg poses while it crosses the arena (after the warning marks the lane).
6. **Guard pictures:** hold **G** with **W** or **S**: the normal high guard pose, not the crouch. **G** with the direction away from your facing still shows the turned guard.

## Hero sizes in fights, keys in the pause Move List (2026-11-18)

What's new: **hero sizes.** About 25 hero sheets drew 6–15 % larger or smaller than the idle pose, so the heroes grew or shrank between moves (for example River's guard, Fire's guard and Exact Counter, Fire's side hook, Wind's Stage 3 weapon walks). Their draw scales are now measured by head size and corrected. **Move List keys.** The pause menu's Move List now shows every move of the hero (before: only the first 24 names) with how to enter it, drawn from your own key bindings or gamepad buttons.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-uc3buf
git checkout claude/project-thread-uc3buf
git pull origin claude/project-thread-uc3buf
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

### Test steps

1. **River's guard:** play Stage 1 as River (or the Lab, `http://localhost:5173/?lab`). Stand still, then hold **G**: River keeps the same size when she raises her guard (before, she grew about 8 %).
2. **Fire:** as Fire, hold **G**, then use Forge Side Hook and Rising Brand (their keys are in the new Move List, step 6). Fire keeps one size in every move.
3. **Exact Counter:** with Fire, press **G** just before an enemy hit: the counter pose is the same size as the idle pose.
4. **Sluice Commander fight:** Stage 1, beat 8, any hero: during the whole fight the hero stays the size of the idle pose; compare with your screenshot.
5. **Stage 3 weapons (Wind):** in the M27 rooms (Lab, F1, Arena list), pick up the Hiking Staff, Wood Axe or Quarry Hammer and walk with Wind: she is no longer smaller while walking than when she stops.
6. **Move List, keyboard:** in a stage press **Esc** and move to **Move List**: every move shows its name and, below it, the keys (for example **T**, **D + T**, "in the air: **T**"). Wind and Fire now also show their last specials and ultimate.
7. **Your own bindings:** in **Controls**, change Attack to another key, go back to the Move List: the list shows the new key.
8. **Gamepad:** play with a gamepad and open the Move List: the list shows the gamepad buttons instead of keys.
9. **Co-op:** with two players, the Move List shows both heroes, each with that player's own keys or buttons.
10. **Languages:** switch to Chinese and German: the hints ("空中：", "in der Luft:") are translated.

Known limit: Fire's and Wind's lance-a sheets draw some cells smaller than others; one scale cannot fix that, so they would need a redraw.

## Sluice Commander's jump and the winch spot (2026-11-18)

What's new: **the jump.** The Stage 1 boss no longer looks smaller when he jumps. His drawings were all one size (his head is the same size in every sheet), but his Flying Knee held a deep crouch for over half a second before the leap and again after landing, and the leap itself showed for only a tenth of a second. The move now plays all six drawings: he points, crouches, takes off, flies with the knee, lands and stands back up. **The winch spot.** In phase 3 the yellow ring on the floor now has a handwheel standing on it and a label "Sluice winch 0/3" above the three crank circles, so it is clear what he is cranking and how far he is.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-uc3buf
git checkout claude/project-thread-uc3buf
git pull origin claude/project-thread-uc3buf
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

### Test steps

1. **Flying Knee:** play Stage 1 to beat 8 (the Sluice Commander). Wait for his Flying Knee (he points, crouches and leaps at you): he passes through a standing point, a crouch, the take-off, the knee in the air, the landing and back up, and never looks smaller than when he stands.
2. **Phase 2:** take him into phase 2 (coat off) and watch the Flying Knee again: the same six steps.
3. **His other moves:** Palm Strike, Roundhouse, Spin Back Kick and the Rising Knee look as before.
4. **Walking:** he walks toward and away from the camera without changing size.
5. **Winch spot:** in phase 3 ("Open the Sluice") the yellow ring at the right has a handwheel on it and the label "Sluice winch 0/3" above the three circles. Each crank he finishes fills a circle and the label counts up (1/3, 2/3); hit him while he cranks to interrupt it.
6. **Languages:** in German the label reads "Schleusenwinde", in Chinese "水闸绞盘".
7. **After the surrender:** the ring, the handwheel and the label are all gone.

## Mountain's run with the legs and arms swapping (2026-11-19)

What's new: Mountain's run uses the redrawn sheet `HERO-MTN-RUN_v2.png` (R9). In the second half of the run the other leg and the other arm come forward, so the run alternates instead of looking like a skip. Mountain's Stage 3 run scale moved from 0.875 to 0.885 to match the new base run (it is measured against it). The other seven runs are unchanged until their `_v2` sheets arrive.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-uc3buf
git checkout claude/project-thread-uc3buf
git reset --hard origin/claude/project-thread-uc3buf
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git checkout main
git pull origin main
pnpm install
pnpm dev
```

### Test steps

1. **Run:** play Stage 1 as Mountain, double-tap and hold **D** (or **A**) to run. The legs and the arms alternate: left leg and right arm forward, then right leg and left arm.
2. **Size:** run, then stop: Mountain keeps the same size when switching between run, walk and idle.
3. **Stage 3 outfit:** in a Stage 3 room (Lab, F1, Arena list), run as Mountain: same size as the Stage 3 walk and idle.

## Redrawn runs for all heroes, and Wind's and Fire's lance (2026-11-19)

What's new: **runs.** Seven more run sheets are in the game (R10–R16): River, Wind and Fire in their Stage 1 and 2 outfits, all four heroes in the Stage 3 outfit. In each, the second half of the run brings the other leg and the other arm forward. Wind's Stage 3 run uses the clean redo (v3), moved slightly so her flight poses stay inside their cells. **Lance.** Wind's and Fire's lance-a sheets (RD01, RD02) are drawn at one figure size in every cell. The widest poses (the thrust and the throw) reached past their cells, so `tools/art/repack_cells.py` fits them back in: Wind's at 92 % (which also brings her to the idle size), Fire's at 96 %.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-uc3buf
git checkout claude/project-thread-uc3buf
git reset --hard origin/claude/project-thread-uc3buf
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git checkout main
git pull origin main
pnpm install
pnpm dev
```

### Test steps

1. **Runs, Stage 1 and 2 outfit:** run (double-tap and hold **D**) as River, Wind and Fire. The legs and arms alternate, and the size stays the same as walking and standing.
2. **Runs, Stage 3 outfit:** in a Stage 3 room (Lab, F1, Arena list), run as all four heroes: the same alternation.
3. **Wind's lance:** in Stage 2, pick up the Service Lance as Wind and use its moves (pickup, sweep, thrust, block, pull, throw). Wind stays the size of her idle pose in every move, and no stray foot or lance end shows next to her.
4. **Fire's lance:** the same with Fire.

## River's run without the stray foot, and the lance stance (2026-11-19)

**What changed:** In River's run, River's Stage 3 run and Fire's Stage 3 run, the back foot of the flight poses reached into the next cell, so a small piece of the next pose showed in front of the hero. The poses are now shifted into their cells (`_v2_fit`). The lance stance: Wind and Fire already use the redrawn lance sheets (RD01/RD02) on this branch and stay at idle size. Mountain's and River's lance sheets draw the stance about 20 % smaller than idle; that needs the redraws RD03/RD04 (Pictures `picture_redraw_prompts.md`) and is not fixed yet.

### Test steps

Use the commands of the section above (this branch).

1. **River's run:** run as River (double-tap and hold **D**), in the Stage 1/2 outfit and in a Stage 3 room. No piece of a foot or leg shows in front of or behind her.
2. **Fire's Stage 3 run:** the same as Fire in a Stage 3 room.
3. **Wind's and Fire's lance:** Lab, Stage 2 Systems Saboteur, pick up the lance as Wind and as Fire: holding it, they stay the size of their idle pose.
4. **Mountain and River:** still smaller while holding the lance (known, waits for RD03/RD04).

## Mountain's and River's lance redraws (RD03, RD04, 2026-11-22)

**What changed:** Mountain's lance sheet is the redraw RD03: all six poses at one size, as tall as idle (the old sheet drew the stance about 20 % smaller). The thrust's back foot touched the next cell, so the sheet is fitted into its cells at 97 % (`HERO-MTN-LANCE_v2_fit.png`) and drawn at scale 1.0 (was 0.9). River's lance sheet is the redraw RD04, used as drawn (every pose inside its cell) at scale 0.96 (was 0.92).

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-uc3buf
git checkout claude/project-thread-uc3buf
git reset --hard origin/claude/project-thread-uc3buf
pnpm install
pnpm dev
```

### Test steps

1. **Holding the lance:** Lab, Stage 2 Systems Saboteur, pick up the lance as Mountain, then as River. Standing with it, each is the same size as without it.
2. **Lance moves:** use the pickup, thrust, sweep, hook and throw with both. Each keeps one size in every move, and no stray foot or lance end shows next to them.
3. **Walking with the lance:** walk with it; the size stays the same as standing with it.

### Mountain's dash before a run (2026-11-22)

**What changed:** a double tap first plays the short dash, then the run. Mountain's dash sheet was drawn about 10 % smaller than his run, so he shrank for a moment before running. The dash is now drawn at his run size (scale 0.91, Stage 3 outfit 0.94).

1. **Run start:** as Mountain, double-tap and hold **D**: he keeps one size from the dash into the run.
2. **Stage 3 outfit:** the same in a Stage 3 room.
3. **Dash alone:** double-tap **D** without holding: the dash is the size of his walk.

### A thrown weapon is no longer drawn twice (2026-11-22)

**What changed:** a weapon throw lets go of the weapon on its first active frame, and from then on the weapon flies as its own picture. The hero's throw pose still drew the weapon in hand until the throw ended, so two weapons showed. Now the throw pose shows only the wind-up; from the release on, the hero's hands are empty. A new test checks this for every hero with the lance, workstaff, sidearm and axe.

1. **Lance:** Lab, Stage 2 Systems Saboteur, pick up the lance and throw it (Interact while holding) with each hero: one lance only, leaving the hands.
2. **Other weapons:** the same with the workstaff (Stage 1) and the axe or hammer (Stage 3).
3. **Dropping:** press Down with Interact while holding a weapon: it falls at the feet, one weapon only.

## The game loads only the art it needs (2026-11-22)

**What changed:** the game used to load all of its art (about 730 sprite sheets) before anything could start, so every mode waited about 19 s and each new picture made it slower. Now it loads the props, effects and villagers at start, and each hero, outfit and enemy the first time it appears; an arena's enemies load as soon as the arena starts. If someone appears before their art has arrived, the game waits a moment instead of showing a grey box. Measured here: the Perimeter Pursuit starts in about 9 s (was 19 s), a Stage 1 story fight in about 6 s (was 20 s).

### Get and start the build

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-uc3buf
git checkout claude/project-thread-uc3buf
git reset --hard origin/claude/project-thread-uc3buf
pnpm install
pnpm dev
```

### Test steps

1. **Start time:** open the game and start any stage: it is playable noticeably sooner than before.
2. **No grey boxes:** play Stage 1 to the first fight: every hero and enemy appears with its art, never as a grey box. A short pause the first time a new enemy type walks in is expected.
3. **Hero switch:** in the Lab, switch through all four heroes and their Stage 3 outfits: each shows its art (a brief pause the first time is fine).
4. **Later waves and bosses:** play a stage to its boss: later waves and the boss appear with their art.
5. **Pursuit:** open the Perimeter Pursuit: the bike and rider are drawn and moving after a few seconds.
6. **Player 2:** press Num 4 to join Player 2: a short pause, then they appear with their art and can move.
7. **Online (if you can run two games):** on the Wi-Fi screen, Host and Connect show "Loading art…" for several seconds, then become usable. The match then plays in step, with every fighter drawn.

## M28 · Stage 3 journey: Shadows over the Herb Mountain (0.28.0)

What's new: **Stage 3 is playable from Play.** Seventeen beats over six areas (Lower Switchback, Qinglan Hamlet, Moonbell Basin, Echo Quarry, Broken Ridge Camp, High Winch Terrace) and two optional branches (Signal Hut: *The Silent Antenna*; Herbalist Shelter: *Baskets Left Behind*), five checkpoints, two horse rides. Free **Gao Wen, Tao Min, An Bo and Ren Xia** (and **Wei Shan** in the Signal Hut): bandits near a captive start visible hostile actions; interrupt them, and each group ends **Secure, Strained or Critical**. Collect and seal the **research record** case at Mist over the Beds. **Tomas** is heard on the radio (Moonbell Basin), seen in the cabin and leaves by the quarry while you free Ren Xia (a small picture over the fight; there is no chase). Capture **Garran Voss**, open his private case: the **damaged invoice**. Then the epilogue, *Paths through the Mist* and the results (grade: rescues 35, research record 15, Garran 20, combat 20, branches 10; a Critical group caps at A; cheats give no grade). The story chapters are still pictures with a slow zoom and a cross-fade; the title loop is a short silent clip; the *Mist and Resolve* score plays throughout. **Progression:** Silvermist Ecology Folio and three artifacts in the Museum, the invoice as a Sponsor Dossier page (open it for *Paper Trail*), eight achievements, the Stage 3 outfits as **Coming soon** in the Store, What's New and the Stage 3 Academy. Everything in English, 简体中文 and Deutsch.

### Get and start the build

To test the branch before it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin claude/project-thread-vwjw61
git checkout claude/project-thread-vwjw61
git pull origin claude/project-thread-vwjw61
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

If Vite prints another port than 5173, use that one. Stop the server with `Ctrl+C`.

### Test steps

Stage 3 opens once Stage 2 is completed. If your profile has not cleared Stage 2, use a temporary profile: `http://localhost:5173/?hublab=stage2` (Stages 1 and 2 completed, nothing is saved), go back to the village and press **Play**. Single beats also start directly: `http://localhost:5173/?stage=3&beat=N` (N from 1 to 17, e.g. 8 for Two Voices in the Mist, 17 for Garran). Keys: move **W A S D**, attack **T**, jump **Y** (Z on QWERTZ), guard **G**, grab / pick up / hold to free or seal **J**. Player 2 joins with **Num 4**.

1. **Start:** Play → Solo → Stage 3 *Shadows over the Herb Mountain* on Medium. The six What's New cards (Mountain horses, Rescue condition, The research record, Highland weapons and food, Highland bandits, Garran Voss) show once.
2. **Silvermist:** five scenes, each a picture that slowly zooms and cross-fades to its end picture, with subtitles (narrator, Ren Xia, the elder, Luo Fen) and the opening music. Skip and Skip all work. Then the elder's briefing (five lines over the expedition map and the hamlet) and the loadout.
3. **Lower Switchback:** the mountain horse ride; then *Hoofprints in the Mud* (the clue: a dropped basket and hoofprints) and *Rope across the Trail*. Each arena has its area backdrop.
4. **Qinglan Hamlet:** *Empty Drying Racks* (checkpoint). At its exit, the **upper half** leads to the Signal Hut (*The Silent Antenna*): free Wei Shan (hold **J** beside her; the villager sprite sits tied, stands up when freed, walks to shelter) and read the radio clue. The lower half skips the branch.
5. **Moonbell Basin:** *Mist over the Beds*: a small picture appears top right (Tomas on the radio) while you fight. Pick up the **research record case** and hold **J** to seal it; a bandit may try to knock it over (watch its tell and interrupt). *Two Voices in the Mist*: free Gao Wen and Tao Min; let one bandit finish an action near them once to see the condition change from Secure to Strained (text and icon).
6. **Echo Quarry:** *Loose Scaffold* (checkpoint), upper half to the Herbalist Shelter (*Baskets Left Behind*: the gathering equipment clue, the camp meal), *Hammer Line*, *Cart Rails* (An Bo).
7. **Broken Ridge Camp:** the ridge ride, *Outer Fence*, *Lantern Row*, *Ren Xia's Enclosure*: the small picture shows Tomas in the cabin; when Ren is free, a second one shows him leaving by the quarry. Nothing asks you to chase him.
8. **High Winch Terrace:** *Chief of the Broken Ridge*. The music follows his phases. Capture him; then examine his **private case**: the stage ends.
9. **Ending:** the epilogue cards (Garran's capture, each rescue with its condition, the research record, each branch you walked, the invoice, Tomas in the lowlands), then *Paths through the Mist* (the reunion at Qinglan shows the Secure picture, or the Critical one if any group ended Critical), then the results: rescue conditions, the research record, horse Stability breaks, Garran's capture, hookstaff and winch redirects, the branches and the grade.
10. **Continue and checkpoints:** lose all Health once at a later beat and continue: the rescues you already made stay as they were.
11. **Co-op:** play a few beats with Player 2 (Num 4): both can free captives and seal the case.
12. **Museum:** Collection and Records → Museum: the Stage 3 pictures, the three chapters in Cinema (*Silvermist*, *The Prepared Route*, *Paths through the Mist*), seven Stage 3 music entries, the **Silvermist Ecology Folio** (first edition; complete edition after both branches in one run), the **Qinglan Rescue Bell**, **Gao Wen's Trail Ledger** and **The Broken Hookstaff**.
13. **Sponsor Dossier:** Investigation shows **The Damaged Invoice** as a page: open it (the invoice picture and its text). The achievement *Paper Trail* is earned with a message.
14. **Achievements:** Collection and Records lists the eight Stage 3 achievements (*Mist Lifts*, *Every Voice Home*, *Signal Restored*, *Shelter Remembered*, *Both Paths Walked*, *Steady on the Switchback*, *Hook Unhooked*, *Paper Trail*).
15. **Store:** Wardrobe shows each hero's *Mountain Rescue Outfit* and *Highland Gathering Festival Attire* as **Coming soon** (preview picture, no price, cannot be bought) and a note about the free default evolution the heroes already wear in Stage 3.
16. **Academy:** the Stage 3 What's New cards any time, and five Stage 3 lessons (the mountain horse, freeing captives, the Ridge Stalker, taking the hookstaff, turning the winch).
17. **Title screen:** after clearing Stage 3, the title shows the Silvermist loop and the Stage 3 menu background.
18. **Languages:** switch to 简体中文 and Deutsch: the encounter names (泥中蹄印 … 断脊之首; *Hufspuren im Schlamm* … *Der Anführer vom Gebrochenen Grat*), achievements (雾散山明 …; *Der Nebel lichtet sich* …), outfits, folio and artifacts follow the agreed names; the chapters, briefing and epilogue are translated.
19. **Stage 1 and 2 unchanged:** play the Stage 1 courtyard and the Stage 2 Loading Yard (`?stage=2&beat=2`) on Medium: nothing should feel different from 0.27.0.

Write down any beat that feels too long or too hard, any villager sprite that looks too big or too small, any subtitle that does not fit its picture, and any music change that feels abrupt.

## M28 playtest fixes (0.28.0)

Fixes for the four findings from the first Stage 3 playtest.

### Commands (Windows PowerShell)

Before it is merged, from branch `claude/project-thread-vwjw61`:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout claude/project-thread-vwjw61
git pull origin claude/project-thread-vwjw61
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173/` (or the port Vite prints). Stop the server with `Ctrl+C`.

### Test steps

1. **Narration:** in Settings, turn the system voice on. Start Stage 3 (or open *Silvermist* from the Museum's Cinema). Each picture now stays on screen, with its subtitle, until the narrator has finished the line; only then does the next line or picture come. Enter still skips ahead at once.
2. **Carried food:** on `http://localhost:5173/?stage=3&beat=7&difficulty=easy` (Mist over the Beds), pick up the green parcel (seed cake) and the broth pot with **J**. The hero keeps the normal stance and walk with the food in hand; no handwheel. Throw it away and pick it up again: same. Try the trail rice and the camp meal in later beats too.
3. **HUD:** the dark strip that stuck out to the right of the Attack bar is gone. Objective messages such as *Evidence collected* now show below the player HUD.
4. **Research record:** in Mist over the Beds, defeat or make the bandits surrender, walk to the **research record case** and stand still beside it. A prompt at the bottom says **Hold J to collect the record**. Keep **J** pressed (about one second, a progress bar fills): the label above the case changes to *Collected*. Walk right through the exit: the next beat (*Two Voices in the Mist*) starts. A short tap of J does nothing; it has to be held.
5. **Captives:** in *Two Voices in the Mist* (`?stage=3&beat=8`), the prompt beside Gao Wen and Tao Min says **Hold J to free them**, with a progress bar.
6. **Languages:** in 简体中文 the prompt reads 长按 J 收集记录, in Deutsch *J halten, um die Aufzeichnung zu sichern*.

### Round 2 (second playtest)

7. **Horse ride:** on the switchback ride (`?stage=3&beat=1`), steer up and down while riding. The horse keeps galloping while it changes lanes; it no longer stands still in the turn picture.
8. **Narration pictures:** with the system voice on, each scene shows only its start picture while the first line is spoken; the end picture fades in quickly when the second line starts. Two pictures should never stay blended on screen, also in *Paths through the Mist*.
9. **Food:** see step 13 (food is now eaten on pickup).
10. **Story pictures during the fight:** the small picture at the top right (Tomas on the radio, Tomas in the cabin, Tomas leaving) is intended: it plays over the fight without stopping it.
11. **Results:** after Garran, the results title reads *Stage 3 complete · Shadows over the Herb Mountain* (第三章完成 · 药山阴影), with the grade names *Rescue (captives freed)*, *Research record*, *Capture (Garran Voss)*, *Combat*, *Side paths*, and the record value translated.
12. **Garran's hookstaff:** when Garran drops the Quarry Hookstaff and you pick it up, the hero holds the hookstaff (with its hook), not a plain hiking staff, while standing, walking and attacking.

### Round 3 (third playtest)

13. **Food:** in Stage 3, walk to a food item and press **J**: it is eaten at once, like the Stage 1 and 2 food. Trail rice and the camp meal restore Health, the vegetable broth restores Defense, the seed cake fills the Attack bar.
14. **Garran:** when Garran surrenders (his Resolve breaks), his Health bar empties.
15. **Hiking staff:** a hiking staff thrown at a bandit lies on the ground as a staff only (no axe beside it).
16. **Hookstaff:** Garran's hookstaff is now held upright at the hero's side. It still has no fighting poses of its own (see the reply in the thread about new art).

## Hookstaff art and Stage 3 outfit walks (0.28.0)

Imports the 16 Quarry Hookstaff sheets (Pictures `codex_prompts_stage3_art_fixes.md`, SF01 to SF16) and the
Stage 3 outfit twins that were missing from the game: the revolver, lance, support gun, handwheel and workstaff
walks and poses. The `-BASE-` Hookstaff sheets stay in Pictures: the game always dresses the heroes in the Stage 3
outfit in Stage 3 rooms, where the Hookstaff appears.

### Commands (Windows, PowerShell)

Before the merge:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout claude/project-thread-vwjw61
git pull origin claude/project-thread-vwjw61
pnpm install
pnpm dev
```

After it is merged:

```powershell
cd C:\AI\Claude\FightForPeace
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm dev
```

Open `http://localhost:5173/` (or the port Vite prints). Stop the server with `Ctrl+C`.

### Test steps

1. **Hookstaff stance and walk:** fight Garran (`?stage=3&beat=16&difficulty=easy` or play to him), make him drop the Quarry Hookstaff and pick it up with **J**. The hero holds it diagonally in both hands (hook up and forward) while standing, and walks with it in both hands. Nothing floats beside the body.
2. **Hookstaff attacks:** attack with **T** and the other attack inputs: the hero sweeps low, thrusts with the iron end, pulls with the hook and raises it overhead. The hiking staff is never shown.
3. **Hookstaff throw:** throw it (hold the throw input): the hero raises it overhead, then it flies as its own item.
4. **All four heroes:** repeat steps 1 and 2 with Wind Sentinel, Fire Warden, Mountain Guardian and River Scout. Each is the same size with the Hookstaff as without it.
5. **Revolver walk in Stage 3:** pick up a bandit revolver in a Stage 3 encounter (for example `?stage=3&beat=7&difficulty=easy` after a bandit drops one) and walk: the hero walks with the gun in the hands, in the Stage 3 outfit. The revolver no longer floats beside the body.
6. **Other Stage 3 outfit walks:** in a Stage 3 room, a lance or support gun walk also shows the Stage 3 outfit with the weapon in hand (when one is available there).
7. **Fire Warden's size:** with the Fire Warden, pick up the quarry hammer (or the axe, the hiking staff, the Hookstaff), stand still, then walk: he keeps the same size; he no longer grows while standing with the hammer and shrinks when he walks. His plain walk matches his idle size too.
8. **Garran's Hookstaff:** in the Garran fight, take his Hookstaff from him in the first phase (Hookstaff Control). Through the phase change and the rest of the fight he never shows a second Hookstaff: he changes phase with empty hands, and his parry uses his forearms. There is only one Hookstaff in the fight, and he never picks it up again.
9. **Stage 3 food by walking over it:** in Stage 3, take some damage (or spend Defense or the Attack meter), then walk over a bowl of broth, trail rice or seed cake without pressing J: the hero eats it on the spot, keeps walking, and the eat sound plays. At full Health, Defense and meter the food stays on the ground for later, exactly like the Stage 1 and 2 food.

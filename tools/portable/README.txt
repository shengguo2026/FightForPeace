Fight For Peace @VERSION@ - portable build
==========================================

Stage 1 "The Broken Water Pact", the village menu and the Combat Lab (milestone M12),
played in your browser from this folder. Menus and subtitles in English, Simplified
Chinese and German. The version is shown in the lower right corner of the game.

Start
-----
Windows:  double-click start.bat
Linux:    run ./start.sh in a terminal (or double-click it and choose "Run")
macOS:    double-click start.command (the first time: right-click > Open)

The start script uses Node.js 24 or newer if this computer has it. Otherwise it downloads
a portable copy of Node.js (about 30 MB) into the "runtime" folder the first time, checks
its SHA-256 checksum, and starts offline from then on. Nothing is installed system-wide
and no administrator rights are needed.

The game then runs on a small local server at http://localhost:6006 (or the next free
port up to 6105) and opens in your default browser. The server only listens on this
computer (127.0.0.1), so Windows Firewall does not ask anything when you play alone.

Stop the game by closing the console window (or pressing Ctrl+C in it).

Options
-------
start.bat --port 7000     use another port (also: environment variable FFP_PORT)
start.bat --no-open       do not open the browser

Starting a second time while the game is already running from this folder just opens
the browser on the running game.

Logs: the "logs" folder (server.log, last-port.txt).

Playing Stage 1
---------------
The first start asks for the language, subtitles, essential accessibility, the keyboard
layout and your controls, then opens the village. Play leads through the mode (solo or
same-device co-op), the players, stage and difficulty, the heroes, the story and the
elder's briefing into Stage 1. Continue appears in the village once a checkpoint is saved.
Menus work with the keyboard (arrows, Enter, Esc), a gamepad or the mouse.
Add ?stage=1 to the address to skip the menus and start the stage directly
(also &difficulty=easy|medium|hard|extreme|ultimate and &beat=1..8 for a practice run),
or ?lab to open the Combat Lab directly.
Hold Interact next to a worker, a clue, the sponsor evidence or a downed partner.
Continues: Easy 5, Medium 3, Hard 2, Extreme 1, Ultimate none. A defeat spends one and
restores the latest checkpoint (beats 3, 5 and the boss); with none left the stage
restarts. End returns to the Lab.

Playing together over Wi-Fi (local network)
--------------------------------------------
Both computers run the game from their own copy of this zip, on the same home Wi-Fi.
1. Host: Play > Wi-Fi co-op > Host a game. The screen shows this computer's address,
   the port (7350 or the next free one) and a four-letter room code.
   The first time, Windows Firewall asks whether Node.js may communicate on networks:
   tick "Private networks" and press Allow. (Without it the guest cannot connect.)
2. Guest: Play > Wi-Fi co-op > Join a game, type the host's address, port and code.
3. Both pick a hero and press Ready; the host picks the difficulty. The stage starts on
   both computers at the same time.
Esc pauses both games; both players confirm before play resumes. A Wi-Fi game keeps no
checkpoint to continue later. Guest networks or "AP isolation" on some routers block
computers from seeing each other: then use the home network instead.
Your own moves show at once; the other player's late moves are corrected by a short
rollback. If one computer drops out (cable, Wi-Fi, a closed window), the other plays on
and the missing hero is kept safe until its player is back: the game reconnects by
itself, or the player opens the game again and joins with the same code. If the host
drops out, the guest's computer takes over and shows the address, port and code the
host joins again with (the guest's Windows Firewall may then ask for Node.js too).

Combat Lab
----------
F1 Lab overlay, F2 settings (training enemy, Defense switches), F3 hitboxes, F5 move
list, F6 slow motion, F7 recipes, F8 Defense panel with timing readouts.
Dummy 1 attacks Player 1 with the Straight Jab; choose other attacks in F2.

Licences
--------
THIRD-PARTY-NOTICES.txt lists the open-source packages inside the game and their licences.

Saves
-----
Profiles, settings, controls and progress are saved in the "saves" folder inside this
game folder (one file per profile, with daily backups). Settings > Profile Data can also
export every profile as a .ffpsave file and import one again, with a preview first.

Updating
--------
Unzip the new version next to the old one and copy the "saves" folder across.

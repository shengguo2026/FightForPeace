Fight For Peace - portable Combat Lab
=====================================

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
computer (127.0.0.1), so Windows Firewall does not ask anything.

Stop the game by closing the console window (or pressing Ctrl+C in it).

Options
-------
start.bat --port 7000     use another port (also: environment variable FFP_PORT)
start.bat --no-open       do not open the browser

Starting a second time while the game is already running from this folder just opens
the browser on the running game.

Logs: the "logs" folder (server.log, last-port.txt).

Combat Lab (milestone M4)
-------------------------
F1 Lab overlay, F2 settings (training enemy, Defense switches), F3 hitboxes, F5 move
list, F6 slow motion, F7 recipes, F8 Defense panel with timing readouts.
Dummy 1 attacks Player 1 with the Straight Jab; choose other attacks in F2.

Updating
--------
Unzip the new version next to the old one. (Saves arrive in a later milestone and will
be kept in a "saves" folder inside the game folder.)

# Fight For Peace — Binding-Aware Button Prompts and a Portable Build

**Date:** 2026-10-29
**Status:** Confirmed by the creator on 2026-10-29 (topic 2 revised the same day). Nothing here is implemented yet.
**Checked against:** game spec §5.2, §14.2, §16 (Guide: "Input examples render the current profile/device bindings"); `Features_Decisions.md` input section, §10.3 Player Academy, D6, D7, D11; `docs/review/03-network-play-and-licensing.md`; `docs/commercial-release-checklist.md`; roadmap and M0 plan of 2026-10-21.

## Summary

| Topic | Finding | Proposal |
|---|---|---|
| 1. Academy shows the player's own buttons | The spec already wants this in spirit (Guide input examples use current bindings; HUD prompts use action icons, not assumed keys; mounted cards honour current key labels; D6 shows the printed character). Nothing says *how*, and **no gamepad default layout exists** yet. | One shared **input prompt system**: every lesson, Guide page, Move List, HUD hint and control card names an *abstract action* (`Attack`), and the game draws that player's current key or button for it at display time. Built in M1, used everywhere from then on, acceptance-tested in M11. |
| 2. Portable zip for other PCs | The built game is a web page. Opening `index.html` from an unzipped folder does not work in browsers, so it needs a small local server. M12 (LAN co-op) also needs the game on a *second* PC. | `release/FightForPeace-<version>.zip` with `start.bat` / `start.sh`: they check for Node.js (downloading a portable copy into the folder if missing), start a local server on port 6006 or the next free port, and open the browser. Saves stay in the game folder. Proof of concept at M4, v1 at M9. |

---

## Topic 1 — Button prompts from the player's current bindings

### 1.1 What the player should see

- A lesson step says, for example, *"Press **[T]** three times"* for Player 1 on keyboard with default bindings.
- If the player rebinds Attack to `K`, the same step says **[K]**, immediately, without restarting the lesson.
- If the player picks up a gamepad mid-lesson (single-player switches seamlessly to the last-used device), it says **[X]** on an Xbox pad, **[□]** on a PlayStation pad, or **[Y]** on a Nintendo pad (same physical left button).
- On a German keyboard the Jump prompt says **[Z]**, because D6 shows the printed character, even though the physical code is `KeyY`.
- In same-device co-op each player sees their own prompts in their player colour: P1 with keyboard sees `[T]`, P2 with a gamepad sees `[X]`, P2 on split keyboard sees their numpad key.

### 1.2 How it works

```
lesson / Guide / HUD text      "Press {action:Attack} three times"   (localization string)
          │
          ▼
PromptResolver(player, action)  ← player's active device (keyboard / gamepad #n / split-keyboard half)
          │                     ← that player's profile bindings for that device (defaults if never changed)
          │                     ← keyboard layout map (printed characters, D6)
          │                     ← gamepad family (Xbox / PlayStation / Nintendo / generic)
          ▼
<InputPrompt> draws keycap "T" or the X-button glyph, plus accessible text "T key" / "X button"
```

Rules:

1. **Text never contains a key letter.** Lesson, Guide, Move List, briefing and HUD strings in all three languages use tokens: `{action:Attack}`, `{action:LowAttack}`, `{dir:Forward}`, `{dir:Up}`. A unit test scans every localization file and fails on a raw key name such as `"T"` or `"KeyT"` inside prompt text.
2. **Actions, not keys, are stored.** This matches the confirmed rule that My Combos recipes store abstract actions. Lesson data and recipes look like `expect: [Attack, Attack, Attack]`.
3. **Directions follow facing.** `Forward + U` is drawn as `D + U` when the hero faces right and `A + U` when facing left, updated live as the hero turns. On gamepad it is drawn as a stick or d-pad arrow towards the enemy.
4. **Optional bindings change the prompt.** If the player bound a dedicated Low Attack key, `{action:LowAttack}` shows that key; otherwise it shows the default chord *Dash + `T` + `G`*. The same applies to Dash (double-tap forward or the Dash key) and to separate Grab and Interact keys.
5. **Unbound actions are shown, not hidden.** If an action a lesson needs has no binding, the prompt shows *"Not assigned"* with a link to Settings → Controls, and the lesson waits.
6. **Prompts are re-resolved on every change**: rebinding, device switch, gamepad connect or disconnect, layout change, language change.

### 1.3 Keyboard labels

- Bindings are stored as physical codes (`KeyT`), as already planned.
- The label comes from `navigator.keyboard.getLayoutMap()` where the browser supports it (Chrome and Edge). Firefox and Safari do not support it, so the game uses the character from the first real key press of that code, and the first-launch layout picker (QWERTY / QWERTZ / AZERTY) until then. This is the D6 decision, unchanged.
- Keys without a printed character get localized names: `Space` / `Leertaste` / `空格`, `Num 4`, `←`, `Shift`, `Enter`.
- Keycaps are drawn by the UI (a rounded box with the label) rather than one image per key, so any character in any language works.

### 1.4 Gamepad labels and the missing default layout

The browser Gamepad API reports buttons by position (the "standard" mapping) and gives a device name string, not a brand. The game:

- Stores gamepad bindings as standard button positions (South, East, West, North, LB, RB, LT, RT, …).
- Detects the family from the device name and vendor ID: Microsoft or XInput → Xbox, `054c` → PlayStation, `057e` → Nintendo, anything else → generic glyphs that show position (a filled dot on the left, bottom, etc.).
- Offers *Settings → Controls → Button prompt style: Automatic / Xbox / PlayStation / Nintendo / Generic*, for pads that report themselves wrongly.
- Non-standard pads go through the guided remapping with live tester (M10) and then show generic glyphs.

**Glyph art:** Kenney's *Input Prompts* pack is CC0 (free for commercial use, no attribution needed), covers keyboard, Xbox, PlayStation, Nintendo Switch, Steam Deck and generic pads, and fits the placeholder-first policy: it can be restyled later under the same logical asset IDs (`ui.prompt.pad.xbox.west`). Brand button shapes on a commercial release are a small trademark question; it goes on the commercial checklist, and the generic set is always available.

**Gamepad defaults (confirmed 2026-10-29):** the spec only fixes Team Attack on a shoulder button (D11). A common layout for brawlers:

| Action | Keyboard P1 (confirmed) | Gamepad (proposed) |
|---|---|---|
| Move | `W A S D` | Left stick and d-pad |
| Attack | `T` | West (Xbox X / PS □) |
| Jump | `Z` (physical `KeyY`) | South (Xbox A / PS ✕) |
| Special | `U` | North (Xbox Y / PS △) |
| Grab / Interact | `J` | East (Xbox B / PS ○) |
| Guard | `G` | RB / R1 |
| Ultimate | `H` | RT / R2 |
| Team Attack | `B` | LB / L1 |
| Dash (optional) | — | LT / L2 |
| Pause | `Esc` | Start / Options |

Menu navigation (confirm/back) uses separate abstract menu actions, so gameplay remapping never breaks menus.

**Split-keyboard Player 2 defaults (confirmed by the creator on 2026-10-29).** They mirror Player 1: the top row `T Z U` becomes `Num 4 5 6` and the row below, `G H J`, becomes `Num 1 2 3`.

| Action | Player 1 (left cluster) | Player 2 (split keyboard) |
|---|---|---|
| Move | `W A S D` | Arrow keys |
| Attack | `T` | `Num 4` |
| Jump | `Z` (physical `KeyY`) | `Num 5` |
| Special | `U` | `Num 6` |
| Guard | `G` | `Num 1` |
| Ultimate | `H` | `Num 2` |
| Grab / Interact | `J` | `Num 3` |
| Team Attack | `B` | `Num 0` (proposed) |

Bindings use physical codes (`Numpad4`), so they work whether Num Lock is on or off. Open points for the M1 plan: confirm `Num 0` for Team Attack; the live tester's ghosting check for this exact set; and a laptop preset for keyboards without a numpad. D7's `IJKL` idea clashes with Player 1's `U`, `H` and `J`, so the M1 plan will propose a different laptop set.

### 1.5 Where it goes in the plan

| Milestone | Addition |
|---|---|
| M0 | `Bindings` is data with a device kind and a list of codes per action, so M1 adds gamepad and split keyboard without changing its shape. The Lab overlay's input panel shows key labels through one `describeBinding()` function rather than literal strings. (Small change to Task 6.) |
| M1 | `PromptResolver` and `<InputPrompt>` component, keyboard layout labels, gamepad family detection, placeholder glyphs (Kenney CC0), gamepad and split-keyboard default tables, live re-resolve on device switch. The input-history panel uses it. |
| M2–M9 | Every Lab readout, first-exposure card and HUD hint uses `<InputPrompt>`; no hard-coded key letters. Covered by the localization lint test. |
| M10 | Guided remapping writes bindings to the profile; the live tester and the "Button prompt style" setting use the same resolver. Saved bindings are part of profile export and import. |
| M11 | Academy lessons, Guide input examples and My Combos playback render through `<InputPrompt>`. **Acceptance test:** rebind Attack to `K` → lesson shows `K`; switch to a gamepad → lesson shows the West glyph; German layout → Jump shows `Z`; P2 on gamepad and P1 on keyboard see their own prompts. |
| M14 / M23 | QA matrix rows for prompts: three languages × keyboard layouts × gamepad families × rebinding. |

Cost: about 3–4 days inside M1 and about 1–2 days inside M11. It replaces work those milestones would have done with hard-coded labels anyway.

---

## Topic 2 — A portable zip with start scripts

**Revised 2026-10-29 after creator feedback:** no desktop app. The portable build is the normal browser game plus `start.bat` / `start.sh`, packed into `release/FightForPeace-<version>.zip`.

### 2.1 What the player does

1. Copy `FightForPeace-0.9.0.zip` to any PC or folder and unzip it.
2. Double-click `start.bat` (Windows) or `start.sh` (Linux; `start.command` on macOS, see 2.5).
3. The script checks that the required runtime is there and downloads it the first time if it is missing. It then starts the game's small local server on port **6006**, or on the next free port if 6006 is taken, and opens the game in the default browser.
4. Close the console window (or press `Ctrl+C`) to stop the game.

Why a script and a server are needed at all: double-clicking `index.html` opens it from `file://`, where browsers block JavaScript modules and asset loading and keep saves unreliably. A tiny local server on `http://localhost:<port>` avoids all of that, and `localhost` counts as a secure context, so gamepads, keyboard layout labels, crypto and Web Locks all work.

### 2.2 What "required libs" means here

| Needed at runtime | Where it comes from |
|---|---|
| The game itself (Phaser, Preact and our code) | Already compiled into `game/` at build time. Nothing to download. |
| The local web server (and later the LAN room server) | One prebuilt file, `server/server.mjs`. It uses only Node's built-in modules, and anything else (for example the WebSocket library for M12) is bundled into it at build time, so the player never runs `npm install`. |
| **Node.js runtime** | The only thing the start script checks. If `node` version 24 or newer is installed, it is used. Otherwise the script downloads the official portable Node.js archive for this OS and CPU (about 30 MB) from `nodejs.org` into `runtime/` inside the game folder, checks its SHA-256 against the value pinned in the release, and unpacks it. Next time it starts offline from `runtime/`. Nothing is installed system-wide and no admin rights are needed. |
| A browser | Any Tier-1 browser already on the PC (Chrome, Edge, Firefox, Safari). |

If the PC is offline on first start and has no Node.js, the script says so clearly. An optional **offline zip** variant can ship with the Windows Node runtime already in `runtime/` (about 30 MB larger), built by the same release command with `--with-runtime win-x64`.

### 2.3 Start-script behaviour

1. Change to the script's own folder, so it works from any directory and from paths with spaces.
2. Use `runtime/node` if present, else a system `node` of version 24 or newer, else download as in 2.2 (Windows: built-in PowerShell `Invoke-WebRequest` and `tar`; Linux and macOS: `curl` or `wget`, `tar`, and `sha256sum` or `shasum`).
3. Run `node server/server.mjs`. The server:
   - tries port **6006**, then 6007, 6008 … up to 6105, binding only to `127.0.0.1` so single-player never triggers a firewall prompt and nobody else on the network can reach it;
   - also accepts `start.bat --port 7000` (and the `FFP_PORT` environment variable) to force a port;
   - serves `game/` with correct MIME types and no caching surprises, prints `Fight For Peace 0.9.0 running at http://localhost:6007`, and opens that address in the default browser (`start`, `open` or `xdg-open`);
   - writes the chosen port to `logs/last-port.txt` and logs to `logs/server.log`;
   - if a Fight For Peace server from the same folder is already running, it just opens the browser on that port instead of starting a second one.
4. When hosting LAN co-op (M12), the in-game lobby asks this same server to open the room listener on port 7350 (next free if taken) on the LAN interface. Only then does Windows Firewall ask once; allow *private networks*.

### 2.4 Saves and the changing port

Browsers keep IndexedDB per address, and the port is part of the address. If 6006 is busy one day and the game starts on 6007, browser-stored saves would seem to vanish. Moving the folder to another PC would also leave the saves behind in the old browser.

**Proposal:** in the portable build, profiles are saved **by the local server into a `saves/` folder inside the game folder**, through the save adapter the spec already requires (`Features_Decisions.md` §11: saves behind a platform adapter). The same versioned, checksummed transactional format and snapshots are used; only the storage location changes. That makes saves independent of the port and the browser, and copying the game folder copies the saves. The pure browser build (`pnpm dev`) keeps IndexedDB, and `.ffpsave` export and import still move profiles between the two. This changes "IndexedDB is the canonical local store" for the portable build only (confirmed 2026-10-29).

### 2.5 Operating systems

| OS | Start file | Notes |
|---|---|---|
| Windows 10 / 11 | `start.bat` | Works by double-click. No SmartScreen warning, because there is no unsigned `.exe`. |
| Linux | `start.sh` | Stored executable in the zip. Some file managers ask "Run or display?"; otherwise run `./start.sh` in a terminal. |
| macOS | `start.command` (a copy of `start.sh`) | macOS opens `.sh` files in a text editor on double-click, but runs `.command` files in Terminal. The first time, Gatekeeper may need right-click → *Open*. |

### 2.6 What goes in the zip and how it is built

```
release/FightForPeace-0.9.0.zip
└─ FightForPeace-0.9.0/
   ├─ start.bat
   ├─ start.sh
   ├─ start.command
   ├─ server/server.mjs        local server, bundled, no node_modules
   ├─ game/                    built game (index.html, JS, assets, media)
   ├─ runtime.json             required Node version, download URLs and SHA-256 per OS/CPU
   ├─ VERSION                  0.9.0
   ├─ README.txt               how to start, ports, firewall note, where saves are, how to update
   └─ LICENSES.txt             third-party notices (Phaser, Preact, bundled libraries, Kenney CC0)
   (created on first run: runtime/, saves/, logs/)
```

- Root command **`pnpm release`**: runs the production build, bundles `server.mjs` with esbuild, assembles exactly the files above (no sources, tests, `node_modules` or dev tools), writes the version from the root `package.json`, and zips it to **`release/FightForPeace-<version>.zip`**. Unix file permissions are kept, so `start.sh` stays executable.
- `release/` is listed in `.gitignore`: zips are build output, not source. CI builds the zip on milestone PRs as a downloadable artifact, and a version tag publishes it as a GitHub Release.
- **CI smoke test:** unzip the release into a temporary folder whose path contains a space, block port 6006 with a dummy listener, run the start script without a system Node (so it downloads into `runtime/`), check that the game is served on 6007, and run the M0 movement test against it with Playwright. This runs on Windows and Linux.
- **Updating:** unzip the new version next to the old one and copy the old `saves/` folder across (README explains). The LAN lobby already rejects mismatched game or rules versions, so both PCs must use the same zip.

### 2.7 Where it goes in the plan

| Milestone | Addition |
|---|---|
| M0 | Guardrails only: the game never assumes a fixed origin or port (no `localhost:5173` literals), and assets load through origin-relative URLs. `release/` is in `.gitignore`. |
| M4 (first playable Combat Lab) | **Proof of concept** (about 2 days): `start.bat`, `start.sh`, `start.command`, `server.mjs` with port search from 6006, Node check and download, `pnpm release`, zip in `release/`. You try it on a second PC early. |
| M9 (Stage 1 playable start to end) | **Portable build v1** (about 2 days): README, licence notices, version display in game and console, the CI smoke test, GitHub Release on tag. Every later milestone ships a zip. |
| M10 | Server-backed save adapter writing to `saves/`, with the same snapshots, backups and export/import as the IndexedDB adapter. |
| M12 | The same server hosts the LAN room listener. The second PC only needs the zip. |
| M14 | The portable zip is in the test matrix: a PC that never had dev tools, offline first start, port 6006 busy, Windows and Linux. |

Cost: about 4–5 days in total, spread over M4, M9 and M10, plus a few hours in M12.

---

## Decisions (confirmed by the creator on 2026-10-29)

1. **Saves in the portable build:** stored by the local server in `saves/` inside the game folder (section 2.4).
2. **Gamepad default layout:** the table in §1.4.
3. **Glyph style:** Kenney CC0 placeholder glyphs now, restyled later through logical asset IDs.

All three are recorded in `Features_Decisions.md` §13.

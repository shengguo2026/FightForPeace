# Fight For Peace — Binding-Aware Button Prompts and a Portable Build

**Date:** 2026-10-29
**Status:** Proposal for creator review, before M0 starts. Nothing here is implemented.
**Checked against:** game spec §5.2, §14.2, §16 (Guide: "Input examples render the current profile/device bindings"); `Features_Decisions.md` input section, §10.3 Player Academy, D6, D7, D11; `docs/review/03-network-play-and-licensing.md`; `docs/commercial-release-checklist.md`; roadmap and M0 plan of 2026-10-21.

## Summary

| Topic | Finding | Proposal |
|---|---|---|
| 1. Academy shows the player's own buttons | The spec already wants this in spirit (Guide input examples use current bindings; HUD prompts use action icons, not assumed keys; mounted cards honour current key labels; D6 shows the printed character). Nothing says *how*, and **no gamepad default layout exists** yet. | One shared **input prompt system**: every lesson, Guide page, Move List, HUD hint and control card names an *abstract action* (`Attack`), and the game draws that player's current key or button for it at display time. Built in M1, used everywhere from then on, acceptance-tested in M11. |
| 2. Portable zip for other PCs | The built game is a web page. Opening `index.html` from an unzipped folder does not work in browsers, so a zip needs a small program that runs it. M12 (LAN co-op) also needs the game on a *second* PC, so the portable build solves a real need there. | ★ **Desktop wrapper (Electron), packaged as a zip** for Windows x64: unzip, double-click `FightForPeace.exe`, play. Saves stay inside the folder. Proof of concept at M4, full portable build at M9, used by M12. |

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
- The label comes from `navigator.keyboard.getLayoutMap()` where the browser supports it (Chrome, Edge, and the desktop wrapper from Topic 2). Firefox and Safari do not support it, so the game uses the character from the first real key press of that code, and the first-launch layout picker (QWERTY / QWERTZ / AZERTY) until then. This is the D6 decision, unchanged.
- Keys without a printed character get localized names: `Space` / `Leertaste` / `空格`, `Num 4`, `←`, `Shift`, `Enter`.
- Keycaps are drawn by the UI (a rounded box with the label) rather than one image per key, so any character in any language works.

### 1.4 Gamepad labels and the missing default layout

The browser Gamepad API reports buttons by position (the "standard" mapping) and gives a device name string, not a brand. The game:

- Stores gamepad bindings as standard button positions (South, East, West, North, LB, RB, LT, RT, …).
- Detects the family from the device name and vendor ID: Microsoft or XInput → Xbox, `054c` → PlayStation, `057e` → Nintendo, anything else → generic glyphs that show position (a filled dot on the left, bottom, etc.).
- Offers *Settings → Controls → Button prompt style: Automatic / Xbox / PlayStation / Nintendo / Generic*, for pads that report themselves wrongly.
- Non-standard pads go through the guided remapping with live tester (M10) and then show generic glyphs.

**Glyph art:** Kenney's *Input Prompts* pack is CC0 (free for commercial use, no attribution needed), covers keyboard, Xbox, PlayStation, Nintendo Switch, Steam Deck and generic pads, and fits the placeholder-first policy: it can be restyled later under the same logical asset IDs (`ui.prompt.pad.xbox.west`). Brand button shapes on a commercial release are a small trademark question; it goes on the commercial checklist, and the generic set is always available.

**Gamepad defaults (proposed, needs your approval):** the spec only fixes Team Attack on a shoulder button (D11). A common layout for brawlers:

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

The **split-keyboard Player 2 defaults** (D7: arrows plus numpad, with an `IJKL` laptop preset) also need exact keys. I will propose them in the M1 plan, since they depend on keyboard-ghosting checks.

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

## Topic 2 — A portable zip that runs on another PC

### 2.1 Why not just zip the web build

`pnpm build` produces a folder of HTML, JavaScript and assets. Double-clicking `index.html` opens it from `file://`, where browsers block JavaScript modules and asset loading, store saves unreliably (Firefox gives each file its own storage), and disable features the game needs. So a portable build has to include something that serves or hosts the game.

### 2.2 Options

| | **A ★ Desktop wrapper (Electron), zipped** | B Small launcher + the player's browser | C Tauri wrapper |
|---|---|---|---|
| What the zip contains | `FightForPeace.exe`, a bundled Chromium, the game files | `FightForPeace.exe` (a tiny local web server), the game files | `FightForPeace.exe`, the game files; uses Windows' built-in Edge WebView2 |
| How it runs | Opens its own game window, fullscreen-capable, no browser bars | Starts `http://localhost:<port>` and opens the default browser | Opens its own window |
| Same browser engine on every PC | Yes (one engine to test) | No; depends on what is installed | Mostly (Edge engine on Windows) |
| Saves | Inside the unzipped folder (`Data\`), so copying the folder or a USB stick moves the saves too | In that PC's browser, tied to the port; moved by profile export and import | In the user profile folder |
| LAN co-op host (M12) | The room server runs inside the app; Windows Firewall asks about *Fight For Peace* | The launcher can run the room server | Room server would need rewriting in Rust or a bundled Node |
| Size (zip) | About 120 MB plus game media | About 40–90 MB plus game media | About 10 MB plus game media |
| Later Steam build | Same wrapper (commercial checklist 3.2) | Needs a wrapper anyway | Possible |
| Extra tools to build | None beyond Node and pnpm | None (Node single-executable) | Rust toolchain |

**Recommendation: A.** It gives one consistent engine (gamepad behaviour, keyboard layout labels via `getLayoutMap`, video codecs), portable saves, the LAN room server, and it is the same wrapper a Steam release needs. B stays possible if size matters more than consistency.

### 2.3 What the portable build looks like (option A)

```
FightForPeace-0.9.0-win-x64.zip
└─ FightForPeace\
   ├─ FightForPeace.exe        double-click to play
   ├─ resources\app.asar       the built game (same code as the browser build)
   ├─ Data\                    created on first run: profiles, settings, logs
   ├─ README.txt               requirements, controls, firewall note, how to move saves
   └─ LICENSES.*               third-party notices (Chromium, Electron, Phaser, …)
```

- **Target PC:** Windows 10 or 11, 64-bit, a graphics card with WebGL 2. Nothing to install: no Node.js, no pnpm, no browser.
- **First start:** the build is not code-signed until commercial release (checklist 3.6), so Windows SmartScreen shows "Windows protected your PC" → *More info* → *Run anyway*. README explains it. When hosting LAN co-op, Windows Firewall asks once; allow *private networks*.
- **Saves:** stored in `Data\` next to the exe. If the folder is read-only (for example under `Program Files`), the game falls back to `%LOCALAPPDATA%\FightForPeace` and says so. Updating to a new version: unzip the new version and copy the old `Data\` folder over, or use profile export and import.
- **Versions:** the zip name and the title screen show the version. The LAN lobby already refuses mismatched game or rules versions, so both PCs must use the same zip.
- **Security hygiene:** the game page gets no Node access (`contextIsolation`, `sandbox`); a small preload exposes only what the game needs (start or stop LAN room, list LAN addresses, fullscreen, open the saves folder). The game is served from a private `app://` scheme, never from a web server.
- **The browser build stays.** `pnpm dev` and `pnpm build && pnpm preview` remain the development path and the Tier-1 browser targets. The desktop app is one more platform adapter (`DesktopHost`) behind the interfaces the spec already requires.

### 2.4 How it is built

- New workspace package `apps/desktop` (Electron main process, preload, room-server host) and root script `pnpm package:win`, which builds the game and produces the zip with electron-builder's `zip` target.
- CI: a `windows-latest` job builds the zip on milestone PRs and uploads it as a downloadable artifact; a version tag publishes it as a GitHub Release. A smoke test launches the packaged exe with Playwright's Electron support and runs the same M0 movement test, so a broken package fails CI.
- macOS and Linux zips are possible later with the same setup (macOS needs notarization or a right-click *Open* the first time).

### 2.5 Where it goes in the plan

| Milestone | Addition |
|---|---|
| M0 | Guardrail only: the game must not assume a fixed origin or port (no `http://localhost:5173` in code), and all assets load through the manifest with origin-relative URLs. No packaging work. |
| M4 (first playable Combat Lab) | **Proof of concept** (about 2 days): `apps/desktop`, `pnpm package:win`, CI artifact. You unzip it on a second PC and check window, keyboard, gamepad and performance early, while fixing things is cheap. |
| M9 (Stage 1 playable start to end) | **Portable build v1** (about 3 days): saves in `Data\` with fallback, README, licence notices, version display, Playwright smoke test of the packaged exe, GitHub Release on tag. Every later milestone ships a zip next to the PR. |
| M10 | Profile export and import also works from the desktop app (native save dialog), so saves can move between the browser and desktop versions. |
| M12 | The second PC runs the portable zip, so the guest needs no Node.js or pnpm. The room server starts from the in-game lobby, hosted by the desktop app. (The browser path from review 03 option A still works for development.) |
| M13 | Check that the cinematic and music formats play in the packaged app (part of the media integration test). |
| M14 | The portable zip is in the hardware matrix (low-end laptop, a PC that never had the dev tools). |

Cost: about 1 week in total, spread over M4 and M9, plus a few hours in M12.

---

## Decisions needed from you

1. **Portable build approach:** A (Electron zip, recommended), B (launcher plus browser) or C (Tauri).
2. **Gamepad default layout:** approve the table in §1.4 or change it.
3. **Glyph style:** Kenney CC0 placeholder glyphs now, restyled later through logical asset IDs, as proposed.

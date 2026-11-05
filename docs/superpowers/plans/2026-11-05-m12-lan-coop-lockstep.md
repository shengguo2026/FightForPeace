# M12 LAN Co-op (Lockstep) Implementation Plan

**Goal:** Two computers on the same home network play Stage 1 together, each from its own copy of the game (the portable zip or `pnpm dev`). The host opens a room and reads out its LAN address, port and room code; the guest joins with them. Both run the same deterministic simulation in delay-based lockstep, compare hashes, and the guest is repaired from the host's snapshot if the two ever differ. Focus loss starts a synchronized courtesy hold, either player can pause both games, play resumes only after both confirm and a countdown, and every way out ends the session safely for both.

**Architecture:** D9 phase 1 (review 01 D9-A, review 03 §1). Four layers, each testable on its own:

| Layer | Where | What |
|---|---|---|
| Room server | `tools/portable/room.mjs` (Node built-ins only) | `POST /__ffp/room` on the game's own server opens a room: the LAN listener starts on `0.0.0.0:7350` (or the next free port up to 7359), with a four-character code (no look-alike characters) and a host token. WebSocket (RFC 6455, hand-written framing) relays messages between host and guest after checking the code or token; it explains refusals (`code`, `full`, `expired`, `closed`, `token`). Mounted by the portable `server.mjs` and by a Vite plugin, so `pnpm dev`, `pnpm preview` and the zip all host. |
| Snapshot and hashes | `packages/sim/src/net/snapshot.ts` | `snapshotWorld` / `restoreWorld` (the world is plain data; the snapshot carries state format, rules version and hash, and restoring checks all three), `rulesHash()` over the rules version, state format and every generated gameplay table, `cheatRegistryHash()`. |
| Protocol, transport, lockstep | `packages/platform/src/net/` | `Transport` interface (WebSocket now, WebRTC or online rooms later), an in-memory pair for tests; frame-stamped inputs, hashes and snapshots on the wire (the format M15 reuses for prediction and rollback); `checkCompat` (protocol, game version, rules, content manifest, cheat registry); `chooseDelay`; the `Lockstep` state machine with time passed in. |
| Game | `apps/game/src/net/netplay.ts`, `shell/screens/Wifi.tsx`, `GameSession.advanceNet` | Host/Join screens, the network lobby (host owns difficulty; each player picks a unique hero and confirms on their own computer), the start message, the lockstep driver inside `GameSession`, the in-game badge and the hold / pause / countdown / ended panel; each computer saves only its own player's results. |

**Spec:** spec §18.2, `Features_Decisions.md` (Deterministic Courtesy Hold with Bounded Recovery, synchronized pause, Dual-Path Ephemeral Pairing as amended by review 03, mismatch blocks readiness, no continuable Wi-Fi save from 2026-10-31); roadmap row M12 and its guardrail (frame-stamped inputs and full snapshots in the M15 format).

## Rules

| Item | Value | Source |
|---|---|---|
| Input delay | 2–4 frames: `1 + ceil((rtt/2 + 8 ms) / frame)`, from the lobby's measured round trip, fixed for the session | D9-A |
| Stepping | a frame is simulated only when both inputs are known; local input stamped for `frame + delay`; a game behind its partner may take up to 2 extra steps per render frame | D9-A |
| Hashes | both send the world hash every 30 frames; a mismatch makes the host send a full snapshot, the guest restores it (the host is authoritative); a snapshot that fails validation ends the session (`desync`) | spec §18.2 |
| Courtesy hold | focus loss or a hidden tab releases held inputs and stops stamping inputs on both computers, so both worlds stop on the same frame; the player who stayed is ready, the returning player must confirm; 3 s hold, then a 60 s recovery grace with a visible countdown, then a safe end (`away`) | F&D Deterministic Courtesy Hold |
| Synchronized pause | Pause on either computer holds both; both players confirm; local settings may be changed (Settings, this computer only); no shared rules change | F&D |
| Resume | after both confirmed, the host sends a 3 s countdown; a new hold cancels it | F&D |
| Connection | heartbeat every 500 ms (also measures the round trip); 10 s of silence or a closed socket ends the session (`lost`) | — |
| Session end | End session, Back to the village from results, a lost connection or an expired grace end the game on both computers with a reason; Wi-Fi play keeps no continuable checkpoint; confirmed results stay saved on the computer that earned them | decision log 2026-10-31 |
| Lobby checks | protocol, game version, deterministic-rules hash, content manifest hash, cheat registry hash; the first difference is named and blocks joining | spec §18.2 |
| Cheats | Wi-Fi games run without Elder's Secrets in M12 (the registry hash is still compared) | — |

## Tasks

- [x] World snapshots, rules hash and cheat registry hash in `packages/sim` (`m12.test.ts`: a restored snapshot continues exactly like the original through 1,500 co-op frames).
- [x] Room server with WebSocket framing, codes, host token, refusals, relay; portable server and Vite plugin mount it; `server/room.mjs` in the zip; README and portable README sections; the smoke test opens and closes a room from the unzipped build.
- [x] Protocol, `Transport`, `Lockstep` with holds, ready, countdown, grace, heartbeat, end and snapshot resync (`packages/platform/test/net.test.ts`: lockstep equals hot-seat play on the same inputs under uneven timing; desync repaired once; hold stops both on one frame; pause needs both; grace ends safely; silence and Leave end the session).
- [x] Game: Wi-Fi mode button, Host/Join screens with the firewall hint and precise errors, network lobby, `GameSession.advanceNet`, device join lock, HUD for both players, the network badge and panels, results and saves per computer, no checkpoint; EN/ZH-CN/DE text.
- [x] Browser tests (`apps/game/e2e/m12.spec.ts`), two browser contexts through the dev server's room: lockstep play with equal hashes (all browsers); hold, resume, repaired desync, pause and safe end; version mismatch, wrong code and readiness cleared by a rule change (Chromium only, for CI time). Every wait is on game state.

## Known limits

- No prediction or rollback, survival proxy, host migration or reconnect: they are M15. A lost connection ends the session.
- The input delay is chosen once, in the lobby.
- Outfit colours of the partner are not sent (each computer draws the partner in the default colours).
- Wi-Fi games skip the intro and briefing and start straight from the lobby, without Elder's Secrets.
- Guest networks or routers with client isolation block the connection; the join error says so.

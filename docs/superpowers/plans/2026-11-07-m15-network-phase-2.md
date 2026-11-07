# M15 Network Phase 2 Implementation Plan

**Goal:** Stage 1 over home Wi-Fi with no input delay; a pulled cable, a closed page or a player who stays away no longer ends the session. The partner's late input is predicted and corrected by a bounded rollback; the computer with authority decides who is in the game; a missing player's hero holds its guard, then follows the Restricted Survival Proxy; a guest whose host is gone takes authority over and the former host comes back as the returning player; a returning player gets a validated snapshot and takes the hero over at the next safe moment. Results are saved once per session on each computer.

**Architecture:** D9 phase 2 on the M12 wire format (frame-stamped inputs, hashes, full snapshots are unchanged; protocol 2 adds `absent`, `promoted`, `rejoin`, `back`).

| Layer | Where | What |
|---|---|---|
| Rollback session | `packages/platform/src/net/rollback.ts` | `RollbackSession<S>` replaces M12's `Lockstep`. Simulation hooks (`frame`, `save`, `load`, `step`, `hash`, `snapshot`, `restore`, `proxy`, `actionable`); local input stamped for `frame + delay`; partner input predicted (held buttons, no new presses); saves of every unconfirmed frame; rollback and re-simulation when a different input arrives; absences per player slot; authority, promotion, demotion and the hand-back; holds as in M12 but on confirmed frames only; delay monitoring; the session log. Time passed in. |
| Survival proxy | `packages/sim/src/net/proxy.ts` | `proxyInput(world, slot, absentFrames, handover)`: 3 s guarded neutral, then follow the partner, guard against visible attacks (directional), conservative basic attacks; only Attack and Guard ever pressed. `actionable(world, slot)`: the safe moment to hand the hero back. Computed from the world, so a re-simulated frame gets the same input. |
| Room server | `tools/portable/room.mjs` | The `joined` notice carries a guest token; a guest that reconnects with it replaces its stale connection (a pulled cable leaves the old socket looking open) without a `peer-left` to the host. |
| Game | `apps/game/src/net/netplay.ts`, `game.ts`, `shell/screens/Wifi.tsx` | `GameSession.netHooks()` (saves are `structuredClone`s of the world: about 0.1 ms each, 12 KB); the driver; reconnecting to the partner's room every 2 s with the token; a standby room opened on this computer after taking authority over; a `hello` during play = a returning player (compat must match; an unknown copy only takes a missing slot); a fresh page that receives `back` rebuilds the stage from its `StartInfo`; overlay notices, the away panel and EN/ZH-CN/DE text (`strings.m15.ts`). |

**Spec:** Stage 2 spec §3, §17, §18; `Features_Decisions.md` §4 (Host-Authoritative Deterministic Simulation with Prediction and Bounded Rollback; Short Recovery Grace, Restricted Survival Proxy and Host Migration; Deterministic Courtesy Hold with Bounded Recovery); roadmap row M15.

## Values chosen (open "networking implementation and test values" in F&D §4)

| Item | Value |
|---|---|
| Input delay | 0 frames when the quickest lobby round trip is under about 100 ms; `ceil((rtt/2 − 50 ms) / frame)` above, at most 3 |
| Delay monitoring | every 5 s: waiting for the partner on ≥ 10 % of render frames raises this computer's delay by 1 (max 3) |
| Rollback window | 8 frames (133 ms) beyond the last confirmed frame; further ahead the world waits |
| Prediction | the partner's last known input, held buttons kept, new presses dropped |
| Hashes | every 30 confirmed frames; on a difference the authority sends the snapshot of its first unconfirmed frame; frames before a snapshot are never rolled back to |
| Heartbeat | 500 ms |
| Missing partner (authority) | silence of 1.5 s, a closed link, the room's `peer-left`, or a courtesy hold that expired: missing from the frame after the last confirmed one |
| Taking over (no authority) | the room's `peer-left` at once; silence of 6 s; an expired courtesy hold of the authority's player |
| Courtesy hold | 3 s (then recovery, no longer a 60 s grace and an `away` end) |
| Recovery grace | 180 frames (3 s) of guarded neutral, then the proxy |
| Hand-back | at the hero's first actionable frame (standing, walking or guarding, no action), at most 2 s later; the returning player's input counts from `snapshot frame + 20 + delay`, guarded neutral until then |
| Double takeover | the computer that owns the room the link runs through keeps authority and repeats its claim; the other one comes back as the returning player |
| Reconnect | every 2 s with the guest token while the link is down |
| Results | saved once per session on each computer (the M10 `resultsRecorded` flag survives every snapshot), logged as `credit`; a player away through the results gets nothing for the run on their computer until they rejoin while the results screen is still open on the authority's computer |

## Tasks

- [x] `RollbackSession` with prediction, saves, rollback, hashes, snapshot repair, holds on confirmed frames, delay monitoring (`packages/platform/test/net.test.ts`: under 30–50 ms latency with jitter and uneven frame rates both games end in the world hot-seat play gives on the same inputs; rollbacks never deeper than the window; a slow link waits at the window and raises the delay; a desynchronised guest is repaired).
- [x] Recovery in the same session: missing partner, proxy, promotion, demotion, rejoin, hand-back, double takeover (tests: guest away after the courtesy hold → proxy → rejoin; host away → guest takes over → host returns; closed host page → takeover from the last confirmed frame; pulled cable on both sides → room owner keeps authority; a short silence on a live link; a hand-back with other rules ends safely).
- [x] Survival proxy in `packages/sim` (tests: only Attack and Guard, meter never spent over 6,000 frames; guarded neutral during the grace and the hand-back).
- [x] Room server guest token (`tests/portable/room.test.ts`).
- [x] Game: driver, reconnects, standby room, `hello` during play, fresh-page rejoin, overlay and text, test hooks (`cutFor`, `setCourtesy`, `corrupt` that also damages the saves).
- [x] Browser tests `apps/game/e2e/m15.spec.ts` (Chromium, two games through the dev server's room): no input delay and a pulled cable on the guest; a closed guest page, proxy, rejoin from a new page with the same code; a closed host page, the guest takes over and opens its room, the host rejoins through it. M12's tests run with a long courtesy hold.

## Known limits

- WebSocket through the host's room server stays the transport (WebRTC is later); a pulled cable is noticed by silence, not by the socket.
- A former host whose page closed rejoins by typing the address, port and code that the other computer shows (the page forgets its session when it closes).
- After a double takeover the guest's own time alone is replaced by the host's game (the guest sees a jump).
- The proxy does not revive a downed partner, pick anything up or use the route; it does not avoid stage hazards beyond staying with its partner.
- Wi-Fi games still run without Elder's Secrets and keep no checkpoint.

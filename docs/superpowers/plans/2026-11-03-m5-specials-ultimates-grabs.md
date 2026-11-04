# M5 Specials, Ultimates and Grabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The founders get their full kits. Each hero has three core Specials and a signature Ultimate, paid from the Attack meter, which now follows the confirmed Authored Per-Action Gain with Independent Combo Decay model. A five-slot Special loadout and a five-slot Ultimate loadout decide what `Special` and `Ultimate` do in each direction; the Lab owns two catalogue moves per hero so the loadout can be tried. `Interact` grabs: a Directional Contextual Grab opens a Short Branching Grab Route (one extension, then a throw, a release strike or a Special finisher, or a shove on timeout). Throws turn the thrown enemy into a body projectile that can hit one other enemy. The training enemy learns two grabs: one the hero breaks with a Telegraph-and-Break Grab Escape, and one that ends in a **restraint** the partner can rescue.

**Architecture:** Builds on M4 without changing its layering. `packages/data` gains Special, Ultimate, grab and throw categories, loadout slot data and defensive-property fields (`armor`, `invulnerable`, `hurtShift`, `projectile`, `grab`, `bodyDamage`); the trainer kit gains two grabs. `packages/sim` grows `combat/meter.ts` (gain, bands, crowd bonus), `combat/loadout.ts` (default loadout, equip rules, slot lookup), `combat/projectiles.ts` (one projectile per owner) and `combat/grabs.ts` (target choice, contested grabs, grab route, throws, body projectiles, escape, restraint, rescue and the grab integrity pass). `apps/game` adds the Loadout section (F2), the Grab panel (F9), Special/Ultimate/grab call-outs, the escape telegraph, an Attack meter bar and the new hints.

**Tech Stack:** unchanged.

**Spec:** `Features_Decisions.md` §6.6 (resource economy), §6.7 (grabs and throws); `2026-10-18-fight-for-peace-game-specification.md` §7.7, §7.8, §8.1–8.2, §9, Appendix A.1–A.4, B.3, B.5, B.6; roadmap row M5 and the campaign guardrail row M5 (no outfit spike; grabs keep a `restraint` outcome tag with partner rescue).

## Global Constraints

- Everything from the M0–M4 plans still applies (60 Hz integer simulation in 1/256 px, no float maths, `Math.random` or `Date` in `packages/sim`, no key letters in player-facing text, heroes are data, open tag sets, one defensive snapshot per frame).
- **Slots, not moves.** Inputs and cancel links name loadout slots (`Special` + direction, `Ultimate` + direction); the loadout decides which move runs. Neutral `Special` and neutral `Ultimate` are fixed signatures. An empty slot is rejected with a reason and never falls back to another move.
- **Nothing is spent on a rejected input.** An Ultimate is paid on acceptance only; an invalid grab, Special or Ultimate press spends nothing and never becomes a delayed action.
- **Grabs are owned by two fighters at once.** Every frame an integrity pass checks both sides of each grab and safely releases a broken pair (grabber hit, target gone, state changed). No path may leave either fighter stuck in a grab state.
- **Grabs keep the target's combo context.** Grabbing a target in an open context, the extension, the finisher and the body-projectile collision all use the same budgets; nothing refreshes them. The struck enemy of a body projectile gets its own context.
- **Restraint is data.** An enemy grab tagged `restraint` ends with the hero restrained (not a throw); a partner rescues by striking a `rescueInterruptible` grabber or by using `Interact` next to the restrained ally. A solo hero is never stuck: the restraint times out.
- **Windows-safe tests.** No test splits paths on `/` or compares text without normalizing `\r\n`. Browser tests wait for simulation conditions (never wall-clock timing) and space key presses by simulation frames, as PR #13 did for the dash double-tap.
- All new numbers are **candidates** for the Combat Lab, kept as named constants or data.

## Candidate rules and tuning

| Item | Candidate value | Source |
|---|---|---|
| Attack meter units | 0–1000 internally (tenths of a percent), shown as 0–100 % | F&D §6.6 needs fractional bands |
| Gain | first hit of an action on a target: authored `meter` × band; guarded contact 25 %; whiffs, protected targets and allies 0 | F&D §6.6 |
| Meter-gain budget | 100 points per target context; each action spends `costs.meterDecay` (default 10) once; band 100 % from 71, 60 % from 31, 25 % from 1, 0 at 0 | F&D §6.6 |
| Crowd bonus | each extra unique enemy hit by the same action: +25 % of the authored gain, total capped at 150 % | F&D §6.6 |
| No self-gain | Ultimates (and throw collisions beyond the crowd bonus) gain nothing | F&D §6.6 |
| Ultimate cost | full bar (100 %), spent on acceptance; neutral or loadout direction | spec §7.7, B.5 |
| Ultimate protection | strike-proof from its first valid contact until it ends ("cinematic protection") | B.3 |
| Ultimate hold | non-final hits of a `finalReaction` action hold the target in hit-stun and carry it; the final hit applies the authored reaction; Ultimates end in a terminal knockdown (protected get-up) | B.3 "closes context" |
| Loadout | 5 Special slots (neutral, forward, backward, up, down) and 5 Ultimate slots; neutral fixed; F/B Special start with the core Specials; up/down Special and all directional Ultimates start empty | spec §9 |
| Equip rules | a move goes only into a slot listed in its `slots`; equipping a move already in another slot moves it; neutral slots refuse changes | spec §9, App. A |
| Armor | Gatebreaker Advance frames 6–15: strikes deal damage, no reaction; loses to grabs and `guardPiercing` | B.3 |
| Strike invulnerability | Rising Rampart frames 1–6; grabs still connect | B.3 |
| Hurtbox retreat | Ebbstep Return frames 3–10: hurtbox shifted 40 px back; no invulnerability | B.3 |
| Projectile | Current Crescent: spawned on the first active frame, 14 px/f for 40 f, hits one enemy once; one per owner (a new one replaces the old) | B.3, B.5 |
| Grab reach | 120 px in front (or in the pressed direction), 45° half-cone in the belt plane | F&D §6.7 (tuning) |
| Grab target score | eligible first; then alignment (larger dot), then distance, then lower id | F&D §6.7 |
| Grab startup / whiff | 6 f startup with a 2 px/f grab step, 2 connect frames, 22 f whiff recovery | F&D §6.7 |
| Contested grab | the closer hero wins; a tie alternates by frame parity (no player-number bias); the loser gets 8 f non-punishing recovery | F&D §6.7 |
| Grab route | decision window **45 f**; after the extension a fresh **30 f** window; one extension, then one finisher | B.6, F&D §6.7 |
| Inputs while holding | `Attack`: extension, then (after it) release strike; `Interact`: throw (neutral = forward, `Backward` = back throw); `Special`: Special grab finisher; nothing: separating shove at the end of the window | F&D §6.7 |
| Re-grab immunity | 30 f after any grab ends (throw, escape, interruption, timeout, release); strikes still work | F&D §6.7 |
| Held target | cannot be hit by anyone but the grabber's route (partner assists are M8) | F&D §6.7, roadmap M8 |
| Body projectile | `bodyProjectile` throws: the thrown enemy's body hits the first other enemy it overlaps (closest along the throw, then lower id), once; `bodyDamage` and a knockdown for the struck enemy, its own context; heroes ignored | F&D §6.7 |
| Grab Escape | trainer grab hold 48 f; window frames 20–30 of the hold (11 f); the first fresh `Guard` press during the hold is the one attempt; success: both separate, no damage, no meter; fail: the route continues | F&D §6.7, B.6 |
| Restraint | `restraint` outcome: hero restrained 150 f; partner `Interact` within 140 px releases at once; striking a `rescueInterruptible` grabber during the hold frees the hero | roadmap guardrail M5 |

## Founders' new moves

| Hero | Slot | Move | S/A/R | Property |
|---|---|---|---|---|
| Mountain | `Special` | Stonewake Palm | 12/4/22 | standard destination |
| Mountain | `Forward + Special` | Gatebreaker Advance | 16/8/28 | armor 6–15 |
| Mountain | `Backward + Special` | Rising Rampart | 7/8/30 | strike-invulnerable 1–6, launch |
| Mountain | `Ultimate` | Rivergate Oath | 10/24/42 | 4 hits, terminal |
| Mountain | catalogue (`Up`/`Backward + Special`) | Skybreak Column | 11/7/25 | anti-air launch |
| Mountain | catalogue (`Backward + Ultimate`) | Still Mountain | 5/14/38 | strike-invulnerable 1–5, wide separation |
| River | `Special` | Current Crescent | 10/3/20 | projectile |
| River | `Forward + Special` | Gale Wheel | 8/3+2+3+2+4/23 | five advancing hits |
| River | `Backward + Special` | Ebbstep Return | 6/4/26 | retreat, hurtbox shift 3–10 |
| River | `Ultimate` | Tempest Crossing | 8/26/40 | 5 hits, side switch, terminal |
| River | catalogue (`Up`/`Backward + Special`) | Waterspout Rise | 8/9/29 | rising anti-air |
| River | catalogue (`Forward + Ultimate`) | Floodline Passage | 7/25/32 | long carry |

Grab kits (names are original; frame data candidates):

| Hero | Grab | Extension (`Attack`) | Throw (`Interact`) | Back throw | Release strike (`Attack` after extension) | Special finisher |
|---|---|---|---|---|---|---|
| Mountain | Millstone Clasp | Keystone Knee | Sluicegate Toss (body projectile) | Turning Weir (body projectile) | Lintel Drop (wall bounce) | Quarry Fall (opens ground window) |
| River | Ferry Catch | Ripple Elbows (2 hits, one extension) | Downstream Fling (body projectile, long) | Eddy Swing (body projectile) | Spring Tide Kick | Whirlpool Vault (launch for a jump chase) |

Mountain's Brace Elbow gets an authored cancel link into the grab (throws are the Mountain Guardian's identity); nothing else cancels into a grab.

Training enemy grabs (appended to its kit, so M4 pattern indices stay):

| Action | Tags | Outcome |
|---|---|---|
| Collar Grab | `rescueInterruptible` | throw (knockdown) unless escaped |
| Rope Snare | `rescueInterruptible`, `restraint` | the hero is restrained for 150 f unless escaped or rescued |

## Review Focus

1. **Meter model:** bands, decay budget, guard 25 %, crowd bonus cap, no gain from whiffs, protected targets or Ultimates; premium cancel cost in the new units. → Task 2.
2. **Loadout:** defaults, empty slots rejected without fallback, neutral fixed, slot compatibility, moving a move between slots, links resolve through slots. → Task 3.
3. **Specials:** armor absorbs strikes but not grabs; invulnerability; hurtbox retreat; projectile spawn, single hit, replacement. → Task 4.
4. **Ultimates:** full bar only, spent on acceptance, not on rejection; cinematic protection after first contact; final hit terminal with protected get-up; no meter gain. → Task 5.
5. **Grabs:** target choice (direction, alignment, distance, id), whiff and contested recovery, route grammar (one extension, one finisher), timeout shove, re-grab immunity, context budgets kept, interruption releases safely. → Task 6.
6. **Throws and body projectiles:** one collision, closest primary, struck enemy's own context, heroes ignored, crowd bonus only. → Task 7.
7. **Grab Escape, restraint and rescue:** single attempt, early/late fail, success separates with no damage; restraint times out; partner `Interact` and partner strike rescue. → Task 8.
8. **Determinism:** `RULES_VERSION` `m5.1`, `STATE_FORMAT` 8, re-recorded replays and a new `specials-grabs` replay reproduce at every render rate. → Task 10.

---

## File structure

```
packages/data/heroes/*.yaml          + Specials, Ultimates, catalogue moves, grab kits
packages/data/enemies/trainer.yaml   + Collar Grab, Rope Snare
packages/data/src/generate.ts        categories, slots, catalogue, armor, invulnerable, hurtShift,
                                     projectile, grab, bodyDamage, meterDecay; grab link kind
packages/sim/src/
  combat/meter.ts                    Attack meter gain, bands, crowd bonus
  combat/loadout.ts                  default loadout, equip, slot lookup
  combat/projectiles.ts              spawn, move, hit, replace
  combat/grabs.ts                    grab resolve, route, throws, body projectiles, escape, restraint, integrity
  combat/hits.ts                     hit sources, armor, invulnerability, finalReaction, cinematic protection
  combat/actions.ts                  special/ultimate/grab links through the loadout
  movement/controller.ts             Special, Ultimate, Interact; grabbed and restrained heroes
  world/types.ts, world.ts           grab fields, loadout, projectiles, encode v8
apps/game/src/
  ui/LabOverlay.tsx, views.ts        Loadout (F2), Grab panel (F9), meters, move list, hints
  scenes/StageScene.ts               projectiles, grab tether, escape telegraph, restraint, call-outs
tests/replays/                       re-recorded replays, new specials-grabs
```

---

### Task 1: Data

- Schema: categories `special`, `ultimate`, `grab`, `grabStrike`, `throw`; contexts `special`, `ultimate`, `grab`, `grabExtension`, `grabRelease`, `grabThrow`, `grabSpecial`; `slots`, `catalogue`, `armor`, `invulnerable`, `hurtShift`, `projectile`, `grab` (enemy hold data), `bodyDamage`, `costs.meterDecay`; link targets `grab`.
- [ ] Tests first: each founder has 15 normals, a counter, 3 core Specials with Appendix B.3 frame data, one signature Ultimate, two catalogue moves and the six grab-route moves; neutral Special/Ultimate are not catalogue moves and list only the neutral slot; catalogue moves may share an input slot; the trainer's grabs carry their tags; generated file up to date (CRLF-safe).
- [ ] Commit `feat(data): founders' Specials, Ultimates, catalogue moves and grab kits`.

### Task 2: Attack meter

- [ ] Tests first: Review Focus 1.
- [ ] Commit `feat(sim): attack meter with per-action gain and combo decay`.

### Task 3: Loadout

- [ ] Tests first: Review Focus 2.
- [ ] Commit `feat(sim): five-slot Special and Ultimate loadouts`.

### Task 4: Specials

- [ ] Tests first: Review Focus 3.
- [ ] Commit `feat(sim): core Specials with armor, invulnerability and a projectile`.

### Task 5: Ultimates

- [ ] Tests first: Review Focus 4.
- [ ] Commit `feat(sim): signature Ultimates`.

### Task 6–8: Grabs, throws, escape, restraint

- [ ] Tests first: Review Focus 5–7.
- [ ] Commits `feat(sim): directional contextual grab and grab routes`, `feat(sim): body-projectile throws`, `feat(sim): grab escape, restraint and partner rescue`.

### Task 9: Lab

- F2 Loadout: per player, five Special and five Ultimate slot selects listing compatible owned moves (refusals explained).
- F9 Grab panel: grab state, decision window left, extension used, last grab outcome ("Grab Escape ✓ pressed on frame 4 of the 11-frame window", "too early: 6 f before the window"), re-grab immunity, restraint countdown.
- Stage: Attack meter bar (full bar marked "ULTIMATE READY"), projectile, grab tether line, "ESCAPE!" telegraph during the window (text and shape, not colour alone), "RESTRAINED" with a countdown and a rescue hint, call-outs for Specials, Ultimates, throws, escapes and rescues.
- Hints: Special, Ultimate, Grab.
- [ ] e2e: a Special by key press; an Ultimate with a full bar; grab and throw; a Grab Escape against the Collar Grab using simulation-frame cues in slow motion; screenshots of the loadout and grab panels.
- [ ] Commit `feat(game): Lab loadout, grab panel and meters`.

### Task 10: Golden replays, README

- `RULES_VERSION` `m5.1`, `STATE_FORMAT` 8. Re-record replays; add `specials-grabs` (Specials, an Ultimate, grab → extension → throw into a second dummy, Grab Escape).
- README: M5 controls and test checklist.
- [ ] Commit `test: M5 golden replays and README`.

## Carried forward

- One Tagged Partner Assist on hero grabs, Team Grab Finishers and co-op restraint rescue as tagged co-op actions (M8).
- Item pickup and weapon throws on `Interact` (M6); the Directional Intent Resolver already gives restraint release and grabs their M5 priority.
- Enemy grab variety, boss grab trees and authored enemy escape reactions (M7).
- `noSelfRefund` premium destinations and enhanced Specials (when a premium cancel leads into an attack).
- Purchase and Mastery unlocks for catalogue moves (M11); the Lab owns all of them.

# M7 Enemies and Boss Implementation Plan

**Goal:** The founders fight the five core Stage 1 archetypes (Pressed Recruit, Bridge Shield, Canal Runner, Rope Overseer, Sling Lookout), the Black-Iron Enforcer and the Sluice Commander in arena scenarios at Easy, Medium and Hard, on the delivered Stage 1 backgrounds. An encounter director spends a shared threat budget under per-hero pressure caps; enemies pick targets by role, defend in tiers, warn before off-screen attacks, and break (flee or surrender) instead of fighting to the last. The Commander has Resolve, a telegraphed Stagger Break and queued phase transitions with capped carryover, claims the Iron Gate Handwheel in phase 2 and cranks the sluice winch (a counted objective) in phase 3.

**Architecture:** `packages/data` gains `enemies/*.yaml` with an AI `profile` block (role, health, perception, ring distance, defense tiers, morale, weapon interest, group attack, attack list, boss phases) and `encounters/difficulty.yaml` and `encounters/arenas.yaml` (waves, substitutions, devices, surge). The generator validates them and emits `ENEMY_PROFILES`, `DIFFICULTY_DATA` and `ARENA_DATA`. `packages/sim` grows `enemies/` (`data`, `director`, `targeting`, `ai`, `boss`, `encounter`) and `combat/damage.ts` (every Health change goes through one function: the boss's phase floor and carryover, knockouts). `createWorld(seed, { arena, difficulty })` builds an encounter world. `packages/platform` gains background-layer manifest entries and enemy pose tables in the sprite picker. `apps/game` gets an arena panel in the Lab, the camera following the simulation's visibility zone, parallax Stage 1 layers (or the Sluice plate), and the arena HUD.

**Spec:** spec §12 and Appendix D (D.2–D.5), `Features_Decisions.md` §8; roadmap row M7, Stage 2 guardrail M7 (roles, phases and difficulty substitutions are data) and campaign guardrail M7 (objective-targeting hostile actions that are authored, visible, interruptible and counted, never timed; boss phases with environment devices).

## Global constraints

- Everything from M0–M6 still applies (60 Hz integer simulation, no float maths, `Math.random` or `Date` in `packages/sim`, data-driven kits, Windows-safe tests).
- **Same rules for everyone.** Enemies use the hero combat rules (hit-stun and juggle budgets, guard, Exact Block, counters, grabs, weapons). Difficulty changes budgets, concurrency, perception and decision rates, never the heroes' controls or defensive windows.
- **Decisions use simulation state only**, in ascending id order, with deterministic rate accumulators instead of random rolls.
- **Visibility is simulation data.** The 1920 px visibility zone follows the living heroes and is part of the encounter state, so every client draws the same zone.
- All numbers are **candidates** for the Combat Lab.

## Candidate rules

| Item | Candidate value | Source |
|---|---|---|
| Threat budget (solo / co-op) | Easy 48/76, Medium 68/108, Hard 82/128, Extreme 96/148, Ultimate 108/166 | spec D.5 |
| Pressure cap per hero | Easy 46, Medium 62, Hard 70, Extreme 78, Ultimate 84 | spec D.5 |
| Committed attackers (solo / co-op) | Easy 2/3, Medium 3/4, Hard 3/5 | spec D.5 |
| Projectiles in flight | Easy 1/2, Medium 2/3, Hard 2/3 | spec D.5 |
| Hard crowd control | one source at a time; no overlapping unblockables | F&D §8 |
| Reservation | an attack reserves its authored threat when it commits and releases it at recovery, interruption or cancel; positioning costs nothing | F&D §8 |
| Boss share | supports may not use the boss's reserved share (40) of the budget | F&D §8 |
| Targeting | re-evaluated every 15 f; a target is kept for 90 f once chosen; role-aware score (distance, current pressure, defenders prefer the nearest, flankers the open side, ranged the farthest in lane) | F&D §8 |
| Tiered defenses | guard chance (rate accumulator × difficulty guard scale), Exact Block for `exact` profiles, counters for `counter` profiles, evades for `evade` profiles, all after the perception delay (difficulty floor + profile) | F&D §8 |
| Off-screen attacks | only `offscreenCapable` actions; warning first (Easy 72 f, Medium 60 f, Hard 54 f): an edge arrow, the word INCOMING and a beep | F&D §8 |
| Morale | at `breakAt` % Health an enemy flees while allies still fight, or surrenders when it is the last one; fled enemies leave at the edge | F&D §8 |
| Group attack | the Enforcer's Anvil Shove: shared 40 f telegraph ("TEAM ATTACK"), both reservations together, cooldown per difficulty | F&D §8 |
| Resolve | per phase 240 / 300 / 360; hits deal Resolve damage by category (+15 for knockdowns); while Resolve remains the boss flinches at most 3 times per combo and resists launches, ground routes and grabs | F&D §8 |
| Stagger Break | Resolve 0: telegraphed 30 f, 300 f window with full routes on boss budgets (stun 70, juggle 70), ends with the window or protected recovery, never mid-combo; 40 f protected re-entry | F&D §8 |
| Phase transition | Health is clamped at the phase floor; damage past it is stored as carryover (cap 120) and applied when the next phase starts; the transition waits for a safe state (grace 180 f), pushes heroes clear, expires hostile projectiles and starts once every hero is actionable | F&D §8 |
| Phase 2 | Iron Gate Handwheel spawned at the weapon spot if not in play; two recruits join; counters and breakers on | spec §12 |
| Phase 3 | the sluice winch: Winch Crank is an authored, visible, interruptible action; 3 completed cranks release the surge (warning 60 f, active 36 f, 80 damage) | campaign guardrail M7 |

## Tasks

- [x] Enemy, difficulty and arena data with schema checks (boss phase attacks must exist in the kit or the phase weapon; supports must be enemy kits).
- [x] Damage routing (`dealDamage`), knockouts, Flee / Surrender / Defeated / PhaseShift states.
- [x] Director: usage, judge (Hidden, Group, Budget, BossShare, Cap, Attackers, Projectiles, HardCC, Unblockable), reservation and release, decision log.
- [x] Targeting with commitment; enemy AI: roles, tactical positioning, tiered defenses, weapon pickup, warnings, group attacks, morale.
- [x] Sluice Commander: Resolve, Stagger Break, queued phases with carryover, handwheel, supports, winch objective and surge.
- [x] Encounters: waves, substitutions (Hard+: one recruit becomes an Enforcer in the courtyard), the visibility zone, results.
- [x] Art: every Stage 1 enemy sheet and the Stage 1 area layers (and the Sluice plate) through `tools/art/import_art.py` and the manifest; pose tables in the sprite picker.
- [x] Game: arena panel (arena, difficulty, Start / Restart, Back to Lab; Home / End keys), director diagnostics, camera, parallax layers, boss bar, enemy health, warnings, team-attack and exit words, device pips, result banner.
- [x] Tests: `packages/sim/test/m7.test.ts`, an arena golden replay (`arena-trial`), `apps/game/e2e/m7.spec.ts`; `RULES_VERSION` m7.1, `STATE_FORMAT` 10.

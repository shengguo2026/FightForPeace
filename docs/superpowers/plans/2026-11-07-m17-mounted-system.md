# M17 · Mounted system and the Guided Pursuit Corridor

Roadmap: `2026-10-21-roadmap.md`, M17. Spec: Stage 2 §8 (bike, mounted actions, Road
Rider, Civil-Protection Response Record). Version 0.17.0, rules version `m17`, state
format 14.

## Scope

- **Data** (`packages/data/mounted/mounted.yaml`, `loadMounted` in `generate.ts`): one
  civil-protection bike with two identification plates (CP-07, CP-12), bounded speed,
  steering, soft-lane drift, Stability, recovery, obstacle impacts, crash and protection
  times, the co-op rescue window and the tether; six mounted actions per hero (neutral,
  directional, hop, lean, Special, Ultimate); the Road Rider and its six working actions;
  per-difficulty Stability, damage, wind-up, commitment cap and brace; the greybox
  corridor `perimeter-pursuit` (road band with a narrowing and a bend, 12 obstacles,
  3 pieces of equipment, 4 recovery gates, waves with a minimum difficulty).
- **Simulation** (`packages/sim/src/mounted/pursuit.ts`): `World.pursuit`, set up by
  `createWorld({ pursuit })`; `stepPursuit` replaces the on-foot step while riding.
  Riders, Road Riders, equipment, the shared camera, recovery gates and the record are
  part of `encodeWorld`, the hash and snapshots.
- **Presentation**: `PursuitView` (road, lanes, gates, obstacles, equipment, bikes, Road
  Riders with bars and telegraphs, callouts, HUD and the Response Record); heroes drawn
  seated on their bikes; mounted hints in the hint bar; the Lab arena list offers the
  corridor with steering assistance and STEADYRIDE; `?pursuit=<id>&difficulty=<d>`.
- **Cheat**: STEADYRIDE (hero scope) is active: Stability never decreases, hit reactions
  and impacts still play, the run is Cheat-Assisted.

## Rules

| Rule | Implementation |
| --- | --- |
| Bounded speed | target speed min/base/max, accel and brake steps; never stops |
| Soft lanes | three lanes from the road band; drift toward the nearest lane without input, stronger with steering assistance; road edges clamp |
| Tether | beyond `soft` the leader's cap falls toward the trailer's speed, reaching it at `hard`; the trailer gets `assist` extra; no teleport |
| Partners | no collision and no friendly hits between bikes |
| Stability | hits and impacts cost Stability; 0 is the warned critical state; the next qualifying hit is a safe crash; recovery after a damage-free delay |
| Health | mounted hits never take the last Health point; the crash adds no Health penalty |
| Solo crash | rewind to the latest recovery gate, full Stability, protection; only waves after the gate return |
| Co-op crash | Downed with a rescue window; partner alongside presses Team Attack → limited Stability back; missed → rejoin at the next gate; all down → rewind |
| Lean | evade window per hero; a lean into a strike evades and restores Stability |
| Hop | clears barriers; on a ramp the longer ramp hop (Mastery) |
| Directional whiff | steering penalty |
| Ultimate | needs a full Attack Bar, spends it, hits every rider in its radius and makes them fade |
| Road Rider | warned entry, approach in formation, commitment cap per difficulty (Medium 1, Hard+ 2, never two on one hero), no commitment on a protected hero or during an obstacle impact, Cutoff Line, Brake-Fade after an interrupt, Rider Brace every Nth approach hit, Breakaway after three commitments, crash and settle at the road edge |
| Equipment | targeted riders kick it unless intercepted in their wind-up |
| Record | Response (par time), Protection, Control, Stability, Assistance with S/A/B/C, Mounted Mastery |

## Deferred

- Pursuit in the stage flow (M20); dismounted Road Riders fighting on foot (M19).
- Hard Enforcer courtyard difficulty (M23).

## Tests

- `packages/sim/test/m17.test.ts`: data, speed, steering, soft lanes, tether, Stability,
  crash and rewind, recovery, Health floor, obstacles, hops, lean, every hero's attacks
  and Ultimate, Road Rider entry, caps and brace, equipment, co-op rescue, cheats, record,
  completion for every hero and every pair, determinism and snapshots.
- `packages/data/test/data.test.ts`: `loadMounted` validation.
- Golden replays `pursuit-fire` and `pursuit-mountain-wind`.
- `apps/game/e2e/m17.spec.ts`: solo ride, co-op to the Response Record, STEADYRIDE.

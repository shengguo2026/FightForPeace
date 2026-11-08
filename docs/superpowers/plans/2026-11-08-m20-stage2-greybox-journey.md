# M20 · Stage 2 greybox journey

Roadmap: `2026-10-21-roadmap.md`, M20. Spec: Stage 2 §5 (stage flow and route), §6 (Ledger
results), §12 (Marek's capture in the flow), §17 (checkpoint state), with the route,
branch, epilogue and Preservation decisions of `stage2_feature_story_line.md` §5.7, §7, §8
and §9.2. Version 0.20.0, rules version `m20`, state format 17.

## Scope

- **The stage is data** (`packages/data/stages/stage2.yaml`, *Prosperity Under Siege*). The
  M9 stage file gains three beat kinds, so the runner still has no Stage 2 knowledge:
  - a **corridor beat** (`corridor: <id>`) runs an M17 mounted pursuit inside the run; it
    ends when the pursuit completes (Marek's intercept passes its outcome on);
  - a **room beat** (`room: <id>`) runs an M18/M19 greenhouse room inside the run: the
    room's waves are the beat's one encounter, its Ledger, containers, pantry, rack, jet,
    redirect, restraint and grenade all work as in the Lab; a room without waves is a
    quiet area;
  - the M9 walking beat (Stage 1), unchanged.
- **Four segments, fourteen beats** (story line §7):

  | Segment | Beats | Checkpoint |
  | --- | --- | --- |
  | 1 Perimeter Alarm | Perimeter Pursuit (corridor) | 1 at the security gate (Loading Yard start) |
  | 2 Broken Entry | Loading Yard · Aquaculture Hall · *Emergency Aeration Annex* · Hygiene Vestibule | 2 at the vestibule |
  | 3 Living Systems | Crop Channels · *Seed Reserve Bay* · Medicinal Wing · *Medicinal Preparation Room* · Filtration Control (Control Breach, grenade) | 3 after filtration (Production Hall start) |
  | 4 Counterattack | Production Hall · Recovery Bay (quiet, pantry and lockers) · Marek's intercept (corridor) · Dispatch Yard (boss) | 4 before the dispatch bikes (intercept start) |

- **Optional branches** (`branch:` on a beat): the beat before a branch has two exits; the
  heroes choose by the lane they leave on (upper half: the branch, lower half: the main
  route, M9 rule) and both lanes are signposted when the exit opens. Each branch rejoins
  the spine in its region. A branch has a goal (rescues, a found record, Ledger assets kept
  at or above a state) and a Museum artifact; its outcome is *completed*, *failed* or
  *skipped* and never blocks the stage:
  - Emergency Aeration Annex: free the maintenance worker, keep the backup aeration line
    out of Critical (artifact: Early Aerator Impeller);
  - Seed Reserve Bay: a Systems Saboteur goes for the two sealed seed reserves (new Ledger
    kind `seed-reserve`, a control); keep both out of Critical (First-Harvest Seed Tin);
  - Medicinal Preparation Room: free the researcher and recover the provenance ledger (hold
    Interact; the M9 clue) (Medicinal Cooperative Field Card).
- **Stage-wide Preservation**: when a room beat ends, its Ledger assets are recorded in the
  run; the stage's Preservation result is the weighted condition of every recorded asset
  (Lost counts 0), so skipping a branch never lowers it. The grade names become the
  approved four: **Flourishing, Secure, Strained, Recovered** (no failure grade; M18's
  candidate names are replaced).
- **Civil-Protection Response**: each corridor beat's M17 record is kept; the stage's
  Response grade is the mean of every line of every corridor, with the rewinds counted.
- **Marek in the flow**: the intercept's outcome becomes the boss room's opening; Marek's
  capture record (route, how the gun was lost, rounds at disarm, Scorched Claim, intercept)
  is kept when the yard is cleared. The marked Stage 2 weapon crate then appears (the
  stage's sponsor evidence); securing it ends the stage.
- **Weapons carry between beats**: a weapon in a hero's hands when a beat ends comes along
  into the next on-foot beat with its exact Integrity and rounds (stowed during a corridor);
  a live or unarmed grenade never carries. Checkpoints keep what was carried.
- **Checkpoints** keep (besides M9's beat, meter and counters) the Ledger record, the
  response records, branch outcomes, the intercept outcome and the carried weapons; a
  continue restores all of them and replays the checkpoint beat fresh.
- **Results**: data-defined categories gain `preservation` and `response` measures. Stage 2
  grades Preservation 35, Response 20, Continues 20, Time 25 (candidates). The screen adds
  the Preservation grade with the itemised assets, the Response grade, the branch outcomes
  with their artifacts and Marek's capture record. Score adds branch, capture and
  Preservation bonuses (optional `score` fields, zero for Stage 1).
- **Layered epilogue** (story line §5.7): before the results, a short sequence of in-engine
  cards chosen from the run: the capture presentation (Resolve surrender or forced capture),
  one Ledger insert per system category (aquatic, crops, systems, supplies) by its own
  condition, Tomas's hand-over of the formula, the matching seal on the weapon crate, the
  differentiated justice (Council transfer, expulsion at dawn), one card per completed
  branch, the community recovery passage by Preservation grade, and the abandoned depot.
  Every mandatory card shows in every run; only inserts vary. Next and Skip, EN/ZH/DE.
- **Game**: the stage HUD, fades and checkpoints work across corridor and room beats; the
  Lab lists Stage 2 with "Start at beat" practice, `?stage=2` starts it; branch signs at
  a two-way exit; the M19 intercept chain stays a Lab-only shortcut outside a run.

## Deferred

- Stage select, Stage 1 → Stage 2 continuity, Credits, achievements and Museum wiring of
  the branch artifacts and records (M21); Stage 2 over Wi-Fi from the shell (M21 with the
  stage select); final art, clips and music (M22); exact values (all candidates).
- The Annex's timed aeration restart is greybox: the goal is the line's condition.

## Tests

- `packages/sim/test/m20.test.ts`: data and the route, corridor and room beats, exits and
  lane branches, branch outcomes (completed, failed, skipped), Ledger and response
  records, checkpoints and continues restoring them, weapon carry, the intercept opening
  and capture record, evidence and completion, results and epilogue, a full run with a bot
  plus state edits, determinism.
- `packages/data/test/data.test.ts`: stage beats name known rooms and corridors.
- Golden replay `stage2-journey`.
- `apps/game/e2e/m20.spec.ts`: `?stage=2` opens the pursuit, the journey reaches a room, the
  epilogue and results show.

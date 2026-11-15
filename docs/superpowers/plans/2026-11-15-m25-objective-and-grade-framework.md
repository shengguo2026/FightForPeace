# M25 · Objective and grade framework (0.25.0)

Roadmap row M25 (campaign review G13). The M24 audit (`docs/review/10-combat-constitution-audit.md`)
marks rows 1.4, 3.10, 5.7, 5.9, 6.1–6.9 and 8.4 as **Module · M25**; this milestone builds the
modules those rows need and proves them in one Lab test room.

**Goal:** every later stage expresses its condition ladder, evidence states and stage grade
as data on three shared modules instead of inventing its own:

| Module | What it carries | Later users |
|---|---|---|
| **Protected units** | A person or group in a protected zone: phases (captive, freed, moving, waiting, safe), a count of completed hostile actions, a data ladder that maps the count to a condition, lock on safe, checkpoint-safe records | Stage 3 rescues (Secure / Strained / Critical), Storm, Stages 5–8, *The Medicine Road* convoy |
| **Hostile channels** | Visible, interruptible enemy actions against a unit or an evidence case: an enemy walks to the spot, works with an on-screen tell, any hit, grab or defeat interrupts it, a completed action counts once, the support robot's interference pauses one | Stage 3 §7.2, Storm, Stages 6–8 (robot pause, audit row 8.4) |
| **Evidence lifecycle** | A case moves Present → Collected → Sealed; a completed hostile action on an unsealed case makes it Disturbed; a hero recovers it (Recovered) and seals it; never lost | Stage 3 research record (Documented / Recovered / Disturbed), Stage 4, Stage 7/8 sets, *The Vanishing Survey* |
| **Grade** | One 100-point grade: weighted categories each with a share (0–100), rank thresholds, category caps, condition caps ("any unit Critical caps at A"), and "no grade" for Cheat-Assisted runs where a stage asks for it; plus the shared letter and band helpers | Stage 1 and Stage 2 results (moved onto it now), Stage 3 §22.2 and every later stage |

## Rules

1. **No behaviour change for Stage 1 and Stage 2.** Their results screens give the same
   categories, points, rank and cap after the move (unit test compares the module against the
   M24 formulas on many runs), and every golden replay keeps its hash (only the
   `rulesVersion` label moves to `m25`). Objective state is encoded only when present, so
   `STATE_FORMAT` stays 18.
2. **Generic, not stage-specific.** Ladders, cases, channels and grade categories are data
   (`packages/data/objectives/objectives.yaml` and an arena's `objectives` and `grade`),
   validated by the generator with clear messages.
3. **Visible authored events only.** Condition never depends on elapsed time (Stage 3
   review S3-1). A count changes only when a channel's visible tell runs to its end.
   Protected people are not fighters: no attack, hazard or blast can damage them.
4. **Deterministic and checkpoint-safe.** All state is plain data in `world.objectives`,
   part of `encodeWorld` when present, survives snapshot/restore. A checkpoint copy restores
   everything except what has locked since: a unit that reached safety and a sealed case
   keep their final state (Stage 3 §17: restarts never duplicate or erase rescues, condition
   grades or evidence).
5. **Placeholders.** The test room uses delivered enemy art and draws protected people,
   zones, cases and channel tells as labelled boxes with text states (never colour alone).

## Part 1 · Data

- `packages/data/objectives/objectives.yaml`: **ladders** (`rescue`: Secure at 0, Strained
  at 1, Critical at 2, shares 100 / 50 / 0) and **evidence outcomes** (`record`: Documented
  100, Recovered 66, Disturbed 33, Missing 0). Names in English, Chinese and German come
  from Stage 3 §7.2 and §22.5.
- Arena `objectives` (new, beside `scenery`): `units` (id, name key, ladder, position, zone,
  free frames, shelter, route waypoints with optional `wait`), `cases` (id, outcome table,
  position, collect / seal / recover frames), `channels` (target id, spot, kind label, tell
  frames, start delay, cooldown after an interruption, kits allowed to work it).
- Arena `grade` (new, optional): categories with a `measure` (`units`, `cases`) and weight,
  ranks, category caps, condition caps (`ladder`, `state`, `rank`), `cheat: none`.
- Stage `grade` gains the optional `cheat` field (absent for Stages 1 and 2, so nothing
  changes there); stage condition caps arrive with the first stage that has protected units
  (M28), on the same arena-grade shape.

## Part 2 · Simulation (`packages/sim/src/objectives/`)

| File | Contents |
|---|---|
| `state.ts` | `ObjectiveState` (units, cases, channels, hero holds, event log), setup from an arena, encoding (marker `0xa5`, only when present), checkpoint copy and restore |
| `units.ts` | Protected-unit phases, deterministic route to shelter with safe hand-off waits, lock on safe; the hero holds (free, collect, seal, recover) |
| `channels.ts` | Actor assignment (nearest free enemy, lowest id on a tie), the AI hook that walks the actor to the spot and keeps it working, interruption by any reaction or defeat, completion counted once (a unit's count, or an unsealed case disturbed), robot interference pausing the working channel nearest the active station |
| `results.ts` | `stepObjectives`, `unitCondition()` on the ladder, `caseOutcome()`, `objectiveGrade()` (an arena's live grade: measures `units` and `cases`, condition caps) |
| `grade.ts` | `grade100(rules, inputs, conditionCaps, noGrade)`: points, rank, category caps, condition caps, no grade; `rankFor`, `bandFor`, `ratio` |

Engine touch points: the world steps objectives after hits (`stepObjectives`), the enemy AI
asks `stepHostileChannel` before its own objective logic, the hero's neutral Interact asks
`objectiveInteract` before the greenhouse, `encodeWorld` appends the objective state.

**Stage 1 and 2 grades on the module:** `stageResults` builds its category inputs with the
existing measures and calls `gradeOf`; `stageResponse`, the Response Record letters
(`gradeOf` in `pursuit.ts`) and the Preservation bands (`ledgerGrade`, `stagePreservation`)
use the module's `rankFor` and `bandFor`.

## Part 3 · Lab test room

`lab-m25-objectives` (*M25 Lab: Captive and Evidence*), courtyard, three waves of recruits:

- **Captive** Lab Captive (rescue ladder) bound at the left of the room, a rope-line and a
  lantern channel inside its zone; freed by holding `J`, cheers, walks to the shelter, waits
  at the hand-off point while an enemy is inside its zone, then is Safe (locked).
- **Evidence case** (record outcomes) in the middle with one crate channel against it;
  hold `J` to collect, again to seal; if an enemy finishes its channel first the case is
  Disturbed and `J` recovers it.
- **Interference station** (M24 robot, kind `interfere`) that pauses the nearest working
  channel when a hero calls it.
- **HUD panel** (top left): the captive's phase, condition with icon, hostile-action count
  and lock; the case state; the live 100-point grade (rescue 70, record 30, Critical caps at
  A) with points per category, rank and cap reason.
- **Lab buttons** *Checkpoint* and *Restore checkpoint* show the checkpoint rule.

## Verification

- `packages/sim/test/m25.test.ts`: ladder mapping; a completed channel counts once; an
  interrupted channel does not count and retries after its cooldown; the count locks on
  safe; the hand-off wait; robot interference pauses a channel; evidence lifecycle (collect,
  seal, disturb, recover) and outcomes; checkpoint restore keeps locked units and sealed
  cases; snapshot/restore round trip; same inputs, same hash; the grade module (points,
  ranks, category caps, condition caps, no grade).
- `packages/sim/test/m25-grade.test.ts`: Stage 1 and Stage 2 results through the module
  equal the M24 formulas (bot runs on several difficulties plus synthetic runs).
- `packages/sim/test/m25-scene.test.ts`: the test room runs headless with a scripted hero
  for its length and ends with the captive safe, the case sealed and a grade; another run
  with no hero shows the condition worsening as enemies act.
- `packages/data/test`: validation cases for the new fields.
- Golden replays unchanged (rule 1); `apps/game/e2e/m25.spec.ts` opens the room and checks
  it draws and the HUD panel shows the grade (short, CI is near its limit).
- Localization: names and HUD strings in English, German and Chinese.

## Tasks

- [x] Plan (this file).
- [x] Data: objectives.yaml, arena `objectives` and `grade`, stage grade fields, validation.
- [x] Grade module; Stage 1 and 2 results, Response and Preservation letters moved onto it.
- [x] Protected units, hostile channels, evidence lifecycle, checkpoint copy, encoding.
- [x] Engine hooks (world step, AI, Interact), robot interference.
- [x] Lab room, view, HUD panel, buttons, strings EN/ZH/DE.
- [x] Tests, golden replays unchanged, e2e.
- [x] Audit rows marked built, version 0.25.0, README, lessons, Guo_tests M25 section.

## Manual part (Guo_tests M25)

Guo opens the test room, lets the enemies work the rope line and lantern and watches the
captive go Secure → Strained → Critical and the grade drop and cap at A; interrupts a
channel with a hit and sees it not count; frees the captive and watches the count lock;
collects, loses and recovers the case; checks the checkpoint buttons; then a short Stage 1
and Stage 2 run to confirm their results screens did not change.

## Out of scope

- Stage 3 content (Gao/Tao, An Bo and Ren Xia's groups, the research record in the stage,
  the Stage 3 results screen): M27/M28 put them on these modules. Stage beats gain an
  `objectives` reference then; M25 provides the checkpoint copy and restore they call.
- Property ledger scoring (audit 5.7, 6.8), the custody pipeline (6.9), the escape-network
  ledger (6.6) and replacement-mount allocation (1.4): they reuse the grade module's
  categories and the unit records but are built with their first stage or mission (S3 for
  1.4, S6–S8 and the missions for the rest); recorded in the audit.

# M24 · Combat Constitution audit and shared engine systems (0.24.0)

Roadmap row M24 (campaign review G12). Sources: every specification written after Stage 2:
Stage 3 to Stage 8, the four Curated Missions (*Storm over Qinglan*, *No Escape at
Reedwater*, *The Medicine Road*, *The Vanishing Survey*) and the expanded game modes
(Mission Remix, Random Operations, Chapter Challenge). Also the Stage 3 builder review that
Stage 3 spec §21 asks for (moved here by review 07 and Stage 3 §22).

**Goal:** before the engine freezes, every mechanic those specifications need is proven to
be one of:

| Verdict | Meaning |
|---|---|
| **Data** | Already expressible in today's engine as YAML; the audit names the file and field. |
| **Engine · M24** | Was not expressible; this milestone adds a generic, data-driven engine feature, a Lab test scene and unit tests. |
| **Module · M25** | Belongs to the shared objective and grade framework the roadmap already schedules for M25 (protected units, counted hostile actions, evidence lifecycle, 100-point grade with caps, property ledgers). |
| **Mode · M26 / later** | Hub, packaging, archive, generator or ranking work; not combat engine. |

Nothing is left without a verdict. Content that is "data on the engine" (a new enemy role,
weapon or hero kit) is built by its stage's milestone; the audit only proves the engine can
carry it.

## Rules for the engine changes

1. **No behaviour change for Stage 1 and Stage 2.** Every golden replay in `tests/replays`
   must reproduce its M23 hash unchanged after the M24 changes (only the `rulesVersion`
   label moves to `m24`). New state is encoded only when it is present, so a world without
   M24 features encodes byte-for-byte as before; `STATE_FORMAT` stays 18. This is the
   regression proof the Constitution asks for ("engine maintenance … only when regression
   validation proves that established gameplay behaviour remains unchanged").
2. **Stable registry order.** Weapon and enemy indices are part of the encoded state. The
   generator orders them by file name today, so a new file could shift existing indices. M24
   freezes the current order and appends new files after it (audit finding, lesson G1).
3. **Generic, not stage-specific.** Each feature is named after the mechanic, not the
   stage ("finite gear", not "Rhea's bracer"), configured in YAML, and validated by the
   generator.
4. **Deterministic and checkpoint-safe.** All new state is plain data in the world, part of
   `encodeWorld` when present, and survives snapshot/restore and rollback.
5. **Placeholders.** Lab scenes reuse delivered art (existing enemy sheets via an `art`
   override, existing props) and draw labelled boxes where nothing exists yet. Stage 3 art
   #001–#200 is approved but not imported in M24; importing is M27/M28 work.

## Part 1 · Audit and builder review (documents)

- `docs/review/10-combat-constitution-audit.md`: one row per mechanic (about 70), grouped
  by family (mounts and vehicles, enemy roles, bosses, weapons, environment, objectives and
  people, heroes and handoff, support systems, modes), with the specs that use it, the
  verdict, and the evidence (YAML field, test and Lab scene). Ends with the engine-change
  list, the M25 hand-over list and open questions for later stage readiness reviews.
- `docs/review/11-stage3-builder-review.md`: Stage 3 spec §21's six checks, each answered
  against the engine and the M25 plan; findings go into the audit and Stage 3 open items.

## Part 2 · Scenery engine

| # | Feature | Mechanics it carries | Lab scene |
|---|---|---|---|
| E1 | **Arena scenery in data**: `arenas.yaml` arenas carry their own `scenery` (items, surfaces, breakables, hazards) instead of only the hard-coded mill layout | every authored environment of Stages 3–8 and the missions | all M24 scenes |
| E2 | **Moving hazards**: a hazard with a path (from → to), a warned ground marker, an active sweep, a schedule, and optional `redirect` by a hit during the warning (it then strikes enemies only and never heroes, protected people or objectives) | mine and transport carts (S3), rolling debris (Storm, S5), suspended crane cargo (Reedwater, Survey), the Broken Wagon (S5), Mara's brake release (Storm), Silas's emitter lanes (S7, as fixed lanes) | `lab-m24-hazards` |
| E3 | **Tagged scenery and tool permissions**: breakables and hazards carry `tags`; weapons list `opens` (break a tagged breakable at once: pry bar, tire iron) and `redirects` (tagged hazards: hook pole, mooring hook); breakables carry a `property` class (protected, expendable, objective, required) and log a player-attributed incident once per `cluster` for M25's property ledgers | Hook-opportunity focus (Storm), Pry Bar / Tripod / Tire Iron / Wagon Hook Pole / Mooring Hook tagged uses, Collateral Care and property ledgers (S6–S8, Reedwater, Survey) | `lab-m24-hazards` |
| E4 | **Moving platform**: a floor region that travels along an authored path and carries the bodies standing on it; non-lethal edges, cannot leave the arena | Reserve Wagon Passage (S5), optional cable-cart boarding (Survey), bridge sway pressure (Storm, as bounded drift) | `lab-m24-platform` |

## Part 3 · Fighter engine

| # | Feature | Mechanics it carries | Lab scene |
|---|---|---|---|
| E5 | **Finite gear**: an enemy or boss carries gear pieces with their own non-regenerating Guard; each piece grants one benefit (frontal block, counter, anti-air, low/dash resistance); breaking one causes one stagger and removes only its benefit; a boss phase may end on `gear`, `resolve` or both | Retrieval Shield (S6), Shield Escort (S7), Shield Controller (S8), Equipment Guard (Survey), Marshal's shield (S6), Silas's projection shield (S7), Ivo's Case Guard (Survey), Rhea's three wearable pieces (S8) | `lab-m24-gear` |
| E6 | **Mounted fighters in on-foot arenas**: an enemy or boss phase rides a mount with Stability; it makes warned lane passes (a marked lane, then the pass); hits and tagged impacts cost Stability; at zero it dismounts safely into a protected recovery and fights on foot with its kit; the mount leaves and never dies | Mounted Raider (S3, S5), Bike Pursuer (S4), Bike Interceptor (Reedwater), Bike Harrier (Medicine Road), Rovan P1 (S5), Cassian P1 (Reedwater), Luo Jian P1 (Medicine Road), the on-foot fallback against riders | `lab-m24-riders` |
| E7 | **Resolve floor and withdrawal; noncombatant custody targets**: a rival's Resolve cannot fall below a floor; reaching it arms an authored withdrawal; noncombatants (no Health, no attacks) are never targetable | Soren and Chen Yue (S4), Damon and Han (S8), ordinary Forum security that withdraws (S7, S8) | `lab-m24-rivals` |
| E8 | **Feints and disguised entry**: an AI attack may open with a feint (a visible start that is cancelled into the real attack after a delay, never removing the tell); an enemy may arrive disguised (non-hostile, untargetable) and reveal at wave start | Ridge Stalker (S3), Route-Cutter Veteran (S5), Rainstep Feinter (Storm), Ferry Feinter (Reedwater), braking feints (Medicine Road), False Merchant (S5) | `lab-m24-rivals` |
| E9 | **Heavy weapons and blast throwables**: weapon `restrict` (no jump, grab, mount or carry), `speed` percent and `heat` for bursts; a throwable with `blast` lands, shows its area, then knocks back, stuns briefly and costs Defense; no friendly fire, never hurts protected people, evidence or ledgers | Restricted heavy machine gun (S6), concussion grenade / device / capsule (S6–S8), compact automatic recoil (S6–S8, already firearm data) | `lab-m24-weapons` |

## Part 4 · Mounts, roster hand-over and support

| # | Feature | Mechanics it carries | Lab scene |
|---|---|---|---|
| E10 | **Mount catalogue**: `mounted.yaml` lists mounts (civil-protection bike, mountain horse, utility bike, cargo bike, response bike) instead of one bike; a corridor names its mount; `atZero: recover` (Stage 2) or `dismount` (safe dismount, the mount is lost for the run, the hero finishes the corridor on the on-foot fallback and regroups at its end); held weapons are stowed and restored | horses (S3, S5), utility bikes (S4), response and cargo bikes (S6–S8), mid-class bikes and run-persistent loss (Medicine Road) | `pursuit-m24-mounts` (Lab pursuit) |
| E11 | **Solo control hand-over and support role**: a stage can swap a slot's hero mid-run, mapping Health, Defense and Attack Bar by percentage (never upwards), clearing combo and temporary states, and moving the held weapon and one carried provision into a single-use cache; in co-op the other player can become a non-mobile **supporter** with authored one-shot actions | Broken Wagon hand-over and Field Protector Support (S5), historical solo hand-off (campaign review G12) | `lab-m24-handover` |
| E12 | **Support robot**: marked stations request authored interventions through one shared state machine (`unused → approaching → active → consumed`, with `disrupted → cooldown → retry` once); effects in M24: mobile cover (a temporary solid surface) and reserve delay (holds the next wave); the "pause one hostile channel" effect is wired as a hook and filled by M25's channels | Supervised support robot (S6), Council Field Support Robot (S7), integrated support network (S8) | `lab-m24-robot` |

## Verification

- Unit tests per feature in `packages/sim/test/m24-*.test.ts`, each including a
  snapshot/restore round trip and a "same inputs, same hash" check.
- `packages/data/test` validation cases for every new YAML field (bad values are rejected
  with a clear message).
- Golden replays: all of `tests/replays` keep their hashes (rule 1). Registry-order test
  (rule 2).
- Every Lab scene runs headless for its scripted length with no exception and ends in the
  expected state (`packages/sim/test/m24-scenes.test.ts`).
- One short e2e check (`apps/game/e2e/m24.spec.ts`) opens each M24 Lab scene in the browser
  and checks that it starts and draws; kept small because the browser jobs already take
  about 55 of the 75 CI minutes.
- Localization: Lab scene and placeholder names in English, German and Chinese.

## Tasks

- [x] Part 1: audit document and Stage 3 builder review.
- [x] Registry order frozen (rule 2), RULES_VERSION `m24`, golden replays unchanged.
- [x] E1 arena scenery in data.
- [x] E2 moving hazards; E3 tags, tool permissions, property classes.
- [x] E4 moving platform.
- [x] E5 finite gear; boss phase exit conditions.
- [x] E6 mounted fighters in on-foot arenas.
- [x] E7 Resolve floor, withdrawal, noncombatants; E8 feints and disguised entry.
- [x] E9 heavy weapons and blast throwables.
- [x] E10 mount catalogue; E11 hand-over and support role; E12 support robot.
- [x] E13 carried provisions (found by the audit: Stage 3 §10.2 food is picked up with `J`).
- [x] Lab scenes, placeholder names in three languages, scene test, e2e check.
- [x] Version 0.24.0, README, `lessons_learned.md` for every new finding, `Guo_tests.md` M24 section.

## Manual part (Guo_tests M24)

Guo opens each M24 Lab scene and checks that the mechanic reads well with placeholder art:
warnings are visible before anything hits, riders dismount safely, broken gear stops
blocking, the platform carries fighters, the hand-over keeps the bars, the robot's cover
appears and is used up. Then a short Stage 1 and Stage 2 run to confirm nothing changed.

## Out of scope

- M25's modules (protected units, counted hostile actions, evidence, grades, property
  ledger scoring) and M26's Hub, packaging and archive.
- Stage 3 content (enemies, Garran, horse values, Stage 3 art import): M27 and M28.
- New hero kits (Sheng Guo, Liang Zhen, Kael, Lin Lan, Soren, Chen Yue): data, written
  before their content waves (campaign review G8).
- Random Operations generator and Chapter Challenge scoring: M41, M42.

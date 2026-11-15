# Review 10 · Combat Constitution audit (M24)

Roadmap row M24, campaign review G12. Date: 2026-11-14. Plan:
`docs/superpowers/plans/2026-11-14-m24-combat-constitution-audit.md`.

**Question:** before the engine freezes for Stage 3 production, can every mechanic that the
specifications written after Stage 2 ask for be built as data on the shared engine, or does
the engine need a change first?

**Sources:** the specifications of Stage 3 to Stage 8, the four Curated Missions (*Storm over
Qinglan*, *No Escape at Reedwater*, *The Medicine Road*, *The Vanishing Survey*) and the
expanded game modes (Mission Remix, Random Operations, Chapter Challenge, Academy, Archive).

**Answer:** yes, after M24. Every mechanic below has a verdict. Seventeen needed an engine
change; all seventeen are built in M24 as generic, data-driven features with a Lab test scene
and unit tests. Stage 1 and Stage 2 behave exactly as before: every golden replay in
`tests/replays` reproduces its M23 hash (only the `rulesVersion` label moved to `m24`), and
the release manifest's replay hashes did not change.

## Verdicts

| Verdict | Meaning | Count |
|---|---|---:|
| **Data** | Expressible in today's engine as YAML; the row names the file and field. | 31 |
| **Engine · M24** | Was not expressible; M24 added a generic engine feature, a Lab scene and tests. | 17 |
| **Module · M25** | The shared objective and grade framework M25 builds (protected units, counted hostile actions, objective channels, evidence lifecycle, 100-point grade with caps, property ledgers). | 15 |
| **Mode · M26+** | Hub, packaging, archive, generator or ranking work; not combat engine. | 8 |

Spec short names: S3 to S8 = Stage 3 to 8; Storm, Reed, Med, Survey = the Curated Missions;
Modes = the expanded game modes specification.

## 1 · Mounts and vehicles

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 1.1 | A corridor ridden on a mount other than the civil bike (horse, utility, cargo, response bike) | S3 §9, S4, S5, S6–S8, Med | **Engine · M24** (E10) | `mounted.yaml` `mounts:` catalogue, corridor `mount:`; `mountOf()` in `mounted/pursuit.ts`; `pursuit-m24-mounts`; test `m24.test.ts` E10 |
| 1.2 | At zero Stability the mount disengages safely and is lost for the run; the hero finishes on foot | S3 §9, Med (run-persistent loss) | **Engine · M24** (E10) | mount `atZero: dismount`, rider state `OnFoot` (not targeted, no attacks, regroups at the end) |
| 1.3 | Stability as the mount's bounded resource, wobble, safe crash, co-op rescue, rewind | S3–S8, Med | Data | M17 `bike` fields per mount (`stability`, `recover`, `crash`, `rescue`) |
| 1.4 | Replacement mount after a rescue (An Bo) | S3 §9 | Module · M25 | a stage beat re-enters a corridor; the allocation counter lives with M25's objective state |
| 1.5 | Mounted enemy (Road Rider pattern) inside a corridor | S2, S4, Reed, Med | Data | `roadRider` actions and corridor `waves` |
| 1.6 | Mounted boss intercept in a corridor | S2 (Marek), S5 (Rovan), Reed (Cassian), Med (Luo Jian) | Data | corridor `boss:` |
| 1.7 | Moving platform ridden on foot (wagon bed, cable cart) | S5 Reserve Wagon Passage, Survey | **Engine · M24** (E4) | arena `scenery.platforms`; `shared/scenery.ts stepPlatforms`; `lab-m24-platform` |
| 1.8 | Bridge sway pressure | Storm | Data on E4 | a platform with a short `x0`–`x1` range and `wait: 0` (bounded drift) |
| 1.9 | Held weapons stowed while mounted and restored after | S3, S4, S6 | Data | M17 pursuit already stows; heavy weapons add `restrict.mount` |

## 2 · Enemy roles

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 2.1 | Mounted fighter in an on-foot arena: warned lane passes, Stability, safe dismount, then fights on foot | Mounted Raider (S3, S5), Bike Pursuer (S4), Bike Interceptor (Reed), Bike Harrier (Med) | **Engine · M24** (E6) | profile `mount:`; `shared/riders.ts`; `lab-m24-riders`; test E6 |
| 2.2 | Finite shield with its own non-regenerating Guard; breaking it staggers once | Retrieval Shield (S6), Shield Escort (S7), Shield Controller (S8), Equipment Guard (Survey) | **Engine · M24** (E5) | profile `gear:`; `shared/fighters.ts gearBlocks`; `lab-m24-gear` |
| 2.3 | Visible feints that alter timing without removing the tell | Ridge Stalker (S3), Route-Cutter Veteran (S5), Rainstep Feinter (Storm), Ferry Feinter (Reed), braking feints (Med) | **Engine · M24** (E8) | AI attack `feint: { at, delay }` (validated: stops before the first active frame); `lab-m24-rivals` |
| 2.4 | Disguised arrival (non-hostile, untargetable) that reveals | False Merchant (S5) | **Engine · M24** (E8) | profile `entry: disguised`, `reveal: { after, range }` |
| 2.5 | Resolve-limited rival that cannot be defeated and withdraws | Soren and Chen Yue (S4) | **Engine · M24** (E7) | profile `rival: { floor, withdraw }`; `rivalDamage()` |
| 2.6 | Ordinary security that withdraws instead of fighting to the end | Forum security (S7, S8) | **Engine · M24** (E7) | `rival` with a high floor; or existing `morale` (Data) |
| 2.7 | Noncombatant custody targets (no Health, no attacks, never targetable) | Damon and Han (S8), bystanders (Reed, Survey) | **Engine · M24** (E7) | profile `noncombatant: true`; `nonCombatant()` covers them |
| 2.8 | Flank coordinator whose orders break on separation | Pack Captain (S3), command roles (S5–S8) | Data | M19 `commands` and `group` |
| 2.9 | Rope Trapper restraint with escape and partner rescue | S3, Storm | Data | M5/M19 restraint grabs (`grabs.ts`: escape window, partner rescue, timeout) |
| 2.10 | Heavy committed bruiser with punishable recovery | Quarry Bruiser (S3) and kin | Data | enemy kit actions and profile |
| 2.11 | Ambusher with bounded pursuit | Trail Ambusher (S3) and kin | Data | profile `role`, `ring`, `walk` |
| 2.12 | Firearm user with exact rounds and warned lines | S3 bandit revolver, S6–S8 compact automatics | Data | M18/M19 `firearm` class, `armed`, `warnedLine` |
| 2.13 | Difficulty variants (Hard elite, Ultimate master) | all stages | Data | M19 `variants` |
| 2.14 | Reserve that replaces the line | S5–S8 | Data | M19 arena `reserve` |

## 3 · Bosses

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 3.1 | Boss phase that ends only when its gear is broken (as well as its Health threshold) | Marshal (S6), Silas projection shield (S7), Ivo Case Guard (Survey), Rhea's three wearable pieces (S8) | **Engine · M24** (E5) | boss phase `require: gear`; `phaseHeld()`; `lab-m24-marshal` |
| 3.2 | Mounted first phase that ends on the dismount | Rovan (S5), Cassian (Reed), Luo Jian (Med) | **Engine · M24** (E5/E6) | boss `mount:` plus phase `require: dismount` |
| 3.3 | Gear that grants a counter or anti-air or low resistance only while intact | Rhea (S8), Marshal (S6) | **Engine · M24** (E5) | gear `benefit: front / counter / antiAir / lowResist` |
| 3.4 | Weapon phase, disarm, Hookstaff durability and owner | Garran (S3) and every armed boss | Data | M19 phase `weapon`, `armed`, `untilDisarmed` |
| 3.5 | Clinch and throw phase with partner interrupt | Garran (S3) | Data | grabs with `rescueInterruptible` |
| 3.6 | Environmental pressure phase (winch, cargo, cover repositioning) with warn, interrupt, redirect | Garran Winch Pressure (S3), Mara brake release (Storm) | **Engine · M24** (E2) | movers with `warn`, `redirect`; boss phase `device`, scenery movers |
| 3.7 | Live capture: disarm, Resolve break, restraint, assessment, custody | every boss | Data | M19 `finalBlow`, surrender, capture |
| 3.8 | Queued transitions with capped carryover | every boss | Data | M7 boss `transition` |
| 3.9 | Emitter lanes (fixed warned lanes) | Silas (S7) | **Engine · M24** (E2) | a mover with `from` = `to` sweeping a lane, or hazards (Data) |
| 3.10 | Private case and testimony after capture | S3 (invoice), S5–S8 | Module · M25 | evidence lifecycle |

## 4 · Weapons and items

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 4.1 | Restricted heavy machine gun: no jump, grab, mount or carry; slower walk; heat-limited bursts | S6 | **Engine · M24** (E9) | weapon `restrict`, `heat`; `shared/weapons.ts`; `lab-m24-weapons` |
| 4.2 | Concussion grenade, device or capsule: lands, shows its area, then knock-back, brief stun, Defense cost; no friendly fire | S6–S8 | **Engine · M24** (E9) | weapon `blast`; `detonate()` |
| 4.3 | Tools with a tagged use (pry bar, tripod, tire iron opening a tagged object at once) | S6–S8, Survey | **Engine · M24** (E3) | weapon `opens`, breakable `tags`; `lab-m24-hazards` |
| 4.4 | Hook pole and mooring hook redirecting a tagged hazard | Storm (Rescue Hook Pole), Reed | **Engine · M24** (E3) | weapon `redirects`, mover `redirect` tag |
| 4.5 | Carried food: `J` pickup, carry, consume on demand, throw, hand over | S3 §10.2, Storm, Med | **Engine · M24** (E13) | weapon class `provision`, Interact + Up eats; Stage 1/2 food stays consumed on touch |
| 4.6 | Medium weapon baselines per difficulty (add on Easy, remove duplicates on Extreme) | every stage | Data | stage `items` per difficulty |
| 4.7 | Exact revolver rounds, empty state, throwable when empty | S3 | Data | `ammo`, `whenEmpty` |
| 4.8 | Melee weapons with durability, clash, disarm, throw | all | Data | M6 weapon YAML |
| 4.9 | One physical instance in co-op; deterministic pickup arbitration | all | Data | M6 `resolvePickups` |

## 5 · Environment

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 5.1 | An arena's own scenery (not only the Lab's mill layout) | every stage and mission | **Engine · M24** (E1) | arena `scenery:` in YAML (items, surfaces, breakables, hazards, movers, platforms, stations) |
| 5.2 | Mine and transport carts on bounded paths | S3 Echo Quarry, Survey | **Engine · M24** (E2) | `scenery.movers` |
| 5.3 | Rolling debris, suspended crane cargo, the Broken Wagon | Storm, S5, Reed, Survey | **Engine · M24** (E2) | movers with `cycles` (a one-shot release is `cycles: 1`) |
| 5.4 | Scaffolds and barriers with intact, damaged, critical, broken states | S3 and all | Data | breakables `thresholds` |
| 5.5 | Impact surfaces (walls, rails) | all | Data | `surfaces` |
| 5.6 | Static warned hazards (runoff, surge) | Storm, S2 | Data | `hazards`, arena `surge` |
| 5.7 | Property classes (protected, expendable, objective-sensitive, required transition) and player-attributed incidents once per damage cluster | S6–S8, Reed §12, Survey | **Engine · M24** (E3) for the record; **Module · M25** for the ledger score | breakable `property`, `cluster`; `world.shared.incidents` |
| 5.8 | No lethal cliffs, no unavoidable captive loss | all | Data | existing hazard rules (protected knock clear) |
| 5.9 | Object persistence (checkpoint-saved, restored, consumed, story-controlled) | S3 §13 | Module · M25 | checkpoint classes with the objective framework |

## 6 · Objectives and people

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 6.1 | Rescue groups with condition Secure / Strained / Critical from counted hostile actions | S3 §7.2, Storm §8, S5–S8 | Module · M25 | protected units, counted hostile actions |
| 6.2 | Visible, interruptible hostile actions in a protected zone, counted once | S3, Storm | Module · M25 | objective channels (M24 robot interference hook ready: `interfering()`) |
| 6.3 | Short deterministic captive routes to shelter, safe hand-off | S3, Storm | Module · M25 | M9 workers are the precedent |
| 6.4 | Research record Documented / Disturbed / Recovered, never lost | S3 §6 | Module · M25 | evidence lifecycle |
| 6.5 | Evidence carriers, clue chains, Sponsor Dossier | S3–S8 | Module · M25 | M9/M20 evidence plus M25 lifecycle |
| 6.6 | Escape-Network Ledger (assets used, denied, recovered) | Reed §9 | Module · M25 | ledger module (M18 Preservation Ledger is the precedent) |
| 6.7 | 100-point stage grade with caps | S3 §22.2 and all | Module · M25 | grade module |
| 6.8 | Collateral Care and property ledgers | S6–S8, Reed, Survey | Module · M25 | consumes M24 incidents |
| 6.9 | Custody pipeline (restraint, assessment, custody) for several people | S8 | Module · M25 | on M24 noncombatants |

## 7 · Heroes and hand-over

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 7.1 | Solo control hand-over mid-run: bars by percentage (never up), combo and temporary states clear, held weapon and one provision into a single-use cache | S5 Broken Wagon (Liang → Sheng), campaign review G12 | **Engine · M24** (E11) | `shared/handover.ts handOver`, `claimCache`; `lab-m24-handover` (Lab buttons) |
| 7.2 | Co-op Field Protector Support: the other player becomes a non-mobile supporter with authored one-shot actions | S5 §9.3 | **Engine · M24** (E11) | `becomeSupporter`, `stepSupporter` (placeholder set: heal, guard, delay, stagger) |
| 7.3 | New hero kits (Sheng Guo, Liang Zhen, Kael, Lin Lan, Soren, Chen Yue) | S4–S8, Reed | Data | hero YAML, written before their content waves (campaign review G8) |
| 7.4 | Unique hero selection, locked rosters | all | Data | M9 `stageHero` |
| 7.5 | Lin access states | Reed §6 | Mode · M26+ | roster availability in the Hub |

## 8 · Support systems

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 8.1 | Support robot: marked stations, one shared request machine (unused → approaching → active → consumed; disrupted → cooldown → one retry) | S6 supervised robot, S7 Council Field Support Robot, S8 network | **Engine · M24** (E12) | `scenery.stations`; `shared/robot.ts`; `lab-m24-robot` |
| 8.2 | Robot effect: mobile cover (temporary solid surface) | S6, S7 | **Engine · M24** (E12) | station `kind: cover` |
| 8.3 | Robot effect: reserve delay | S6, S8 | **Engine · M24** (E12) | station `kind: delay`; `waveHeld()` |
| 8.4 | Robot effect: pause one hostile objective channel | S7, S8 | Module · M25 | hook `interfering()` is wired; M25's channels read it |
| 8.5 | Teaching Guide, cheats (`STEADYRIDE` and kin) | all | Data | M11 cheat registry |

## 9 · Modes

| # | Mechanic | Used by | Verdict | Evidence |
|---|---|---|---|---|
| 9.1 | Archive-led Mission Hub, Character Chronicles | Modes §5.1–5.2 | Mode · M26+ | |
| 9.2 | Mission Remix (rule cards on finished stages) | Modes §5.3 | Mode · M26+ | combat rules unchanged; difficulty and roster levers are Data |
| 9.3 | Curated Mission packaging and manifests | Modes §5.4, every mission §3 | Mode · M26+ | |
| 9.4 | Random Operations generator | Modes §5.5 | Mode · M41 | builds arenas from the M24 `scenery` data |
| 9.5 | Chapter Challenge ranking and Mastery Score | Modes §6 | Mode · M42 | |
| 9.6 | Village Scoreboard, Run Archive, replays | Modes §7 | Mode · M26+ | replays are the existing deterministic logs |
| 9.7 | Academy curriculum growth | Modes §8 | Data | M11/M21 lessons and showcases |
| 9.8 | Cross-mode Cheat-Assisted marking | Modes §10 | Data | M11 |

## Engine changes made in M24

All new state is plain data in the world (`world.shared`, `fighter.ext`, `item.fuseAt`),
encoded only when present (`encodeShared`, marker byte `0xA4`), so a world that uses none of
it hashes byte for byte as before. `STATE_FORMAT` stays 18.

| # | Feature | Code | Lab scene |
|---|---|---|---|
| E1 | Arena scenery in data | `generate.ts convertScenery`, `encounter.ts arenaLayout` | all |
| E2 | Moving hazards (warned, redirectable, never lethal) | `shared/scenery.ts` | `lab-m24-hazards` |
| E3 | Tags, tool permissions (`opens`, `redirects`), property incidents | `shared/scenery.ts`, `combat/environment.ts` | `lab-m24-hazards` |
| E4 | Moving platforms | `shared/scenery.ts` | `lab-m24-platform` |
| E5 | Finite gear; boss phase `require` | `shared/fighters.ts`, `combat/damage.ts`, `enemies/boss.ts` | `lab-m24-gear`, `lab-m24-marshal` |
| E6 | Mounted fighters in on-foot arenas | `shared/riders.ts` | `lab-m24-riders` |
| E7 | Resolve floor and withdrawal; noncombatants | `shared/fighters.ts` | `lab-m24-rivals` |
| E8 | Feints; disguised entry | `enemies/ai.ts`, `shared/fighters.ts` | `lab-m24-rivals` |
| E9 | Heavy weapons (restrict, heat); blast throwables | `shared/weapons.ts`, `combat/held.ts`, `combat/items.ts` | `lab-m24-weapons` |
| E10 | Mount catalogue, safe dismount, on-foot fallback | `mounted/pursuit.ts` | `pursuit-m24-mounts` |
| E11 | Solo hand-over and cache; co-op supporter | `shared/handover.ts` | `lab-m24-handover` |
| E12 | Support robot stations | `shared/robot.ts` | `lab-m24-robot` |
| E13 | Carried provisions | `shared/weapons.ts eatProvision` | `lab-m24-weapons` |

Also: the weapon and enemy registry order is frozen (`FROZEN_WEAPONS`, `FROZEN_ENEMIES` in
`generate.ts`), new files are appended, and new arenas are appended after every stage and
greenhouse arena (lesson G1).

## Hand-over to M25

M25 builds on these M24 hooks: `world.shared.incidents` (property ledgers), `interfering()`
(robot pauses a hostile channel), `noncombatant` profiles (custody targets), rival
`floorAt` (a rival's withdrawal as an objective event), the `SharedEvent` log (Lab and
achievements). The rows marked Module · M25 above are its scope.

## Open questions for the later stage readiness reviews

1. **Horse values (S3):** the placeholder `mountain-horse` uses `atZero: dismount`. Stage 3
   §9 also allows a recovered horse after An Bo; decide per corridor whether the horse is
   lost (dismount) or recovers (recover).
2. **Supporter actions (S5 §9.3):** the four placeholder actions (heal, guard, delay,
   stagger) are generic; Stage 5 authors its four, and they should move into stage data when
   it does.
3. **Feint rule:** M24 feints every second use of an attack. If a stage wants a different
   rhythm (every third, or random by seed) it is a one-field extension.
4. **Rider hits on heroes in the lane** use the hazard rules (guard blocks, protected knock
   clear). Confirm with Guo that this reads well for the Mounted Raider before Stage 3 tuning.
5. **Property incidents** count hero damage only, once per cluster. M25 decides how throws
   and redirected hazards are attributed (today: the thrower and the redirecting hero).

## M25 status (2026-11-15)

M25 built the shared objective and grade framework (plan
`docs/superpowers/plans/2026-11-15-m25-objective-and-grade-framework.md`, code in
`packages/sim/src/objectives/`, data in `packages/data/objectives/objectives.yaml` and an
arena's `objectives` and `grade`, Lab room `lab-m25-objectives`).

| Row | Status after M25 |
|---|---|
| 6.1 Rescue groups, Secure / Strained / Critical | **Built**: protected units with a data ladder (`rescue`), counted hostile actions, lock on safe |
| 6.2 Visible, interruptible hostile actions counted once | **Built**: hostile channels (tell, interruption by any reaction or defeat, cooldown, counted once) |
| 6.3 Short captive routes to shelter, safe hand-off | **Built**: authored waypoints, `wait` hand-off points, Safe at the last one |
| 6.4 Research record Documented / Disturbed / Recovered | **Built**: evidence lifecycle and the `record` outcome table |
| 6.5 Evidence carriers, clue chains, Sponsor Dossier | **Built** for the case lifecycle; clue chains stay stage data (M9/M20) |
| 3.10 Private case and testimony after capture | **Built** as an evidence case (the capture beat authors it in M28) |
| 6.7 100-point stage grade with caps | **Built**: `grade100` with category caps, condition caps and no grade for Cheat-Assisted runs; Stage 1 and 2 results moved onto it |
| 8.4 Robot pauses one hostile channel | **Built**: an active `interfere` station pauses the working channel nearest to it |
| 5.9 Object persistence through checkpoints | **Built** for objectives: a checkpoint copy restores everything except units that reached safety and sealed cases; other object classes stay with their stage |
| 1.4 Replacement mount after a rescue | **Stage 3 (M27/M28)**: a rescue's unit record is the trigger; the allocation counter is stage data |
| 5.7 / 6.8 Property and Collateral Care ledgers | **First user (S6 or a mission)**: a grade category over `world.shared.incidents` |
| 6.6 Escape-Network Ledger | **Reedwater**: a grade category over its own records |
| 6.9 Custody pipeline | **Stage 8**: protected units with custody phases on M24 noncombatants |

Open question 5 above (attribution of throws and redirected hazards) moves with the property
ledgers to their first user.

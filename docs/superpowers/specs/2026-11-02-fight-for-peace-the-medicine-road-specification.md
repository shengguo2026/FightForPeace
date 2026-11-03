# Fight for Peace — The Medicine Road Specification

**Version:** 1.0 approved  
**Date:** 2026-11-02  
**Scope:** Curated Mission 2 — *The Medicine Road / 送药之路 / Die Medizinroute*  
**Status:** Approved on 2026-11-02; fresh builder review passed; implementation planning has not begun  
**Depends on:** permanent Combat Constitution, shared game specification, Phase 4 expanded-game-modes specification, Stage 5 continuity, Curated Mission package contract  

## 1. Intent and interpretation

This document converts the approved Medicine Road decisions into a build-facing product, content, and technical specification. It extends the permanent Combat Constitution and Curated Mission framework; it does not replace shared controls, combat, profile, economy, Store, accessibility, localization, networking, deterministic simulation, Museum, Guide, Academy, cheats, Automatic Highlights, or media rules.

The mission is a canon-compatible side story available after Stage 5 and before Stage 6. It demonstrates that the village's prosperity has become a regional responsibility: protecting medicine is not about owning valuable cargo, but about ensuring that remote communities receive care.

Where this document provides candidate thresholds, population envelopes, or duration targets, validated production tuning may adjust the number without changing the approved behavior, fairness boundary, narrative outcome, or system contract. Exact production values listed in Section 31 are deferred data gates, not unresolved feature decisions.

Implementation planning is explicitly outside this document.

## 2. Goals, non-goals, and anti-goals

### 2.1 Goals

- Deliver a 30–40 minute first clear and 20–28 minute experienced replay.
- Combine fighting-game combat with mobile escort, repair defense, cargo recovery, environmental combat, and bounded motorbike pursuit.
- Make every objective consequence visible, deterministic, reversible only through approved play, and checkpoint-safe.
- Keep the complete route solo-feasible and co-op-enhanced without making co-op mandatory.
- Preserve canonical essential delivery while allowing condition, execution, and optional service to affect grade and rewards.
- Provide meaningful replay through five difficulties, advanced roles, optional branches, rank improvement, achievements, and Automatic Highlights.
- Tell a complete independent side story without Tomas, sponsor, or mandatory campaign-evidence content.
- Teach every mission-specific rule through Guide and optional Academy content.
- Support keyboard, remapped keyboard, gamepad, same-device co-op, and local-Wi-Fi co-op.

### 2.2 Non-goals

- No new playable hero.
- No change to the Combat Constitution.
- No free-roaming or steerable clinic vehicle.
- No persistent or Store motorbike.
- No firearms, grenades, military equipment, lethal crashes, lethal falls, or civilian collision weapons.
- No permanent cargo loss, mission-ending vehicle destruction, patient death, or protected mechanic death.
- No mandatory optional branch, S rank, purchase, particular hero, or particular move.
- No new case-specific cheat.
- No actionable pharmaceutical, diagnostic, or patient information.
- No Automatic Highlight expansion outside Curated Missions.

### 2.3 Anti-goals

The mission fails its design intent if it can:

- punish ordinary cosmetic collision as objective damage;
- strand a hero after bike loss;
- require a weapon to clear the only route;
- make objective failure happen off-screen or without a warning;
- use cargo damage as graphic medical distress;
- double enemy durability merely because a second player joined;
- let checkpoint restoration improve cargo, repair, bike, score, or resource state;
- reward deliberate cargo loss, warning delay, repair interruption, or Highlight farming;
- imply that the road gang serves Tomas or the sponsor;
- alter simulation according to language, presentation frame rate, effects setting, input device, or Highlight capture.

## 3. Approved approach

Three broad structures were considered during refinement:

1. **Hard-failure convoy escort:** cargo or vehicle destruction could fail the mission. This was rejected because a single escort failure would undermine accessibility, replay pacing, and the canonical delivery.
2. **Protected delivery with condition ledgers:** essential delivery is guaranteed, while visible preventable incidents affect state, grade, dialogue, achievements, and rewards. This is the approved approach because it preserves stakes without softlocks or narrative contradiction.
3. **Linear cinematic road battle:** the convoy would be scenery while play remained ordinary combat. This was rejected because it would not deliver the mobile-escort identity or co-op protection decisions.

The selected approach is the **Four-Part Medical Delivery Ledger** combined with bounded mounted sections, deterministic recovery, and objective-first grading.

## 4. Package and availability contract

- Stable case identity: Curated Mission 2, Medicine Road.
- Localized titles:
  - English: *The Medicine Road*
  - Simplified Chinese: *送药之路*
  - German: *Die Medizinroute*
- Timeline position: after Stage 5 present-day investigation, before Stage 6.
- Story gate: completion of Stage 5, including Cheat-Assisted Story completion because this is a content-access gate.
- Access requires no score, rank, difficulty, Credits, or another Curated Mission.
- Late installation opens immediately if the Stage 5 gate is already satisfied.
- Package ownership or completion never gates a required hero, campaign ending, difficulty, starting technique, or mandatory story fact.
- Installed packages do not rotate or expire.
- Package metadata declares compatible schema, ruleset, localization, accessibility, objective, grading, reward, replay, and Highlight versions.
- Version mismatch blocks local-Wi-Fi readiness with a localized repair/update path.
- Incompatible historical results remain visible as Legacy records.

## 5. Inherited architecture and permanent boundaries

The mission consumes shared data-driven schemas for:

- hero kits, loadouts, purchased Special and directional Ultimate slots;
- standing, aerial, low, and ground routes;
- cancels, defense, Exact Block, Counter, Combo Breaker, Resolve, anti-infinite budgets, and co-op rescue;
- pickable weapons and `J` lifecycle;
- mounts and Stability;
- objective state, checkpoints, deterministic replay, score, achievements, rewards, and Museum transactions;
- same-device and local-Wi-Fi ownership;
- localization, captions, screen reader, current-binding prompts, accessibility, cheats, and Assisted records;
- Automatic Highlight candidate collection and replay reconstruction.

The package may add data, artwork, animation, audio, encounters, and mission-specific state machines. It may not fork combat code, change universal input semantics, add a private physics model, or create a mission-only progression economy.

## 6. Narrative and canonical state

### 6.1 Premise

The village clinic and Regional Civil Protection Council prepare six sealed cases of medicine, diagnostic equipment, and emergency supplies for remote communities along the Changling Trade Road. Luo Jian's independent road gang attacks to steal and resell them.

### 6.2 Canonical truths

- The cargo is legitimate regional medical relief.
- The road gang acts independently for resale profit.
- Luo Jian is not connected to Tomas, the sponsor, the procurement cutout, or mandatory campaign evidence.
- All six essential cases reach the remote clinic.
- Luo Jian is genuinely defeated, restrained alive, and medically assessed.
- The mission introduces no new hero.
- Optional branches deepen regional service but cannot alter campaign continuity.

### 6.3 Selectable heroes

- Mountain Guardian
- River Scout
- Wind Sentinel
- Fire Warden

Solo selects one. Co-op selects two different heroes; duplicates are forbidden. Every hero and every unique pair must be able to complete every mandatory objective and both optional branches. Selection may alter barks and camera emphasis, never facts or outcome.

## 7. Player flow and route

Primary flow:

`Mission Hub -> selection and Highlight toggle -> Before the Long Road -> Dispatch Yard -> Forest Switchbacks -> CP1 -> Old Service Tunnel -> optional beacon -> CP2 -> Stone Viaduct and Service Turnout -> optional hillside clinic -> CP3 -> Remote Clinic Approach -> Luo mounted phase -> CP4 -> Luo baton phase -> Luo empty-hand phase -> restraint and delivery -> results -> Archive/Museum transaction`

### 7.1 Council Medical Dispatch Yard

- Confirms heroes, difficulty, loadouts, vehicle, six-case manifest, controls, and Highlight setting.
- Runs Dispatch Test against Road Blockers.
- Teaches normal and fallback clearance.
- Does not permit cargo loss before the tutorial is complete.
- Contains empty crates, handcarts, folding barriers, and loading frames; sealed cases are protected.

### 7.2 Forest Switchbacks

- Two authored moving-defense sections separated by a secure anchor.
- Introduces First Bend, Cedar Rest Raid, and Harrier Run.
- Introduces first Cargo Snatcher channel and first bounded Bike Harrier pursuit.
- Provides complete on-foot fallback.
- Ends at CP1 Switchback Secured.

### 7.3 Old Service Tunnel

- Contains Tunnel Breakdown around the damaged wheel assembly.
- Mechanic, lighting restoration, Lookout support, and controlled cargo pressure are active.
- First authored Tire Iron placement occurs here.
- Tunnel Exit Blockade follows the repair.
- Optional Beacon Beyond the Tunnel opens after mandatory lighting restoration.
- Ends at CP2 Tunnel Reopened.

### 7.4 Stone Viaduct and Service Turnout

- Contains Viaduct Seizure, the strongest mandatory cargo-removal attempt.
- Provides deterministic later recovery for any carrier that exits with a case.
- Contains cargo-restraint-frame repair during Turnout Repair Siege.
- Folding Road Baton appears through emergency rack or eligible drop.
- Optional One More Clinic departs from the turnout and returns safely.
- Ends at CP3 Viaduct Cleared.

### 7.5 Remote Clinic Approach

- Begins Luo Jian's Road Closure Run.
- CP4 follows his safe dismount.
- Baton Interception and Cornered Leader complete the genuine boss fight.
- Live restraint, assessment, cargo receipt, and canonical delivery follow.

## 8. Four-Part Medical Delivery Ledger

### 8.1 Clinic Vehicle Condition

States:

- **Roadworthy:** no designated warned vehicle-damage action completed.
- **Damaged:** at least one designated warned attack or hazard affected the exterior.
- **Stabilized:** the vehicle was Damaged and both authored repairs completed safely.

The vehicle cannot explode, be permanently destroyed, run over people, leave the authored route, or cause mission failure. Ordinary contact, enemy bodies, fragments, cosmetic debris, camera effects, off-screen simulation, and rollback correction cannot change condition.

The wheel-assembly and cargo-restraint repairs represent mandatory road-stress maintenance and are condition-neutral by themselves: Ready for Repair does not change Roadworthy to Damaged. Only a clearly warned designated vehicle-impact action performs Roadworthy to Damaged. A Damaged vehicle remains Damaged until both repairs are Completed, at which point it becomes Stabilized. After CP3 the vehicle enters the protected clinic approach; Luo Jian and ordinary combat cannot cause a later vehicle-condition transition.

### 8.2 Cargo Manifest

Exactly six marked cases exist:

- two medicine cases;
- two diagnostic-equipment cases;
- two emergency-supply cases.

Each case has:

- custody: **Secured**, **Displaced**, or **Recovered**;
- seal: **Intact** or **Scuffed**;
- stable identity and category;
- carrier/location/recovery-node facts;
- a one-way Recovered lock that prevents repeat removal.

Cases cannot be consumed, opened, sold, used as shields, destroyed, thrown into unreachable space, or permanently lost. If a Snatcher exits, the case moves to its predetermined later recovery point. Recovery cannot be repeated after restore, reconnect, or replay.

Every case starts Secured and Intact. Completion of the Snatcher removal channel changes custody to Displaced. If the carrier is interrupted before the warned escape consequence completes, recovery preserves Intact. If the carrier completes the warned escape/rough-transfer consequence, the case moves to its fixed later recovery point and its seal changes irreversibly to Scuffed. Ordinary drops, throws, collisions, environmental contacts, presentation effects, and network correction cannot Scuff a seal. One continuous case sequence is one resolved delivery incident for S evaluation even if its linked history contains both Displaced and Scuffed facts.

### 8.3 Repair Ledger

The wheel assembly and cargo-restraint frame each track:

- Ready for Repair;
- Interrupted;
- Completed.

Interruption pauses progress and records an incident; it never resets completed work. The protected mechanic has no ordinary Health or death state. Solo receives a protected repair window that suppresses invalid pressure. Co-op may split repair and defense but cannot receive extra objectives merely for having two players.

### 8.4 Route Clearance

Each authored obstruction tracks:

- Blocked;
- Being Cleared;
- Reopened.

No hidden failure timer exists. Every obstruction has a normal interaction and fixed fallback using existing abstract actions and current bindings. Loss, absence, or breakage of a Tire Iron or Baton cannot block progress.

### 8.5 State-change authority

Only designated, warned objective actions change the ledger. Every such action requires:

- visible objective-role marker;
- target line or tagged target;
- readable anticipation and active window;
- non-colour silhouette/shape treatment;
- priority SFX, caption, screen-reader event, and optional vibration;
- deterministic target and consequence;
- validated response time for every hero.

Solo permits one cargo or route threat approaching completion. Co-op permits two staggered threats against different targets. Difficulty may tighten legal windows and combine pressure but cannot hide meaning, add instant loss, or create unavoidable overlap.

## 9. Objective interactions and ownership

- All required prompts display current keyboard/gamepad bindings.
- Repair, recovery, branch delivery, and restraint support hold, toggle, and reduced-input variants.
- A pure input-form change that preserves timing remains eligible; timing or pressure assistance uses Assisted records.
- Objective items have one authoritative owner.
- Simultaneous pickup resolves by authoritative input frame then stable player identity.
- Dropped objective items recover through authored nodes.
- `J` retains shared pick-up, carry, handoff, consume, throw, and discard priorities.
- Objective cargo is never treated as food or ordinary weapon content.
- A completed repair, recovery, branch, or restraint has a stable completion transaction and cannot pay twice.

## 10. Bounded Medical-Convoy Pursuit

### 10.1 Player bikes

- Solo receives one stage-local mid-class motorbike.
- Co-op receives one per hero.
- Controls use inherited depth-lane steering, capped acceleration, braking, hazard avoidance, universal mounted strike, and voluntary dismount.
- Bikes have separate Stability; zero produces safe nonlethal dismount.
- No explosion, lethal collision, civilian collision weapon, free roam, persistent ownership, or Store use.
- Weapons are stowed during mounted transitions and restored at the next legal dismount.
- Mounted play adds no weapon, Special, or Ultimate routes.

Each assigned bike is persistent for the full run. A voluntarily parked bike with positive Stability is staged at the next secure anchor and returns for the next mounted section with exact remaining Stability. A bike reaching zero Stability is permanently unavailable for the remainder of the run; no secure anchor, repair, checkpoint, reconnect, or restore replaces it.

### 10.2 Clinic vehicle

Players cannot steer, board, weaponize, or redirect it. It travels deterministic authored paths between secure anchors and slows for regrouping.

### 10.3 Complete on-foot fallback

A dismounted hero can:

- evade readable Harrier passes;
- attack during low-speed turns;
- redirect riders into tagged barriers;
- use the authored roadside path;
- rejoin at the next secure anchor.

No hero or partner is abandoned. Bike loss may affect Combat or Efficiency only; it cannot reduce Medical Delivery Integrity, block a branch, or prevent completion. Co-op may split interception and protection but route boundaries prevent indefinite separation.

### 10.4 Difficulty and restoration

Higher profiles add coordinated passes, braking feints, and staggered lane pressure rather than unreadable speed. Loss during Harrier Run carries into every later pursuit and Luo Jian's mounted phase, each of which remains fully completable through the approved on-foot fallback. Co-op bikes are independent, allowing one mounted hero and one on-foot hero. Restore preserves exact bike outcome. `STEADYRIDE` applies only to player bikes and preserves controls, reactions, obstacles, routes, and authored dismounts.

## 11. Encounter baseline

| # | Encounter | Primary purpose |
| --- | --- | --- |
| 1 | Dispatch Test | Clearance tutorial; no cargo loss |
| 2 | First Bend | Moving defense with Blockers and Harriers |
| 3 | Cedar Rest Raid | First Snatcher channel and Lookout support |
| 4 | Harrier Run | Bounded pursuit and on-foot fallback |
| 5 | Tunnel Breakdown | Wheel repair, mechanic protection, controlled cargo threat |
| 6 | Tunnel Exit Blockade | Mixed clearance after repair |
| 7 | Viaduct Seizure | Strongest cargo attempt and deterministic recovery |
| 8 | Turnout Repair Siege | Cargo-frame repair under mixed pressure |
| Boss | Luo Jian | Mounted, baton, and empty-hand phases |

Optional branch encounters are additional and excluded from the eight mandatory encounters.

### 11.1 Initial active-hostile envelopes

| Difficulty | Solo cap | Co-op cap |
| --- | ---: | ---: |
| Easy | 3 | 5 |
| Medium | 4 | 6 |
| Hard | 5 | 7 |
| Extreme | 5 | 7 |
| Ultimate | 6 | 8 |

These are initial playtest envelopes, not immutable final tuning. Reserves enter visibly and cannot begin an objective channel before becoming interruptible. Co-op adds tactical coverage, not doubled Health.

Extreme replaces a Viaduct slot with the Tow-Chain Enforcer. Ultimate retains it and replaces a Turnout support slot with the Dispatcher. Their objective actions cannot approach completion simultaneously in an unavoidable combination. `QUIETCROWD` removes only ordinary density.

## 12. Coordinated Road-Gang Roster

### 12.1 Road Blocker

- Slow melee and route-control role.
- Builds or guards tagged barriers.
- Only designated warned action may worsen Route Clearance.
- Cannot create an unpassable only route.

### 12.2 Bike Harrier

- Performs bounded passes, flank pressure, and braking feints.
- Uses inherited Stability and safe dismount.
- Cannot use civilian or clinic-vehicle collision as a weapon.

### 12.3 Cargo Snatcher

- Selects one eligible marked case.
- Uses visible approach and interruptible carry channel.
- Carries at most one case.
- Never uses a case as shield.
- Cannot retarget a Recovered-locked case.
- Interruption uses legal drop/recovery state; exit uses predetermined later recovery point.

### 12.4 Ridge Lookout

- Uses a compact sling with finite blunt clay pellets or weighted markers.
- Every shot has visible line or ground warning.
- May interrupt an unprotected repair channel.
- Cannot damage vehicle, cargo, or mechanic from off-screen.
- Uses no firearm.

### 12.5 Extreme specialist — Tow-Chain Enforcer

- Repositions tagged loose barriers and cargo obstacles.
- Cannot pull heroes, civilians, cases, vehicles, bikes, bosses, or indispensable structures.
- Has no off-screen action.
- Replaces rather than adds an ordinary Viaduct slot.

### 12.6 Ultimate specialist — Road-Gang Dispatcher

- Uses visible whistle and hand-signal channel.
- Coordinates one existing Harrier or Snatcher action.
- Interruption cancels the order.
- Cannot create hidden spawns, reinforcements, or unavoidable combinations.
- Replaces rather than adds a Turnout support slot.

### 12.7 Shared enemy rules

- Enemies may surrender or enter live restraint.
- No firearms, grenades, military gear, sponsor insignia, execution, or lethal crash.
- Difficulty improves coordination, conversions, and timing rather than excessive Health.
- Shared Resolve, ground combat, defense, anti-infinite, surrender, restraint, and co-op rescue rules apply.

## 13. Medical-Corridor Impact Network

### 13.1 Dispatch Yard

Empty transport crates, handcarts, folding safety barriers, and loading frames provide wall reactions and light breakage. Sealed medical cases remain protected objective objects.

### 13.2 Forest Switchbacks

Timber guard barriers, maintenance crates, route-marker posts, and stacked drainage pipes provide rebound, knockdown, and temporary fragments without blocking the only road.

### 13.3 Old Service Tunnel

Tool carts, collapsible maintenance fencing, empty cable reels, service cabinets, and lighting controls support combat. Lighting restoration cannot create electrocution or unavoidable darkness damage.

### 13.4 Stone Viaduct

Sandbag stacks, empty cable spools, removable road barriers, and reinforced guardrails create lane control. Guardrails cannot open lethal falls or permit actors to be thrown from the viaduct.

### 13.5 Remote Clinic Approach

Benches, empty supply carts, water containers, and awning supports provide restrained reactions. Clinic entrance, staff, patients, and delivered supplies remain protected.

### 13.6 Environmental fragments

Barrier slats, empty lightweight containers, and small maintenance pieces may become temporary `J` projectiles. They are not persistent weapons and disappear after authored use. They follow shared damage, stun, bounce, Resolve, scaling, ownership, clash, throw, and anti-infinite rules.

Combat objects and objective objects remain strictly separated. Cosmetic destruction cannot alter the Medical Delivery Ledger. Solo and co-op use identical object schedules; reduced effects preserve collision and timing.

## 14. Pickable tools

### 14.1 Tire Iron

The existing Stage 4 profile returns unchanged: slower, stronger guard pressure, knockback, low sweep, and tagged road-object interactions, with distinct standing, aerial, low, and ground routes. It cannot damage medical cases or protected safety equipment through contextual actions.

### 14.2 Folding Road Baton

The existing Stage 4 profile returns unchanged: quick recovery, interruption, guard/Resolve pressure, and lower raw damage, with distinct standing, aerial, low, and ground routes.

### 14.3 Shared tool constraints

- Stage pickup only; never pre-equipped, persistent, or sold through this mission.
- Shared Attack/directional Attack and `J` lifecycle.
- No automatic restraint or Resolve bypass.
- Safe stow/restore across mounted transitions.
- `TRUSTYTOOLS` affects carried integrity only, not throws, drops, disarms, handoffs, fragments, fixed mechanisms, or authored boundaries.

## 15. Luo Jian / 罗坚 boss graph

### 15.1 Identity and fairness

Luo Jian is the independent road-gang leader. He seeks resale profit, has no conspiracy connection, and must be genuinely defeated. He follows normal hit, defense, Resolve, scaling, anti-infinite, and ground-combat legality. He receives no scripted voluntary defeat, unbounded armour, rage immunity, infinite guard, or reinforcement immunity.

### 15.2 Phase 1 — Road Closure Run

- Mid-class motorbike and separate Stability.
- Telegraphed passing strikes, braking feints, lane changes, and barrier kicks.
- Mounted heroes use normal pursuit tools.
- On-foot heroes receive readable attack windows during slower turns and may redirect him into tagged barriers.
- Zero Stability produces safe dismount.
- Hero-bike loss cannot make the phase impossible.

### 15.3 Phase 2 — Baton Interception

- Reinforced folding road baton.
- Complete standing, aerial, low, and ground routes.
- Emphasizes guard pressure, healing interruption, and positional redirection.
- Legal disarm or authored Health threshold removes the baton.
- Phase must execute at least one bounded decision cycle and cannot be skipped.

### 15.4 Phase 3 — Cornered Leader

- Rough boxing, shoulder checks, low kicks, and short throws.
- Exact Blocks and one defense-consuming Combo Breaker.
- No objective immunity or new objective threat.
- Co-op isolation is temporary and always supports partner rescue.
- Cannot create an unavoidable two-player restraint.

### 15.5 Difficulty and defeat

Higher difficulty adds feints, safer conversions, and improved defensive decisions rather than excessive Health. Defeat commits live restraint, medical assessment, independent-resale admission, and canonical clinic delivery. Boss resources and phase state are checkpoint-safe.

## 16. Medicine Road Provision Set

| Resource | English | Simplified Chinese | German | Effect |
| --- | --- | --- | --- | --- |
| Life | Ginger Chicken Congee | 姜香鸡肉粥 | Ingwer-Hühnerreisbrei | Health recovery |
| Defense | Salted Plum Electrolyte Drink | 咸梅电解质饮料 | Elektrolytgetränk mit Salzpflaume | Defense recovery |
| Attack | Sesame-Peanut Energy Cake | 芝麻花生能量糕 | Sesam-Erdnuss-Energiekuchen | Attack-Bar recovery |
| Balanced | Clinic Route Lunchbox | 医疗路线餐盒 | Proviantbox der Medizinroute | Moderate recovery of all three |

### 16.1 Initial placements

- Medium solo: three Congees, two Drinks, two Cakes.
- Medium co-op: add one common item in each category.
- Every active hero can access one Lunchbox before Luo Jian.
- Easy adds one common item per category.
- Hard, Extreme, and Ultimate remove one, two, or three common items respectively.
- No profile eliminates a common category or the pre-boss Lunchboxes.

### 16.2 Resource separation

Provisions appear in personal lockers, roadside rest caches, maintenance cupboards, or secured route containers. They are not part of the six-case manifest. Their pickup, consumption, throw, ownership, checkpoint, or `FULLPANTRY` behavior cannot alter or duplicate medical cargo.

All use shared `J`, co-op ownership, handoff, consume, throw, and anti-duplication rules. Their effects are gameplay abstraction and never claim that food substitutes for medical treatment.

## 17. Optional branches

### 17.1 Beacon Beyond the Tunnel

Localized titles:

- English: *Beacon Beyond the Tunnel*
- Simplified Chinese: *隧道尽头的信标*
- German: *Signal hinter dem Tunnel*

After mandatory lighting restoration, a short maintenance alcove becomes available. The heroes may defend the technician while an old emergency-route beacon is reactivated.

Constraints:

- not required for route or convoy progress;
- cannot be permanently destroyed;
- no hidden sponsor or campaign clue;
- active time is excluded from efficiency comparison;
- reveals early travelling-clinic communication history.

### 17.2 One More Clinic

Localized titles:

- English: *One More Clinic*
- Simplified Chinese: *还有一间诊所*
- German: *Eine weitere Klinik*

At the service turnout, the heroes may carry a supplementary relief parcel along a short guarded footpath to a secure satellite-clinic locker.

Constraints:

- parcel is separate from the six manifest cases;
- cannot be opened, destroyed, consumed, or used as a shield;
- has no Medical Delivery Ledger effect;
- Council personnel deliver it later if the branch is declined;
- complete in solo and co-op;
- active time is excluded from efficiency comparison.

### 17.3 Combined recognition

Completing both branches in one eligible run grants:

- **Care Reaches Every Road / 医疗通达每条道路 / Hilfe erreicht jeden Weg**;
- text-free emergency-beacon lens Museum exhibit;
- regional clinic-route token Museum exhibit;
- Sheng Guo commentary about extending safety and medicine beyond the prosperous centre.

Branches are not required for clear, S rank, essential delivery, sponsor evidence, or base Museum entry. Locked entries show localized discovery clues. Cheat-Assisted play may reveal presentation content but grants no achievement or prestige transaction.

## 18. 100-Point Medical Escort Grade

| Component | Points | Included facts |
| --- | ---: | --- |
| Medical Delivery Integrity | 45 | Cargo custody/seals 20, vehicle 10, repairs 10, route clearance 5 |
| Protection and Collateral Control | 20 | Mechanic, clinic/civilians, protected zones, restrained destruction |
| Combat and Nonlethal Mastery | 25 | Variety, defense, Exact Blocks, counters, interruption, restraint, Luo performance |
| Resource and Active-Time Efficiency | 10 | Provision use, avoidable delays, encounter efficiency |

### 18.1 Candidate thresholds

- C: valid clear below 60.
- B: 60.
- A: 75.
- S: 90.

Final thresholds are independently validated for each difficulty and solo/co-op configuration.

### 18.2 Valid clear

A valid clear requires:

- Luo Jian restrained alive;
- all six essential cases arriving;
- canonical delivery transaction committed.

### 18.3 Excellence and caps

S is excellent, not perfect. It permits exactly one resolved delivery incident from:

- one Scuffed seal;
- one recovered displacement;
- one interrupted repair;
- vehicle damage repaired to Stabilized.

Several combined incidents disqualify S through score and/or approved caps. Repeated avoidable incidents, unrepaired Damaged vehicle, or three or more Scuffed seals cap A. Major avoidable protected-zone damage caps B. Fixed fallback interactions impose no automatic cap.

A single case's continuous removal-to-recovery history counts once for this rule even if it contains both Displaced and Scuffed facts; separate cases or separate later incidents count separately.

Optional branches are separate and never required for S. Their active time is compensated. Cheat-Assisted completion is unranked and grants no score, Credits, achievement, Mastery, or prestige reward.

### 18.4 Anti-exploit scoring

- No score from protected actors, mechanic, patients, staff, surrendered enemies, invulnerable transitions, repeatable props, or post-clear enemies.
- One event cannot pay multiple objective-prevention bonuses unless explicitly authored as one diversified Highlight candidate; score remains single-source.
- Restoring cannot erase active time, incidents, caps, resource use, or anti-farm counters.
- Co-op attribution explains contributions without creating an intra-team winner.
- Comparable records require same difficulty, player configuration, ruleset/loadout class, and compatible mission version.

## 19. Rewards and achievements

### 19.1 First-clear transaction

Every valid first clear grants:

- itemized difficulty-adjusted Credits;
- Medicine Road Canon-Compatible Side Story Chronicle entry;
- regional mobile-clinic network Museum case;
- mission background-music track for Museum listening;
- **The Delivery Arrives / 送药抵达 / Die Lieferung kommt an**.

### 19.2 Rank and difficulty prestige

- First A: text-free Six-Case Convoy profile emblem.
- First S: **Clinic Route Patrol / 医疗路线巡护装 / Patrouillenfarbset der Medizinroute** colourway for all four eligible heroes.
- First Ultimate clear: **Road of Care / 仁心之路 / Weg der Fürsorge** profile title.

The colourway is appearance-only, adds no statistic/resource/objective/scoring effect, and occupies no combat-style outfit slot.

### 19.3 Achievement set

- **The Delivery Arrives:** valid clear.
- **Care Reaches Every Road:** both optional branches in one eligible run.
- **Every Seal Intact / 封签完好 / Jedes Siegel unversehrt:** all six seals Intact, both repairs Completed, and vehicle Roadworthy or Stabilized.
- **Guardian of the Medicine Road / 送药之路守护者 / Wächter der Medizinroute:** S rank on Hard or above.

No achievement requires a particular hero, purchase, co-op partner, or combo route. Locked entries show localized clues.

### 19.4 Transaction boundaries

First-clear, rank-improvement, and Ultimate bonuses are profile-once. Replays grant bounded Credits under shared anti-farm policy. Cheat-Assisted clears retain completion, Chronicle, and base Museum access but grant no competitive/economy/prestige reward.

## 20. Presentation and localization

### 20.1 Before the Long Road

The skippable opening shows:

1. six sealed cases checked at Dispatch Yard;
2. clinic coordinator explaining remote-community need;
3. selected heroes accepting protective responsibility;
4. dawn departure.

The briefing exposes route, cargo categories, current controls, selected loadouts, difficulty, and Automatic Highlight toggle. Hero-specific reactions cannot alter facts.

### 20.2 Secure-anchor communication

Short exchanges report:

- case and vehicle condition after Switchbacks;
- wheel repair and mechanic state at the tunnel;
- recovery and cargo-frame repair at the viaduct;
- optional-branch acknowledgement.

Dialogue cannot interrupt an active threat or conceal control return.

### 20.3 Luo confrontation

Luo Jian demands the cargo for resale. The heroes reject treating remote patients' needs as gang profit. Combat starts only after control and warnings return. Defeat is followed by restraint, medical assessment, and his independent-motive admission.

### 20.4 The Road Reaches Them

The skippable ending shows all cases received and distribution beginning. Vehicle state, seal state, repairs, and branches receive bounded acknowledgements; essential delivery never changes. The clinic vehicle prepares for another route. Sheng Guo's Chronicle commentary connects regional access with peace.

### 20.5 Language and media boundary

- Complete English, Simplified Chinese, and German subtitles/transcripts.
- Text and installed voice language selectable independently with explicit fallback.
- Dialogue subtitle-first.
- Windows TTS limited to prototype/accessibility fallback unless deployment rights are established.
- Generated footage text-free, low-motion, and based on validated start/end frames.
- Localized text is added in-game, not embedded in artwork/video.
- Every sequence supports skip, Museum replay, and localized still-panel fallback.
- Completion cannot depend on speech, video, colour, vibration, high motion, or generated voice.

## 21. Roads of Care Audio Suite

| Cue | Simplified Chinese | German | Purpose |
| --- | --- | --- | --- |
| Dawn Dispatch | 黎明启程 | Aufbruch im Morgengrauen | Preparation and departure |
| Wheels Along Changling | 长岭行车 | Fahrt über Changling | Main travel identity |
| Blockade at the Bend | 弯道封锁 | Blockade an der Kurve | Switchback combat/pursuit |
| Light in the Service Tunnel | 隧道灯火 | Licht im Versorgungstunnel | Repair tension and restored warmth |
| Cases on the Viaduct | 高架桥上的药箱 | Die Kisten auf dem Viadukt | Cargo pressure and second repair |
| The Roadmaster's Demand | 路霸的索求 | Die Forderung des Straßenherrn | Three-phase boss stems |
| The Road Reaches Them | 送药抵达远方 | Die Hilfe erreicht ihr Ziel | Delivery and resolution |

Music uses plucked/bowed acoustic strings, bamboo flute, warm low winds, hand percussion, wooden blocks, and subtle modern pulse. Travel rhythm may evoke wheels but must not use literal engine samples as percussion. No lyrics, generated voices, recognizable borrowed melody, or artist imitation.

Gameplay cues provide loopable exploration, pressure, pursuit, repair, boss, and resolution stems driven only by stable presentation events.

### 21.1 SFX groups

- clinic vehicle, hero bikes, and Harrier bikes;
- latch, seal inspection, displacement, recovery, and secure lock;
- wheel and cargo-frame repairs;
- Blocker, sling, Tow-Chain, and Dispatcher warnings;
- tunnel lighting, beacon, barriers, pipes, viaduct surfaces;
- Luo mounted, baton, disarm, Combo Breaker, restraint.

Objective warnings, boss telegraphs, Exact Blocks, Counters, and Combo Breakers receive priority. Music and ambience duck. Meaningful sounds have captions and visual equivalents. Reduced audio cannot remove warnings. Generated candidates require editing, provenance, normalization, and commercial-rights clearance.

## 22. Automatic Highlight profile

At most three diversified Highlights are selected, at most one per family.

| Family | Medicine Road qualification |
| --- | --- |
| Perfect Combo | Universal hero-normalized rule |
| Two Threats One Move | Universal rule; excludes protected cargo, props, and repeated single-target contact |
| Guardian Intervention | Prevent committed Snatcher, Blocker, Tow-Chain, repair, or Luo barrier threat before objective loss |
| Defensive Mastery | Exact Block/Counter designated Blocker, dangerous Harrier, or Luo mounted/baton attack, then legal damage-free punish |
| Team Harmony | One hero secures repair/recovery/clearance/optional delivery while partner interrupts threat, followed by secured state |
| Environmental Ingenuity | Approved road object interrupts objective actor and meaningfully affects another hostile |

Candidate evidence stores responsible hero/team, objective identity, pre/post state, threat commitment, prevented outcome, frame/time facts, assistance label, and screenshot-safe presentation frame.

Detection cannot reward deliberate cargo displacement, vehicle damage, repeated repair interruption, warning delay, protected actors, or environmental farming. Screenshots favor successful intervention and cannot depict patients or clinic staff as injured. Highlights grant no score, rank, Credits, Mastery, or achievement.

Shared default-on toggle, 24-candidate bound, local reconstruction, localized explanation, ephemeral image, pin/export, 50-pin profile budget, privacy, backup, replay retention, and Curated-Only Validation Gate apply unchanged.

## 23. Four-Anchor Convoy Snapshot

### 23.1 Locations

- **CP1 Switchback Secured:** after Switchbacks and first pursuit.
- **CP2 Tunnel Reopened:** after wheel repair and final beacon decision.
- **CP3 Viaduct Cleared:** after recovery, second repair, and final parcel decision.
- **CP4 Roadmaster Dismounted:** immediately after Luo's mounted Stability phase.
- Mission start remains fallback before CP1.

### 23.2 Snapshot payload

Each snapshot includes:

- package/case/ruleset/schema versions and deterministic seed/index;
- route segment, encounter, dialogue, branch access, and objective markers;
- vehicle condition and designated incidents;
- all six case identities, categories, custody, seals, carrier/location, recovery locks, and history;
- both repair states, progress, interruptions, and mechanic state;
- every obstruction and fallback fact;
- branch beacon/parcel and Museum-pending state;
- bike identity, rider, Stability, loss/dismount, and stowed weapon ownership;
- enemies, roles, combat states, surrender/restraint, and resolved encounters;
- Luo phase, Stability, Health, Defense, baton, disarm, Combo Breaker, and restraint state;
- hero identity, loadout, position, Health/Defense/Attack, lives/continues, combat state, cheats, assistance, and ownership;
- every provision, tool, fragment, consumption, integrity, carrier, and recovery node;
- environmental-object state and collateral facts;
- score components, active time, caps, achievement progress, Highlights, and anti-farm counters;
- network authority, peers, acknowledged inputs, rollback/recovery, reconnect, and host-recovery facts.

### 23.3 Restore invariants

Restore cannot:

- reseal, secure, relock, or improve a case;
- improve vehicle, repair, route, mechanic, bike, boss, branch, score, or resource condition;
- erase an interruption, collision, collateral event, rank cap, time, or anti-farm fact;
- respawn consumed provisions, removed tools, fragments, enemies, Credits, or rewards;
- reroll recovery nodes, encounter composition, warnings, or Highlights;
- repeat repairs, branches, recovery, achievements, or Museum grants;
- convert bike loss or failed mounted performance into success;
- change hero or item ownership for advantage.

Validated technical recovery follows shared competitive policy. Ordinary continues remain recorded.

## 24. Delivery-to-Archive Result Ledger

### 24.1 Result sections

1. **Mission Record:** difficulty, configuration, heroes, loadouts, ruleset, continues, assistance, cheats, network mode, version.
2. **Delivery Report:** vehicle, every case category/custody/seal/history, both repairs, route incidents, fallback use.
3. **Protective Duty:** mechanic, clinic/civilian safety, collateral, surrender/restraint, Luo phases.
4. **Performance Evaluation:** grade components, points, rank, caps, branches, achievements, Credits, unlocks, co-op attribution.
5. **Highlights and Archive:** up to three cards, localized reasons, pin/export/reconstruct, compatible personal-best comparison.

The compact result transaction commits before Highlight reconstruction. Reconstruction cancellation or failure cannot lose result, reward, or Archive data.

### 24.2 Replay retention

Shared tiered retention preserves full capsules for:

- personal best in each comparable Curated category;
- five latest Curated runs per profile;
- manually pinned replays;
- runs containing Museum-pinned Highlights.

Older unprotected records retain facts and localized explanations as clearly labelled text-only entries. Incompatible versions retain facts, pinned images, reasons, and Legacy label while disabling inaccurate simulation.

### 24.3 Museum case

The Museum contains:

- regional mobile-clinic overview;
- route map and vehicle artwork;
- non-actionable six-case cargo explanation;
- optional beacon lens and clinic-route token;
- Luo Jian independent-gang case summary;
- opening and ending scenes;
- approved music and artwork;
- Sheng Guo Chronicle commentary.

Locked optional exhibits show localized discovery clues. The Museum includes no patient names, personal medical records, or actionable pharmaceutical instruction. Cheat-Assisted base access remains visibly unranked/unrewarded.

## 25. Guide, Academy, accessibility, and cheats

### 25.1 Guide card

**Medical Escort Operations / 医疗护送行动 / Medizinischer Geleitschutz** appears on first mission access and remains searchable during pause. It covers:

- four ledgers and every state;
- objective warnings and threat limits;
- normal/fallback clearance;
- repair, recovery, and cargo ownership;
- mounted and on-foot rules;
- grade, caps, branches, achievements, rewards;
- Automatic Highlight criteria;
- current keyboard/gamepad bindings.

It requires no video, audio, pointer input, or Academy completion.

### 25.2 Academy drill

Installing the mission adds **Medicine Road Convoy Drill / 送药护送训练 / Übung für die Medizinroute**.

Lessons:

1. normal and fixed-fallback barrier clearance;
2. Snatcher interruption and practice-case recovery;
3. mechanic protection during repair;
4. ride, brake, mounted strike, safe Stability loss, on-foot finish;
5. co-op repair/defense split and partner rescue.

Practice cargo cannot be lost. The drill grants no Credits, mission rank, exclusive power, or mission-access gate. Standard Academy recording may store learned combos without changing mission eligibility.

### 25.3 Accessibility

Cargo category and condition use redundant shape/icon, pattern/text, audio/caption, screen-reader announcement, target line/silhouette, and optional vibration. No state relies on colour alone.

Repair, recovery, restraint, and branches support hold, toggle, and reduced-input forms. Riding supports steering sensitivity, camera centring, and route guidance. No objective requires pointer precision.

Independent reductions cover dust, reflection, shake, motion, particles, engine variation, debris, flash, and background activity. Non-simulation accessibility preserves eligibility. Assistance that changes timing, steering, pressure, commitment, or damage uses Assisted records and remains distinct from cheats.

### 25.4 Cheat interpretation

No case-specific code is added.

- Applicable hero codes retain shared declared scope.
- `QUIETCROWD`: lowers ordinary commitment/density; preserves advanced roles, boss, objectives, and selected-difficulty mechanics.
- `FULLPANTRY`: adds eligible ordinary provisions only; cannot create Lunchboxes, tools, cargo, branch parcel, or objective resources.
- `TRUSTYTOOLS`: prevents applicable carried Tire Iron/Baton integrity loss only.
- `STEADYRIDE`: preserves player-bike Stability while retaining controls, reactions, obstacles, route, and authored dismounts.
- `HOMECOMING`: returns to latest exact valid Convoy Snapshot or mission start.
- `SAFEPASSAGE`: displays **Not Applicable in This Mission** because essential delivery cannot suffer completion-blocking permanent loss and the code cannot preserve grading condition.

Any active code marks the whole run Cheat-Assisted. Such clears retain mission completion, Chronicle, base Museum, encountered enemy records, and content-access gates, but grant no competitive score, rank, Credits, Mastery, performance achievement, emblem, colourway, title, or comparable record.

## 26. Network and authority requirements

### 26.1 Host authority

The local-Wi-Fi host owns:

- route and encounter activation;
- clinic-vehicle movement and condition;
- every case identity, custody, seal, carrier, location, and recovery lock;
- repairs, interruptions, completion, and mechanic state;
- clearance and branches;
- enemy AI, motorbike Stability, and objective-threat channels;
- Luo phases, restraint, and capture;
- score, caps, achievements, Highlights metadata, checkpoints, rewards, and result transaction.

Peers submit frame-stamped abstract inputs. Prediction may animate intent but cannot commit pickup, displacement, recovery, repair, route, branch, boss, reward, or achievement transitions.

### 26.2 Conflict resolution

Simultaneous interactions resolve through authoritative input frame and stable player identity. At any frame one case has at most one carrier, one repair has one committed completion, one enemy has one authoritative restraint owner, and one reward transaction has one stable transaction ID.

Rollback cannot replay the same SFX, warning, reward, Highlight fact, or objective consequence.

### 26.3 Recovery and compatibility

Reconnect and host recovery restore the latest validated authoritative state without improvement. Network delay cannot lengthen or shorten authoritative warning, hazard, channel, or encounter schedules. Client presentation may buffer warnings only within shared policy. Package/version mismatch blocks readiness with localized repair guidance rather than divergent simulation.

Automatic Highlight collection creates no network traffic; each device chooses its display setting and reconstructs optional images locally.

## 27. Performance and reduced-effects contract

Target: 60 FPS. Supported minimum presentation: 30 FPS. Simulation timing is identical.

Peak validation includes two heroes, Ultimate's eight-enemy active cap, clinic vehicle and six cases, two player bikes and hostile bikes, repair/objective warnings, breakable objects and temporary projectiles, subtitles/captions/screen-reader events, and Automatic Highlight eligibility.

Reduced effects may lower or disable:

- dust, exhaust, reflections, and wheel spray;
- decorative debris and fragment persistence;
- background traffic, workers, and clinic activity;
- camera shake, speed lines, motion blur, and secondary motion;
- dynamic shadows and secondary lighting;
- redundant engine layers, crowd impacts, and ambience.

It may not change enemy count, AI, hitboxes, lanes, warning duration, objective timing, collision, score, network authority, or deterministic outcome. Cosmetic layers degrade first. Under sustained pressure, optional Highlight collection may stop gracefully without losing results, rewards, pins, or compact run facts.

## 28. Manifest-to-Archive Acceptance Matrix

### 28.1 Configuration coverage

Validate:

- all four solo heroes;
- all six unique co-op pairs;
- same-device and local-Wi-Fi co-op;
- Easy, Medium, Hard, Extreme, Ultimate;
- Standard Loadout, Open Loadout, Assisted, Cheat-Assisted;
- supported browsers at 60 target and 30 presentation;
- reconnect, rollback, and host recovery;
- keyboard, remapped German-layout keyboard, supported gamepads, non-pointer UI, screen reader, captions, reduced effects;
- English, Simplified Chinese, German, overflow, and subtitle safe areas;
- package install, late install, update, uninstall/reinstall, migration, mismatch, and Legacy behavior.

### 28.2 Content coverage

Validate:

- every legal vehicle transition and objective incident;
- all six case categories, custody states, seals, recovery locks, exits, and results;
- both repairs Ready/Interrupted/Completed and all solo/co-op protection paths;
- every obstruction normal/fallback path;
- both branches skipped, entered, abandoned, completed singly, and completed together;
- all eight mandatory encounters and optional encounters;
- every core role and Extreme/Ultimate specialist under concurrency limits;
- Tire Iron, Baton, fragments, provisions, integrity, ownership, drops, stow/restore, cheats, and anti-duplication;
- every mounted route, safe dismount, bike loss, co-op split, on-foot fallback, and regroup;
- every Luo phase, legal disarm/threshold path, minimum phase cycle, co-op rescue, Combo Breaker, restraint, and capture;
- all checkpoints and restore invariants;
- all grade facts, caps, achievements, one-time rewards, rank improvements, bounded replay Credits, and Cheat restrictions;
- all six Highlight families, toggle, 24-candidate bound, reconstruction, pin, export, storage, backup, performance failure, and no-reward behavior;
- Guide, Academy, accessibility, audio, subtitle, still fallback, Museum, Chronicle, and results.

### 28.3 Required negative proof

Prove the mission cannot produce:

- permanent cargo loss, destruction, opening, consumption, sale, or unreachable placement;
- off-screen, cosmetic, ordinary-collision, or network-correction ledger damage;
- duplicate case, two carriers, repeated displacement/recovery, or seal improvement;
- repair reset/repetition, route softlock, missing-tool softlock, or branch trap;
- hero abandonment after bike loss or co-op separation softlock;
- lethal crash, lethal viaduct fall, civilian death, patient/clinic-staff injury, or protected mechanic death;
- unavoidable simultaneous objective actions or off-screen Snatcher completion;
- checkpoint improvement, reroll, respawn, duplicated reward, or erased incident/time/cap;
- score, resource, achievement, Museum, reward, or Highlight farming;
- mandatory co-op, optional branch, specific hero, purchase, or move;
- Tomas/sponsor/procurement/evidence contamination;
- firearm, grenade, military gear, explosive vehicle, or civilian collision weapon;
- simulation difference caused by language, input device, frame presentation, effect setting, audio setting, or Highlight capture.

### 28.4 Release gate

Release requires:

- zero unresolved Critical or High-severity defects;
- reproducible validation evidence for all matrix classes;
- deterministic hash/outcome equivalence with Highlights On and Off;
- complete localization/accessibility audit;
- commercial-rights/provenance record for approved generated media;
- documented final tuning version and replay compatibility status.

## 29. Production appendices and data gates

### A. Exact combat and interaction data

Production must author and validate:

- startup, active, recovery, cancel, invulnerability, armour if any, hit/block/Exact-Block outcomes;
- damage, Resolve, guard, Stability, stun, launch, bounce, wall, knockdown, ground, combo, scaling, and anti-infinite data;
- every enemy, tool, environmental fragment, motorbike, and Luo route;
- Snatcher/Blocker/repair/clearance/branch channel frames and warning durations;
- hold/toggle/reduced-input equivalence and Assisted variants;
- co-op rescue timing and network rollback boundaries.

These values may tune balance but cannot violate approved roles, state transitions, warnings, caps, or fallback guarantees.

### B. Final environment and asset register

Production must supply:

- final corridor map geometry and every secure anchor;
- objective, recovery, checkpoint, spawn, camera, co-op tether, and fallback nodes;
- hero-compatible bike, clinic vehicle, six stable case identities, mechanic, Luo, enemy roles, tools, provisions, branch artifacts;
- final model sheets, sprites, animation lists, collision volumes, VFX, UI icons, patterns, captions, and screen-reader labels;
- text-free start/end frames, any Flow clips, still fallbacks, and continuity references;
- asset source, prompt/history, creator, license, review, provenance, localization, accessibility, and optimization status.

No final artwork may embed localized words, logos, signatures, or watermarks unless explicitly approved as UI rather than art.

### C. Encounter and economy balancing

Production must validate:

- final active/reserve counts and attack-token budgets;
- solo/co-op pressure and objective concurrency;
- every hero and pair completing all mandatory and optional content;
- first-clear/replay durations;
- provision placements and total recovery value;
- boss Health/Defense/Stability and phase timing;
- score curves, B/A/S thresholds, caps, active-time targets, branch compensation;
- Credit amounts, first-clear/rank-improvement transactions, replay bounds, and anti-farming;
- Easy through Ultimate behavior without excessive Health inflation;
- 60/30 performance budgets.

### D. Final localization and media

Production must author:

- briefing, anchor, branch, Luo, delivery, results, Guide, Academy, Museum, Chronicle, achievement, reward, warning, and accessibility text in EN/ZH-CN/DE;
- subtitle timing, safe areas, line breaks, glossary, and language-independent icons;
- voice casting only if a separately approved voice strategy exists;
- final music masters, adaptive stems, SFX, captions, loudness, ducking, and mixer groups;
- commercial-use clearance and provenance for generated candidates.

### E. Deferred numerical and commercial values

The following remain deferred without reopening the feature model:

- exact frame and balance values;
- final Credit amounts and commercial package pricing;
- precise storage/performance thresholds within shared platform policy;
- final dialogue wording, shot count, and optional voiced delivery;
- final media masters and asset counts;
- post-launch additional Curated Missions.

## 30. Traceability summary

The approved design depends on:

- permanent Combat Constitution and input abstraction;
- shared Curated Mission availability, fairness, grading, replay, reward, and package rules;
- shared Automatic Highlight system and Curated-Only Validation Gate;
- shared cheats and Cheat-Assisted restrictions;
- Stage 4 Tire Iron, Folding Road Baton, and bounded mount continuity;
- Stage 5 completion gate and campaign chronology;
- authoritative `story_line.md` Medicine Road record;
- `Features_Decisions.md` confirmed feature bullets.

If a future document conflicts, the newest explicitly approved controlling specification governs mission implementation, while `story_line.md` remains authoritative for campaign continuity.

## 31. Specification acceptance conditions

The specification is ready for user approval when a fresh builder reviewer can plan the mission without a material product, narrative, system, or acceptance guess. Minor exact tuning and final production-media choices may remain deferred under Section 29.

No implementation plan or product code is authorized by approval of this document alone.

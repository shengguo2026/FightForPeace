# Fight for Peace — Stage 6: The Price of Leverage Specification

**Version:** 1.0 approved  
**Date:** 2026-11-02  
**Stage:** 6 of 8  
**Status:** Approved on 2026-11-02; fresh builder review passed; implementation planning has not begun  
**Implementation planning:** Not started; remains a separate future activity  

## 1. Intent and interpretation

This document is the controlling product, content, narrative, gameplay, presentation, persistence, accessibility, and validation specification for Stage 6 of *Fight for Peace*.

The authoritative localized title is:

| Language | Title |
|---|---|
| English | **The Price of Leverage** |
| Simplified Chinese | **筹码的代价** |
| German | **Der Preis des Druckmittels** |

This specification consolidates approved decisions from `story_line.md` and `Features_Decisions.md`. If later production data conflicts with an approved feature boundary, the boundary wins unless the conflict is explicitly refined and approved. Exact frame data, numerical balance values, final geometry, final artwork, final animation, and final audio assets remain production work.

The permanent combat engine is unchanged. Stage 6 introduces content and data profiles, not a replacement combat system.

## 2. Goals, non-goals, and anti-goals

### 2.1 Goals

Stage 6 must:

- Show the village's humane technological and infrastructural development.
- Make people—not machinery—the explicit protection priority.
- Give the bridge, microgrid, logistics network, utility robots, electric vehicles, firearms, and motorbikes distinct readable roles.
- Reveal that Tomas was used as a disposable instrument by a larger organization.
- Preserve Tomas as vengeful and calculating rather than prematurely repentant.
- Deliver a complete local victory through infrastructure protection and live capture of the Procurement Recovery Marshal.
- Provide a substantial late-campaign stage with manageable replay duration.
- Support solo, same-device co-op, and local-Wi-Fi co-op without requiring duplicate heroes or co-op-only progression.
- Preserve the established standing, aerial, ground, block, counter, Combo Breaker, weapon, mount, co-op combo, and anti-infinite systems.
- Keep every objective, warning, result, and story fact accessible in English, Simplified Chinese, and German.

### 2.2 Non-goals

Stage 6 does not:

- Reveal the Meridian Compact's formal identity or steering circle.
- Make Tomas a playable fighter, boss, ally, or repentant witness.
- Make the Procurement Recovery Marshal a Compact leader.
- Add a selectable robot hero or the reusable Stage 7 robot-summon system.
- Add permanent firearms, grenades, heavy weapons, vehicles, or pre-stage weapon loadouts.
- Add a new combat engine, racing engine, cover shooter, hacking minigame, or vehicle-combat subsystem.
- Require co-op, optional branches, purchased content, a specific hero, or a particular costume.
- Add Automatic Highlight detection or screenshots to Story Mode.
- Change Stages 1–5 retroactively.

### 2.3 Anti-goals

The stage must never produce:

- Civilian death or completion-blocking evidence loss.
- Bridge collapse or permanent loss of critical village services.
- Player-blamed Tomas escape.
- Ordinary combat accidentally changing an infrastructure ledger.
- Infinite firearm ammunition, environmental loops, or crowd stun locks.
- Off-screen unreadable gunfire or overlapping impossible objective warnings.
- A bike-loss softlock or required mounted completion.
- A robot that independently wins combat or completes an objective.
- Heavy-machine-gun access during the boss.
- Marshal death, escape, missing live capture, skipped phase, or hidden life bar.
- Optional content gating S rank, canon, Stage 7, or mandatory Museum records.
- Cheat-Assisted competitive, economy, achievement, or prestige rewards.
- Generated readable document text embedded inside imagery.

## 3. Canonical position and story purpose

Stage 6 occurs **38 months after Stage 2** and approximately eighteen months after Stage 4. It follows Stage 5's present-day historical reckoning and the Curated Mission *The Medicine Road*.

The four village heroes return. Kael remains independently occupied with the Wayfarer Watch. Early robot assistance is supervised support only.

Tomas believes the modern bridge, logistics district, solar service area, robot-maintenance facility, and transformed village perimeter form the decisive target for his renewed operation. The organization behind his procurement network has a different purpose: observe the village's defenses, recover surveillance equipment, withdraw support, seize Tomas's assets, and abandon his remaining personnel.

The heroes preserve the district, capture the Procurement Recovery Marshal alive, and recover enough authenticated material to prove that a larger organization financed and discarded Tomas. Tomas escapes with a different part of the abandonment order and keeps it as leverage. Stage 7 remains responsible for identifying the Compact and its leaders.

## 4. Inherited permanent boundaries

Stage 6 inherits without modification:

- Browser-first architecture and deterministic simulation.
- Keyboard and supported gamepad input, including remapping and German physical-key handling.
- Unique-hero selection with no duplicate heroes.
- Standing, aerial, and ground combat.
- Defense Bar, normal block, Exact Block, counter, and Defense-consuming Combo Breaker.
- Attack Bar, Special and Ultimate loadouts, fixed/purchased slot rules, and anti-infinite budgets.
- `J` pickup, carry, handoff, consume, drop, and weapon-throw behavior.
- Weapon durability/ammunition ownership and deterministic persistence.
- Safe mount Stability and forced-dismount rules.
- Live-capture narrative policy.
- Story, Chapter Challenge, Museum, Chronicle, Guide, Academy, Store, profile backup/import, and Run Archive contracts.
- Story progression access for Cheat-Assisted players with competitive/economy/prestige exclusions.

## 5. Route, runtime, and encounter budget

### 5.1 Runtime targets

- First clear with normal exploration and unskipped story: **48–55 minutes**.
- Scene-skipping replay: **32–40 minutes**.
- Both optional branches: approximately **6–8 additional minutes** total.

### 5.2 Encounter budget

The stage contains nine mandatory encounters plus the boss:

- Three short transition encounters.
- Four standard formation encounters.
- Two major infrastructure-defense set pieces.
- One three-phase Procurement Recovery Marshal battle.
- Two optional branch encounters outside the mandatory count.
- One bounded motorbike pursuit lasting approximately two to three minutes.
- One supervised robot-support sequence embedded in an existing encounter.

Difficulty changes composition, coordination, pressure, and specialists—not mandatory wave count.

### 5.3 Six-Link Infrastructure Defense Route

1. **Renewal District Briefing**
2. **Modern Transport Bridge**
3. **Solar Service Yard**
4. **Charging and Logistics Concourse**
5. **Robot Maintenance Bay**
6. **Recovery Terminal and Village Perimeter**

The route is continuously streamed. Twenty-to-forty-second traversal spaces support dialogue, provisions, equipment management, visual storytelling, checkpoint capture, and breathing room. Conventional inter-zone loading screens, hub returns, and required backtracking are forbidden.

Optional branches are signposted before their exit boundary, reconnect forward, and require confirmation before being left behind. Heroes remain together on one connected map. Safe regroup gates wait for both co-op players.

## 6. Opening and briefing

### 6.1 Morning of Renewal

A short skippable opening establishes ordinary life:

- Civilian traffic uses the completed modern bridge.
- Electric utility vehicles enter the logistics district.
- Solar-service teams begin work.
- Civilian utility robots assist workers.
- Villagers wear more modern clothing and early protective materials.

Three warnings interrupt the routine:

1. Unauthorized utility vehicles approach the bridge.
2. False maintenance credentials appear near the solar-service network.
3. Tomas's expected transport support disappears from regional tracking.

The third warning is presented only as an unexplained anomaly. It cannot reveal the Compact or Tomas's abandonment.

### 6.2 Sheng Guo briefing priorities

Sheng Guo orders the heroes to:

1. Protect civilians and workers.
2. Keep essential infrastructure operational.
3. Capture attackers whenever possible.
4. Never abandon people or critical systems merely to pursue retreating enemies.

The briefing includes unique-hero selection, the standard loadout flow, spoiler-safe branch indicators, accessibility controls, and an infrastructure map. Solo and co-op receive identical required facts. Control begins with a short interactive walk through the Renewal District before the bridge call.

## 7. Objective hierarchy and infrastructure ledger

### 7.1 Canonical mandatory objectives

Players must:

- Clear evacuation routes.
- Prevent permanent removal of essential surveillance records.
- Reach every critical zone.
- Defeat and capture the Procurement Recovery Marshal.

Mandatory objectives cannot be lost off-screen. An unrecoverable mandatory failure restores the latest checkpoint. Tomas's escape is fixed canon and never attributed to player failure.

### 7.2 Graded assets

The stage independently tracks:

1. Transport Bridge
2. Solar Microgrid
3. Charging and Logistics Network
4. Robot Maintenance Facility
5. Recovery Terminal

Each ends in one condition:

- **Protected:** no avoidable major disruption.
- **Functional:** limited damage or interruption; normal service can resume quickly.
- **Emergency Bypass:** local damage requires temporary redundant operation and later repair.

Only a visible, warned, interruptible authored action can downgrade an asset. Ordinary physics, firearms, grenades, throws, environment damage, and incidental contact cannot change the ledger.

### 7.3 Optional preservation results

- **Microgrid Stabilized** or **Emergency Isolation Used**.
- **Technicians and Robots Protected** or **Technicians Evacuated with Robot Losses**.

People survive canonically. Missed protection may cause non-graphic injury, delayed evacuation, equipment loss, repair requirements, and grading consequences—never death.

The result screen identifies every asset condition, downgrade cause, and improvement opportunity. Asset conditions affect score, rank, achievements, Museum presentation, and ending detail, never Stage 7 or canonical capture/escape.

## 8. Modern Transport Bridge

### 8.1 Encounter 1 — Open the Crossing

Mercenary Strikers and one Retrieval Shield hold remotely locked lanes. Players clear three safe corridors:

- Pedestrian
- Civilian vehicle
- Emergency service

Civilians move automatically after a corridor is safe. Solo pressure is sequential; co-op permits bounded overlap without separating heroes.

### 8.2 Encounter 2 — Hold the Bridge Controls

Attackers make three warned attempts:

1. Hijack an electric utility vehicle.
2. Overload the lane-control cabinet.
3. Damage the local power relay.

Solo permits one critical action at a time. Co-op permits at most two when both heroes have fair response routes.

- Zero successes: Bridge **Protected**.
- One success: Bridge **Functional**.
- Two or more: Bridge **Emergency Bypass**.

The bridge cannot collapse, become impassable, or kill civilians. Lane dividers, cargo restraints, maintenance crates, vehicle doors, and roadside fixtures remain tactical combat objects without ledger authority.

After the defense, a designated courier escapes beyond the immediate protection perimeter with a stolen access device. The fixed escape causes no grade loss. Civil-protection motorbikes begin the pursuit.

## 9. Bounded motorbike pursuit

The courier always reaches the Solar Service Yard. Performance determines escort outcomes, player-bike survival, and a separate authoritative courier-pressure result.

- Stopped escorts are absent from the Yard.
- Escaped escorts replace part of the Yard opening formation; they do not add a wave.
- Successful courier pressure denies a prepared Yard advantage.
- The courier cannot be defeated during the pursuit.

Each hero receives one assigned bike with independent Stability. A surviving bike is parked at the Yard and returns at the outdoor Logistics Concourse. Zero Stability causes a controlled dismount and permanent-for-run bike loss. No replacement or magical repair occurs.

A complete on-foot service-walkway fallback rejoins the same Yard state. Co-op partners may temporarily use mounted and fallback routes but regroup before the next mandatory encounter. Bike loss never blocks later completion.

The road is evacuated. Obstacles are early-readable; collisions cannot instantly defeat; low Stability uses visual, audio, and controller warnings; mounted pressure is bounded. Assisted steering and reduced camera motion are available.

The pursuit contains three authored **Pressure Gates** at the bridge exit, service-road bend, and Solar Yard approach. Each gate awards at most one shared Pressure event through the first valid action: a legal mounted hit against the courier's guarded position, stopping the designated escort before its screening maneuver completes, or using the on-foot fallback's marked service control to force an evasive route. Repeated hits, co-op duplicates, and delay cannot add events. The authoritative state stores `courier_pressure_count` from zero to three, completed gate IDs, attribution, and `yard_preparation_denied`. Two or three events deny the jammer; zero or one permits it. This state is separate from escort defeats, bike Stability/survival, courier arrival, and pursuit-achievement eligibility and is stored exactly at Solar Departure.

## 10. Solar Service Yard

### 10.1 Mandatory — False Maintenance

The courier joins attackers carrying false credentials. Hostile silhouettes must remain unmistakable beside technicians.

Three warned sabotage actions target:

1. Inverter-control bank
2. Battery-isolation switch
3. Load-routing terminal

- Zero successes: Microgrid **Protected**.
- One success: **Functional**.
- Two or more: **Emergency Bypass**.

Critical services automatically isolate before collapse. Successful pursuit pressure prevents preparation; otherwise the courier deploys a destructible jammer that suppresses only objective markers, never audio, shape, color, environment, or accessibility cues.

The courier is captured. The recovered bridge device reveals a second intrusion at the Logistics Concourse.

### 10.2 Optional — Keep the Current

The branch requires three deterministic steps:

1. Isolate a compromised circuit.
2. Route essential services through a safe inverter group.
3. Confirm balanced load while defeating one interruption team.

Solo serializes; co-op may divide tasks within one connected arena. Multimodal cues never rely on color alone.

Success records **Microgrid Stabilized**. Skip/failure records **Emergency Isolation Used**. Stabilization prevents cascading risk but cannot repair or upgrade the physical ledger. Technicians remain protected. Live batteries, arrays, and electrical equipment cannot become explosive weapons.

## 11. Charging and Logistics Concourse

### 11.1 Mandatory — Break the Hijack

Portable override rigs target:

1. Charging hub
2. Dispatch console
3. Automated cargo lane

A Hijack Technician must remain locally connected inside a marked control area. Players may interrupt the Technician, disable the rig, or force hostile control away.

- Zero completed overrides: Network **Protected**.
- One: **Functional**.
- Two or more: **Emergency Bypass**.

Surviving bikes may be reused in the outdoor forecourt, while equivalent footpaths and shortcuts reach every objective. Bikes park permanently before the loading hall.

Electric utility carts may be repositioned through normal interaction for access, cargo, or cover. They are low-speed, safety-braked, nonlethal, and cannot become ramming weapons.

### 11.2 Mandatory — Secure the Freight Spine

Retrieval Shields protect finite-ammunition Gunners while Strikers contest the dispatch platform. Players break formation protection, deny two firing positions, and preserve marked medical/civil-protection cargo for grading.

Exactly two cargo groups are authoritative: the **Sealed Medical-Supply Pallet** and **Civil-Protection Equipment Cases**. Each begins **Secured** and may become **Damaged** once; Lost, Destroyed, contaminated, and completion-blocking states do not exist. A downgrade requires enemies to establish that group's linked firing position and a finite Gunner to complete a visible, target-labelled **Cargo Breach** aiming channel. Completion spends one finite shot and causes the sole downgrade. Ordinary bullets, grenades, throws, physics, player attacks, carts, and debris cannot alter cargo. Solo permits one Breach channel; co-op may permit both only on separate reachable lanes under warning-spacing rules. Damaged cargo remains sealed for later inspection and affects Tactical Discipline, commentary, and Archive only. Checkpoints store condition, linked position, breach completion/cause, and interruption; an event cannot score or penalize twice.

Cargo straps, empty pallets, movable crates, and cart doors support environmental combat. Charging batteries cannot explode.

A cloned credential issued a Robot Maintenance Bay evacuation command before this fight. The next emergency is not another unavoidable escape and is not player blame.

## 12. Robot Maintenance Bay

### 12.1 Mandatory — Clear the Evacuation Line

The heroes secure:

1. Calibration floor
2. Charging aisle
3. Emergency service gate

Technicians advance automatically after each area is safe. Sustained hostile control after a clear warning forces an emergency reroute.

- Zero reroutes: Facility **Protected**.
- One: **Functional**.
- Two or more: **Emergency Bypass**.

Ordinary presence, stray attacks, and environmental impacts cannot downgrade the Facility.

### 12.2 Optional — Every Helping Hand

Players release and protect short autonomous routes for:

- Inspection crawler
- Compact lifting robot
- Service carrier

Solo serializes releases. Co-op may operate two fairly spaced routes. Robots cannot fight, shield heroes, or be carried.

Saving all three records **Technicians and Robots Protected**. Skip or any loss records **Technicians Evacuated with Robot Losses**. Damage is mechanical and non-graphic.

Full preservation opens a history alcove containing a component from the village's first already-retired service robot. It never comes from a newly damaged unit.

### 12.3 Mandatory — Hold the Service Gate

Shields, Strikers, and a Hijack Technician attack the rear gate while the facility locks down. A rugged support robot is released under technician supervision regardless of optional-branch result. After security, the robot and technicians trace the false command to the Recovery Terminal.

## 13. Supervised support robot

Marked stations use the existing contextual interaction to request three single-use interventions in any order:

1. **Deploy Cover:** temporary barrier against ranged fire; cannot crush or trap.
2. **Restrict a Reinforcement Lane:** visibly redirects and delays one group; never deletes it.
3. **Support the Gate Lock:** delivers emergency power that slows override progress; players must still interrupt it.

Only one intervention is active at once. Technician confirmation and a visible route preview precede movement.

A warned enemy disruption before activation makes the robot safely retract and places the selected intervention on a fixed cooldown without consuming it. That intervention receives one retry after cooldown; a second pre-activation disruption consumes it without effect, preventing indefinite delay or farming. Once cover is deployed, a barricade is positioned, or emergency power is connected, the intervention is consumed even if enemies later destroy, bypass, or interrupt its effect. “Single-use” therefore means one successful activation, subject to at most one failed approach and retry. Checkpoints store the exact `unused`, `approaching`, `disrupted`, `cooldown`, `retry_available`, `active`, or `consumed` state. Repeating a disrupted request awards no additional score. The robot cannot be permanently destroyed, deal damage, affect combos, revive, collect, capture, or complete objectives. Branch outcome does not alter support. Solo activation is quick; co-op shares one authoritative command state. Routes, timing, cooldown, retry availability, and consumption restore deterministically. Difficulty may increase surrounding pressure but cannot weaken or conceal the support.

## 14. Recovery Terminal

### 14.1 Encounter 8 — Break the Extraction Line

At the freight apron, Shields, finite Gunners, and Strikers protect three surveillance-equipment loads. Each load uses `secured_on_apron`, `carried`, `dropped_unsecured`, `secured_in_extraction_vehicle`, and `recovered_after_combat`. A designated carrier must complete a visible pickup channel, follows an authored path, and cannot throw, damage, duplicate, or hand the load to another carrier. Interruption moves it to a fixed nearby drop marker; another eligible carrier may resume while hostiles remain. Players never carry these loads.

A load reaching the vehicle becomes `secured_in_extraction_vehicle`. The vehicle cannot depart, explode, be driven, or move equipment off-screen. When the final hostile falls, it is automatically immobilized and secured; every carried, dropped, or vehicle-secured load becomes `recovered_after_combat` through a short in-engine custody confirmation. No additional interaction, search, wave, or branch exists. `secured_on_apron` earns full interception credit; `recovered_after_combat` preserves canon but records a loading incident and reduces Emergency Response. All three are recovered before interior entry, and the checkpoint stores each complete route history and final state.

Extreme/Ultimate may add a Recovery Specialist.

The one restricted heavy machine gun appears here as an optional formation-breaking tool. Before interior entry, any remaining gun must be placed in a visible secured disposal clamp after explicit confirmation of surrendered ammunition.

### 14.2 Encounter 9 — Preserve the Record

Attackers attempt:

1. Disconnect a defensive-sensor archive module.
2. Export local route telemetry.
3. Sever the authenticated recovery-log connection.

- Zero completions: Terminal **Protected**.
- One: **Functional**.
- Two or more: **Emergency Bypass**.

Immutable backups preserve mandatory evidence and progression. Completed hostile operations affect local equipment, redundant copies, grading, and repairs only.

Ultimate may include one Systems Breacher under the shared channel restrictions. After the formation falls, the Marshal seals the perimeter and enters alone. No ordinary reinforcements join the boss.

## 15. Enemy roster and difficulty progression

### 15.1 Mercenary Striker

Mobile close-range pressure with disciplined punches, low kicks, short throws, punishable lunges, and one eligible Defense-consuming Combo Breaker.

### 15.2 Retrieval Shield

Finite non-regenerating Guard protects Gunners and Technicians. Counters include Exact Block, throws, rear attacks, impacts, and co-op flanks. Broken shields are unusable and cannot become permanent armor.

### 15.3 Hijack Technician

Every override requires tagged-device arrival, visible local connection, and warned channel. Remote, through-wall, downed, and off-screen hacking are forbidden. Short tool strikes and evasive shoves provide limited defense.

### 15.4 Finite-Ammunition Gunner

Uses warned revolver or automatic fire, finite ammo, repositioning, and a punishable empty state. Cannot generate ammunition and uses limited close combat when empty.

### 15.5 Extreme/Ultimate — Recovery Specialist

May recover one dropped firearm with only its remaining ammunition and may relocate/restart one disabled portable rig once per encounter. Both require long visible interruptible interaction. Cannot replenish, revive, touch mandatory evidence/civilians, or repeat the restart.

### 15.6 Ultimate — Systems Breacher

May temporarily control one tagged noncritical shutter, barrier, or unused support station through a visible local channel. Success may change cover, redirect a lane, or delay one robot intervention. It cannot damage ledgers, trap heroes, block the sole route, erase support, affect evidence, or alter canon. Defeat releases control.

### 15.7 Difficulty ladder

- Easy separates roles and lengthens warnings.
- Medium is baseline.
- Hard combines complementary core roles.
- Extreme adds authored Recovery Specialists.
- Ultimate retains them and adds selected later Systems Breachers.

Challenge grows through behavior, positioning, objective timing, defense, and punish discipline—not extra waves, hidden cues, infinite ammo, or primary Health inflation.

## 16. Deterministic formation safety

Active-hostile caps:

| Difficulty | Solo | Co-op |
|---|---:|---:|
| Easy | 4 | 6 |
| Medium | 5 | 7 |
| Hard | 6 | 8 |
| Extreme | 6 | 8 |
| Ultimate | 6 | 8 |

Reserve enemies may reposition visibly but cannot attack, fire, channel, or enter attack animation.

Approved patterns are Escort Wedge, Split Pressure, Objective Relay, Retreat Screen, Recovery Team, and Systems Disruption.

Solo permits at most one objective channel, one ranged aim, and one specialist action. Co-op permits at most two on reachable separate lanes. Two ranged enemies cannot create unavoidable crossfire on one hero. Ultimate specialists cannot channel against the same device or begin critical actions simultaneously.

At most two melee enemies pressure one solo hero; at most three may pressure one co-op hero while ignoring the partner. Reinforcements use visible authored entrances, warning, and entry recovery. Spawning behind a hero, inside an active combo, or beside an interaction is forbidden.

Critical warnings remain separated. Objective timers pause for forced presentation/recovery. A bounded extension prevents the later of two co-op channels becoming impossible after a down.

Downed heroes retain wake-up protection. Shields always expose a flank, throw route, impact route, or Guard break. Checkpoint restoration reproduces formation order, equipment, ammunition, and timing.

## 17. Weapons and ammunition

All weapons are temporary stage pickups and cannot be pre-equipped, purchased as permanent weapons, or carried to another stage.

### 17.1 Revolver

- Six visible precise shots.
- Slow anti-loop recovery.
- Directional close grip strike.
- One committed downward aerial shot.
- No reload or ammo pickup.
- Empty weapon may be thrown.

### 17.2 Compact automatic

- One finite magazine.
- Short controlled bursts.
- Recoil and recovery prevent permanent suppression.
- Directional angle/reposition variants do not add ammo.
- No reload; empty weapon may be thrown.
- Enemy versions share the same finite rule.

### 17.3 Fictional concussion grenade

- One carried at most.
- Single use, non-fragmentation.
- Visible landing area and audiovisual/controller warning.
- Knockback, short stun, and Defense damage.
- No gore, permanent injury, friendly fire, civilian harm, evidence damage, or ledger damage.
- Boss control is reduced and retains Combo Breaker protection.

### 17.4 Restricted heavy machine gun

- Appears once outside the Terminal.
- One fixed ammo supply.
- Severe movement reduction.
- Prevents jump, grapple, mount, and item carry.
- Controlled heat-limited bursts.
- Cannot suppress infinitely or affect objectives.
- Cannot enter the boss.

### 17.5 Shared rules

Ammo persists exactly through zones and checkpoints. Random ammo, reloads, and duplication are forbidden. Pickup ownership is explicit; deliberate drops permit co-op transfer. Enemy shots require aim preparation, directional warning, and on-screen or edge cues. Player ammo does not decrease by difficulty. Designs are fictional and use no real brands.

## 18. Vehicles and environmental damage

Utility carts move only on marked low-speed lanes for access, cargo, or cover. Automatic braking prevents harm to people, robots, equipment, and boundaries. Carts cannot ram enemies. A damaged cart becomes stationary cover, never explodes, traps, or blocks the sole route, and cannot be repaired during the run.

Approved two-step breakables include lane dividers, lightweight barriers, empty crates and tool cabinets, pallets, restraint frames, service partitions, removable cart doors, empty cable reels, non-powered robot racks, and already-secured terminal housings.

Most use **Intact → Damaged → Broken**. Approved breakage may create one safe marked throwable such as a barrier post, polymer panel, empty tool-case lid, or short restraint bar. Glass, live battery parts, sharp electrical pieces, and chemicals never become pickups.

Tagged impacts add damage, stun, wall bounce, or knockdown under collision cooldown, diminishing control, elite resistance, and Combo Breaker rules.

Bridge structure, solar arrays, live batteries/charging equipment, active robots, evidence storage, occupied vehicles, and essential terminals are immune to ordinary combat. Only authored objective actions change ledgers.

Avoidable nonessential property damage is separately graded as **Collateral Care**. Required combat, rescue, accessibility, and route damage is exempt. Reduced flash, shake, debris, and effects preserve authoritative simulation.

## 19. Procurement Recovery Marshal boss

The boss uses a three-phase **Field Extraction System** and a visible Resolve and Defense Bar.

### 19.1 Phase 1 — Control the Perimeter

A compact retrieval shield and control baton support standing strings, shield checks, joint-control throws, warned low sweep, committed jumping baton attack, and escapable ground restraint.

The shield has finite non-regenerating Guard. Phase 1 ends only after both the Resolve threshold and shield break, ensuring the counter lesson without indefinite delay.

### 19.2 Phase 2 — Reclaim the Assets

The Marshal abandons the shield for faster baton, throws, aerial interception, and two warned weapon-recovery opportunities. Recovered weapons retain exact ammunition/durability. A warned disarm counter may drop but never delete a player weapon. Interrupted recovery is punishable. One standard concussion grenade is allowed. Heavy-gun and generated replacement access are forbidden.

### 19.3 Phase 3 — Cut the Line

A withdrawal order confirms revoked support. Firearms are discarded. Empty-hand control, baton, low attacks, aerial approaches, grounded recovery, and counter throws form the final kit.

One warned extraction attempt occurs at low Resolve. Interruption creates a major punish. Success only repositions the Marshal and grants a short visible defense; he cannot escape or restore Resolve.

### 19.4 Shared boss fairness

- No hidden armor or silent phase refill.
- Combo Breakers consume visible Defense.
- Anti-infinite protection governs launch, wall, ground, and co-op relaunch.
- Throws target one hero and permit partner interruption.
- No downed-hero camping or unavoidable crossfire.
- Co-op changes target coverage, not phases or weapon supply.
- Higher difficulty adds legal feints and choices, never hidden attacks or extra life bars.
- Terminal condition changes presentation and cover only, never mechanical difficulty.
- Zero Resolve triggers an in-engine, non-QTE live capture.

## 20. Abandonment revelation and evidence split

During the final phase, Tomas monitors from a separate temporary command vehicle and intercepts a recovery packet intended for the Marshal. It proves:

- Withdrawal was authorized before Tomas's decisive phase.
- Tomas's shell accounts, contracts, equipment, and intermediaries are being seized.
- Retrieval forces were ordered to take surveillance material and abandon his personnel after enough defense data was gathered.

Tomas turns against the network but does not repent or aid the village.

### 20.1 Heroes' recovered evidence

- Authenticated recovery-order header
- Procurement-cutout identifiers
- Concealed subsidy records
- Asset-seizure notices
- Extraction instructions

This proves a larger sponsor used and discarded Tomas. A recurring authorization marker points toward a shell consultancy without identifying the Compact or leaders.

### 20.2 Tomas's retained evidence

- Authorization annex
- Deliberate-abandonment timestamp
- Partial internal routing record later attributable to Damon's shell consultancy

This is real leverage but insufficient alone for exposure or prosecution.

### 20.3 Fixed escape

While heroes secure the living Marshal, people, and records, Tomas uses a prearranged off-arena service route in his own vehicle. He takes only his portable copy. The escape is independent of rank, conditions, branches, or delay and is never player blame.

The captured Marshal confirms the order and procurement cutout but knows neither the Compact's name nor steering circle.

## 21. Solo and co-op equivalence

Solo selects one of four village heroes. Co-op selects two different heroes; duplicates are prohibited. Every hero can operate every objective, vehicle, and support station.

Solo serializes critical channels and interaction steps with travel-aware timers. Co-op may divide at most two reachable responsibilities without duplicating rewards. Enemy Health is not simply doubled; co-op challenge uses coverage, coordinated defenses, and simultaneous responsibility.

Friendly fire and partner collision damage are disabled. Co-op attacks, shared launches, aerial follow-ups, and rescues retain the global contribution and anti-infinite rules.

A downed co-op hero may be revived. The later simultaneous channel receives a bounded extension. Progress does not reset merely because one hero falls. Enemies cannot camp a legal revival without a response window.

The map remains connected with soft camera tether, partner indicator, and regroup gates. Bikes, weapons, ammunition, food, and personal resources remain individual. Infrastructure, support, branches, evidence, and score events are shared authoritative state.

Solo and co-op use separately comparable normalized leaderboards. No achievement, Museum entry, canon, unlock, or S rank requires co-op.

## 22. Checkpoints, recovery, and networking

### 22.1 Seven anchors

1. Bridge Response
2. Pursuit Launch
3. Solar Departure
4. Logistics Secured
5. Maintenance Secured
6. Recovery Interior Entry
7. Marshal Confrontation

No boss-phase checkpoint exists. Boss defeat restores exact pre-boss state and restarts Phase 1.

### 22.2 Snapshot payload

Every anchor stores:

- Hero identity, Health, Defense, Attack, status, and down state.
- Loadouts and purchased-move assignments.
- Held/dropped weapons, durability, ammo, ownership, and food.
- Bike Stability and loss.
- Five ledgers and downgrade causes.
- Branches and robot results.
- Utility vehicles, breakables, cargo, and Collateral Care.
- Enemy defeats, formation/specialist permissions, and timers.
- Support interventions and cooldowns.
- Evidence, equipment loads, Marshal state, score, difficulty, player count, and integrity.

Restore never repairs, refills, rerolls, duplicates, reverses branches, or improves conditions.

### 22.3 Integrity paths

- Validated technical recovery preserves eligibility.
- One transactional Suspend Stage record may be created at an anchor and is consumed on resume.
- Defeat or voluntary Continue preserves Story and Stage 7 access but marks Continued and removes competitive/economy/prestige results.
- Restart Stage begins fresh.

### 22.4 Co-op interruption

A disconnected client enters protected nonparticipating standby. Bounded reconnect restores exact ownership/resources. The host may continue solo after confirmation; only future formations/timers recalculate. A second player rejoins only at an anchor. Host migration uses validated authority or suspends at the latest anchor. No path duplicates rewards or restores eligibility.

Original co-op eligibility persists only while protected standby/reconnect remains active, the same validated player returns with exact ownership, and no solo-continuation confirmation has been accepted. Confirming solo continuation marks the run **Party Changed** immediately. Future formation/timer/concurrency switches to solo at the next safe boundary; every committed co-op outcome/resource/score/condition remains. The absent hero and inventory withdraw safely without transfer, duplication, or conversion. Party Changed completion grants canon, Stage 7, difficulty access, mandatory records, and catalogue visibility but no competitive score/rank, Credits, achievements, emblem, title, personal best, or leaderboard entry. A later anchor rejoin restores exact personal state but cannot restore eligibility. Archive records initial pair, disconnect, confirmation, rejoin, time under each player count, and the noncompetitive Party Changed class; it compares with neither solo nor co-op. Validated migration/reconnect before continuation preserves original co-op eligibility, and a paused interruption with no continued play does not invalidate it.

## 23. Score and rank

An eligible run has a 100,000-point core plus up to 5,000 optional points:

| Category | Maximum |
|---|---:|
| Combat Mastery | 35,000 |
| Infrastructure Protection | 30,000 |
| Emergency Response | 15,000 |
| Tactical Discipline | 10,000 |
| Hero and Team Resilience | 10,000 |
| Optional branches | +5,000 |

Each of five assets grants 6,000 Protected, 4,000 Functional, or 2,000 Emergency Bypass.

Combat rewards varied character-specific standing/aerial/ground/freestyle routes, defense, counters, throws, weapon integration, and co-op mastery. Repetition and farming decay to zero.

Response scores warned interruption, corridors, recovery, and prioritization once each. Discipline covers finite tools, cargo, and Collateral Care with required damage exempt. Resilience covers resource judgment, downs, revivals, and shared contribution without score stealing.

Each optional branch grants up to 2,500. Skipping is not penalized and S remains possible without either.

| Rank | Threshold |
|---|---:|
| S | 90,000 |
| A | 78,000 |
| B | 65,000 |
| C | 50,000 |
| D | Below 50,000 |

Clear time is a leaderboard tiebreaker, not a rank requirement. Boards separate difficulty, player count, hero/pair, loadout, and integrity. Cheat-Assisted/Continued runs show diagnostics but submit no competitive result. Each event and mistake is attributed once without double penalty.

## 24. Achievements, rewards, and unlocks

### 24.1 Achievement set

| English | Simplified Chinese | German | Requirement |
|---|---|---|---|
| The Price of Leverage | 筹码的代价 | Der Preis des Druckmittels | Eligible clear |
| Every Lane Open | 全路畅通 | Alle Fahrspuren frei | Three corridors and Protected Bridge |
| Keep the Current | 电流不息 | Der Strom bleibt | Complete microgrid branch |
| Every Helping Hand | 众力皆护 | Jede helfende Hand | Protect all three utility robots |
| Systems in Harmony | 系统协同 | Systeme im Einklang | Complete both branches |
| Renewal Defended | 守护新生 | Erneuerung verteidigt | All five assets Protected |
| Close Pursuit | 紧追不舍 | Dicht auf den Fersen | Stop all escorts and preserve every assigned bike |
| Leverage Reversed | 反制筹码 | Das Druckmittel gewendet | Interrupt final extraction and capture after Exact Block/Counter |

No achievement requires co-op.

**Leverage Reversed** uses one deterministic Reversal Chain. The Marshal signals the final extraction and performs a designated setup attack. Either an Exact Block or a legal Counter—both are not required—arms the chain. Before the Marshal returns to neutral or within four seconds, whichever occurs first, the team must legally interrupt the extraction channel. Live capture must then occur in the same eligible boss attempt, but may follow further normal combat. In co-op, one hero may arm and the partner interrupt; both are attributed and receive shared eligible credit. A plain interruption without the designated defense does not qualify. Expiry requires a new setup defense. Marshal Confrontation restore clears the chain. Cheat-Assisted, Continued, and Party Changed runs retain diagnostic facts without awarding it.

### 24.2 Access

Any canonical clear, including Cheat-Assisted or Continued for access, unlocks:

- Stage 7
- Curated Mission 3, *The Vanishing Survey*
- Stage 6 Chapter Challenge
- Mandatory Chronicle/Museum records
- Normal difficulty progression: Hard→Extreme and Extreme→Ultimate

### 24.3 Eligible rewards

First eligible clear grants balance-defined Credits and Store visibility for:

- Infrastructure Emergency-Response Outfit
- Village Renewal Festival Attire

The families apply to every playable hero unlocked through Stage 6, including Mission-mode heroes. The four current village heroes receive their canonical Stage 6 default evolution free.

First eligible A grants a text-free bridge-and-sun emblem. First eligible S grants **Guardian of the Renewal / 新生守护者 / Hüter der Erneuerung**. Higher-difficulty marks are cosmetic only.

Cheat-Assisted and Continued clears retain access, catalogue, and mandatory records but grant no Credits, achievements, ranks, emblem, title, or leaderboard entry.

## 25. Provisions, containers, and costumes

### 25.1 Recovery localization

| Function | English | Simplified Chinese | German |
|---|---|---|---|
| Health | Greenhouse Vegetable Wrap | 温室蔬菜卷 | Gewächshaus-Gemüsewrap |
| Defense | Aquaponic Fish Broth | 鱼菜共生鲜鱼汤 | Aquaponik-Fischbrühe |
| Attack | Fruit-Energy Gel | 水果能量胶 | Frucht-Energiegel |
| All, moderate | Balanced Village Meal | 村庄均衡餐 | Ausgewogene Dorfmahlzeit |

Localized descriptions and full/partial restoration feedback follow the approved copy in `story_line.md`.

The herb, formula, and experimental medicine never become consumable power-ups.

### 25.2 Deterministic placement

- Bridge: one Wrap.
- Solar: one Broth plus one **Fruit-Energy Gel** after successful completion of Keep the Current; skip/failure creates no substitute.
- Logistics: one Gel plus one post-hall **Greenhouse Vegetable Wrap** on every difficulty.
- Maintenance: one Wrap and one Broth.
- Terminal approach: one Gel.
- Pre-boss: one Balanced Village Meal.

The mandatory baseline is three Wraps, two Broths, two Gels, and one Balanced Meal; successful Solar branching adds a third Gel. Solo receives one authored item per slot. Co-op receives two smaller portions of the same type with equivalent combined value, with exact portion ownership/consumption persisted. Difficulty may tune recovery values/accessibility but never item identity or randomize contents. The branch Gel is excluded from `FULLPANTRY`; the ordinary post-hall Wrap follows normal eligible-container behavior. `J` interactions and exact consumption persist.

Food, weapons, evidence, and Museum objects use distinct containers/silhouettes. Categories never randomize. Weapons never respawn or reroll.

### 25.3 Costume rules

The four village heroes receive free modern protective defaults. Purchasable **Infrastructure Emergency-Response Outfit** and **Village Renewal Festival Attire** are character-specific, visual-only, distinct rather than palette swaps, permanently available after reveal, and usable wherever costume selection is permitted. Canonical first play retains story defaults.

## 26. Museum and Chronicle

Canonical clear unlocks galleries for village renewal, bridge, microgrid, logistics, robots, characters, boss, weapons, vehicles, environment, costumes, food, art, music, SFX, ambience, cinematics, briefings, and endings.

The **Abandoned Instrument** exhibit uses controlled localized UI for:

- Recovery-order header
- Cutout identifiers
- Subsidy trail
- Asset-seizure notices
- Extraction instructions
- Marshal testimony

Source classification:

- **Confirmed:** pre-authorized withdrawal, asset seizure, surveillance recovery.
- **Corroborated:** a larger organization financed and used Tomas.
- **Unresolved:** sponsor identity, consultancy ownership, leadership, complete routing, and Tomas's annex contents.

The Chronicle may state that the player witnessed Tomas take a fragment while explicitly noting the patrol cannot authenticate it.

Optional upgrades:

- **Power in Balance:** non-instructional illustrated microgrid flow.
- Retired service-robot component, history art, and technician commentary.
- **Renewal through Cooperation:** combined people/infrastructure/utility exhibit.

Replay recovers missed optional content. No exhibit names the Compact or leaders before Stage 7, inflates the Marshal, reveals Tomas's annex, or hides mandatory clues in optional content.

## 27. Academy and Guide

### 27.1 Pre-stage spoiler-safe lessons

1. Priorities under Pressure
2. Ride, Dismount, Regroup
3. Finite Arms Discipline
4. Break the Retrieval Formation

### 27.2 Post-clear lessons

5. Direct the Helper
6. Capture the Extraction Marshal

Lessons use demonstration, guided practice, independent test, and Free Practice. Deterministic training actors replace story people/evidence. Solo may use a configurable partner; co-op is optional. Training reset never transfers to scored play. My Combos may record legal weapon, aerial, ground, counter, and handoff routes.

Lessons grant no power, access, Credits, or rank. EN/zh-Hans/DE text, narration, captions, transcripts, remapped German physical-key diagrams, and active gamepad diagrams are required.

The Guide provides text-based reference for objective levels, ledgers, warnings, mounts, finite ammo, robot support, score, achievements, cheats, and accessibility without replacing Academy practice.

## 28. Cheat interpretation

Stage 6 adds no code.

- `SOFTERBLOWS`/`SAFEHEART`: ordinary hero Health only.
- `STEADYFEET`: eligible on-foot knockdowns only.
- `IRONGUARD`: hero Defense only.
- `BRIGHTSPIRIT`: legal Attack Bar only.
- `STRONGHANDS`: eligible Health/Resolve damage, not Guard, vehicles, objectives, ledgers, or environment.
- `TRUSTYTOOLS`: eligible melee durability only; never firearm/grenade/heavy-gun resources or debris.
- `STEADYRIDE`: player-bike Stability only while preserving controls, reactions, obstacles, bounds, and authored transitions.
- `QUIETCROWD`: lowers ordinary commitment but retains selected Specialists, operators, boss kit, and discoveries.
- `FULLPANTRY`: ordinary deterministic recovery only; excludes balanced meal, branch provision, weapons, evidence, and Museum items.
- `HOMECOMING`: exact latest anchor without improvement.
- `SAFEPASSAGE`: **Not Applicable in This Stage**; it cannot preserve graded assets, optional robots, cargo, bikes, or collateral.

Any code marks the run Cheat-Assisted. Access/canon/catalogue/discovery remains; competitive/economy/performance/prestige rewards do not. Localized cards support every input, and co-op requires mutual consent.

## 29. Presentation, localization, and accessibility

### 29.1 Media sequence

- **Morning of Renewal:** 24–32-second silent Flow montage.
- In-engine civil-protection briefing with portraits and controlled localized map/UI.
- **The Line Is Cut:** one or two small-motion Tomas-alone clips plus localized evidence inserts and in-engine Marshal notice.
- **Leverage Retained:** in-engine/illustrated condition-aware ending.

### 29.2 Flow rules

- Approved start and end frames.
- One camera axis and small existing-frame motion.
- Explicit position, gaze, hand, and prop ownership.
- No generated speech, readable screens, subtitles, logos, signatures, or watermarks.
- Complex movement, crowds, handovers, and changes remain in-engine/editing.
- Simplify after two failed attempts.
- Every clip has a still fallback.

### 29.3 Language and access

English defaults with complete Simplified Chinese and German support for subtitles, speaker labels, speech/narration, briefings, evidence, warnings, results, transcripts, Museum replay, SFX captions, and directional descriptions.

Optional Windows narration is a separate track and never replaces subtitles. Subtitle size/background, speaker color-plus-shape, narration/music/SFX/ambience volume, reduced motion/flash/shake/particles/video, screen reader, keyboard/gamepad focus, hold/toggle, and non-color cues are supported.

Every sequence is independently skippable with localized recap. Presentation and readiness time never affects scoring.

## 30. Audio suite

The **A Village Tested Again** family includes:

1. Renewal in Motion
2. Across the New Bridge
3. Current under Strain
4. Freight Lines
5. Hands of Tomorrow
6. The Recovery Order
7. No One's Partner
8. Leverage Retained

Authored exploration, combat, objective, critical, and victory stems transition on beat. Boss phases transition without full restart. Optional branches receive confirmation stings rather than exclusive tracks.

Music ducks under objective alarms, firearm cues, Stability warnings, robot confirmation, extraction warning, speech, and narration. Music is never the sole cue.

Zone ambience covers district activity, bridge wind/traffic, safe energy systems, logistics machinery, maintenance servos, and terminal equipment without masking direction. Fictional weapon, empty, shield, channel, override, robot, and bike sounds are distinct and captioned.

Generated audio is candidate material only and requires human editing, loop preparation, provenance, and commercial-use verification under creation-date terms. Final audio contains no generated lyrics or language-dependent vocals.

## 31. Automatic Highlight boundary

Automatic Highlight detection and screenshot capture remain exclusive to Curated DLC Missions as a pilot.

Stage 6 and all eight Story stages have:

- No Highlight toggle.
- No detector.
- No automatic capture.
- No reserved performance/memory budget.

Manual platform screenshots remain available. Lightweight authored replay bookmarks may mark Protected Bridge, robot preservation, or Marshal capture but contain no automatic screenshot or localized highlight judgment.

## 32. Chapter Challenge, Run Archive, and replay

Any canonical Story clear unlocks Stage 6 Chapter Challenge. Fresh attempts select unlocked difficulty, solo/co-op, unique hero/pair, Standard/Open Loadout, costume, and declared assist/cheat state. No Story state carries over.

The full route, nine encounters, branches, specialists, boss, and ledgers remain. Briefing may shorten; seen scenes default skippable. Canon remains fixed and Automatic Highlights remain absent.

Competitive Run Archive stores complete configuration, score, ledger, branch, robot, cargo, bike, weapon, ammo, provision, collateral, specialist, boss, checkpoint, recovery, network, integrity, version, and validation data. Noncompetitive attempts use separately labelled activity history.

Personal-best comparison requires compatible mode/version, difficulty, player configuration, hero/pair, loadout, and integrity. Incompatible history remains **Legacy** and is never recalculated.

Compact replay capsules store inputs, bookmarks, state transitions, authority, and hashes—not video. Compatible versions replay deterministically; incompatible versions show a localized timeline and stored results. Replays grant nothing and cannot become checkpoints. Profile export/import preserves records, capsules, labels, and integrity.

## 33. Release acceptance matrix

### 33.1 Required coverage

- Four solo heroes and six unique co-op pairs.
- Five difficulties.
- Standard, Open, Assisted, Cheat-Assisted, and Continued.
- Keyboard/remapping/German physical placement and supported gamepads.
- Same-device and local-Wi-Fi co-op.
- Supported browsers at 60-FPS target and stable 30-FPS minimum without simulation drift.
- Six zones, nine encounters, two branches, pursuit, support, all boss phases.
- Every core enemy and specialist.
- Every reachable five-ledger result and warned-action boundary.
- Every bike/fallback, robot, weapon/ammo/grenade/heavy-gun/transfer/disarm/disposal state.
- Every provision, container, environment, vehicle, cargo, and collateral transition.
- Evidence split, fixed escape, custody, and Stage 7 transition.
- All seven checkpoints and every recovery/network/replay/save/import/version path.
- Every score/rank/reward/achievement/Store/Museum/Chronicle/Archive path.
- Complete EN/zh-Hans/DE and accessibility/media/audio coverage.

### 33.2 Required negative proof

Validation must prove impossible:

- Civilian death or mandatory evidence loss.
- Bridge collapse or critical-service permanent loss.
- Incidental ledger downgrade.
- Impossible warning overlap.
- Off-screen or infinite firearm attacks.
- Infinite combat/environment/co-op loops.
- Missing, duplicated, or permanently stolen equipment.
- Bike softlock or required mounted completion.
- Robot objective completion or premature Stage 7 summon.
- Heavy gun during boss.
- Marshal death, escape, phase skip, or missing custody.
- Player-blamed Tomas escape or premature leader disclosure.
- Optional/co-op gates on S, canon, progression, or mandatory records.
- Cheat rewards.
- Story Automatic Highlights.
- Save/replay/import/migration duplication.
- Accessibility/presentation changing simulation.

Release requires zero unresolved Critical or High defects.

## 34. Production-deferred data

The following remain production validation rather than open feature decisions:

- Exact frame data, damage, stun, recoil, Guard, Resolve, and Defense values.
- Exact warning durations, interaction channels, and timer extensions.
- Final enemy counts within approved active caps.
- Final weapon ammunition placement beyond approved capacities and zones.
- Final food recovery amounts.
- Final Credit values and Store prices.
- Final geometry, traversal distances, camera bounds, and checkpoint timing.
- Final artwork, animation, cinematics, voices, music masters, ambience, and SFX.
- Browser-specific memory, GPU, network, and replay budgets.
- Localization QA and final terminology review.

Production tuning may adjust values inside approved boundaries. It cannot add waves, change canon, create unavailable mechanics, weaken access guarantees, or reopen settled scope without explicit refinement.


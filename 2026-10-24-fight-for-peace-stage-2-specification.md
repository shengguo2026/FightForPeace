# Fight for Peace — Stage 2 Product, Content, and Technical Specification

**Version:** 1.0 approved-design draft  
**Date:** 2026-10-24  
**Stage title (working):** *Prosperity Under Siege*  
**Decision source:** `stage2_feature_story_line.md`  
**Shared-system source:** `2026-10-18-fight-for-peace-game-specification.md` and the review decisions in `Features_Decisions.md` §13

## 1. Status and interpretation

This document converts the approved Stage 2 decisions into a build-facing specification. It extends, and does not replace, the shared campaign specification. Shared combat, controls, profiles, economy, accessibility, localization, networking, and deterministic-simulation rules remain normative unless this document explicitly adds a Stage 2 rule.

Priority order:

1. Safety, readable counterplay, accessibility, deterministic state, and progression integrity.
2. This specification and the shared campaign specification.
3. Validated Stage 2 action, encounter, and economy data.
4. Candidate tuning values and production placeholders.

Items marked **Deferred** require production or tuning, not another product decision. They must remain data-defined and cannot silently change an approved mechanic.

## 2. Stage purpose and pillars

Stage 2 occurs approximately three years after the river was restored. The village has converted water security into resilient prosperity through reserves, greenhouse agriculture, aquaponics, education, healthcare, civic construction, and a civilian protection program. The raid tests whether that prosperity can be protected without abandoning compassion, restraint, or accountability.

Stage-specific pillars:

- **Victory has visible consequences:** the village is healthier, more capable, and better dressed because Stage 1 mattered.
- **Protect living systems:** crops, fish, shrimp, medicinal research, workers, and machinery create tactical stakes beyond defeating enemies.
- **Compassion plus verification:** rescuing an injured stranger was morally right; failing to verify his story was the weakness.
- **Modern tools, unchanged values:** motorbikes and finite firearms expand tactics but do not turn the game into a racer or shooter.
- **New heroes, one combat language:** Wind Sentinel and Fire Warden use the same legal combat rules while adding distinct complete kits.
- **Mystery advances without premature revelation:** the sponsor is linked to both stages, but not identified.

## 3. Scope and inherited architecture

Stage 2 must support solo, same-device two-player co-op, and local-Wi-Fi two-player co-op. Teams contain unique people; duplicate heroes are forbidden. Mountain Guardian, River Scout, Wind Sentinel, and Fire Warden are all selectable and solo-complete.

The implementation remains:

- TypeScript and Vite.
- Phaser for 2D rendering and scene coordination.
- A framework-independent fixed-step deterministic simulation, candidate 60 Hz.
- DOM UI for briefings, subtitles, Guide, Museum, Store, Academy, results, and settings.
- The shared abstract-input layer for keyboard and gamepad, including German QWERTZ behavior.
- Host-authoritative local-Wi-Fi play with frame-stamped inputs, bounded rollback, state hashes, authoritative recovery, and content-version checks.
- IndexedDB profiles with transactional saves, backup/import, migration, and previous-known-good recovery.

Stage 2 is a data-centric content package. New state schemas may extend, but may not fork, the shared engine. Required extensions include mounted Stability, Preservation Ledger state, advanced finite-ammunition weapons, optional branches, ownership-aware containers, Sponsor Dossier evidence, Museum records, and staged research.

## 4. Narrative specification

### 4.1 Prosperity Interlude

Before the Stage 2 introduction, a skippable **Prosperity Interlude** shows three years of development:

1. River restoration and water-reserve construction.
2. Irrigation and greenhouse construction across seasons.
3. Hydroponic vegetable and crop cultivation.
4. Aquaponic fish and shrimp systems with separated filtration, circulation, aeration, and plant beds.
5. Medicinal-plant research and clinic cooperation.
6. New homes, school, hospital, civic headquarters, market activity, and reinvestment in education.
7. Civil-protection training, improved protective clothing, boots, modern transport, and accountable equipment handling.
8. A final prosperous village panorama that makes the coming threat emotionally legible.

Generated footage contains no embedded words. Subtitles, captions, narration, and titles are runtime overlays. Every clip has a still-art fallback and transcript.

### 4.2 Deception and investigation

On patrol, Wind Sentinel and Fire Warden rescue the injured **Tomas Rell** from apparent pursuers. The village clinic treats him. He claims to possess a plant-derived recovery technique and offers it in gratitude. The elder accepts the offer provisionally and permits him to recover.

Two weeks later, Tomas requests a three-day tour of the village and greenhouses. His questions focus on roads, structures, schedules, and access rather than medicine or agriculture. The elder becomes suspicious, quietly places the guard on watch, and avoids openly accusing a recovering guest without evidence.

Tomas is a noncombatant infiltrator. At the arranged night signal he attempts to coordinate Marek Vane's external raid. The guard intercepts him immediately, but his partial success places the greenhouse complex in danger and starts the playable attack.

### 4.3 Resolution

The heroes defeat **Marek Vane — The Gilded Jackal**, the outside commander seeking the village's wealth and technology. Marek and eligible raiders are medically assessed, documented, and transferred to the civilian Regional Civil Protection Council with evidence, translated copies, and a custody receipt.

Tomas is captured alive. To protect himself he hands over the genuine formula, source notes, and known provenance. The clinic quarantines the material for independent validation. The elder accepts useful knowledge but states that it cannot purchase innocence. Tomas receives necessary care and basic provisions, is permanently expelled under escort, and is reported to the council.

The ending confirms that Stage 1 and Stage 2 equipment share a seal and related order-code structure. The intermediary route leads only to an abandoned depot. The sponsor remains unknown.

### 4.4 Canonical outcome

There is one canonical story outcome: the raid fails, the living systems survive in a recoverable state, Marek is lawfully captured, Tomas is expelled, and the formula enters research. Performance changes dialogue, imagery, Preservation grade, surrender presentation, records, and rewards; it does not create a contradictory campaign branch.

## 5. Stage flow and route

The player flow is:

`Prosperity Interlude → Roadside Deception → village/elder briefing and loadout → Guided Pursuit Corridor → greenhouse attack → optional branches → filtration crisis → production hall → Marek mastery intercept → dispatch-arena boss → layered epilogue → results and save`

The playable route has four major segments:

1. **Perimeter and Loading Yard:** full mounted teaching pursuit, loading-yard combat, initial Preservation introduction, and Checkpoint 1.
2. **Aquaculture and Crop Systems:** fish/shrimp systems, plant beds, worker protection, Aeration and Seed branches, and Checkpoint 2.
3. **Medicinal and Filtration Systems:** research wing, optional Medicinal branch, Saboteur/grenade encounter, reversible Control Breach, and Checkpoint 3.
4. **Production and Dispatch:** advanced formations, short mounted Marek intercept, boss arena, capture, and pre-boss Checkpoint 4.

The three optional branches are:

- **Emergency Aeration Annex:** rescue a worker and stabilize aquatic life; Museum artifact and `Breath Beneath the Water` eligibility.
- **Seed Reserve Bay:** protect designated seed containers; Museum artifact and `Seeds for Tomorrow` eligibility.
- **Medicinal Preparation Room:** rescue a researcher and recover the provenance ledger; Museum artifact and `Knowledge Has Many Roots` eligibility.

Optional branches award bounded score, Credits, discoveries, Museum content, Preservation benefits, and achievements. Missing or failing one cannot block stage completion or later mandatory research continuity.

## 6. Preservation Ledger

Stage 2 replaces binary escort-style failure with a layered **Preservation Ledger**. It tracks authored optional state for:

- Workers and rescued specialists.
- Fish, shrimp, aeration, and water circulation.
- Crops, seedlings, seed reserves, and medicinal beds.
- Pumps, filtration controls, greenhouse glazing, shutters, racks, rails, and repairable equipment.
- Optional evidence, research material, and community supplies.

Damage must be deterministic, readable, bounded, and recoverable where specified. Essential systems enter safe fallback rather than causing a hard story failure. Players receive repair, stabilization, or consequence opportunities. Grades include at least the approved **Flourishing** top result and lower authored bands. Exact thresholds are Deferred.

The Ledger drives results, ending inserts, records, achievements, bounded rewards, and Museum annotations. It cannot reward destruction, punish unavoidable scripted contact, or require perfect play for canonical completion.

## 7. Playable heroes

### 7.1 Wind Sentinel — 风神

Wind Sentinel is the 18-year-old sister, an observant and compassionate civil-protection hero using fast karate-derived movement. She is a mobile whiff-punisher and route creator with lower individual damage and guard pressure.

Core normal catalogue: eight standing, three aerial, two ground, one dash, and one low action. The accessible route is `Windmark Jab → Crossline Reverse → Horizon Heel`. Her dash low is **Grass-Cutter Sweep**. Her confirmed starting Specials are **Windbreak Combination** (`U`), **Gale Passage** (`Forward + U`), and **Skyward Sentinel** (`Backward + U`). **Four-Wind Vigil** (`H`) is fixed and signature.

Her defensive identity uses redirection and reset: **Open Gate Return**, **Breeze Turn**, **Clear Path Cast**, **Sentinel Heel**, and **Clear Horizon**. Her mounted role is **Rescue Interceptor**, with **Passing Palm**, **Crosswind Kick**, **Wind-Lane Hop**, **Crosswind Lean**, **Guardian Cut-In**, and **Open Road Vigil**.

Her default civil-protection outfit uses storm teal, cloud gray, ivory, silver-cyan, small safety-yellow details, lightweight protection, and flexible patrol boots. Store cosmetics are **Greenhouse Response** and **Prosperity Festival**; both are visual-only.

### 7.2 Fire Warden — 火神

Fire Warden is the 18-year-old brother, a disciplined and intense civil-protection hero using Sanda/Sanshou, streamlined kickboxing, and short Qinna-derived control. He is a Momentum Converter: direct strikes earn brief catches, clinches, trips, and controlled conclusions. He has shorter reach and more committed recovery than Wind Sentinel.

Core normal catalogue: seven standing, three aerial, three ground, one dash, and one low action. The accessible route is `Spark Jab → Hammer Cross → Furnace Heel`. His low is **Ashline Reap**. Starting Specials are **Forge Combination** (`U`), **Flashpoint Clinch** (`Forward + U`), and **Furnace Rising** (`Backward + U`). **Warden's Crucible** (`H`) is fixed and signature.

His control routes require confirmed eligible contact. Large enemies and bosses permit full control only in authored vulnerable or Resolve-broken states. His mounted role is **Formation Breaker**, using committed rider-delivered attacks and Stability management rather than vehicle impact damage.

His default costume is a modern Civil-Protection Breach Specialist silhouette with robust joint protection, grappling gloves, and boots. Store cosmetics are **Pump-House Response** and **Ember Heritage**; both are visual-only.

### 7.3 Sibling cooperation

Every legal two-hero pairing keeps the shared handoff system. The twins add **Reciprocal Handoffs** and the **Twin Guardians' Accord** finisher but may not reset hit-stun, juggle, ground, scaling, stun, or environmental budgets. These actions are taught in Academy and tested in Combat Lab. Selecting neither twin does not remove any story-critical event.

## 8. Mounted system

Each active hero receives one mechanically equivalent, temporary 350–450 cc civilian dual-purpose motorbike. Bikes are stage equipment, not Store inventory or loadout items. One shared art package may use identification variants.

Mounted play uses a **Guided Pursuit Corridor** with continuous soft-lane steering, bounded speed change, authored bends and obstacles, and a shared co-op camera. Partner bikes do not collide or deal friendly damage. A bounded tether slows the leader and assists a trailing rider before separation becomes unsafe.

Every rider has Health plus visible **Stability**. Zero Stability creates a warned critical state; another qualifying hit causes a safe authored crash or dismount with protected recovery. Vehicle collision is not an unrestricted attack. The full introductory pursuit teaches the system; Marek later receives a compact 45–75 second mastery intercept.

The **Civil-Protection Response Record** separately grades Response, Protection, Control, Stability, Assistance, and optional Mastery. Story completion remains possible at every result.

## 9. Weapons and interaction

All Stage 2 weapons are acquired during the stage. None may be pre-equipped, stored between stages, or purchased as permanent combat power.

### 9.1 Telescoping Service Lance

A blunt segmented greenhouse maintenance tool with locking collars, rubber grips, and a short coupling hook. It provides a complete standing, aerial, ground, throw, and contextual-fitting interaction graph. Integrity may loosen or bend segments before breakage. It is visually and mechanically distinct from the Canal Workstaff.

### 9.2 Deliberate Six-Round Sidearm

The principal revolver is a finite-ammunition precision pickup. It uses warned lines, committed firing, meaningful Defense cost, exact remaining-ammunition transfer, no ordinary reload, and a useful empty state. It supplements melee combat and cannot bypass surrender, Resolve, protected recovery, or preservation rules.

### 9.3 Low-Fragmentation Breaching Grenade

One authored filtration encounter contains one grenade. The Saboteur visibly removes, arms, aims, and releases it. Visual, audio, and caption warnings are mandatory. Interruption before arming may release an unarmed pickup. A live grenade may be retrieved and returned when clearly indicated; retrieval never resets the fuse. The blast emphasizes knockback and Integrity pressure and cannot irreversibly destroy essential infrastructure.

### 9.4 Finite Burst-Command Support Gun

Marek's support gun has an exact finite magazine. Ammunition spent by Marek is the ammunition transferred if the heroes disarm it. Player bursts impose movement, recoil, recovery, and restricted cancels. Boss interruption converts mainly to Resolve pressure. The empty weapon retains limited stock-strike or throw value and cannot be reloaded or retained.

## 10. Recovery items and containers

The **Layered Pantry** adds:

- **Fresh Greenhouse Wrap** and **Herb-Fish Rice Bowl** for Health.
- **Mineral Garden Broth** for Defense.
- **Honey-Fruit Rice Cake** for Attack Bar.
- Rare **Community Harvest Stew** for bounded mixed recovery.

Items obey shared maximum, sharing, pickup, checkpoint, and anti-duplication rules.

Ownership-aware containers distinguish protected property from hostile or damaged breakables. Harvest Totes, Meal Carriers, Clinic Cabinets, Maintenance Lockers, and Emergency Cabinets are interaction-opened. Raider Cases, Stolen Cargo Crates, and Damaged Irrigation Housings may be breakable. Contents are deterministic and persist correctly through checkpoints.

## 11. Enemy roster and difficulty

Core roles:

- **Claim Hand:** readable formation generalist.
- **Glasshouse Runner:** mobile depth and aerial pressure without scenery phasing.
- **Cargo Reaver:** telegraphed clinch-and-reposition controller.
- **Revolver Marauder:** warned finite-ammunition interrupter.
- **Systems Saboteur:** physically reaches controls for interruptible Access, Tamper, and Commit phases.
- **Road Rider:** lane-pressure pursuer with visible Stability and safe dismount.

Difficulty additions:

- **Easy:** reduced role selection and gentler combinations.
- **Medium:** every story-critical Stage 2 role and mechanic; canonical balance reference.
- **Hard:** elite core variants and the sponsor-upgraded returning **Black-Iron Enforcer**.
- **Extreme:** **Jackal Signalman**, advanced formations, and visible interruptible commands.
- **Ultimate:** full roster, master profiles, rare legal combinations, and finite `Replace the Line` reserves; no additional required enemy art package.

The Signalman's commands—**Crossfang Call**, **Guard the Claim**, and Ultimate-only **Replace the Line**—reserve shared Threat Budget, retain ordinary telegraphs, are interruptible, and never create infinite enemies. AI reads canonical world state, never future inputs.

Difficulty does not secretly shorten Exact Block, Counter, Grab Escape, Combo Breaker, rescue, or essential warning windows. Pressure comes from legal formations, decision quality, role capabilities, resource placement, and preservation demands.

## 12. Boss — Marek Vane, The Gilded Jackal

Marek is a ruthless raider commander seeking wealth and technology. His Tailored Predator fight combines:

1. The short mounted mastery intercept.
2. Armed command with the finite support gun and readable subordinate pressure.
3. Disarm or ammunition-exhaustion transition with exact physical weapon state.
4. **Predator Unbound**, a full counter-brawler phase using shared legal combat rules.
5. Bounded **Scorched Claim** pressure that threatens optional infrastructure without forcing unavoidable loss.
6. Resolve-sensitive surrender and lawful capture.

Marek visibly deteriorates through authored costume, posture, equipment, and animation states. The clean Resolve surrender and harder forced presentation converge on the same canonical capture, with different dialogue, record, and achievement eligibility.

Boss phases cannot reset shared combo budgets, create hidden immunity, fire during protected transitions, or make optional Preservation damage unavoidable. Boss AI and transitions are deterministic and checkpoint-safe.

## 13. Environmental combat

Stage 2 uses the shared deterministic environmental system with Preservation-aware additions:

- Loading shutter impact surface.
- Seedling rack/support rail multi-state object.
- Irrigation purge jet active response.
- Cooperative redirect opportunity.
- Cargo-restraint boss interaction.
- Controlled grenade effects.

Broken fragments are usable only where explicitly tagged. Environmental reward depends on tactical outcomes, not destruction count. Essential greenhouse information must remain readable without color or audio alone.

## 14. Progression, Museum, Store, and research

### 14.1 Achievements

The compact twelve-achievement set is:

1. **Peace in the Glasshouse** — complete Stage 2; narrative-eligible in Cheat-Assisted play.
2. **Every System Breathing** — reward-eligible Flourishing Preservation grade.
3. **First to the Alarm** — highest authored response grade without mounted rewind.
4. **Guardians in Accord** — eligible Reciprocal Handoff and Twin Guardians' Accord.
5. **Breach Denied** — stop Control Breach and avoid optional grenade infrastructure damage.
6. **Seize the Moment** — disarm the support gun with ammunition remaining and use or secure it.
7. **Strength Without Vengeance** — clean Resolve surrender.
8. **Silence the Signal** — interrupt every Signalman command on Extreme or Ultimate.
9. **Breath Beneath the Water** — complete Aeration Annex rescue.
10. **Seeds for Tomorrow** — complete Seed Reserve Bay with designated containers preserved.
11. **Knowledge Has Many Roots** — rescue the researcher and recover the provenance ledger.
12. **Guardian of Every Wing** — complete all three branches in one reward-eligible run.

### 14.2 Museum and Archive

Stage 2 introduces an expandable Museum with Picture, Cinema, Music, Sound, Collection, and Investigation sections. It indexes eligible Stage 1 media without modifying Stage 1 gameplay. Three branch-exclusive artifacts, Sponsor Dossier evidence, formula research records, and Stage 2 media use stable manifest IDs. Cheat-Assisted play may retain eligible narrative discoveries but not mastery rewards.

### 14.3 Store and wardrobe

Every available hero receives two new Stage Service/Heritage visual costumes for the newly added stage. The twins' approved outfits are specified above; founder outfits remain the approved Stage 2 production entries in the decision log. Cosmetics do not alter statistics and remain independent of combat style or loadout.

Stage 2 follows the shared Technique Library model: signature neutral `H` remains fixed; owned directional Ultimates and optional `Up + U`/`Down + U` Specials are assigned before a stage and persist until changed. Purchased techniques are sidegrades, never required power.

### 14.4 Formula research

The formula follows four milestones: **Quarantine and Provenance**, **Independent Replication**, **Safety Review**, and a possible later **Approved Preparation**. Stage 2 completes the first milestone and records inputs for the second. No real ingredients, extraction steps, dosages, or actionable pharmaceutical instructions may appear. Any future item is finite, optional, and a recovery sidegrade.

## 15. Teaching, Guide, and cheats

The Three-Layer Teaching System contains:

1. A concise What's New briefing.
2. Safe first-use encounters and contextual prompts.
3. Optional Academy, Guide, Move List, My Combos, and Combat Lab depth.

Academy adds lessons for both twins, Reciprocal Handoffs, Twin Guardians' Accord, mounted Stability and rescue, revolver, grenade return, support-gun disarm, Preservation, ownership-aware containers, and new enemy roles. Players can record valid freestyle routes under the existing My Combos rules.

Stage 2 adds one new openly documented cheat, `STEADYRIDE`, which prevents or automatically restores mounted Stability loss according to the canonical modifier definition. It belongs to all four beginner presets. It does not create infinite ammunition, automatic Preservation, skipped objectives, or free records. Any accepted cheat marks the full run Cheat-Assisted under the shared rules.

## 16. Presentation, localization, and audio

Required languages remain English, Simplified Chinese, and German. Stable localization IDs drive subtitles, transcripts, temporary TTS, final voice files, warnings, Museum text, objectives, and captions. Text and installed voice language may be selected independently with explicit fallback.

The **Selective Motion Package** contains six generated-video chapters: Prosperity Interlude, Roadside Deception, Guest Under Observation, Night Signal, Community Recovery, and Justice and Mystery Coda. State-dependent combat, surrender, and Preservation outcomes remain in engine. Generated clips are silent source footage; runtime narration, dialogue, music, ambience, and captions are separate.

The **Subtitle-Complete, Narration-Led Voice Pipeline** uses selective elder and character speech. Windows TTS is a prototype/accessibility fallback unless commercial deployment rights are independently established. Complete subtitles and transcripts are mandatory even if no localized voice ships.

The seven-cue **Prosperity Under Siege** score is:

1. Water Became a Future.
2. Roadside Vigil.
3. Glass and Green.
4. Alarm Through the Channels.
5. Protect the Living System.
6. The Gilded Jackal, including mounted, armed-command, Predator Unbound, and Scorched Claim states.
7. What We Protected.

Music, ambience, and SFX are separate layers. Essential warnings receive mixer priority and localized captions. Candidate generated audio requires human editing, loop construction, transition authoring, loudness normalization, browser export, provenance, and commercial-use verification.

## 17. Save, checkpoint, replay, and synchronization state

Stage 2 checkpoints and deterministic snapshots must serialize:

- Content, rules, cheat-registry, and localization-compatible versions.
- Active heroes, profiles, devices, loadouts, resources, and Cheat-Assisted status.
- Weapons, owner, position, Integrity, finite ammunition, fuse, and consumed state.
- Opened containers, consumed items, broken objects, fragments, and optional branch state.
- Preservation, repairs, stabilization, workers, aquatic systems, research, and evidence.
- Mounted state, Stability, response grades, bike identity, and rescue state.
- Enemy health, morale, role state, formation commands, finite reserves, and boss phase.
- Story, Sponsor Dossier, Museum, achievements, research milestones, and eligible results.

Restart, reconnect, host migration, guest participation, and profile re-entry cannot duplicate or erase rewards, weapons, ammunition, items, evidence, or outcomes. A mismatch in protocol, content manifest, rules, cheats, or state hash blocks readiness or triggers the approved recovery path rather than guessing.

## 18. Risk-Tiered Complete-Path Acceptance

Release requires no open Critical or High-severity defect and the following evidence:

- All four heroes complete Medium solo.
- All six unique hero pairs complete Medium in hot-seat and local-Wi-Fi.
- Easy, Hard, Extreme, and Ultimate receive complete solo and representative co-op coverage.
- Clean and Cheat-Assisted paths, both Marek capture presentations, every optional branch, every Preservation grade, checkpoint resume, disconnect/rejoin, backup/import, and progression results are covered.
- Zero crashes, freezes, softlocks, save corruption, duplication, lost progress, incompatible network states, bad difficulty unlocks, infinite combos, unavoidable mandatory damage, broken boss transitions, or missing essential information.
- German QWERTZ, remapping, supported gamepads, menus, Academy, and gamepad-only cheat selection pass.
- English, Simplified Chinese, and German pass layout, fallback, subtitle, transcript, caption, and overflow validation.
- Completion does not depend on color, speech, vibration, video, or high motion. Reduced motion, steering assistance, captions, warnings, and still fallbacks pass.
- Reference profile targets 60 FPS. The minimum profile remains playable at stable 30 FPS using approved adaptive reductions.
- Stress tests cover crowded combat, mounted co-op, grenade return, every Marek phase, media transitions, and Museum navigation.
- Easy is beginner-completable without cheats; Medium is canonical; higher difficulties remain legal and readable; no dominant infinite hero, pair, move, weapon, or environmental route exists.
- Release package includes coverage matrix, severity-reviewed known issues, performance results, localization/accessibility results, rights/provenance manifest, and versioned content/rules/checkpoint/replay hashes.

## 19. Production appendices and data gates

### A. Purchased move catalogue

The production catalogue must provide at least two candidate optional Specials and a bounded set of directional Ultimate sidegrades for each twin. Every entry requires stable ID, input slot, tactical purpose, startup/active/recovery data, hit and guard outcomes, Defense/Attack costs, scaling and budget effects, allowed cancels, target eligibility, boss conversion, co-op tags, AI/test scenario, Store effort band, Academy trial, animation/effect/audio IDs, and localization keys.

Catalogue review must prove that each purchase creates a choice rather than correcting an incomplete base kit. No bought move may outperform the starting option across range, safety, damage, control, preservation utility, and meter efficiency simultaneously.

### B. Exact frame data

All hero, enemy, boss, mounted, weapon, grenade, environment, and interaction actions require versioned 60 Hz frame data. Required fields include input acceptance, startup, active, recovery, hit-stop, invulnerability/evasion/armour, movement curve, hitbox/hurtbox, target filters, reactions, hit-stun, guard-stun, launch/ground behavior, damage, Resolve, Stability, Integrity, meter, scaling, threat cost, cancels, network event IDs, and accessibility cue timing.

Candidate numbers remain **Combat Lab Candidate** until replay determinism, anti-infinite, co-op, boss, checkpoint, and difficulty tests pass. Presentation timing may follow simulation events but may not redefine them.

### C. Final artwork and asset register

The controlled Stage 2 package includes model sheets and animation for four heroes, two hero bikes plus shared variants, Tomas, Marek, six core enemies, Black-Iron Enforcer, Jackal Signalman, weapons, containers, foods, environments, breakables, hazards, Museum artifacts, UI icons, story art, still fallbacks, and localized presentation overlays.

Every asset manifest entry records logical ID, source tool/model, prompt, references, date, creator consent, provenance, human edits, commercial-rights evidence, locale/quality variants, hashes, dependencies, animation anchors, collision relationship, and delivery bundle. Generated media never becomes final solely because it was generated.

### D. Encounter balancing

Encounter data must define spawn composition, finite reserves, Threat Budget, concurrent major actions, visibility and warning floors, hard-control limits, per-hero co-op pressure, resource placement, Preservation exposure, optional-branch cost, morale, surrender, checkpoint boundaries, and difficulty substitutions.

Telemetry must capture damage source, defense choice, combo-budget termination, objective harm, rescue response, weapon ammunition, mounted Stability, branch time, boss transitions, surrender route, checkpoint recovery, and network correction. Candidate encounters are promoted only after solo and co-op completion, access, deterministic replay, economy, preservation, and performance bands are validated.

### E. Explicitly deferred production values

- Final localized scripts, names, voice casting, dialogue timing, and subtitle timing.
- Exact action frames, hitboxes, damage, resource values, AI weights, and encounter tables.
- Exact score, Credit, achievement threshold, Preservation threshold, and Store prices.
- Final artwork, animation, effects, video edits, music, ambience, SFX, and Museum layouts.
- Exact room dimensions, spawn points, checkpoint payload sizes, network rollback window, and browser-performance budgets.
- Commercial-use verification for every generated or licensed asset.

These deferrals permit implementation and production planning. They do not permit changes to the approved stage structure, hero identities, canonical outcome, legal combat rules, progression boundaries, accessibility promises, or release gate without design review.

## 20. Specification review gate

This specification is ready for builder review. Approval authorizes implementation planning and production breakdown, not automatic implementation or final balance lock.

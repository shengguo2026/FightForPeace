# Fight for Peace Stage 3 Product Content and Technical Specification

**Version:** 1.0 approved-design draft  
**Date:** 2026-11-01  
**Stage title:** *Shadows over the Herb Mountain* / *药山阴影* / *Schatten über dem Kräuterberg*  
**Decision source:** `stage3_feature_story_line.md`  
**Campaign continuity source:** `story_line.md`  
**Shared-system source:** `docs/superpowers/specs/2026-10-18-fight-for-peace-game-specification.md`

## 1. Status and interpretation

This document converts the approved Stage 3 decisions into a build-facing specification. It extends the shared campaign specification and does not replace the established combat, control, profile, economy, accessibility, localization, networking, deterministic-simulation, Museum, Store, Guide, Academy, cheat, or media rules.

Priority order:

1. Player safety, readable counterplay, accessibility, deterministic state, and progression integrity.
2. The shared game specification, campaign continuity record, and this Stage 3 specification.
3. Validated Stage 3 action, encounter, economy, and presentation data.
4. Candidate tuning values and production placeholders.

Items marked **Deferred** require production, tuning, or validation rather than another product decision. They must remain data-defined and cannot silently change an approved mechanic, story fact, rescue outcome, or clue.

Stages 1 and 2 remain locked. Stage 3 may reuse shared systems and consequences, but it may not retroactively insert Stage 3 technology, enemies, routes, or narrative facts into those stages.

## 2. Stage purpose and pillars

Stage 3 occurs approximately 18 months after Stage 2. Promising preclinical research requires limited samples of a rare fictional mountain plant. Bandits kidnap the gathering team for ransom and leverage, and Tomas Rell uses the crisis to resume pressure on the village through a deniable alliance.

Stage-specific pillars:

- **Rescue before pursuit:** saving captives is the correct action even when Tomas escapes.
- **Science with boundaries:** the discovery remains preclinical, fictional, non-actionable, conservation-aware, and independent of combat progression.
- **Terrain without unfairness:** slopes, horses, quarry tools, ropes, carts, and winches create tactics without hidden falls, unavoidable traps, or lethal cliff requirements.
- **Established heroes under new pressure:** all four current heroes remain complete and distinct; Stage 3 does not add a new selectable fighter.
- **One canonical victory:** every captive survives, Garran is captured, Tomas escapes, and performance changes recognition rather than campaign truth.
- **Mystery through reliable evidence:** the damaged invoice proves an intermediary route without revealing the sponsor prematurely.

## 3. Scope and inherited architecture

Stage 3 supports:

- Solo Story Mode.
- Same-device two-player co-op.
- Host-authoritative local-Wi-Fi two-player co-op.
- Keyboard and supported gamepads through the abstract-input layer.
- English, Simplified Chinese, and German.
- Easy, Medium, Hard, Extreme, and Ultimate under the established unlock rules.

Teams contain unique people; duplicate heroes are forbidden. Mountain Guardian, River Scout, Wind Sentinel, and Fire Warden are all selectable and solo-complete.

The implementation remains:

- TypeScript and Vite.
- Phaser for 2D rendering and scene coordination.
- A framework-independent fixed-step deterministic simulation, candidate 60 Hz.
- DOM UI for briefings, subtitles, Guide, Museum, Store, Academy, results, settings, and accessibility surfaces.
- Host-authoritative local-Wi-Fi state with frame-stamped inputs, bounded rollback, state hashes, authoritative recovery, and version checks.
- IndexedDB profiles with transactional saves, backup/import, migration, and previous-known-good recovery.

Stage 3 is a data-centric content package. Required package extensions include hostage-condition state, mountain-horse instances, Stage 3 weapons and finite revolver ammunition, optional branches, ecology Museum records, Sponsor Dossier evidence, new enemy roles, Garran's boss graph, Tomas presentation events, and five checkpoint payloads. These extensions may add schemas but may not fork the shared engine.

## 4. Narrative specification

### 4.1 Scientific catalyst

Village researchers refine Tomas's formula and source notes into a fictional candidate that controls selected tumor-cell growth unusually well in laboratory mice. No human efficacy is established. International institutions fund replication, toxicity research, conservation, provenance review, and possible controlled cultivation rather than commercial production.

The candidate requires **Silvervein Moonbell / 银脉月铃草 / Silberader-Mondglocke**, a wholly fictional blue-violet mountain plant with silver-veined leaves. Its invented cofactor **MV-3** stabilizes the fictional preparation in mouse research but has no standalone curative effect.

No stage surface may provide real ingredients, extraction, preparation, dosage, safety values, or an actionable biological mechanism. The plant and formula never become combat items, Store upgrades, purchased-move materials, or permanent statistics.

### 4.2 Kidnapping and response

The village and Qinglan send an experienced team to gather limited documented samples. Bandits ambush the expedition. Luo Fen returns with the ransom demand; injured field medic Deng Hao returns with a partial account. Four people remain captive.

The elder and patrol establish four objectives:

1. Locate and rescue every captive.
2. Prevent ransom and hostage pressure from controlling the village.
3. Secure the gathering route without claiming the mountain as conquered territory.
4. Determine how the bandits became sufficiently organized to threaten the village.

### 4.3 Tomas reveal and escape

Planning maps, radios, schedules, and supply placement establish unusual organization. An open-radio exchange at Moonbell Basin confirms Tomas's voice. At Broken Ridge Camp, the heroes see him questioning Ren Xia in an elevated cabin. Ren refuses to authenticate exaggerated claims or disclose preparation information.

Tomas activates a planned signal and withdraws before the heroes can reach him. He carries only portable records, enters the quarry service passage, uses a transport cart through its narrow section, and transfers to a waiting horse. The accessible path leads to Ren. A normal gate and damaged rail close the escape route. The game presents rescue as the active goal and never issues a false chase prompt or penalizes the player for Tomas's escape.

### 4.4 Resolution and transition

The heroes defeat Garran Voss at High Winch Terrace through legal systemic combat. Garran is disarmed, Resolve-broken, restrained, medically assessed, and captured alive. His key and testimony expose a private case containing a damaged invoice he retained as leverage against Tomas.

The invoice's batch reference links the operation to the regional procurement cutout used by the same route family seen in Stages 1 and 2. It does not identify the final sponsor. Tomas reaches a lowland shelter and contacts a former commercial broker, beginning the Stage 4 investigation.

### 4.5 Canonical outcome

There is one canonical outcome:

- Gao Wen, Tao Min, An Bo, and Ren Xia survive.
- Enough viable, documented herb material remains for responsible preclinical research.
- Garran and eligible bandits are captured alive or surrender under the shared rules.
- Tomas escapes through his prepared route.
- The damaged invoice enters the Sponsor Dossier and initiates Stage 4.

Condition grades, supplies, optional branches, environmental damage, and combat performance affect presentation, score, Credits, records, achievements, and epilogue inserts. They do not create a contradictory story branch.

## 5. Route and authored content

The player flow is:

`research update -> village briefing and loadout -> Lower Switchback -> Qinglan Hamlet -> Moonbell Basin -> Echo Quarry -> Broken Ridge Camp -> High Winch Terrace -> Garran capture -> invoice discovery -> Tomas coda -> results and save`

First-clear playtime targets 40-50 minutes. Experienced replay targets 25-35 minutes.

| Region | Mandatory content | Optional or systemic focus | Checkpoint |
| --- | --- | --- | --- |
| Stage departure | Research context, hostage report, hero and loadout confirmation | Accessibility, language, and co-op readiness | 1 |
| Lower Switchback | Safe horse introduction followed by 2 encounters and pursuit evidence | Horse Stability, trail readability, abandoned equipment | - |
| Qinglan Hamlet | 2 encounters and community information | Signal Hut branch; communication repair | 2 after mounted introduction |
| Moonbell Basin | 2 encounters; rescue Gao Wen and Tao Min | Protected habitat, documented samples, rescue condition | 3 after rescue |
| Echo Quarry | 3 encounters; rescue An Bo | Herbalist Shelter branch, second horse allocation, quarry interactions | 4 after rescue |
| Broken Ridge Camp | 3 encounters; rescue Ren Xia; Tomas sighting and escape | Separated enclosures, portable evidence, no false chase | 5 after rescue and before Garran |
| High Winch Terrace | Garran boss | Hookstaff disarm, winch counterplay, live capture | Boss retry uses Checkpoint 5 payload |
| Epilogue | Private case, invoice, Tomas coda, results | Museum, Sponsor Dossier, progression save | Transactional completion save |

The route contains 12 mandatory combat encounters, Garran's boss encounter, and two optional encounters. Exact spawn positions and populations remain data-driven.

## 6. Research governance and conservation state

Stage 3 must communicate the following without creating a separate bureaucracy plot:

- The Moonbell habitat is part of the Silvermist ecosystem, not automatic village property.
- Qinglan is a credited conservation and field-research partner.
- Collection requires consent, limited sampling, habitat monitoring, and provenance.
- Grant funders gain no automatic ownership of the formula, habitat, village data, or future treatment rights.
- Tomas's prior work is documented but does not give him sole ownership or control of later independent research.
- Field collection pauses after the kidnapping until the route is secure and Qinglan approves resumption.
- Independent backups prevent any hostage from becoming a single point of ownership or data failure.

The stage tracks authored sample and documentation state for presentation and score, but mandatory research continuity cannot be destroyed. The minimum canonical material is secured through the main route. Optional conservation performance may improve recognition and Museum detail without becoming a second failure condition.

## 7. Hostages and rescue state

### 7.1 Character records

| Character | Role | Mandatory location and outcome |
| --- | --- | --- |
| Luo Fen / 罗芬, 44 | Gathering coordinator and trusted ransom messenger | Returns before play and participates in briefing. |
| Deng Hao / 邓浩, 32 | Clinic field medic with non-life-threatening injury | Returns before play and documents the ambush. |
| Gao Wen / 高文, 52 | Qinglan trail and conservation steward | Rescued at Moonbell Basin. |
| Tao Min / 陶敏, 22 | Apprentice gatherer and route observer | Rescued with Gao at Moonbell Basin. |
| An Bo / 安博, 35 | Horse handler and rescue volunteer | Rescued at Echo Quarry; supports recovered horses. |
| Ren Xia / 任霞, 41 | Village research liaison and provenance custodian | Rescued at Broken Ridge Camp before the boss. |

### 7.2 Condition model

Each rescue group owns one deterministic condition state:

- **Secure:** strong protection and timely stabilization.
- **Strained:** moderate delay, pressure, or environmental exposure.
- **Critical:** poor protection or severe delay, but still alive and recoverable.

Condition transitions must use visible authored events and never a hidden execution clock. The UI communicates state through text or icon plus non-color visual treatment and optional audio/caption feedback. Condition affects medical presentation, score, recognition, and epilogue details only.

Freed captives follow short, deterministic routes to protected shelters. They may wait for a safe handoff event but never become long-duration escort AI. A captive cannot be damaged by an unavoidable spawn, hidden hazard, off-screen attack, or non-interactive cinematic event.

## 8. Playable heroes and co-op

Selectable heroes:

- Mountain Guardian.
- River Scout.
- Wind Sentinel.
- Fire Warden.

All retain their approved normals, Specials, fixed signature `H`, directional Ultimate loadouts, defense tools, ground combat, environmental eligibility, weapon rules, mount rules, combo budgets, and anti-infinite protections.

Hero selection may change short dialogue, camera emphasis, and reaction lines. It cannot change Tomas's reveal, captive survival, Garran's capture, the invoice, or the Stage 4 transition.

Co-op requirements:

- Unique hero selection; no duplicate hero.
- Shared rescue and optional-objective state.
- Existing cooperative launch, juggle, handoff, environmental redirect, weapon handoff, and co-op attack rules.
- Garran's hooked grab remains interruptible by the partner.
- Pressure budgets scale by active players rather than doubling every population.
- One horse and the approved replacement allocation per active hero.
- One physical pickup instance; no co-op duplication of weapons, food, evidence, or rewards.

## 9. Mountain-horse system

Stage 3 reuses the shared mounted architecture with a **mountain horse** content profile.

Required content behavior:

- One horse per active hero at Lower Switchback.
- One replacement per active hero after rescuing An Bo.
- Mounted play in the opening and one Echo-Quarry-to-camp pursuit only.
- Stability replaces mount health as the primary bounded resource.
- At zero Stability, the horse disengages safely and cannot die.
- Horses carry no military equipment and cannot become persistent pre-stage loadout items.
- Dismount, remount, attack, defense, collision, co-op separation, camera, and accessibility behavior follows the shared mount rules.
- Checkpoints preserve mount identity, availability, rider, position or authored return point, Stability, and disengaged state without duplication.
- `STEADYRIDE` applies according to the existing cheat definition and marks the run Cheat-Assisted.

Final horse speed, acceleration, turning, Stability, mounted actions, collision envelopes, and encounter placements are Deferred Combat Lab values.

## 10. Weapons and recovery items

### 10.1 Medium weapon baseline

| Weapon | Quantity | Acquisition and constraints |
| --- | ---: | --- |
| Hiking Staff | 2 | Stage pickup; shared melee durability and throw rules. |
| Wood Axe | 1 | Main-route pickup; committed authored profile. |
| Quarry Hammer | 2 | Quarry pickup; slow impact and environmental eligibility. |
| Bandit revolver | 1 | Enemy or authored pickup with exactly 5 remaining rounds. |
| Quarry Hookstaff | 1 | Garran's weapon; interactable only after the authored disarm. |

Easy adds one Hiking Staff and one Quarry Hammer. Extreme and Ultimate remove one duplicate Hiking Staff but never remove an entire weapon class. Hard begins from the Medium class set unless encounter tuning relocates a duplicate without changing access.

All weapons are acquired during play. No Stage 3 weapon may be equipped before stage start. Weapons use the shared `J` pickup, carry, handoff, throw, condition, ammunition, checkpoint, deterministic arbitration, and local-Wi-Fi rules.

The revolver:

- Owns its exact five-round state.
- Has no ordinary reload or separate ammunition inventory.
- Remains throwable when empty.
- Cannot reset combo, stun, juggle, bounce, or scaling state.
- Cannot create a repeatable interrupt or stun loop.
- Uses readable target selection and warning behavior under the shared advanced-weapon rules.

### 10.2 Medium recovery baseline

| Category | Item family | Quantity | Effect boundary |
| --- | --- | ---: | --- |
| Life | Trail rice parcel | 3 | Health recovery only. |
| Defense | Warm vegetable broth | 2 | Defense Bar recovery only. |
| Momentum | Spiced seed cake | 2 | Attack Bar recovery only. |
| Balanced rare | Mountain camp meal | 1 | Moderate recovery across all three; Herbalist Shelter only. |

Easy adds three common items, Hard removes one common item, Extreme removes two, and Ultimate removes three. The rare meal remains in its optional branch at every difficulty.

Food uses `J` pickup, carry, consume, and throw. Recovery is a gameplay abstraction; no food or research plant makes a medical claim.

## 11. Enemy roster and difficulty

### 11.1 Core roles

- **Trail Ambusher:** mobile approach and flank pressure with visible paths and bounded pursuit.
- **Quarry Bruiser:** committed heavy pressure, strong environmental eligibility, and punishable recovery.
- **Rope Trapper:** telegraphed setup, interruptible control, finite restraint, and legal escape or partner rescue.
- **Mounted Raider:** horse pressure using the same readability, Stability, and safe-disengagement principles as player mounts.

### 11.2 Advanced roles

- **Ridge Stalker:** Extreme specialist with visible feints. Feints alter timing without removing recognition, defense, or punish windows.
- **Pack Captain:** Ultimate specialist coordinating readable flank orders. Separation, interruption, or defeat breaks the command benefit.

### 11.3 Population baselines

| Difficulty | Initial solo population target | Composition rule |
| --- | ---: | --- |
| Easy | About 22 ordinary enemies | Reduced coordination and beginner-readable formations. |
| Medium | About 30 | Canonical roster and resource placement. |
| Hard | About 34 | Stronger role combinations and objective pressure. |
| Extreme | About 36 | Adds Ridge Stalkers. |
| Ultimate | About 40 | Adds Ridge Stalkers and Pack Captains. |

Co-op targets roughly 35 percent more total threat rather than double the count. Threat budgets also cap simultaneous major actions, off-screen pressure, hard control, projectiles, mounted pressure, and hostage exposure.

Every enemy retains readable tells, finite defensive resources, defense-consuming Combo Breakers, target-owned combo context, scaling, anti-infinite rules, and punishable recovery. Difficulty may improve cooperation, timing, role mixture, and objective pressure, but cannot remove required warning channels or create unavoidable damage.

## 12. Garran Voss boss specification

**Identity:** Garran Voss - The Ridge Wolf / 加兰·沃斯 - 岭狼 / Garran Voss - Der Gratwolf, age 46.  
**Role:** Mountain Bandit Chief and former quarry transport foreman.  
**Motivation:** Ransom, route control, and wealth.  
**Combat identity:** Ridge Hook Wrestling with a blunt Quarry Hookstaff.

### 12.1 Visual boundary

Garran is broad, weathered, and powerful without exaggerated giant proportions. His approved components are layered charcoal and ochre work clothing, dull-red reinforced vest, quarry gloves, rope harness, heavy trail boots, and compact radio. He has no military uniform, wolf costume, sponsor emblem, or futuristic armor.

### 12.2 Phase graph

1. **Hookstaff Control**
   - Long sweeps, guarded thrusts, hooked pulls, low-line attacks, and short descending strikes.
   - The staff uses normal durability, clash, environmental eligibility, and disarm state.
2. **Clinch and Cast**
   - Starts after authored damage or disarm transition.
   - Collar ties, shoulder throws, trips, body blows, and bounded ground follow-ups.
   - No unbreakable grab; co-op partner interrupt remains available.
3. **Winch Pressure**
   - Low-Resolve environmental layer using cargo and cover repositioning.
   - Every activation has visible and accessible warning, interrupt, avoidance, and redirect responses.

Garran owns Health, Defense, Resolve, stun and combo budgets, Exact Block, Counter, and a defense-consuming Combo Breaker. Phase transitions cannot reset player scaling illegally, erase a valid punish, create hidden immunity, or duplicate the Hookstaff.

Canonical defeat sequence:

`legal final interaction -> disarm if not already complete -> Resolve break -> restraint -> medical assessment -> live custody -> private-case testimony`

The boss checkpoint restores all mandatory rescue and clue prerequisites. The damaged invoice does not spawn until capture is committed.

## 13. Environmental combat

Stage 3 uses authored deterministic environmental interactions rather than unrestricted rigid-body physics.

Required content families:

- Quarry scaffolds with authored intact, damaged, critical, and broken states.
- Mine or transport carts with bounded movement and collision profiles.
- Loose stone with explicit eligibility and cleanup policy.
- Timber barriers and breakable cover with approved interactive debris only.
- Retaining walls and rails as impact surfaces with safe boundaries.
- Winches, cargo, and cover as boss actions with warnings and counters.
- At least one co-op redirect opportunity and one boss Resolve interaction.

Environmental contacts remain inside shared damage, scaling, stun, juggle, bounce, knockdown, meter, Combo Breaker, and anti-infinite rules. Objects declare persistence as checkpoint-saved, encounter-restored, consumed, story-controlled, or decorative.

No interaction may:

- Require throwing a character from a lethal cliff.
- Cause unavoidable captive loss or condition downgrade.
- Destroy the mandatory invoice or minimum research continuity.
- Reward indiscriminate habitat destruction.
- Remove functional warnings under reduced effects or low-quality presentation.

## 14. Optional branches progression and Store

### 14.1 Signal Hut branch

The heroes restore the damaged cliffside communication hut and rescue its trapped operator. Completion records operator state, repair state, encounter result, time band, and accessibility-safe feedback.

### 14.2 Herbalist Shelter branch

The heroes recover missing gathering equipment from the abandoned shelter. The branch contains the rare Mountain Camp Meal and contributes to the ecology record without supplying actionable medical instructions.

### 14.3 Museum and achievements

Completing both branches in an eligible run grants a Stage 3 optional-completion achievement and upgrades the Museum presentation. The Museum receives a non-actionable illustrated mountain-ecology record. Missed discoveries remain recoverable through replay.

Locked entries show concise localized unlock clues through pointer hover, keyboard or gamepad focus, click or confirmation, touch, and accessibility labels. Hints identify the relevant stage and action type without revealing unreached mandatory story facts. Cheat eligibility is stated explicitly.

Exact achievement names, catalogue size, thresholds, score, Credit rewards, and condition-grade achievements are Deferred. The catalogue should cover story completion, optional branches, rescue condition, mounted mastery, Garran counterplay, higher difficulty, and sponsor evidence without requiring mutually impossible actions in one run.

### 14.4 Store and wardrobe

Every available hero receives:

- One character-specific **Mountain Rescue Outfit**.
- One character-specific **Highland Gathering Festival Attire**.
- One free canonical Stage 3 default-clothing evolution.

Purchased costumes are visual-only, meaningful redesigns rather than palette swaps, independent of combat style, usable in Standard Loadouts, and permanently available after reveal. The free default evolution ensures modernization is visible without a Store purchase. Stage 3 adds no robot gear or advanced combat wearable.

### 14.5 Technique Library

Stage 3 inherits the shared Technique Library and saved pre-stage loadout rules. It does not require a new move purchase or replace any hero's fixed neutral `H`. Purchased Specials and directional Ultimates remain sidegrades, not mandatory power.

## 15. Teaching Guide and cheats

The Three-Layer Teaching System provides:

1. A concise localized What's New briefing.
2. Safe first-use encounters and contextual prompts.
3. Optional Academy, Guide, Move List, My Combos, and Combat Lab depth.

Stage 3 teaching coverage includes:

- Mountain-horse movement, Stability, safe disengagement, and replacement.
- Rescue condition and short protected routes.
- Hiking Staff, Wood Axe, Quarry Hammer, finite revolver, and boss Hookstaff behavior.
- Rope Trapper restraint and partner rescue.
- Ridge Stalker feints and Pack Captain commands when their difficulties unlock.
- Garran's Hookstaff ranges, clinch escape, partner interrupt, winch warnings, and redirects.
- Conservation, optional branches, Museum clues, and non-actionable research framing.

No new Stage 3 cheat code is required. Existing openly documented individual cheats and clusters remain selectable by keyboard and gamepad. `STEADYRIDE` covers eligible horse Stability behavior.

Any accepted cheat marks the run Cheat-Assisted. Such a run may complete the stage and unlock later difficulties, but receives no score, Credits, mastery achievements, performance grades, or competitive records under the shared rules. Narrative completion and eligible story or Museum discoveries remain available.

## 16. Presentation localization and audio

### 16.1 Language and accessibility

Required languages are English, Simplified Chinese, and German. Stable localization IDs drive titles, briefing text, objectives, subtitles, transcripts, warnings, condition grades, Museum text, Sponsor Dossier text, item names, enemy names, and accessibility labels.

Text and installed voice language may be selected independently with explicit fallback. Completion cannot depend on color, speech, vibration, video, high motion, or generated voice.

### 16.2 Cinematic pipeline

Generated images and clips contain no embedded language-dependent text, signage, logos, subtitles, or watermarks. Runtime overlays provide all localization. Every motion clip has:

- A still-art fallback.
- Subtitle and transcript coverage.
- Reduced-motion behavior.
- A skippable control that preserves narrative and load readiness.
- Provenance, edit history, commercial-use verification, and integrity metadata.

Flow production follows the established constraints: small motion grounded in the frame; named prop hands, gaze targets, and container contents; still-frame verification before generation; and action redesign after two failed attempts. Large motion, travel, handoffs, and time changes should normally be assembled in editing rather than forced into one generation.

Final cinematic chapters, shot count, scripts, voices, and timing are Deferred. At minimum, presentation must cover the research purpose, kidnapping briefing, Tomas confirmation, Ren rescue priority, Garran capture, invoice discovery, and Tomas's lowland contact without replacing playable state-dependent events.

### 16.3 Music and SFX

The Stage 3 family is **Mist and Resolve**:

1. **Silver Veins in Morning Mist** - mountain introduction and research purpose.
2. **The Empty Gathering Trail** - absence and first evidence.
3. **Hooves above the Ravine** - mounted traversal and pursuit.
4. **Quarry of Echoes** - quarry passages and escalation.
5. **Captives in the High Camp** - rescue pressure.
6. **Chief of the Broken Ridge** - Garran boss states.
7. **Paths through the Mist** - rescue resolution, Tomas escape, and invoice coda.

The palette uses breath-like flute, bowed strings, hand drums, stone and wood percussion, hoof rhythm, high-altitude air, and a distant low sponsor pulse. Music follows the Authored Adaptive Score state graph and remains presentation-only. Music, ambience, dialogue, and low-latency gameplay SFX are separate mixer categories. Combat warnings, hostage warnings, Exact Block cues, projectiles, boss tells, and objective alerts receive priority.

Generated audio is candidate source material requiring human editing, looping, state transitions, loudness normalization, browser formats, provenance, and commercial-use verification.

## 17. Save checkpoint replay and synchronization state

Stage 3 deterministic snapshots and checkpoints serialize:

- Content, rules, cheat-registry, localization, and protocol-compatible versions.
- Active heroes, profiles, devices, loadouts, resources, and Cheat-Assisted status.
- Enemy health, Defense, Resolve, combo state, role state, mounts, formations, and finite reserves.
- Garran phase, Hookstaff durability and owner, winch state, Resolve, and transition state.
- Player weapons, holder, position, condition, exact revolver ammunition, empty state, and consumed state.
- Opened containers, food, consumed supplies, optional branches, ecology discoveries, and Museum state.
- Gao/Tao, An, and Ren rescue commitment, condition grade, route state, shelter state, and presentation flags.
- Horse identity, allocation, rider, Stability, availability, disengaged state, and replacement state.
- Environmental object, fragment, cart, scaffold, barrier, cargo, and persistence state.
- Research sample and documentation presentation state without allowing mandatory continuity loss.
- Tomas reveal, radio event, cabin sighting, escape commitment, and coda state.
- Garran capture, private-case availability, key/testimony, damaged invoice, batch reference, Sponsor Dossier, and results eligibility.

Restart, reconnect, host migration, guest participation, backup/import, and profile re-entry cannot duplicate or erase weapons, ammunition, food, horses, rescues, condition grades, evidence, rewards, or completion. A protocol, content, rules, cheat, or state-hash mismatch blocks readiness or triggers the approved authoritative recovery path rather than guessing.

## 18. Data package requirements

The Stage 3 content package requires stable logical IDs and versioned data for:

- Stage, regions, encounters, checkpoints, optional branches, objectives, and results.
- Localized place, character, enemy, item, costume, achievement, Museum, and music names.
- Six enemy roles and Garran's complete boss graph.
- Four weapon families plus the boss Hookstaff and five-round revolver profile.
- Four recovery-item families and difficulty placements.
- Mountain-horse profile, allocations, replacement, and mounted encounter actions.
- Captive groups, condition transitions, safe routes, shelters, and presentation variants.
- Environmental surfaces, breakables, fragments, carts, hazards, winches, and persistence policies.
- Tomas events, radio, cabin sequence, escape, coda, Garran case, invoice, and Sponsor Dossier evidence.
- Store costume manifests and free default-evolution manifests for four heroes.
- Music states, ambience, SFX, subtitles, transcripts, still fallbacks, and media provenance.

All mandatory narrative content must be referenced by manifest and validated at load. A missing optional media asset may use its approved fallback. A missing mandatory state definition, localization entry, clue, or checkpoint dependency is a blocking content error.

## 19. Risk tiered complete path acceptance

Release requires no open Critical or High-severity defect and evidence for all of the following:

- All four heroes complete Medium solo.
- All six unique hero pairs complete Medium in hot-seat and local-Wi-Fi co-op.
- Easy, Hard, Extreme, and Ultimate receive complete solo and representative co-op coverage.
- Every mandatory rescue commits and restores correctly at Secure, Strained, and Critical presentation bands.
- Every captive survives; no hidden execution timer, unavoidable downgrade, escort softlock, or inaccessible shelter occurs.
- Both optional branches, Museum discovery, replay recovery, and localized unlock clues pass.
- Clean and Cheat-Assisted completion, difficulty unlock, reward suppression, and `STEADYRIDE` behavior pass.
- All five checkpoint payloads restore weapons, five-round revolver state, food, horses, rescues, environment, Tomas events, Garran state, and evidence without duplication or loss.
- Garran's phases, disarm, co-op grab interruption, Combo Breaker, winch warnings, redirect, live capture, and case discovery pass deterministically.
- The mandatory invoice and batch reference cannot be skipped, destroyed, duplicated, or spoiled before capture.
- Ridge Stalker and Pack Captain appear only at approved difficulties and retain accessible tells and punish windows.
- No infinite combo, firearm interrupt loop, environmental bounce loop, mounted trap, unbreakable restraint, or unavoidable boss sequence exists.
- German QWERTZ, remapping, supported gamepads, gamepad-only menus and cheats, and device reassignment pass.
- English, Simplified Chinese, and German pass layout, overflow, fallback, subtitle, transcript, clue, item, place-name, and accessibility validation.
- Completion does not depend on color, speech, vibration, video, high motion, or a generated voice. Still fallbacks and reduced motion pass.
- Reference profile targets 60 FPS; the minimum profile remains playable at stable 30 FPS with only approved cosmetic reductions.
- Local-Wi-Fi readiness, rollback, authoritative correction, reconnect, content-version mismatch, and host recovery pass in mounted, rescue, boss, and evidence states.
- The release package includes coverage matrix, severity-reviewed known issues, performance results, localization and accessibility results, rights and provenance manifest, and versioned content, rules, checkpoint, and replay hashes.

## 20. Production appendices and data gates

### A. Exact frame data

All hero, enemy, boss, mount, weapon, environment, hostage-interaction, and rescue actions require versioned 60 Hz data. Required fields include input acceptance, startup, active, recovery, hit-stop, movement curve, invulnerability or armor, hitbox, hurtbox, target filters, reaction, hit-stun, guard-stun, launch and ground behavior, damage, Defense, Resolve, Stability, Integrity, ammunition, meter, scaling, threat cost, cancel rules, checkpoint identity, network event identity, and accessibility cue timing.

Candidate values remain **Combat Lab Candidate** until determinism, anti-infinite, solo, co-op, boss, hostage, checkpoint, difficulty, accessibility, and network tests pass.

### B. Final artwork and asset register

The controlled Stage 3 package includes:

- Stage 3 default-evolution and two Store costume sets for four heroes.
- Mountain-horse models and mounted animation coverage.
- Luo Fen, Deng Hao, Gao Wen, Tao Min, An Bo, Ren Xia, Tomas Stage 3, Garran, four core enemies, Ridge Stalker, and Pack Captain.
- Silvervein Moonbell, documented samples, storage, maps, radios, portable medical equipment, and non-actionable research visuals.
- Hiking Staff, Wood Axe, Quarry Hammer, revolver, Quarry Hookstaff, containers, and four food families.
- Lower Switchback, Qinglan, Moonbell Basin, Echo Quarry, Broken Ridge Camp, High Winch Terrace, optional branches, breakables, hazards, Museum record, UI icons, story art, and still fallbacks.

Every manifest entry records logical ID, source tool or model, prompt, references, creator consent where applicable, date, provenance, human edits, commercial-rights evidence, locale and quality variants, hashes, dependencies, animation anchors, collision relationship, and delivery bundle.

### C. Encounter balancing

Encounter data defines spawn composition, Threat Budget, concurrent major actions, warning floors, hard-control limits, per-hero and co-op pressure, mounted pressure, hostage exposure, resource placement, weapon access, optional-branch cost, morale, surrender, checkpoint boundaries, and difficulty substitutions.

Telemetry captures damage source, defense choice, combo termination, restraint escape, rescue condition transition, weapon ammunition, horse Stability, environmental interaction, branch timing, boss transition, live capture, clue commitment, checkpoint recovery, and network correction.

Population baselines may change only through validated tuning. Tuning cannot remove the 12 encounter locations, boss, two optional branches, mandatory rescues, weapon classes, advanced enemy identities, or evidence continuity.

### D. Final dialogue localization and media

Production must author final briefing, radio exchange, captive dialogue, Tomas-Ren exchange, Garran confrontation, capture, invoice discovery, elder response, and lowland coda in all required languages. Scripts must preserve the non-actionable medical boundary and the sponsor reveal schedule.

Final story frames, Flow clips, subtitles, transcripts, voices, music, ambience, SFX, and accessibility variants require a shot or asset register, continuity references, source history, review status, and fallback.

### E. Explicitly deferred production values

- Exact action frames, hitboxes, damage, Defense and Resolve values, AI weights, and threat budgets.
- Final spawn tables, map dimensions, camera bounds, horse speeds, checkpoint payload sizes, rollback window, and browser-performance budgets.
- Exact score, Credits, achievement names and thresholds, condition thresholds, Store prices, and unlock wording.
- Final dialogue, voice casting, subtitle timing, cinematic shot count, animation, effects, artwork, music masters, ambience, SFX, and Museum layout.
- Final commercial-use verification for every generated, recorded, licensed, or commissioned asset.

These deferrals permit implementation and production planning. They do not authorize changes to the approved route, hostage survival, research boundary, hero roster, Tomas escape, Garran capture, sponsor clue, difficulty identities, combat legality, accessibility promises, or canonical transition without design review.

## 21. Specification review gate

This specification is ready for builder review. Approval authorizes implementation planning, production breakdown, Combat Lab authoring, content manifests, and test planning. It does not automatically lock candidate numerical balance or authorize changes to the shared engine.

Builder review must confirm:

1. Every required state has one authoritative owner and a deterministic serialization path.
2. The rescue-first route never miscommunicates Tomas as a failed chase objective.
3. Mandatory research continuity and the invoice cannot be lost through gameplay, checkpoint restore, replay, or network correction.
4. Every boss, enemy, mount, weapon, and environmental action uses shared legal combat budgets.
5. All essential information has localized visual or textual access independent of generated video and audio.
6. Deferred values remain data-defined and pass their stated promotion gates before final content lock.

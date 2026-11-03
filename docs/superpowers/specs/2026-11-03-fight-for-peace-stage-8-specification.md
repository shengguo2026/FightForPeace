# Fight for Peace — Stage 8: Fight for Peace Specification

**Version:** 1.0 approved  
**Date:** 2026-11-03  
**Stage ID:** `story.stage8.fight_for_peace`  
**Status:** Approved by the user on 2026-11-03 after fresh builder review and seven approved consistency clarifications  
**Implementation planning:** Not started  

## 1. Authority and title

This is the controlling product, narrative, gameplay, presentation, persistence, accessibility, and release-validation specification for Stage 8. `story_line.md` remains the campaign-continuity authority.

| Language | Title |
|---|---|
| English | Fight for Peace |
| Simplified Chinese | 为和平而战 |
| German | Kampf für den Frieden |

The permanent combat engine is unchanged. Exact frame data, numerical balance, economy, geometry, final assets, and browser budgets remain production work.

## 2. Purpose and fixed outcome

Stage 8 occurs days or weeks after Stage 7. A lawful Council intervention protects uninvolved people and records, captures Damon and Han as noncombatants, defeats and captures Rhea alive, secures sufficient archives, begins restitution, and resolves the campaign through peace and individual accountability.

The stage must not permit civilian death, destroy the legal case, make Damon or Han bosses, kill or release Rhea, introduce a higher mastermind, force family reconciliation, require co-op, add permanent weapons, change the combat engine, or enable Story Automatic Highlights.

## 3. Seven-Link Peacekeeping Intervention

Target duration is 58–68 minutes first clear and 40–50 minutes replay. There are eleven mandatory encounters plus Rhea, two optional branches adding 7–10 minutes, and four protected review transitions.

The four transitions are fixed and ordered. **Evacuation Review** follows Employee Services and its optional branch; Employee Services Secured commits before playback and Data-Control Spine follows. **Archive Review** follows Hold the Data Spine and its optional branch; Data Spine Secured commits before playback and Damon follows. **Leader Custody Review** follows Damon's live custody; Damon in Custody commits before playback and Operations Yard follows. **Final Accountability Review** follows live Rhea/Han custody; Command Complex Contained remains the pre-Rhea recovery anchor, while captures and Campaign Completed commit transactionally before playback and the ending follows.

All four are skippable, pausable, recap-accessible, and excluded from active time. They cannot alter resources, score, incidents, eligibility, enemies, or condition ledgers. Quitting during one resumes at its protected boundary without objective replay or reward duplication. Release tests verify exactly four, correct order, complete/partial skip, interruption recovery, and identical gameplay-state hashes before/after playback except for the declared anchor/completion commit.

1. Regional Council Intervention Staging.
2. Forum Public Atrium.
3. Employee Services Concourse.
4. Logistics and Data-Control Spine.
5. Compact Operations Yard.
6. Transport Hub.
7. Steering Command Complex.

Active links stream without conventional loading or required backtracking. One bounded Hub vehicle section is not a full mount route. Canon always protects people, preserves sufficient evidence, and captures all three leaders. Performance changes score, archive completeness, property, Museum, and epilogue detail only.

## 4. Opening and roster

The 30–40-second skippable **Mandate to Protect / 守护之令 / Mandat zum Schutz** shows off-site Stage 7 evidence, controlled judicial authorization, ordinary Forum life, Council approach, and Rhea lockdown without framing the institution as an enemy.

The briefing prioritizes uninvolved people, evidence, stopping coercion, and live capture. Sheng Guo rejects revenge. Kael and Wayfarer coordinate voluntarily without patrol membership. Stage 7 ledgers remain safe off-site.

Selectable heroes are Mountain Guardian, River Scout, Wind Sentinel, Fire Warden, and Kael. Solo chooses one; co-op two unique. Unselected Kael grants no advantage. Soren and Chen Yue remain non-playable external Story allies.

## 5. Civilians and Public Atrium

### Encounter 1 — Open the Forum Doors

Authenticate the intervention order, distinguish marked hostile lockdown personnel from ordinary security, release two exits, and clear routes. Ordinary security may surrender, withdraw, or assist.

### Encounter 2 — Hold the Public Atrium

Defend exits, stop three route-control pylons, prevent a Jammer from disabling both indicators, and transfer the public cohort. Only completed pylon actions are condition incidents; Jammer suppression is tactical pressure and never changes cohort condition.

Mandatory cohort lifecycle is `Sheltered → Routes Open → Evacuating → Council Safe`. Zero completed hostile route-control actions yields Secure; first yields Delayed plus alternate route; second yields Emergency Assisted plus slower extraction. Interrupted/further actions do not count, worsen, or farm. Council Safe locks condition. People have no Health, death, grab, shield, or environmental state.

Solo permits one evacuation/system channel; co-op two staggered different reachable controls. Warnings state route, direction, consequence, and window and never begin off-screen. Public assets are protected; tagged lockdown equipment is legal.

## 6. Employee Services

### Encounter 3 — Protect the Support Corridor

Manually restore three safe partitions, clear access routes, and transfer employee-support, first-aid, and assisted workers. Two distinct warned, once-only hostile actions determine this cohort's condition: **Isolation Lock** separates one protected care zone, while **Emergency Re-seal** closes one restored safe partition. Zero completed actions yields Secure; either one yields Delayed; both yield Emergency Assisted. Interrupted attempts do not count, completed actions cannot repeat or be farmed, and neither action can injure, kill, trap, or remove a civilian. Formation Guards and Baton Interceptors debut. Partitions cannot crush, trap, or remove manual access. Robot support is optional.

Medical/access/employee/emergency assets are protected and cannot become combat or recovery objects. Formula, herbs, medication, and medical supplies never become power-ups. The optional medical-wing decision follows.

## 7. Archive Completeness and Damon

Archive condition uses three once-only degradation tokens: **Physical Record** for a completed hostile relocation or inventory-corruption action in Encounter 4; **Backup Set** for completed loss of authenticated backup redundancy in Encounter 5; and **Transmission Index** for completed victim/asset-index deletion in Encounter 5 or Damon's deletion action in Encounter 6. Damon can affect only the Transmission Index token. Zero spent tokens is **Complete**, one is **Reconstructed**, and two is **Essential Set**. A repeated incident against an already spent token affects efficiency/score only and cannot degrade Archive condition again.

If a third distinct token would be spent, a special eligibility-preserving recovery returns to the relevant encounter boundary with Archive condition at Essential Set and the first two tokens still committed. It retains committed time, consumed resources, and unrelated incidents from the failed attempt, does not reroll enemies or restore provisions, and cannot be used for score farming. This is the only exception to ordinary non-improving restore semantics; it protects the canonical minimum rather than improving the pre-attempt Archive state.

### Encounter 4 — Preserve the Physical Record

Secure three physical archive groups, stop relocation and Jammer inventory actions, and transfer records to Council custody. Records cannot become weapons or environment.

### Encounter 5 — Hold the Data Spine

Isolate three authenticated backup nodes, maintain a manual transmission path, stop deletion, and preserve the victim/asset index. Every node has a slower accessible manual fallback. The contingency-vault branch decision follows.

### Encounter 6 — Damon’s Last Transaction

Damon visibly attempts to delete the acquisition index, transfer asset keys, and seal the suite. Index deletion can spend the Transmission Index token only if it remains unspent; otherwise it affects efficiency/score only. Completed asset-key transfer records the once-only Damon entry in the Custody Incident Ledger and affects restitution detail; suite sealing affects efficiency only. Heroes defeat protection, secure controls, lawfully open the suite, and perform non-QTE custody.

Damon has no Health, Defense, Resolve, attacks, weapons, or boss phase; cannot be attacked, shield, escape, destroy the case, or transfer assets permanently; and receives assessment, rights notification, and live custody.

## 8. Operations Yard

### Encounter 7 — Break the Command Line

Defeat three formations and disable three finite/readable command platforms providing formation timing, defensive positioning, or reserve-route guidance. Benefits never raise Health, hide warnings, or exceed budget. Robot support cannot complete platform objectives.

### Encounter 8 — Open the Transport Route

Break the final yard formation, interrupt two route seals, secure manual override, and protect Hub credentials. A fixed convoy reaches the Hub. Zero completed seal actions yields **Route Secured** with the escort disabled and no barrier; one yields **Route Disrupted** with one active escort and no barrier; two yields **Route Forced** with one active escort plus one route-pressure barrier.

Tagged Compact yard objects are legal. Council equipment, structure, power, and routes are protected. Machinery cannot crush. The yard has no civilians.

## 9. Transport Hub

### Encounter 9 — Cut Off the Withdrawal

A 2–3-minute evacuated sequence provides one finite-Stability response bike solo or per co-op hero, safe/voluntary dismount, and equivalent on-foot route. Pressure Gates are Close the Departure Lane, Disable the Escort Relay, and Secure the Transfer Bridge.

Hub actions can only improve the inherited Yard state and never reactivate or worsen it. Three successes always yield no escort and clear any barrier. Two keep Route Secured at no escort, while Route Disrupted/Forced yield one disabled neutral-cover vehicle and clear any barrier. Zero/one keep Route Secured at no escort, Route Disrupted at one active finite defensive position, and Route Forced at that position plus its barrier. The barrier creates only a clearly warned alternate approach and active-time pressure; it cannot block a gate, automatically damage heroes, create a wave, alter canon, or affect Rhea. Han/Rhea transfer safely. Bikes park before the Complex and cannot ram, explode, carry evidence, or become weapons. Exact safety and state persistence apply.

## 10. Steering Command Complex and Han

### Encounter 10 — Secure the Command Floor

Defeat the command formation, secure three controls, open noncombatant exits, and resolve the bounded Hub escort result. Any active escort has finite ammunition/Guard, becomes inert, and never persists.

### Encounter 11 — End the Withdrawal

Stop two custody-record destruction attempts, secure transport controls, defeat Rhea’s last ordinary formation, and contain Han. Each completed destruction attempt records its own once-only Han entry in the Custody Incident Ledger. Han uses an untargetable fixed transition to a protected chamber. Completion clears all adds and opens Rhea.

After Rhea’s capture, Council performs Han’s non-QTE live custody. He cannot escape, fight, shield, destroy proof, or become a boss. Legitimate emergency/custody/work/property/structure/evacuation assets are protected; tactical equipment is legal.

## 11. Integrated support network

One shared robot has **six independent encounter allocations**: one in Hold the Public Atrium, Protect the Support Corridor, Hold the Data Spine, Break the Command Line, Secure the Command Floor, and Rhea. Unused allocation does not carry between encounters; consumption/disruption affects only its encounter, and checkpoints preserve each completed encounter's result without duplication. Rhea's one allocation spans all three phases, never refreshes on transition or mid-attempt retry, and returns to its exact pre-attempt available state only when the whole fight restarts from Phase 1.

- Mobile Cover: non-damaging marked cover.
- Objective Interference: pauses, never cancels/completes, one hostile channel.
- Evacuation Guidance: highlights manual route and extends one current interruption window without opening/moving.
- Recovery Relay: shortens one hero-performed revive/protected interaction without healing/reviving/completing.

One effect runs. First pre-activation disruption permits one cooldown retry; second or success consumes. Jammers suppress current effect only. Difficulty cannot weaken support. State persists. Rhea permits Cover/Relay only; other options are Not Applicable. She has one warned active-effect suppression, never unused allocation or resources. Robot cannot attack, carry, open, preserve, capture, drive, complete, affect Rhea equipment/combos, or deal final hit. Every use has an unassisted solution.

## 12. Final Intervention Equipment and property

Stage-only temporary pickups are Telescoping Response Staff with complete routes, finite Security Sidearm, one-magazine Compact Security Automatic, and single-use fictional Concussion Capsule. No reload/refill. Authorized/disarmed acquisition only; no pre-equip, storage, purchase, or export. Rhea’s baton is boss evidence.

Authored legal breakables use `Intact → Damaged → Broken` and safe fragments. Batteries, glass, live electronics, medical equipment, evidence, records, lockers, and safety systems never become debris weapons.

Exclusive ledgers are Public and Employee Services; Archive and Data Preservation; Operations and Transport Infrastructure; Command and Custody Integrity. Each is Protected at zero avoidable player incidents, Disturbed at one/two, and Damaged at three-plus. One authored cluster counts once. Compact tactical/exempt actions do not count. People, evidence, medical systems, custody targets, critical controls, and routes are immune. Shared firearm, friendly-fire, and environmental anti-loop rules apply.

## 13. Enemies and difficulty

Core roles are Formation Guard, readable Baton Interceptor, finite-Guard/directional-field Shield Controller, and narrow local Systems Jammer. Extreme adds a limited Vector Lieutenant. Ultimate retains it and adds separable/counterable Command Anchor plus Command Striker occupying two slots with a visible finite link, no revive/shared Health/hidden warning/objective overlap.

| Difficulty | Solo | Co-op |
|---|---:|---:|
| Easy | 4 | 6 |
| Medium | 5 | 7 |
| Hard | 6 | 8 |
| Extreme | 6 | 8 |
| Ultimate | 6 | 8 |

Formation families are Controlled Entry, Shielded Intercept, Split Lockdown, Data Suppression, Command Wedge, Withdrawal Screen, and Vector Formation. Solo permits one objective/aim/specialist command; co-op two staggered separate channels. Advanced coordination cannot overlap critical channels. No crossfire, off-screen action, hidden warning, combo spawn, waves/Health inflation, or Rhea adds.

## 14. Final boss — Rhea Calder

Rhea Calder / 瑞娅·卡尔德, approximately 48, uses visible Health, Defense, Resolve, Combo Breakers, anti-infinite, and live capture.

**Vector Authority:** complete empty-hand kit. Separate finite Command Bracer, Shoulder Deflector, and Leg Stabilizer strengthen selected counters, aerial defense, and dash/low resistance. Legal break causes one stagger and removes only its benefit; breakage is optional.

**Baton Directive:** at Resolve threshold, finite non-pickable command baton adds complete routes, reach, Guard pressure, sweeps, and one warned player-weapon disarm. It cannot leave, reset resources, or be endlessly retrieved; unarmed fallback is defined.

**Last Order:** at low Resolve, baton is removed and surviving wearable functions disconnect. Earlier breaks reward score/shorter transition but intact pieces do not punish. Pure Vector combat uses shorter readable strings, finite-cost conversions, and one warned desperation grab with co-op rescue. No tech, heal, reset, adds, or escape.

Three ordinary readable boss actions are the designated **Every Vector Answered** predicates: Phase 1 **Cross-Axis Palm**, Phase 2 **Directive Arc**, and Phase 3 **Final Vector Strike**. Each accepts either an Exact Block or its approved Counter response and none is required to win.

Zero Resolve yields non-QTE disarm, assessment, restraint, live custody, and stand-down. No death, escape, or secret phase.

## 15. Optional branches and Museum

**Care Must Continue / 照护不可中断 / Die Versorgung muss weitergehen** follows Employee Services and uses access → bounded Guard/Jammer clear → three care zones → evacuation → rejoin. Medical assets remain protected and never become items.

**Accounts for Every Victim / 每一位受害者都有记录 / Aufzeichnungen für jedes Opfer** follows Hold the Data Spine before Damon and uses dual authorization → bounded Shield/Jammer clear → victim index → asset records/three indestructible folios → custody → rejoin.

Any clear grants **Compact Accountability Archive / 联合体问责档案 / Archiv zur Rechenschaft des Kompakts**. Both create **Peace and Restitution Collection / 和平与追偿典藏 / Sammlung für Frieden und Wiedergutmachung** and eligible **No One Left Unrecorded / 无人被遗忘 / Niemand bleibt unerfasst**.

Branches reconnect, time-compensate, loss-proof, checkpoint, and never duplicate. Skip never blocks. They never gate S, evidence, capture, ending, or base Museum and grant no power.

## 16. Solo/co-op equivalence

Both modes share route, content, conditions, captures, robot, gates, resources, and ending. Solo uses one hero/channel/bike with compensated timing. Co-op uses two unique heroes, at most two staggered separate channels, and two bikes without extra gates/objectives; scaling adds coverage, not Health.

All state is once-only host authority. Any hero completes every objective; Kael is never required. First valid input resolves. Friendly fire/harmful collision are off. Camera/regroup and later-window extension after partner down apply without automatic downgrade. Rhea permits rescue and shares all state once. Separate normalized records/informational contributions apply; shared rewards and nothing requires co-op.

## 17. Checkpoints and recovery

Anchors are Intervention Begins, Employee Services Secured, Data Spine Secured, Damon in Custody, Operations Yard Secured, Transport Hub Secured, and Command Complex Contained. There is no mid-Rhea checkpoint; Phase 1 restarts exactly.

Snapshots include all hero, civilian, archive, branch, property, vehicle, robot, enemy, leader, Rhea, score, network, and integrity state. Restore cannot improve, reroll, replenish, duplicate, reverse, reopen, or change conditions.

Validated recovery and one consumed suspension preserve eligibility. Continue retains ending/postgame only and removes competitive/economy/prestige. Restart is fresh. Disconnect standby plus reconnect/migration before resumed play preserves class. Solo continuation marks Party Changed at safe boundary, withdraws absent state safely, retains story/Museum/ending/postgame only, and cannot regain eligibility.

## 18. Score and ranks

| Category | Points |
|---|---:|
| Civilian Protection and Evacuation | 25 |
| Archive Preservation and Restitution | 25 |
| Leadership Apprehension and Custody | 20 |
| Combat and Nonlethal Mastery | 15 |
| Property and Operational Discipline | 10 |
| Resource and Active-Time Efficiency | 5 |

Valid clear requires all mandatory people safe, Essential Set+, live Damon/Rhea/Han. Ranks are C valid below60, B60, A75, S90. The **Custody Incident Ledger** has three once-only entries: Damon's completed asset-key transfer and Han's two completed custody-record destruction actions. Zero entries is clean custody. Each completed entry deducts two points from Leadership Apprehension/Custody, to a minimum of 14, and adds no separate rank cap. Interrupted/repeated actions do not count or farm. Damon index deletion is Archive-only, suite sealing efficiency-only, and Han record actions custody-only; no event double-counts. Live custody remains canonical. S needs all Secure, Archive Complete, all four ledgers no worse than Disturbed, and clean custody. Delayed/Reconstructed caps A; Emergency Assisted/Essential Set caps B; one/two Damaged categories cap A/B. Wearable breaks never required.

Branches add five post-rank points each with time compensation and never gate S. Access time is excluded and farming prevented. Ineligible classes keep ending/postgame only.

## 19. Achievements and rewards

Eight eligible achievements are clear; each branch; combined No One Left Unrecorded; all mandatory cohorts Secure **Everyone Returns Safely**; Archive Complete **The Full Account**; all four property ledgers Protected **Peace without Ruin**; and **Every Vector Answered**. The last requires an Exact Block or approved Counter against Cross-Axis Palm, Directive Arc, and Final Vector Strike plus Rhea's live capture in one uninterrupted boss attempt. Phase transitions preserve progress; full Phase-1 restart clears it and mid-phase retry cannot preserve/duplicate it. Progress is team-shared in co-op and either hero may answer each action. Wearables, baton break, hero, co-op, and difficulty are not requirements; normal eligible-run rules apply.

Any clear unlocks full postgame, Chronicle, all Story Chapter Challenges, completed-stage Remixes, final Museum, credits, and difficulties. First eligible clear grants Credits/outfit visibility; first A Open Hands and Shield emblem; first S **Guardian of Peace / 和平守护者 / Hüter des Friedens**; first Ultimate **Peacekeeper of the Eight Paths / 八程和平守望者 / Friedenswächter der acht Wege**. Rewards are bounded, non-power, and never require co-op, purchase, hero, or costume. Story Highlights remain off.

## 20. Provisions and costumes

Health is Employee Meal Pack; Defense Emergency Hydration Pouch; Attack Response Energy Chew; balanced Coordination Center Meal, all localized. Medium solo has two each common/one Meal; co-op three each/one shared. Easy adds one each; Hard/Extreme/Ultimate remove one/two/three commons; Meal remains. Safe authorized locations, no branch provisions, no medical-item conversion, shared J state, and ordinary-only FULLPANTRY apply.

Five Story heroes receive free canonical mature protective defaults; Sheng/key civilians modernize consistently. Purchasable visual-only character-specific **Regional Peacekeeping Coordination Outfit / 区域和平维护协调装 / Regionale Friedensschutz-Koordinationsausrüstung** and **Peace and Reconciliation Festival Attire / 和平与和解庆典礼服 / Festkleidung für Frieden und Versöhnung** cover five Story heroes plus unlocked Soren/Chen Yue/Reed Warden. First eligible clear reveals per-hero purchases. No mechanics/story changes or Compact glorification.

## 21. Canonical ending

Immediate accountability captures all leaders alive, secures archives/assets, individually reviews personnel, and begins independent Forum administration. There is no higher mastermind. Restitution, victim claims, legitimate-program preservation, separate proceedings, historical acknowledgement, and permanent anti-collective-punishment reform follow.

The village return celebrates accountable protection, Wayfarer independence, humane technology, and continued peacekeeping. Kael chooses **Meet Now / Reply and Meet Later / Not Yet** to Xu Lian through a profile-stored noncombat choice affecting one still/Chronicle note only; Tomas is absent and no choice changes canon/rewards.

Final image is the modern bridge at sunrise over restored river. Sheng’s localized line is: “Strength does not create peace. It protects the chance to build it.”

## 22. Guide, Academy, and cheats

Guide **Final Intervention and Peacekeeping / 最终干预与和平维护 / Letzte Intervention und Friedenssicherung** covers every system with post-clear detail. Academy **Peacekeeping Mastery Course / 和平维护精通训练 / Meisterkurs Friedenssicherung** uses seven synthetic lessons plus post-clear Fight for Peace Trial/full Rhea. Established practice/access rules apply; training grants/transfers nothing and never gates ending.

No new cheat. Shared codes retain narrow scopes. STRONGHANDS excludes Guard/Rhea equipment/nodes/property/vehicles/objectives/custody; TRUSTYTOOLS Response Staff only; STEADYRIDE player bike while preserving play; QUIETCROWD retains specialists/objectives/leaders/Rhea; FULLPANTRY ordinary only; HOMECOMING exact; SAFEPASSAGE Not Applicable. Cheat-Assisted retains full ending/postgame/content/catalogue/Kael choice but no competitive/economy/achievement/prestige. Co-op consent applies.

## 23. Archive, replay, and Campaign Completed

The stage versions all systems/hashes and blocks co-op mismatch. Archive stores complete configuration, mission, leader, Rhea, result, ending, and Kael-choice facts with separate ineligible/Legacy history; no Highlights.

Compact nonvideo deterministic replay simulates only when compatible, otherwise shows localized summaries and grants/changes nothing. First canonical clear creates durable **Campaign Completed** access/credits/Challenge/Remix/Chronicle/Museum/postgame/Academy/Store/Kael response. Response changes only in dedicated Chronicle. Asset removal/export/import preserve and label everything; incompatible suspends remain readable; no analytics upload.

## 24. Presentation and audio

Presentation uses silent small-motion **Mandate to Protect**, state-shaped **The Last Order Ends**, three-chapter **Peace Is Built** with in-engine Kael choice, and replayable accessible chaptered **Those Who Built Peace** credits/provenance/postgame summary.

Generated media uses approved endpoints, one action/axis, no speech/readable text/logos, two-failure simplification/editing/still fallback. Full EN/zh-Hans/DE plus optional separate Windows narration, redundant non-color/access cues, access-time exclusions, reduced simulation-preserving effects/input, remapped German keys/gamepad, and independent skip/recap apply.

Audio family **Strength in Service of Peace / 为和平服务的力量 / Stärke im Dienst des Friedens** contains Mandate to Protect, Open the Forum Doors, Hold What Must Remain, Break the Command Line, Cut Off the Withdrawal, multi-layer Vector Command, The Last Order Ends, Peace Is Built, and authored eight-family Those Who Built Peace medley. Adaptive stems never leak state and duck under essential cues. Full SFX have captions/non-audio/reduced-audio paths. Generated audio requires human finishing, project-original motifs, no lyrics, and creation-date rights/provenance.

## 25. Release gate

Coverage includes five solo heroes/ten pairs; all difficulties, rules, inputs, co-op, browsers; seven links, eleven encounters, branches, leaders, presentation; every civilian/archive/property/enemy/equipment/environment/bike/robot/provision/score state; all checkpoint/network/archive/replay/version/asset/profile/postgame/choice paths; and EN/zh-Hans/DE/accessibility/performance peak.

Negative proof forbids civilian death/follower/shield/medical powerups; insufficient evidence/archive below Essential/Stage7 proof damage; missing/duplicate/contradictory custody; Damon/Han combat; Rhea death/escape/adds/hidden phase/infinite baton/reset/mandatory wearable break; off-screen/hidden/unavoidable/overlap/extra waves; lost/duplicated state; route destruction/lethal bikes/autonomous robot; co-op/hero gates; Cheat rewards; Story Highlights; forced reconciliation/choice overwrite/Tomas pardon/collective punishment/higher mastermind; persistence/credits/postgame corruption; or settings/frame rate changing outcomes.

Peak validation combines maximum co-op cap, two warnings, robot, fragments, gunfire, civilians, and full localization/access UI. Release requires zero unresolved Critical/High defects. Deferred production data cannot violate approved boundaries.

## 26. Completion criteria

Feature design is complete when this specification passes fresh builder review, every material gap is approved/logged, and the user approves the reviewed document. Implementation planning begins only after a separate explicit request.

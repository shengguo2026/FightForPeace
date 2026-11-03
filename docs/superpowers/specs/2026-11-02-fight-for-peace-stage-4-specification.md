# Fight for Peace Stage 4 Product Content and Technical Specification

**Version:** 1.0 approved  
**Date:** 2026-11-02  
**Stage title:** *The Weight of Inheritance* / *传承之重* / *Die Last des Erbes*  
**Campaign continuity source:** `story_line.md`  
**Decision ledger:** `Features_Decisions.md`  
**Shared-system source:** `docs/superpowers/specs/2026-10-18-fight-for-peace-game-specification.md`  
**Previous-stage source:** `docs/superpowers/specs/2026-11-01-fight-for-peace-stage-3-specification.md`

## 1. Status and interpretation

This document converts the approved Stage 4 decisions into one build-facing content specification. It extends the shared game and campaign contracts; it does not fork or replace combat, input, profiles, economy, saves, localization, accessibility, networking, deterministic simulation, Museum, Store, Guide, Academy, cheats, or media systems.

Priority order:

1. Player safety, readable counterplay, deterministic state, accessibility, progression integrity, and canonical continuity.
2. Shared game specification, `story_line.md`, and this Stage 4 specification.
3. Validated Stage 4 action, encounter, economy, presentation, and performance data.
4. Candidate tuning values and production placeholders.

Items marked **Deferred** are production or validation work rather than unresolved feature choices. They must remain data-defined and cannot silently change the route, canonical outcome, evidence logic, rival behavior, live-capture requirement, accessibility promise, or reward boundary.

Stages 1–3 remain locked except for shared-system fixes that do not alter their approved content. Stage 4 may reuse their engine contracts but may not retroactively insert its vehicles, enemies, routes, evidence, or narrative consequences.

## 2. Purpose and pillars

Stage 4 occurs approximately six weeks after Stage 3. Garran's damaged invoice and procurement batch receive initial authentication. Tomas convinces his son Kael that the regional evidence convoy carries falsified material intended to complete the family's persecution. Kael, Soren Beck, and Chen Yue intercept it. Their protection of ordinary people conflicts with Tomas's story, and authenticated records eventually force Kael to reconsider inherited revenge.

Stage pillars:

- **Protect people and proof:** evidence and civilians matter more than defeating enemies quickly.
- **Conflict without dehumanization:** Kael and his companions are responsible opponents with protective principles, not cruel caricatures.
- **Genuine victory, lawful custody:** Kael must be defeated through the complete combat system and captured alive.
- **Movement without escort frustration:** authored secure anchors replace persistent convoy AI.
- **Truth through corroboration:** no confession or single object resolves the history.
- **Choice beyond inheritance:** Kael chooses neutrality without instant absolution, village membership, or forced family reconciliation.
- **One canonical transition:** disputed historical records require Stage 5's playable reconstruction.

## 3. Approved approach and rejected alternatives

The approved approach is a **Five-Act Chain-of-Custody Route** with authored convoy transitions, a **Three-Part Chain-of-Custody Ledger**, bounded rival appearances, a deterministic motorbike pursuit, and hybrid cinematic/in-engine evidence presentation.

The following alternatives were considered and rejected:

- Persistent escort AI was rejected because it would turn the chapter into vehicle babysitting and create network and checkpoint failure risks.
- Permanently destructible mandatory evidence or civilian death was rejected because it could erase campaign truth and undermine the nonlethal protection theme.
- Soren and Chen as additional bosses were rejected because their growing doubt and protective withdrawals are narratively more important than farming three boss victories.
- A voluntary or scripted Kael loss was rejected because his later moral choice requires an authentic defeat and accountable custody.
- A fully generated dialogue cinematic was rejected because evidence exposition, localization, and continuity need authored in-engine control.
- Story-mode Automatic Highlights were rejected because that feature remains Curated-Mission-only; Stage 4 uses lightweight authored replay bookmarks.

## 4. Scope and inherited architecture

Stage 4 supports:

- Solo Story Mode.
- Same-device two-player co-op.
- Host-authoritative local-Wi-Fi two-player co-op.
- Keyboard and supported gamepads through abstract remappable input.
- English, Simplified Chinese, and German.
- Easy, Medium, Hard, Extreme, and Ultimate under shared unlock rules.
- Standard Loadout, Open Loadout, Assisted, Cheat-Assisted, and Continued classifications.

Mountain Guardian, River Scout, Wind Sentinel, and Fire Warden are selectable and solo-complete. Co-op uses any two different heroes; duplicates are forbidden. Kael, Soren, and Chen are not Story selections in Stage 4.

The implementation remains TypeScript and Vite, Phaser presentation, framework-independent fixed-step deterministic simulation, DOM UI, host-authoritative Wi-Fi with bounded rollback and hashes, and IndexedDB transactional profiles with portable backup/import.

Stage 4 is a data-centric package. It adds evidence-ledger states, protected-actor states, rival Resolve exits, road enemies, utility weapons, motorbike pursuit data, Kael's boss graph, optional branches, five checkpoints, result-ledger fields, replay bookmarks, wardrobe manifests, and media assets without forking the engine.

## 5. Narrative specification

### 5.1 Opening and false premise

The skippable opening shows Kael, Soren, and Chen protecting unrelated travelers and taking no reward. Tomas's courier then delivers manipulated instructions claiming that the convoy carries manufactured evidence against the Rell family.

The village receives authenticated transfer authorization and deploys the selected hero or heroes to protect the neutral archivist, travelers, civilians, and sealed originals until they reach the Regional Council evidence facility.

### 5.2 Growing doubt

Soren disengages from a trade-road confrontation to protect endangered travelers. Chen abandons a non-injurious attempt to restrain the archivist when waystation civilians need treatment. At the final approach, both urge withdrawal. Kael orders them to escort civilians and remains to accept responsibility for the confrontation.

### 5.3 Truth Under Seal

After genuine defeat, Kael is restrained, medically assessed, and treated with dignity. A neutral examiner connects four authenticated groups:

1. Garran's invoice and procurement batch.
2. Tomas's pharmaceutical-formula dispute and broker trail.
3. Xu Lian's sealed financial and legal records.
4. Tomas's instructions and communications to Kael.

Sheng Guo distinguishes the father's genuine betrayal from the unjust collective exile of the family. That injustice explains Tomas's pain but does not excuse his adult fraud, manipulation, or violence. Xu Lian's identity is disclosed; whether Kael later meets her remains his choice.

### 5.4 Canonical outcome

Every completion preserves one canon:

- Mandatory evidence reaches authenticated custody.
- The archivist and mandatory civilians survive and complete their safe routes.
- Soren and Chen withdraw to protect civilians.
- Kael is genuinely defeated, treated, and captured alive.
- Kael accepts responsibility, suspends allegiance to Tomas, and chooses neutrality.
- Kael neither joins the village nor receives instant absolution.
- Historical contradictions trigger mandatory Stage 5 reconstruction.

Performance changes grade, rewards, optional records, and bounded presentation inserts, never these facts.

## 6. Five-Act Chain-of-Custody Route

First-clear target is 35–45 minutes; experienced replay target is 25–30 minutes.

| Act | Region | Mandatory content | Optional/system focus | Checkpoint |
|---|---|---|---|---|
| 1 | Council Transfer Yard | Verify transfer, protect release, two encounters | Evidence tutorial, Baton/Tire Iron introduction | CP1 after convoy release |
| 2 | Changling Trade Road | Protect travelers, two encounters, Soren Resolve appearance | Road impacts, first motorbike pressure | CP2 after Soren withdrawal |
| 3 | Damaged Waystation | Mandatory evacuation corridor, two encounters, Chen Resolve appearance | Annex branch, provisions, breakables | CP3 after clearance |
| 4 | Broken-Road Pursuit | Two mounted-to-dismounted encounters | Recorder branch, Stability, utility bikes | CP4 after pursuit |
| 5 | Evidence-Facility Approach | Two encounters, rival withdrawal, Kael boss | Final chain checks and lunchbox | CP5 immediately before Kael |

Convoy movement between secure anchors is authored presentation, not a continuously simulated escort target. No hidden timer exists. An optional route cannot block the mandatory corridor or S eligibility.

## 7. Chain-of-Custody state model

### 7.1 Sealed originals

The sealed originals are one aggregate protected evidence case containing multiple authenticated packets. The case owns one **Secure**, **Disturbed**, or **Recovered** state while the event ledger records each seal, threat, breach, recovery, location, and attribution. Originals cannot be permanently destroyed, lost, duplicated, or replaced. A breach triggers an authored recovery and grading consequence.

Hashes and working copies support authentication but do not replace the originals as the stage's central protected proof.

### 7.2 Archivist and civilians

Four authoritative protected units are tracked independently: the neutral archivist, trade-road travelers, main waystation group, and optional annex group. Each uses **Protected**, **Evacuating**, and **Cleared** states and may suffer at most one bounded marked disruption per run. Only one disruption may be active globally. Protected people have no ordinary Health or death state. Only designated, clearly warned objective actions can cause disruption. Ordinary contact, off-screen activity, cosmetic hazards, or network correction cannot change their state.

### 7.3 Convoy recorder

Allowed states are **Intact**, **Damaged**, and **Lost**. The recorder affects score, achievement eligibility, optional Museum material, and the second branch. It never gates mandatory truth, Stage 5, or Kael's decision.

### 7.4 Fixed breach opportunities

Exactly two predetermined evidence-breach opportunities exist. Each is an embedded phase of an already counted mandatory encounter, never a dynamically inserted encounter or separate spawn group. Recovery resolves within that encounter graph and commits before the next checkpoint. The first recovered breach may remain S-compatible under the grading rule; the second recovered breach caps the run at A. No third breach opportunity exists, preserving the literal ten-encounter route and bounded anti-farming state.

## 8. Playable heroes and co-op

All four heroes retain their complete approved kits, purchased legal loadouts, defensive systems, Combo Breakers, weapons, mounted identities, and unique movement/combo graphs.

Every objective, branch, grade, and boss phase is solo-complete. Co-op adds role division rather than compulsory simultaneous interactions. Partner rescue interrupts eligible temporary holds and Kael chain-control states; a solo hero always has a readable self-escape or Academy-trained defensive answer.

Co-op adds approximately 35–40% ordinary pressure through complementary lanes. It does not duplicate Soren, Chen, Kael, specialists, objectives, hazards, evidence, recorder, vehicles, or protected actors.

## 9. Resolve-limited rivals

### 9.1 Soren Beck

Soren uses defensive savate, long-range precision kicks, evasive footwork, and protected disengagement. The player must first reach his protected Resolve exit threshold. His Resolve cannot fall below that floor. Only then does the authored traveler-danger event become active and trigger his voluntary withdrawal. He cannot be defeated, restrained, looted, or farmed.

### 9.2 Chen Yue

Chen uses judo redirection, safe throws, non-injurious restraint, and emergency response. The player must first reach her protected Resolve exit threshold. Her Resolve cannot fall below that floor. Only then does the authored civilian-treatment event become active and trigger her voluntary withdrawal. She cannot be turned into a boss, custody target, loot source, or repeated score source.

### 9.3 Final withdrawal

At the evidence-facility approach, Soren and Chen urge withdrawal. Kael directs them to escort civilians. Their departure is canonical and does not reduce Kael's boss Health, Resolve, Defense, AI, or phase requirements.

## 10. Enemy roster and encounter baseline

Core roles:

- **Road Blocker:** ordinary close-range lane denial.
- **Baton Interceptor:** mid-range utility control with readable recovery.
- **Bike Pursuer:** mounted pressure followed by safe dismounted combat at zero Stability.
- **Restraint Controller:** temporary warned holds with legal self-escape and partner rescue.
- **Convoy Breaker:** Extreme specialist with designated evidence/support pressure.
- **Counter Grappler:** Ultimate specialist with advanced defense and short ground conversions below Kael's complexity.

The route has ten mandatory ordinary encounters, two per act, plus Soren, Chen, Kael, and at most one brief engagement per optional branch.

Initial solo ordinary-enemy targets:

| Difficulty | Target | Identity |
|---|---:|---|
| Easy | 20 | Lower decision speed and simple role mixes |
| Medium | 28 | Reference pressure |
| Hard | 32 | Stronger mixed formations |
| Extreme | 35 | Includes two Convoy Breakers |
| Ultimate | 38 | Includes Convoy Breakers and two Counter Grapplers |

Simultaneous ordinary threat caps at four solo and six co-op. Only one marked objective action may approach completion at once in solo and two in co-op. No off-screen state change, protected-boundary spawn, execution, firearm, military/sponsor identity, lethal crash, or inescapable restraint is legal.

Counts are playtest baselines. Tuning may not remove acts, rival appearances, specialist identities, Kael, branches, or readable counterplay.

## 11. Kael boss specification

Kael uses a three-phase empty-hand graph and the shared boss, anti-infinite, Defense, Resolve, scaling, recovery, and co-op rescue rules.

### 11.1 Measured Pursuit

Pressure boxing, compact head movement, body counters, low kicks, lane cutting, and disciplined advance. The phase teaches spacing and defensive conversion without unreactable cross-lane pressure.

### 11.2 Chain Control

Clinches, linked takedowns, controlled ground transitions, joint control, throws, readable self-escape, and partner rescue. No hold is indefinite, off-screen, or simultaneously unavoidable for both heroes.

### 11.3 Burdened Resolve

Tighter defense, Exact Blocks, Counter conversions, and one Defense-consuming Combo Breaker after his companions leave. The phase adds no armor, rage immunity, reinforcements, evidence-based statistics, or voluntary defeat.

Kael must reach the legal defeat state through player action. Only then may restraint, treatment, live custody, and evidence review begin. Phase carryover, combo separation, and checkpoint restoration cannot skip this requirement.

## 12. Motorbike pursuit

Broken-Road Pursuit is a bounded authored Chase profile. Solo provides one utility motorbike; co-op provides one per active hero. Controls include lane steering, capped speed, brake, evasive action, one mounted strike, and authored dismount.

Each bike has Stability. Zero Stability causes a safe forced dismount, never death or an explosive crash. The route remains fully completable on foot, and regroup occurs at the next secure anchor. A held weapon is safely stowed across the riding transition and restored according to exact ownership state.

In co-op, a forced-dismounted hero continues on foot inside the same bounded pursuit arena. The successful rider remains mounted but receives a shared-camera tether and speed cap that prevents abandoning the partner. Both states simulate simultaneously under the same authoritative encounter and collision space until the next secure anchor, where every active hero returns on foot. The successful rider is not automatically dismounted early, although the section ends with the authored all-on-foot transition.

The bikes are stage-local, non-Store, nonpersistent, and cannot enter free roam, traffic simulation, civilian collision, or firearm combat.

## 13. Weapons, environment, and recovery

### 13.1 Pickable tools

- **Folding Road Baton:** fast interrupt, guard/Resolve pressure, and unique standing, aerial, low, and ground actions.
- **Tire Iron:** slower committed impact, guard pressure, knockback, low sweep, and tagged road-object interaction.

Both use shared `T`/directional attack graphs, `J` pickup/throw-discard, ownership, durability, disarm, handoff, affinity, anti-infinite, checkpoint, and deterministic recovery rules. They are stage pickups, not pre-stage equipment or permanent Store weapons.

### 13.2 Deterministic Roadside Impact Network

- Transfer Yard: handcarts, cases, and barriers.
- Trade Road: barriers, crates, guardrails, and frames.
- Waystation: furniture, shutters, carts, and shelving.
- Broken Road: warned cargo, stone, and barrier hazards.
- Facility Approach: dividers, document carts, and retractable barrier.

Shared damage, Resolve, scaling, rebound, ground-bounce, anti-infinite, quota, and debris rules apply. Environment cannot crush civilians or custody targets, destroy evidence, close the only route, cause lethal falls/crashes, or change timing under reduced effects.

### 13.3 Roadside Provision Set

- Life: **Waystation Noodle Box / 驿站面餐盒 / Nudelbox der Raststation**.
- Defense: **Citrus Electrolyte Drink / 柑橘电解质饮料 / Zitrus-Elektrolytgetränk**.
- Attack Bar: **Roasted Nut Bar / 烤坚果棒 / Gerösteter Nussriegel**.
- Balanced: **Convoy Lunchbox / 护送餐盒 / Proviantbox des Geleits**.

Medium solo uses 3/2/2 common items; co-op adds one per common category. Each active hero receives one pre-Kael lunchbox. Easy adds one per common category; Hard, Extreme, and Ultimate remove one, two, and three common items without eliminating a category or lunchbox. Placement occurs at safe points. Effects are gameplay abstractions, not medical claims.

## 14. Optional branches and Museum

### 14.1 No One Left at the Waystation

**No One Left at the Waystation / 驿站不留一人 / Niemand bleibt an der Raststation** evacuates a service-annex group. If skipped, the Council rescues them canonically. Completion prevents its bounded disruption and discovers a text-free road-guardian training token.

### 14.2 The Record Survives

**The Record Survives / 记录留存 / Die Aufzeichnung bleibt erhalten** recovers the separated recorder as Intact or Damaged before its valid Lost outcome.

Completing both in one eligible run grants **People and Proof Preserved / 人证物证皆保全 / Menschen und Beweise bewahrt** and upgrades an early road-guardian Museum exhibit. Later Wayfarer Watch commentary may expand it. Branches never gate S, Kael capture, mandatory truth, Stage 5, or base Museum access.

## 15. Grading, achievements, and rewards

The 100-point **Chain-of-Custody Guardian Grade** is:

- Evidence and chain of custody: 40.
- Archivist, traveler, and civilian safety: 25.
- Combat and nonlethal control: 25.
- Resource and active-time efficiency: 10.

Candidate thresholds are B 60, A 75, and S 90. Clear requires live Kael custody, authenticated-original delivery, and safe mandatory actors. S permits either one recovered evidence breach or one resolved civilian disruption, not both, and requires S-band collateral. Lost recorder has no automatic cap. Major avoidable protected damage caps B. Branch time is compensated; pause, cinematics, loading, protected interactions, custody, and validated recovery do not count.

Eight achievements:

1. *The Weight of Inheritance* eligible clear.
2. *No One Left at the Waystation*.
3. *The Record Survives*.
4. *People and Proof Preserved*.
5. **Unbroken Chain / 证据链无损 / Lückenlose Beweiskette**.
6. **Safe Testimony / 证人安然 / Sichere Aussage**.
7. **Broken Road, Unbroken Ride / 断路疾行 / Ungebrochene Fahrt**.
8. Optional co-op **Together on the Road / 同路并肩 / Gemeinsam auf der Straße**.

Any canonical clear grants Stage 5, mandatory Chronicle/Museum records, and current-hero Stage 4 wardrobe visibility. The first eligible Standard, Open, or Assisted clear grants itemized Credits once across those categories. First A grants the text-free **Verified Passage** emblem; first S grants **Keeper of the Chain / 证据链守护者 / Hüter der Beweiskette**. Assisted A/S may earn the same emblem/title in its separately labelled category. Co-op is never required.

Cheat-Assisted and Continued completion receive their approved access and narrative records but no competitive score, rank, Credits, performance achievement, emblem, title, or prestige result. Assisted grades and records remain separate.

Assisted achievement eligibility is aid-specific. **Extended Protection Window** disables **Unbroken Chain** and **Safe Testimony**. **Guided Road Control** disables **Broken Road, Unbroken Ride**. **Extended Grapple Response** disables **Together on the Road**. The clear, branch, and combined-branch achievements plus any unaffected performance achievement remain available when their normal conditions are met. Continued Runs receive no achievement, Credits, grade, emblem, title, or competitive record.

## 16. Visual and wardrobe specification

### 16.1 Current heroes

Road and Convoy Guardian outfits:

- Mountain Guardian: **Stoneway Escort / 石道护运装 / Steinweg-Geleitschutz**.
- River Scout: **Currentline Courier / 流线信使装 / Strömungskurier-Outfit**.
- Wind Sentinel: **Crosswind Interceptor / 侧风截卫装 / Seitenwind-Abfangschutz**.
- Fire Warden: **Ember Convoy Guard / 烬火护运装 / Glut-Geleitschutz**.

Traveler's Homecoming outfits:

- Mountain Guardian: **Homeward Stone / 归途磐石装 / Stein der Heimkehr**.
- River Scout: **Returning Current / 归流礼装 / Heimkehrende Strömung**.
- Wind Sentinel: **Clear-Wind Homecoming / 晴风归乡装 / Heimkehr im klaren Wind**.
- Fire Warden: **Hearthfire Return / 暖炉归乡装 / Heimkehr zum Herdfeuer**.

All are meaningful, character-specific, visual-only redesigns preserving silhouette, animation anchors, and combat readability. They are individually Credit-purchasable after catalogue reveal and work with every legal loadout.

### 16.2 Kael

Kael's default **Independent Road Fighter** model uses dark indigo, charcoal, muted rust, pale sand, concealed rib padding, grappling gloves, articulated trousers, and flexible road-wrestling boots. It supports Traveler Protector, Convoy Interceptor, Burdened Resolve, and Live Custody conditions.

At his later approved Wayfarer Watch/free-mode unlock, the default is granted and two delayed Stage 4 alternatives become visible for Credit purchase:

- **Wayfarer Roadguard / 行旅守望装 / Wegwächter-Outfit**.
- **Chosen Road Attire / 自择之路礼装 / Gewand des selbst gewählten Weges**.

Neither implies village membership, forces Xu Lian reconciliation, grants power, or reveals the Compact.

### 16.3 Soren and Chen

Soren's stable base is a tall, lean ash-blue/cream/mustard road-savate design. Chen's is a compact muted-plum/smoke-grey/sage judo-response design with an ordinary response pouch. Both carry personal three-path training tokens and support Traveler Protector, Misdirected Interceptor, and Civilian Withdrawal conditions without premature Wayfarer uniform or sponsor disclosure.

## 17. Presentation, localization, music, and SFX

### 17.1 Truth Under Seal presentation

The opening and coda use hybrid presentation. Generated Flow footage is text-free, dialogue-free, low-motion, and limited to content already present in controlled start/end frames. Complex action, player-selected heroes, evidence comparison, and factual exposition remain in-engine.

English, Simplified Chinese, and German subtitles, transcripts, still-image fallback, skip, and Museum review are mandatory. Optional branch and recorder states may add bounded inserts but cannot alter truth or Kael's decision.

### 17.2 Burden of Blood music family

Seven cues:

1. *Records in Transit*.
2. *Doubt at the Waystation*.
3. *Wheels under Pressure*.
4. *Three Who Stand Together*.
5. *Kael — Inherited Weight*.
6. *Truth Under Seal*.
7. *A Road Chosen Freely*.

Traveling strings, wheel-like percussion, restrained modern rhythm, unresolved harmony, and an emerging Wayfarer motif define the family. The sponsor motif is only faint evidence-review color and cannot disclose the Compact.

Evidence confirmations, civilian warnings, motorbike Stability, defensive feedback, partner rescue, and Kael grapple/phase cues take mix priority through bounded music ducking. Every essential cue has visual and optional vibration equivalents. Music never controls gameplay. Generated music requires human loop editing, provenance, and commercial-use verification.

## 18. Guide, Academy, accessibility, and cheats

### 18.1 Protect the Chain

The localized **Protect the Chain / 守护证据链 / Schützt die Beweiskette** Guide card is available from briefing, pause, and Help. It explains objective states, branches, rival Resolve, warnings, Stability, live capture, and eligibility consequences.

Academy offers spoiler-safe **Convoy Interruption**, **Road Control**, and **Break the Hold** lessons. First clear unlocks **Kael Matchup Lab** for authentic grapple defense, ground recovery, Exact Block, Combo Breaker, and punish training. Training never gates progress, rank, achievement, move ownership, or power.

### 18.2 Evidence-Road Accessibility Profile

Standard-eligible accommodations include redundant symbols/text/audio/captions/screen-reader cues, target lines, current remapped prompts, independent motion/effect reductions, steering sensitivity/dead zone/lane/camera controls, hold/toggle alternatives, and non-color co-op alerts.

Simulation-changing aids create an Assisted result:

- **Extended Protection Window**.
- **Guided Road Control**.
- **Extended Grapple Response**.

Assisted play retains Story, checkpoints, ordinary Credits, purchases, Hero Mastery, Museum progress, and separate grades/records. Original-timing achievements and Standard/Open comparison remain unassisted. Shared co-op aids require readiness consent. No objective requires hearing, color, rapid tapping, pointer input, camera motion, or vibration.

### 18.3 Cheat profile

No new Stage 4 cheat is added. Shared hero codes apply. `TRUSTYTOOLS` protects carried tool integrity only. `STEADYRIDE` prevents player Stability loss without bypassing riding. `QUIETCROWD` lowers pressure without removing authored rivals, variants, or Kael. `FULLPANTRY` affects eligible ordinary containers only. `HOMECOMING` restores the exact latest snapshot. `SAFEPASSAGE` displays Not Applicable because mandatory targets cannot suffer completion-blocking permanent loss.

Any active code marks the team Cheat-Assisted. Co-op configuration and consent follow shared rules.

## 19. Persistence, result ledger, and replay

### 19.1 Five-Anchor Evidence Snapshot

CP1 follows convoy release; CP2 traveler protection and Soren withdrawal; CP3 waystation clearance and Chen withdrawal; CP4 pursuit resolution; CP5 final-approach clearance before Kael. Mission start is the fallback before CP1.

Snapshots serialize heroes, resources, loadouts, weapons, provisions, ownership, evidence, protected actors, branches, recorder, bikes, Stability, forced dismount, environment, collateral, enemies, score, time, caps, achievements, anti-farm facts, deterministic encounter state, co-op authority, inputs, recovery, versions, and eligibility.

Restore cannot repair, reroll, duplicate, erase, reopen, repeat, or improve state. Validated technical recovery and one checkpoint-only transactional suspension preserve eligibility. Defeat-based or voluntary checkpoint continuation becomes a Continued Run while preserving canonical completion and Stage 5 access.

### 19.2 Chain-of-Custody Result Ledger

Five localized result sections:

- Evidence Integrity.
- People Protected.
- Combat and Restraint.
- Road Performance.
- Recognition and Records.

The ledger stores all state transitions, attribution, grade components and caps, branches, rewards, configuration, assistance, cheats, continues, recovery, version, and compatible personal-best comparison.

Stage 4 has no Automatic Highlight detection or screenshot capture. Lightweight authored replay bookmarks may identify evidence recovery, civilian rescue, pursuit completion, and Kael custody.

## 20. Data package requirements

Stable versioned data and logical IDs are required for:

- Stage, acts, regions, encounters, checkpoints, objectives, branches, and results.
- Evidence originals, archivist/civilians, recorder, transitions, warnings, and attribution.
- Four playable heroes, six legal pairs, Soren, Chen, Kael, and every visual condition.
- Six enemy roles, population profiles, concurrency caps, and difficulty substitutions.
- Kael's complete three-phase graph and custody transition.
- Player and enemy motorbikes, Stability, route, obstacles, dismount, and fallback.
- Folding Road Baton, Tire Iron, stow/restore, durability, ownership, and weapon graphs.
- Roadside environment objects, hazards, fragments, collision, persistence, and protected filters.
- Four recovery families and solo/co-op/difficulty placements.
- Grade, cap, achievement, reward, catalogue, emblem, title, Museum, and Chronicle manifests.
- Current-hero wardrobes, Kael default and delayed alternatives, and spoiler gates.
- Guide, Academy, accessibility, assistance, cheat applicability, and localized explanations.
- Cinematics, stills, subtitles, transcripts, voices, music, ambience, SFX, cues, and provenance.
- Result ledger, replay bookmarks, records, suspension, recovery, migration, and legacy behavior.

Missing mandatory state, localization, evidence, boss, checkpoint, or fallback data is a blocking content error. Optional media may use its approved fallback.

## 21. Evidence-to-Archive Acceptance Matrix

Release coverage includes:

- All four heroes solo and six unique pairs.
- Every difficulty and Standard/Open/Assisted/Cheat-Assisted/Continued classification.
- Keyboard, supported gamepads, hot-seat, and local-Wi-Fi.
- Supported browsers at 60-FPS target and stable 30-FPS minimum without simulation difference.
- Every valid evidence, protected-actor, recorder, branch, vehicle, weapon, environment, resource, checkpoint, collateral, enemy, specialist, rival, and Kael state.
- Every grade, cap, achievement, reward, wardrobe reveal, Museum update, ledger entry, and replay bookmark.
- Crash, reload, suspension, reconnect, host migration, backup/import, migration, and legacy paths.
- EN, zh-Hans, and DE plus remapping, captions, screen reader, non-color cues, reduced effects, hold/toggle input, and Assisted options.
- Guide, Academy, wardrobe, cinema, transcript, music, and SFX paths.

Negative proof is required against:

- Permanent mandatory-evidence loss or civilian death.
- Hidden or unwarned objective change.
- Route, branch, vehicle, custody, checkpoint, or co-op softlock.
- Infinite combo, unavoidable simultaneous grapple, unreadable Kael action, or scripted Kael loss.
- Lethal crash or protected-target weapon/environment damage.
- Restore improvement, reroll, duplication, repeated reward, or score farming.
- Duplicate hero or incorrect co-op attribution.
- Premature sponsor/Compact disclosure.
- Story-mode Automatic Highlight activation.
- Language, frame rate, quality, or input-dependent simulation.

Release permits zero unresolved Critical or High-severity defects.

## 22. Production appendices and data gates

### A. Exact frame data

All hero, rival, enemy, boss, motorbike, weapon, environment, objective, restraint, and rescue actions require versioned fixed-step data: input acceptance, startup, active, recovery, hit-stop, movement, armor/invulnerability, hit/hurt boxes, target filters, reactions, stun, launch/ground state, Health, Defense, Resolve, Stability, Integrity, meter, scaling, threat cost, cancel tags, quotas, warnings, checkpoint identity, network event, and accessibility cue timing.

Candidate values remain Combat Lab Candidate until determinism, anti-infinite, solo, co-op, evidence, protected-actor, pursuit, boss, checkpoint, difficulty, accessibility, and network tests pass.

### B. Final artwork and asset register

The controlled asset package includes five regions, convoy and evidence props, four heroes and eight current-hero Store outfits, Kael and four conditions plus two delayed alternatives, Soren, Chen, six enemy roles, two tools, motorbikes, four provision families, environment states, optional branches, Museum token/recorder, UI icons, story art, generated-shot frames, and still fallbacks.

Every asset records logical ID, source, model/tool, prompt, references, consent where applicable, date, provenance, human edits, commercial-rights evidence, locale and quality variants, hashes, dependencies, animation anchors, collision relationship, and delivery bundle.

### C. Encounter balancing

Encounter data defines composition, Threat Budget, concurrency, objective actions, warning floors, control limits, hero/co-op pressure, mounted pressure, resource placement, branch cost, morale, surrender, checkpoint boundaries, and difficulty substitutions.

Telemetry captures state transitions, damage, defense, combo termination, restraint escape/rescue, evidence breach/recovery, protected disruption, recorder, weapon, Stability, environment, branch timing, rival exit, Kael transition/custody, checkpoint recovery, and network correction.

Tuning cannot remove five acts, ten mandatory encounters, rivals, Kael, specialist identities, branches, vehicle fallback, evidence continuity, or legal counterplay.

### D. Final dialogue, localization, and media

Production authors final courier delivery, briefing, traveler incidents, rival exchanges, Kael confrontation, custody, neutral examination, Sheng Guo explanation, Xu Lian disclosure, Kael decision, and Stage 5 transition in all three languages.

Media production must obey the small-motion Flow rule, include controlled start/end frames, keep generated source text-free and dialogue-free, and provide subtitles, transcripts, still fallback, shot register, source history, review status, and commercial-use evidence.

### E. Deferred production values

- Exact frames, hitboxes, damage, Defense, Resolve, Stability, AI weights, and Threat Budgets.
- Final spawn tables, map dimensions, camera bounds, pursuit speed, rollback window, payload size, and performance budgets.
- Exact Credit awards, Store prices, resource values, final thresholds after validation, and tuning telemetry bounds.
- Final dialogue, acting, subtitle timing, shot count, animation, effects, artwork, music masters, ambience, SFX, and Museum layout.
- Final commercial-use verification for generated, recorded, licensed, or commissioned assets.

These deferrals do not authorize changes to story, route, evidence safety, protected survival, rival exits, Kael's genuine defeat and neutrality, Stage 5 transition, difficulty identities, combat legality, accessibility, or reward restrictions.

## 23. Specification review gate

This specification passed fresh builder review and received user approval on 2026-11-02. It is the controlling Stage 4 document. Approval authorizes later implementation planning, production breakdown, Combat Lab authoring, content manifests, and test planning; it does not itself begin implementation or lock candidate balance.

Builder review must confirm:

1. Every evidence, protected-actor, rival, vehicle, boss, checkpoint, and result state has one authoritative owner and deterministic serialization path.
2. The authored convoy anchors eliminate persistent escort AI without making protection feel cosmetic.
3. Mandatory truth and Stage 5 access cannot be lost, duplicated, skipped, or contradicted.
4. Soren and Chen cannot be farmed or converted into bosses/custody targets.
5. Kael cannot reach custody without a complete legal victory.
6. Every essential warning and story fact remains available without color, audio, motion, generated speech, or generated video.
7. Cheats, Assisted rules, Continued Runs, rewards, wardrobe reveals, and records cannot leak eligibility.
8. Deferred values remain data-defined and pass their promotion gates before content lock.

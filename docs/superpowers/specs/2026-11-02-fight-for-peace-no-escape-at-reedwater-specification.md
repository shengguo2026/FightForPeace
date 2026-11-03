# Fight for Peace - No Escape at Reedwater Product Content and Technical Specification

**Version:** 1.0 approved design

**Date:** 2026-11-02

**Curated Mission title:** *No Escape at Reedwater* / *芦水渡口：无处可逃* / *Kein Entkommen in Schilfwasser*

**Decision source:** `no_escape_at_reedwater_feature_story_line.md`

**Campaign continuity source:** `story_line.md`

**Shared game source:** `docs/superpowers/specs/2026-10-18-fight-for-peace-game-specification.md`

**Expanded-mode source:** `docs/superpowers/specs/2026-11-01-fight-for-peace-expanded-game-modes-specification.md`

## 1. Status, intent, and interpretation

This document converts the approved Reedwater decisions into a build-facing mission specification. It extends the permanent Combat Constitution and Curated Mission framework. It does not replace shared combat, controls, input abstraction, profile, economy, accessibility, localization, networking, deterministic simulation, Museum, Guide, Academy, cheat, Automatic Highlight, package, or media rules.

Interpretation priority:

1. Player safety, readable counterplay, accessibility, deterministic state, and profile integrity.
2. Shared game and expanded-mode specifications, campaign continuity, and this mission specification.
3. Validated mission action, encounter, economy, localization, and presentation data.
4. Candidate values and production placeholders.

**Confirmed** rules require a new approved design decision to change. **Production baseline** values may change through documented tuning without changing the feature model. **Deferred** work requires production or validation, not another product decision.

The selected documentation approach is a two-document handoff: `no_escape_at_reedwater_feature_story_line.md` remains the readable narrative and feature record, while this file owns build-facing contracts and acceptance. A combined file was rejected because it would mix canon review with implementation state and validation detail.

## 2. Goals, non-goals, and anti-goals

### 2.1 Goals

- Deliver a complete 20-40-minute authored nonlethal apprehension case using the permanent combat engine.
- Make live custody, route control, civilian safety, restraint, and collateral discipline as meaningful as defeating enemies.
- Support all five eligible heroes in solo and all ten unique pairs in same-device and local-Wi-Fi co-op.
- Introduce Lin Lan as an optional guest and unlockable noncompetitive hero without gating progression or rank.
- Provide deterministic, recoverable pressure through three one-way escape assets and three public-safety zones.
- Add replay value through two optional branches, five difficulties, ranks, achievements, Highlights, Museum records, and state-sensitive presentation.
- Preserve the canon-compatible side-story boundary and provide no campaign-villain evidence.

### 2.2 Non-goals

- No change to Combat Constitution, controls, combo/cancel/defense rules, anti-infinite behavior, weapon framework, difficulty unlock model, or network authority model.
- No player-controlled ferry, boat, motorbike, or general vehicle system.
- No civilian Health/death, lethal custody target, hidden failure timer, permanent early escape, open-world chase, or route simulation.
- No firearm, grenade, military faction, sponsor clue, Tomas link, main-story progression, required purchase, or permanent power reward.
- No hero duplication, Lin requirement, co-op requirement, branch requirement, or single correct hero/move solution.

### 2.3 Anti-goals

The mission fails its intent even if technically completable when it:

- rewards harming civilians, helpless restrained actors, witnesses, protected commerce, or ferry safety equipment;
- lets Cassian or a lieutenant die, drown, vanish, or escape permanently;
- allows an asset to resolve without an announced actor and warning or to resolve more than once;
- creates unavoidable stacked consequences after missed interceptions;
- permits checkpoint restore, reconnect, rollback, or host migration to improve asset, civilian, collateral, custody, boss, reward, or resource state;
- requires Lin, co-op, colour, sound, motion, pointer input, an optional branch, a Store item, or a cheat;
- implies a sponsor or main-villain connection;
- forks or changes the shared combat engine.

## 3. Package and availability contract

Reedwater is an optional Curated Mission package in the Mission Hub's permanent expandable case catalogue.

### 3.1 Planning and prerequisite boundary

This specification plans **Reedwater as a mission extension**, not an end-to-end greenfield game. The shared combat runtime, Mission Hub, profile, economy, replay, local-Wi-Fi, Guide, Academy, Museum, localization, accessibility, package, and Highlight systems are prerequisites governed by the cited shared specifications. A future implementation plan must represent missing foundations as explicit predecessor work rather than silently rebuilding or redefining them inside Reedwater.

The shared game specification's “review draft” label does not authorize Reedwater to invent competing runtime contracts. Before implementation planning begins, the project must approve or version-pin the applicable shared runtime revision and identify its actual schema/interfaces, including Lin's temporary guest-hero interface. Until then, this document is a complete product/content design with a declared integration prerequisite, not approval to scaffold the base engine.

### 3.2 Entitlement neutrality

“DLC” describes packaging and distribution and does not imply that Reedwater is paid. This mission specification is entitlement-neutral. The Expanded Modes contract still requires a compatible package and gameplay assets on every local-Wi-Fi device; whether a commercial guest pass, one purchase, or two purchases grants that entitlement remains a separate global commerce decision. Acquisition, payment, and entitlement-service implementation are outside Reedwater's mission scope and must be resolved before commercial distribution planning. Same-device co-op uses one local installation.

### 3.3 Manifest and lifecycle

The package manifest must declare:

- stable case identity, package version, content hash, and schema compatibility;
- localized title and synopsis in English, Simplified Chinese, and German;
- **Canon-Compatible Side Story** label;
- chronology approximately four weeks after Stage 3, following Qinglan and before Stage 4;
- independent availability gate: Stage 3 completion, including Cheat-Assisted completion;
- no ownership or completion dependency on Qinglan or another Curated Mission;
- five eligible heroes, unique-hero co-op, and Lin guest/unlock policy;
- supported solo, same-device two-player, and local-Wi-Fi two-player configurations;
- objective, grading, checkpoint, reward, Museum, Chronicle, Academy, Highlight, accessibility, localization, replay, and migration profiles.

Before the Story gate, an installed package displays a localized spoiler-safe clue. If installed after the gate, it opens immediately. Uninstalling removes playable package assets while preserving compact completion, Lin unlock, reward, achievement, Museum, Chronicle, and record facts. If Lin's playable assets are absent, eligible selectors show **Unlocked - Assets Not Installed**. Reinstallation restores compatible access without regranting first-clear rewards.

## 4. Inherited technical architecture

The mission remains a data-centric extension of the browser game:

- TypeScript and Vite application shell;
- Phaser 2D rendering and scene coordination;
- framework-independent fixed-step deterministic simulation, candidate 60 Hz;
- DOM surfaces for Mission Hub, briefing, loadout, Guide, Academy, pause, subtitles, results, Museum, settings, and accessibility;
- abstract remappable actions for keyboard and supported gamepads;
- host-authoritative local-Wi-Fi play with frame-stamped input, bounded rollback, state hashes, version checks, reconnect, and authoritative recovery;
- IndexedDB profile persistence with transactional writes, backup/import, migration, and previous-known-good recovery.

Reedwater may extend data schemas for escape assets, civilian zones, custody targets, deterministic waterfront interactions, mounted Stability, Lin guest eligibility, mission results, optional branches, and Cassian's phase graph. It may not create a mission-only combat fork or inaccessible input semantics.

## 5. Narrative and canonical state

### 5.1 Premise

Cassian Rook's independent group controls Reedwater's public ferry crossing through illegal tolls, confiscation, intimidation, and violence. The Regional Civil Protection Council issues a lawful live-capture order. Lin Lan briefs the heroes, who dismantle the relay, winch, and motorbike escape network, clear three public zones, capture three lieutenants, and apprehend Cassian alive.

### 5.2 Canonical outcome

Every valid clear produces one outcome:

- all three public zones are safely evacuated;
- all three lieutenants enter documented live custody;
- Cassian is incapacitated under control, restrained, assessed, and transferred alive;
- confiscated property and records are returned;
- illegal toll barriers are removed and public ferry passage resumes;
- no Tomas, sponsor, Garran, or Meridian evidence is found.

Asset, disruption, branch, collateral, and boss-gate states modify grade, results, and bounded coda inserts only. They never contradict the canonical outcome.

### 5.3 Presentation boundary

All generated video is text-free, dialogue-free, logo-free, and built from stable small-motion shots. Hero selection, guest-role substitution, route state, custody detail, and other stateful content remain in-engine. Essential facts must appear in localized subtitles/transcripts or interactive presentation, never only in generated visuals.

## 6. Hero eligibility and Lin state machine

### 6.1 Eligible roster

`eligibleHeroes = { MountainGuardian, RiverScout, WindSentinel, FireWarden, LinLan }`

- Solo selects exactly one.
- Co-op selects exactly two distinct heroes.
- Every solo hero must pass every objective, branch, grade, boss, and accessibility path.
- No content may branch into a Lin-only or co-op-only solution.

### 6.2 Lin access states

Lin uses the following durable states:

1. **Unavailable:** package gate unmet or package absent and no prior unlock.
2. **GuestAvailable:** package playable; Lin selectable only in Reedwater and Reedwater Apprehension Drill.
3. **UnlockedAssetsInstalled:** any valid Reedwater clear recorded and compatible assets installed; Lin available in Academy, Curated Missions, completed Mission Remixes, and Random Operations.
4. **UnlockedAssetsNotInstalled:** unlock fact retained but assets absent/incompatible; selector communicates unavailable asset package.

Story Mode and Chapter Challenge reject Lin in every state. Cheat-Assisted clear may change `GuestAvailable` to an unlocked state but grants no Mastery or competitive reward.

Recorded guest-Lin combo demonstrations use stable move identifiers and migrate into her unlocked Academy profile. Pre-clear activity cannot create Mastery, Store eligibility, rank, or broader roster access.

### 6.3 Narrative role substitution

When Lin is not selected, she owns command-post dialogue and safe coordination scenes. When selected, a neutral Council dispatcher owns those lines and Lin exists only in the field. Dialogue/localization lookup must resolve the role before a scene begins; no frame may instantiate Lin in both places.

## 7. Mission state model

The authoritative run state includes at minimum:

- package/content/rules versions and deterministic seed;
- selected hero(s), player ownership, loadout, difficulty, ruleset, assistance, cheats, input configuration, and network authority;
- current segment, encounter, encounter budget, enemy states, and conditional group consumption;
- relay, winch, and motorbike state plus pending/consumed consequences;
- three civilian-zone states and disruption facts;
- four key custody states and handoff facts;
- branch states, witnesses, recovered property, safety equipment, archive grants, and per-hero recovery choice;
- deterministic environment, protected/expendable classification, player/enemy/mandatory attribution, and collateral ledger;
- Cassian phase, Health, Defense, Resolve, bike Stability, gate attempt, carried resources, weapon state, and transition state;
- hero resources, lives/continues, held/dropped tools, provisions, ownership, and consumption;
- grading components, caps, active time, anti-farm facts, achievements, Highlights, rewards, and unlock transactions;
- checkpoint, reconnect, rollback, recovery, replay, integrity, and result metadata.

All mission transitions are fixed-step simulation events with stable identifiers and authoritative frame numbers.

## 8. Five-Link route contract

### 8.1 Segment order

The mandatory order is:

1. Ferry Market Entry;
2. Ferry Warehouse;
3. Crane Yard;
4. Loading Platform;
5. Secured Ferry Deck.

The Right to Passage branches between 1 and 2. Secure Every Line branches between 3 and 4. Branch return points are authored and cannot skip a mandatory encounter or alter canonical order.

### 8.2 Duration and pacing

- **Production baseline first clear:** 30-40 minutes.
- **Production baseline experienced replay:** 20-28 minutes.
- Approximately eight mandatory non-boss encounters plus Cassian.
- Custody, loading, cinematics, pause, synchronized readiness, and validated network recovery do not count against active-time grading.

### 8.3 Segment completion gates

A segment completes only when its mandatory enemies/objective actors are resolved, relevant civilian movement reaches its protection boundary, declared custody finishes, and the next transition is safe. No new encounter may activate across protected custody or before civilians reach the boundary.

## 9. Escape-Network Ledger

### 9.1 Asset state machine

Each asset uses:

`Active -> Disabled`

or

`Active -> Used -> ConsequencePending -> ConsequenceConsumed`

The display may collapse consumed state to **Used**, but persistence retains pending/consumed facts. No other transition is valid. A target actor, start warning, commitment frame, interruption window, and resolution event must be explicit.

### 9.2 Authority by asset

- **Relay:** Only Signal Runners and the relay lieutenant can commit activation.
- **Winch:** Only Cargo Controllers and the winch lieutenant can commit activation.
- **Motorbike:** Only Cassian during Mounted Toll Run can resolve it. Bike Interceptors and the bike captain cannot.

### 9.3 Used consequences

- **Relay:** Exactly one group at the next eligible encounter: two ordinary Enforcers on Easy/Medium or three on Hard/Extreme/Ultimate. No specialist or objective action. The group never replenishes.
- **Winch:** Exactly one advantageous loading-platform position and one destructible cover object. No unavoidable cargo event.
- **Motorbike:** Exactly one warned mounted escape and counterable deck entry. No boss stat increase.

Pending consequences are reserved once, serialized, and consumed once. If no later eligible point exists because of technical recovery, the state remains Used for grading but may not spawn content in an unsafe segment.

### 9.4 Fairness invariants

- All-Used remains completable by every eligible solo hero.
- Used consequences never overlap into an unavoidable formation.
- Disabled assets never grant direct boss damage or skip custody.
- Difficulty may change actor composition, pressure, and window duration, never warnings, consequence identity, or canonical outcome.
- Solo and co-op share the same asset count and outcomes.

## 10. Civilian-zone contract

### 10.1 State machine

Each zone uses:

`Occupied -> Evacuating -> Cleared`

During `Evacuating`, one marked committed intimidation or route-blocking action may set `disrupted = true`; the zone still proceeds to `Cleared`. A zone can be disrupted at most once. `Cleared` is terminal and untargetable.

### 10.2 Zone allocation

- Market: vendors and travelers.
- Warehouse/crane: workers.
- Waiting area: passengers.

The final deck cannot open until waiting-area passengers are Cleared. Civilians have no combat Health, death, down, grab, collision-damage, or persistent follower state. Authored movement has redundant navigation recovery and a timeout that safely snaps actors to the protected boundary without applying a disruption.

### 10.3 Objective-action budgets

Solo permits at most one designated objective action at a time. Co-op permits at most two, staggered, against different targets. No objective action may commit during protected restraint, assessment, handoff, tutorial lock, synchronized readiness, or critical network recovery.

## 11. Custody contract

### 11.1 Key targets

`relayLieutenant`, `winchLieutenant`, `bikeCaptain`, and `cassianRook` use the live-custody pipeline:

`Combatant -> ResolveBroken -> ControlledIncapacitation -> RestraintProtected -> Assessment -> DocumentedCustody -> HandedOff`

Health depletion alone cannot kill, remove, or complete a key target. Resolve break opens the controlled interaction. Solo receives a protected restraint interval. In co-op, one hero may restrain while the other defends, but either hero can complete the interaction alone.

### 11.2 Protection rules

From `ControlledIncapacitation` through handoff, key targets are excluded from enemy targeting, player damage, throws, environmental damage, falls, collision, and off-screen cleanup. If spacing or network correction invalidates animation placement, the target snaps to a declared safe custody anchor without changing outcome or grade.

### 11.3 Held tools

Default restraint automatically places a held tool at a safe owned anchor and restores normal pickup legality after custody. If a separate Interact action is configured, data may require it instead. A tool can never block restraint, become unrecoverable, duplicate, or cross into the river.

### 11.4 Ordinary hostiles

Ordinary enemies may surrender, withdraw, or enter a group-custody presentation. The mission does not require four-stage custody for every ordinary fighter and cannot farm ordinary surrender or restraint.

## 12. Protected-property and collateral contract

Objects declare one of:

- `Protected` - avoidable player damage counted;
- `Expendable` - intended combat interaction;
- `ObjectiveSensitive` - governed by an objective state rather than general collateral;
- `RequiredTransition` - damage or state change never charged to the player.

Classification is exposed through icon, silhouette/material treatment, localized text when focused, audio/caption cues, and screen-reader semantics. Attribution distinguishes player, enemy, mandatory transition, physics consequence, and technical correction. Only avoidable player attribution may reduce grade.

Protected classes include passenger shelters, ferry safety equipment, ordinary commerce cargo, and mooring controls. Enemy-caused and required damage cannot be misattributed after rollback or replay.

## 13. Optional branch contracts

### 13.1 The Right to Passage

Required state:

- toll office entered;
- permits, receipts, and personal property secured;
- two witnesses reach Council handoff;
- bounded branch hostiles resolved;
- no sponsor clue emitted.

On completion, the relay's warning profile changes to the approved longer warning and the civilian component receives a bounded declared bonus. It does not alter actor authority, remove relay pressure, or force Disabled.

### 13.2 Secure Every Line

Required state:

- emergency mooring lines recovered;
- safety cabinets restored;
- bounded Cargo Controller group resolved;
- protected ferry equipment preserved within branch rules.

On completion, each active hero independently chooses one ownership-aware Life, Defense, or Momentum recovery. The choice is immediate, serializable, non-transferable unless shared recovery rules permit transfer, and cannot exceed validated resource caps. It does not alter winch or motorbike state.

### 13.3 Archive and achievement state

Either branch expands the Reedwater Civic Passage Archive. Both in one eligible run evaluate Reedwater Stands Free. Branches do not gate S, clear, Lin, live custody, base Museum, or main-route fairness. Cheat-Assisted completion may reveal archive content but may not grant mastery achievements.

## 14. Enemy role contracts

### 14.1 Toll Enforcer

Close guard-and-shove role with baton/shield. Only a declared intimidation action may disrupt evacuation. Its warning must remain distinct from attacks, Cassian's gate, and asset activation.

### 14.2 Signal Runner

Fast evasive role whose objective path and relay target are visibly linked. It cannot activate the winch, motorbike, custody, or civilian logic. After relay resolution, its objective capability is disabled.

### 14.3 Cargo Controller

Heavy control role using hook/rope and tagged equipment. It can operate only declared winch/barrier interactions. After winch resolution, the escape action is disabled while normal combat remains.

### 14.4 Bike Interceptor

Mounted loading-platform role with fixed warned lanes and separate Stability. Zero Stability causes deterministic safe dismount into close combat. It cannot be mounted by players, kill a protected actor, leave through a lethal edge, or resolve Cassian's motorbike.

### 14.5 Ferry Feinter and Lockdown Captain

Ferry Feinter appears only on Extreme/Ultimate and uses delayed counter bait with warning-distinct presentation. Lockdown Captain appears only on Ultimate, places one destructible barrier, and coordinates one authored two-lane formation within the ordinary encounter budget. It cannot seal the route, create infinite reinforcements, or appear with final-deck Cassian.

### 14.6 Faction content boundary

Allowed visual/equipment language: mismatched ferry workwear, toll batons, hooks, ropes, ordinary motorbikes, improvised barriers. Forbidden: firearm, grenade, military kit, Council impersonation, sponsor/Meridian mark, execution, torture, lethal crash, or futuristic equipment.

## 15. Two-Tool Custody Arsenal

### 15.1 Shared lifecycle

Both tools use the shared pickable-weapon lifecycle: authored rack/drop -> available -> owned/carried -> dropped/thrown/placed -> broken or discarded. They use abstract Attack/directional Attack and Grab/Interact actions; keyboard labels such as `T` and `J` are presentation from current bindings, not hard-coded simulation inputs.

Neither tool persists outside the case, appears in pre-stage loadout/Store, grants custody automatically, bypasses Resolve, or becomes mandatory.

### 15.2 Mooring Hook data requirements

- unique standing, aerial, and ground route identifiers;
- long spacing and pull/sweep profile;
- controlled Resolve contribution and shared scaling;
- allowlist for tagged light barriers, lines, and cargo;
- hard denylist for civilians, restrained/custody targets, Cassian, bikes, ferry, protected/essential scenery;
- deterministic fallback reaction when an interaction target becomes invalid.

### 15.3 Short Restraint Baton data requirements

- unique standing, aerial, and ground route identifiers;
- short reach, quick recovery, interruption, guard/Resolve emphasis;
- lower raw Health output than comparable heavy tools;
- no auto-restraint or special custody bypass.

### 15.4 Placement baseline

Medium solo authors two Hooks and two Batons. Co-op adds one Baton. Easy adds one additional Baton. Hard through Ultimate retain at least the Medium class availability. Exact coordinates and durability remain validated data. `TRUSTYTOOLS` changes only allowed carried-tool state; it cannot create branch items, objective property, or duplicate tools.

## 16. Deterministic environment contracts

### 16.1 Market and warehouse

Market awnings, barriers, carts, stalls, and an ordinary fragment use deterministic break/reaction states. Vendor property is protected. Warehouse shutters, racks, rope bundles, and handcarts provide cover/redirection but cannot trap a hero or seal the only route.

### 16.2 Crane yard

Suspended cargo follows fixed seeded motion and declared safe volumes. Warnings include ground silhouette, priority audio, caption, icon, and screen-reader event. Tagged cargo can be stopped, redirected, or released against eligible hostiles. It cannot affect civilians, protected actors, custody targets, or indispensable equipment. Reduced effects preserve collision and timing. The environmental cargo mechanism and escape winch use separate identifiers and state.

### 16.3 Loading platform

Bike lanes, retractable safety barriers, cargo cover, and the Ultimate barrier follow authored schedules. Collisions are warned, capped, and nonlethal. Broken barriers preserve a safe collision boundary and cannot expose a river fall.

### 16.4 Ferry deck

Bollards, ropes, secured crates, cabin corners, rails, and catch nets support declared wall/environment conversions. Rail impacts resolve to capped reactions or authored safe returns. The ferry's berth, transform, physics boundary, and departure state remain fixed. Visual water and sway never affect hitboxes, input, hazards, or simulation.

### 16.5 Shared invariants

Environment schedules are identical in solo/co-op; only eligible ordinary enemy pressure scales. All damage/Resolve/stun/bounce obey shared scaling and anti-infinite rules. Bosses receive full environmental reactions only in declared vulnerability windows. No environment interaction may create a softlock or mandatory damage.

## 17. Encounter graph and population baselines

| ID | Encounter | Mandatory roles and purpose | Terminal state |
|---|---|---|---|
| E1 | Market Toll Line | Enforcers; restraint lesson | toll line cleared |
| E2 | Market Evacuation | Enforcer, Signal Runner, intimidation | market Cleared |
| E3 | Warehouse Approach | Enforcers and Runners | relay room opened |
| E4 | Relay Control | lieutenant and limited support | relay resolved, custody complete |
| E5 | Crane Yard Entry | Controllers and Enforcers; Hook/cargo lesson | winch area opened |
| E6 | Winch Control | lieutenant, Controllers, mobile support | winch resolved, custody complete |
| E7 | Loading Approach | Bike Interceptors and Enforcers | platform control opened |
| E8 | Bike Captain | captain and bounded support | custody complete, bike remains Active |
| B1-B3 | Cassian | Mounted Toll Run, Deck Counter-Control, Last Tollgate | documented custody |

Mandatory non-boss population targets including lieutenants are 17/23/26/28/31 for Easy/Medium/Hard/Extreme/Ultimate. A Used relay adds only its fixed Enforcer group. Co-op adds approximately 35-40% ordinary complementary pressure and never duplicates lieutenants, specialists, assets, hazards, or custody targets. Exact compositions are production data.

## 18. Cassian Rook boss contract

### 18.1 Shared resources

Cassian owns continuous Health, Defense, Resolve, attack resources, anti-infinite memory, and phase state. The motorbike owns separate Stability. No resource refills or resets at area/phase transition unless an explicitly shared universal rule applies and is visible to the player.

### 18.2 Mounted Toll Run

The phase starts only after bike-captain custody and CP3. Cassian uses one readable lane at a time with warned braking sweeps, baton passes, and dismount actions. If bike Stability reaches zero before the escape threshold, state becomes Disabled and Cassian safely dismounts into a punish window. If he reaches the ferry barrier first, state becomes Used and a counterable deck-entry action follows.

The phase cannot produce lethal crash, river fall, unavoidable hit, simultaneous two-hero capture, or vehicle control. CP4 is written only after the outcome and exact boss state are authoritative.

### 18.3 Deck Counter-Control

Cassian uses baton checks, guard pressure, body counters, low sweeps, clinches, trips, and short throws. Failed counter/grapple actions expose authored recovery. Eligible grabs allow partner rescue. Disarms place tools at safe reachable anchors and cannot destroy or throw them into water.

### 18.4 The Last Tollgate

At the validated low-Resolve threshold, Cassian enters braced defense by the portable barrier and may perform exactly one emergency-gate attempt. It has distinct anticipation, commitment, interrupt, success, and consumed states. Interrupt causes stagger. Success narrows one lane and creates one destructible cover object; it cannot trap heroes or block capture. No ordinary reinforcement activates after the final deck fight begins.

### 18.5 Completion

Boss defeat means Resolve break followed by the custody pipeline. Cassian obeys Defense Bar, Exact Block, Counter, defense-consuming Combo Breaker, combo scaling, anti-infinite, throws, environment vulnerability, and co-op pressure. He has no permanent super armour, instant capture, unbreakable counter loop, or hidden escape.

## 19. Provision economy

The provision catalogue uses stable IDs for Steamed Fish Rice Bowl (Life), Citrus Barley Tea (Defense), Peanut-Sesame Crisp (Momentum), and Reedwater Work Lunchbox (balanced).

Placement baseline:

| Profile | Life | Defense | Momentum | Lunchbox |
|---|---:|---:|---:|---:|
| Easy solo | 3 | 3 | 3 | 1 |
| Medium solo | 2 | 2 | 2 | 1 |
| Medium co-op | 3 | 3 | 3 | 1 |
| Hard | baseline minus 1 authored common | | | 1 |
| Extreme | baseline minus 2 authored common | | | 1 |
| Ultimate | baseline minus 3 authored common | | | 1 |

Co-op difficulty removal is authored from its own baseline. The lunchbox always appears in the safe transition after bike-captain custody and before Cassian. Supplies never spawn during active evacuation/restraint. Objective property and safety equipment cannot be consumed. `FULLPANTRY` affects ordinary eligible containers only and cannot duplicate lunchbox, branch choice, tools, or objectives.

## 20. Grading contract

### 20.1 Components

| Component | Points |
|---|---:|
| Live Apprehension and Escape-Network Control | 45 |
| Civilian Safety and Collateral Restraint | 25 |
| Combat and Restraint Mastery | 20 |
| Resource and Active-Time Efficiency | 10 |

Clear eligibility requires all four key custody records. Candidate thresholds are C for authenticated clear, B 60, A 75, S 90. Final thresholds/components may receive validated per-difficulty and player-count curves without changing the 45/25/20/10 intent.

### 20.2 Rank caps and S eligibility

- S requires at least two Disabled assets, two undisrupted zones, and S-band collateral.
- One Used asset and one disrupted zone may coexist with S.
- Two Used assets cap A; all three cap B.
- Two disruptions cap A; all three cap B.
- Major avoidable protected-property damage caps B.
- Emergency-gate success loses declared points but is not an automatic S blocker.
- Optional branches are not required and their added active time is compensated.

### 20.3 Time and anti-farm

Active time excludes pause, cinematics, loading, synchronized readiness, protected custody, and validated technical recovery. Surrendered/restrained enemies, civilians, custody scenes, repeatable barriers, harmless destruction, warnings, and transitions cannot score repeatedly. Enemy/mandatory damage cannot lower collateral. The scoring event ledger deduplicates by stable event ID and authoritative frame.

### 20.4 Outcome matrix

Automated grading must cover all 8 asset combinations multiplied by all 8 civilian-disruption combinations = 64 primary outcome sets, then exercise boundary collateral, gate, combat, time, solo/co-op, difficulty, and branch data. Caps must be explicit and order-independent.

## 21. Achievements, unlocks, and rewards

The eight achievement definitions and localizations are authoritative in the decision source. Each has explicit eligibility facts and cannot infer success from presentation alone.

Reward transactions:

- Any valid clear: case completion, Chronicle, base Museum/media, and Lin unlock under approved modes.
- First reward-eligible clear: itemized Credits and clear achievement.
- First A: Open Passage text-free emblem.
- First S: Keeper of Safe Passage localized title.
- Branch achievements/archive expansions: reward-eligible runs only.
- Co-op achievement: optional, never required for S, Lin, Museum, or solo completion.

Cheat-Assisted completion may grant only approved access/narrative unlocks. It grants no score, rank, Credits, Mastery, achievement, emblem, title, or prestige. Reward writes are idempotent transactional events keyed by profile, case, reward ID, and compatible version category.

## 22. Presentation and localization contract

### 22.1 Opening

**The Toll at Dawn**, 25-35 seconds, is skippable and Museum-replayable. It shows ordinary work, illegal toll control, non-graphic refusal, escape infrastructure, and Council authorization. Complex action and selected heroes remain in-engine.

### 22.2 Adaptive briefing

The briefing must communicate Cassian, lawful live-capture objective, Ledger states, civilian zones, protected scenery, custody, Lin guest state, current bindings, difficulty, loadout, assistance/cheat disclosure, and co-op readiness. Lin-selected and Lin-unselected variants use the role-substitution contract.

### 22.3 Coda

**Passage Restored**, 30-45 seconds, is skippable and Museum-replayable. It communicates live custody, returned property, toll removal, safe passage, resumed service, and Lin's unlock. Optional state inserts are selected from bounded, canon-safe combinations and never imply death, sponsor evidence, or a failed canonical outcome.

### 22.4 Localization

English, Simplified Chinese, and German must cover titles, synopsis, briefing, dialogue, subtitles, transcripts, objective/state labels, achievements, rewards, Guide, Academy, errors, accessibility strings, results, Museum, and Chronicle. Text layout supports German expansion and Chinese line breaking. No essential text is baked into art/video.

## 23. Audio contract

The River Without Tolls family contains the five approved cues. Music uses the approved palette and maintains side-chain/ducking space for warnings. Ferry bells/horns and musical transients may not imitate relay, winch, bike, civilian, custody, or gate cues.

SFX buses separate motorbike, relay, winch, crane, barrier, restraint, ferry, rope, water, custody, warning, UI, music, ambience, and speech. Every essential sound has caption and non-audio equivalent. Generated media requires documented source, edit history, license/commercial-use confirmation, and final human quality review.

## 24. Automatic Highlight contract

The shared detector remains optional, enabled by default at selection, and may be disabled for performance. It observes simulation facts and cannot modify gameplay.

Reedwater profiles:

- universal Perfect Combo and Two Threats One Move;
- Guardian Intervention for committed consequence prevention;
- Defensive Mastery for an eligible exact defense plus clean punish;
- Team Harmony for evacuation/custody plus partner interruption and successful resolution;
- Environmental Ingenuity for an approved environmental control affecting an objective actor and another hostile.

Each candidate stores event IDs, zone/asset, threat, pre/post state, responsible hero/team, assistance category, and authoritative frames. At results, select maximum three and one per family. Safe screenshot frames prefer successful intervention/clearance/custody and exclude distressed civilians or helpless restrained targets. Delay, provocation, Active-state farming, protected damage, or boss extension invalidates a candidate. Highlights grant no reward.

## 25. Checkpoints, persistence, and replay

### 25.1 Four-Gate Custody Snapshot

- CP1 after relay resolution and custody.
- CP2 after winch resolution and custody.
- CP3 after bike-captain custody with motorbike Active.
- CP4 after Mounted Toll Run with motorbike Disabled/Used and exact Cassian state before Deck Counter-Control.
- Mission start fallback before CP1.

### 25.2 Snapshot invariants

Snapshots include every mission-state field in Section 7 and validate content/rules versions and integrity hashes before load. Restore cannot reroll hazards/windows, change asset state, repeat/erase consequences, reopen zones/custody/branches, repair collateral/tools/Cassian/barriers/bikes, respawn items/enemies, duplicate rewards/archive credit, or improve CP4.

### 25.3 Recovery

Validated crash, reconnect, rollback, and host-migration recovery may preserve reward eligibility when authoritative state/history remains intact. Ordinary continue use is recorded under shared rules. If compatibility or integrity cannot be established, restart from the last safe compatible checkpoint in an appropriately labelled noncompetitive/technical-recovery category or restart the case; never guess missing competitive state.

### 25.4 Results and replay

Results store custody, Ledger, civilian, collateral, branch, boss, resources, grade, caps, reward, Highlight, continue, recovery, and network facts with case/content/rules/configuration versions. Comparable categories remain separate. Curated tiered replay retention and Legacy behavior follow the expanded-mode specification. Incompatible runs retain records without false playback or recalculation.

## 26. Guide, Academy, accessibility, and cheats

### 26.1 Apprehension Operations card

First use presents a localized card covering Active/Disabled/Used, Occupied/Evacuating/Cleared/Disrupted, Resolve, restraint, custody, protected scenery, bike Stability, current bindings, and the absence of civilian death/permanent early escape. It remains in Guide and pause.

### 26.2 Reedwater Apprehension Drill

The Academy drill includes demonstration, guided practice, independent trial, and optional mastery for relay/winch interruption, evacuation, restraint with and without a held tool, Mooring Hook control, bike Stability, and gate interruption. Guest Lin is limited to Reedwater and this drill until clear; no pre-clear Mastery is awarded.

### 26.3 Accessibility

All objective state uses redundant icon, silhouette, localized text, audio, captions, target-line, and screen-reader feedback. No objective requires pointer, colour, audio, or motion. Hold/toggle/reduced-input alternatives cover restraint and evacuation. Independent reduced-motion/effects settings preserve timings and hitboxes. Simulation-changing aid records Assisted.

### 26.4 Cheats

Applicable hero cheats plus `QUIETCROWD`, `FULLPANTRY`, `HOMECOMING`, and carried-tool `TRUSTYTOOLS` follow shared definitions. `QUIETCROWD` cannot remove unique targets, custody, or asset decisions. `STEADYRIDE` and `SAFEPASSAGE` report Not Applicable. No case-specific cheat is introduced.

## 27. Networking and deterministic authority

The host is authoritative for asset commits, civilian transitions, custody anchors, environment events, Stability, Cassian phases, checkpoints, scoring, and rewards. Clients receive predictive presentation only where shared network rules permit.

Rollback/replay must reproduce actor selection, warnings, interruption windows, consequence reservation/consumption, environment schedules, damage/Resolve attribution, collision, custody, grade, and Highlights. State hashes cover all Section 7 fields needed for outcome integrity. Host migration is permitted only at shared safe points and cannot occur mid-custody, mid-asset commitment, mid-mounted transition, or during reward transaction unless the shared engine has a validated atomic migration path.

Input latency cannot shorten an announced objective window below validated local-Wi-Fi fairness. If synchronization cannot preserve a fair window, the authoritative simulation delays commitment using the shared bounded network allowance rather than granting an unwarned success.

## 28. Results UI requirements

The result screen presents:

- clear/assistance/cheat/network/recovery category;
- 45/25/20/10 component breakdown and total rank;
- all three asset outcomes and any consumed consequence;
- all three civilian zones and disruption facts;
- all four custody records;
- protected collateral summary with attribution exclusions;
- branch/archive status and per-hero recovery use;
- Cassian motorbike and gate results;
- active-time/resource summary;
- achievements, first-clear/A/S rewards, Lin unlock state, Museum/Chronicle updates;
- up to three Highlights with localized reason;
- replay/save/record compatibility and version labels.

Rank caps must identify their factual cause. Cheat-Assisted results clearly state which access unlocks persist and why score/economy/prestige do not.

## 29. Content-data and schema requirements

Reedwater content should be authorable through validated data definitions for:

- package/gate/roster/unlock policy;
- route graph, segments, branches, safe transitions, and checkpoints;
- encounter budgets, role legality, spawns, warnings, and population curves;
- asset actors, transitions, windows, consequences, and Ledger presentation;
- civilian zones, objective actions, disruption, route anchors, and safe completion;
- custody targets, animations, anchors, protected windows, assessment, and handoff;
- tools, provisions, environment interactions, protection classification, and attribution;
- Cassian phase graph, Stability, gate attempt, and transitions;
- grade components, caps, thresholds, achievements, rewards, Highlights, anti-farm, and results;
- localization, accessibility, Guide, Academy, audio, video, Museum, and Chronicle;
- migration, Legacy, test fixtures, and deterministic integrity values.

Schema validation rejects invalid state transitions, missing warnings, duplicate unique actors, missing localization/accessibility labels, unbounded spawns, forbidden hero eligibility, missing safe anchors, impossible branch returns, and reward definitions that grant combat power.

## 30. Warrant-to-Archive acceptance matrix

### 30.1 Configuration coverage

- five solo heroes and ten unique co-op pairs;
- Easy, Medium, Hard, Extreme, Ultimate;
- Standard Loadout, Open Loadout, Assisted, Cheat-Assisted;
- solo, same-device co-op, local-Wi-Fi co-op;
- supported browsers, keyboard/gamepad mixes, EN/zh-Hans/DE;
- 60-FPS target and stable 30-FPS minimum with identical simulation.

Pairwise reduction may be used for broad device/browser presentation combinations, but every hero solo, every pair, every difficulty, every ruleset, and every core state transition requires direct or formally justified deterministic coverage.

### 30.2 Functional coverage

- all eight asset combinations and all eight civilian-disruption combinations;
- automated grading of all 64 combined outcome sets;
- all branches, custody targets, handoffs, protected-property classes, and attribution sources;
- every core/specialist enemy, objective-action budget, Used-relay group, and difficulty boundary;
- complete tool lifecycle, provision baseline, ownership, `FULLPANTRY`, and `TRUSTYTOOLS`;
- every environment interaction, reduced-effects setting, safe return, and invalid target;
- Cassian Disabled/Used transitions, exact resource carry, gate interrupt/success, co-op rescue, disarm, and custody;
- CP1-CP4 restore, continue, crash recovery, reconnect, rollback, host migration, and version mismatch;
- grade thresholds/caps, achievements, first-clear/A/S reward idempotence, Lin guest/unlock/uninstalled states;
- Highlight detection/screenshot/selection, results, replay, Legacy, Museum, Chronicle, Guide, Academy, and package lifecycle;
- all localization, screen-reader, caption, reduced-input, reduced-motion, remapping, and non-pointer paths.

### 30.3 Negative proof

Tests must demonstrate absence of:

- civilian or key-target death;
- permanent Cassian/lieutenant escape;
- off-screen, unwarned, or duplicate objective resolution;
- repeated or stacked illegal consequence;
- route, branch, custody, weapon, checkpoint, or ferry softlock;
- drowning, lethal fall, lethal crash, player vehicle control, or random ferry motion;
- restore/reconnect/migration improvement, reroll, resource duplication, or boss healing/reset;
- repeated Lin/reward/archive grant, score farming, or competitive Cheat reward;
- Lin/co-op/specific-move/branch/purchase requirement;
- pointer/colour/audio/motion dependency;
- sponsor/Tomas/Meridian continuity leak.

Release permits zero unresolved Critical or High-severity defects.

## 31. Observability and tuning requirements

Development telemetry and deterministic test logs should expose, without collecting unnecessary personal data:

- interruption opportunity, commit, outcome, and window remaining;
- civilian action/disruption and clearance duration;
- custody start/completion/failure recovery;
- environment event and attribution;
- Cassian phase/resource/Stability/gate state;
- damage/Resolve/defense/anti-infinite/scaling events;
- rank component/cap/anti-farm decisions;
- checkpoint/recovery/migration/integrity events;
- accessibility/assistance category, not sensitive device identity.

Telemetry may tune windows, counts, thresholds, placement, and warnings but cannot silently change Confirmed contracts. Production data changes require deterministic regression fixtures and version/category review.

## 32. Deferred production decisions

The product design is complete. Builders and content teams must determine and validate:

- Lin's exact move catalogue, cancels, frame data, hitboxes, damage, Resolve, defense, AI, animations, voice, model sheet, costumes, and effects;
- enemy and Cassian frame data, thresholds, AI weights, vulnerability windows, lane timings, and network allowances;
- exact encounter composition, spawn coordinates, item coordinates, durability, provision values, rank thresholds, and Credit amounts;
- final environment art, protection tagging, collision, safe anchors, camera, lighting, effects, video start/end frames, subtitle timing, music, and SFX;
- performance budgets, memory/package size, browser/device matrix, rollback limits, and accessibility QA;
- final localization, cultural review, media provenance, license/commercial-use verification, and balance validation.

These choices may not contradict the mission contracts or alter the combat engine.

## 33. Definition of ready and definition of done

### 33.1 Ready for implementation planning

The mission is ready for planning when this specification is approved, shared schema dependencies are identified, Lin's temporary data interfaces are defined, and deferred values are clearly owned by content, combat, UI, media, network, accessibility, localization, and QA workstreams.

### 33.2 Done

The mission is done only when:

- all Confirmed contracts are implemented through shared systems/data;
- complete solo/co-op/difficulty/accessibility/localization paths pass;
- the 64-set outcome matrix and all negative proofs pass;
- rewards, Lin unlock, checkpoints, replay, and migration are transactional and idempotent;
- final media/provenance/localization/performance/balance are approved;
- no Critical or High defect remains;
- product review confirms the case still communicates lawful force in service of peace, without campaign-villain contamination or combat-engine change.

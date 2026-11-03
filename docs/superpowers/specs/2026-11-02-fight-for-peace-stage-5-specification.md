# Fight for Peace Stage 5 Product Content and Technical Specification

**Version:** 1.0 approved  
**Date:** 2026-11-02  
**Stage title:** *The Bell Before Dawn* / *黎明前的钟声* / *Die Glocke vor der Morgendämmerung*  
**Campaign continuity source:** `story_line.md`  
**Decision ledger:** `Features_Decisions.md`  
**Shared-system source:** `docs/superpowers/specs/2026-10-18-fight-for-peace-game-specification.md`  
**Previous-stage source:** `docs/superpowers/specs/2026-11-02-fight-for-peace-stage-4-specification.md`

## 1. Status and interpretation

This document converts the approved Stage 5 decisions into one build-facing product, content, and technical specification. It extends the shared game and campaign contracts; it does not fork or replace combat, input, profiles, economy, saves, localization, accessibility, networking, deterministic simulation, Museum, Store, Guide, Academy, cheats, Chapter Challenge, Character Chronicle, Mission Remix, or media systems.

Priority order:

1. Player safety, readable counterplay, deterministic state, accessibility, progression integrity, and canonical continuity.
2. Shared game specification, `story_line.md`, and this Stage 5 specification.
3. Validated Stage 5 action, encounter, economy, presentation, and performance data.
4. Candidate tuning values and production placeholders.

Items marked **Deferred** are production or validation work rather than unresolved feature choices. They must remain data-defined and cannot silently change the route, fixed history, evidence logic, historical roster, Qiao Lan's sacrifice, Liang Zhen's injury, Rovan's genuine defeat and live capture, individual-guilt theme, accessibility promise, or reward boundary.

Stages 1–4 remain locked except for shared-system fixes that do not alter approved content. Stage 5 may reuse shared contracts but may not retroactively insert its historical heroes, weapons, transport, enemies, evidence, or consequences into earlier stages.

## 2. Purpose and pillars

Stage 5 begins immediately after Stage 4's evidence review. Sheng Guo, Kael, and a neutral archivist compare authenticated but incomplete records. Their inquiry reconstructs the false-convoy assault approximately forty years before Stage 1, when 26-year-old Sheng Guo and 31-year-old Liang Zhen defended the village from Rovan Kest's raiders after steward Oren Rell enabled their entry.

Stage pillars:

- **Evidence before authority:** historical conclusions come from corroborated records, witnesses, physical evidence, and firsthand memory rather than Sheng's status.
- **Protection before victory:** people, reserves, warning infrastructure, and lawful custody matter more than speed or destruction.
- **Fixed history, variable service:** player performance changes protection, property, optional preservation, grade, and recognition but never canonical facts.
- **Individual guilt, no inherited blame:** Oren's betrayal is genuine; collective exile of innocent relatives remains unjust.
- **Reciprocal rescue:** Liang initially protects Sheng; Sheng later saves Liang and completes the defense.
- **Force in service of peace:** Rovan must be genuinely defeated, disarmed, treated, and captured alive.
- **Historical contrast:** manual warnings, physical ledgers, ordinary horses, work tools, and human messengers contrast with the modernizing present.
- **One continuing mystery:** historical freight infrastructure becomes an institutional ancestor of the later criminal network without making Rovan a modern sponsor.

## 3. Approved approach and rejected alternatives

The approved approach is an **Evidence-Anchored Historical Reconstruction** framed in the present, using a **Five-Act Warning Bell Defense**, **Four-Ledger Historical Defense Model**, **Three-Phase Reciprocal Rescue Handoff**, and **Three-Phase Road-Cutter** boss.

Rejected alternatives:

- Time travel, supernatural memory, and virtual-reality framing were rejected because Stage 5 concerns evidence, memory, and institutional accountability.
- Free rewriting of historical outcomes was rejected because it would create incompatible campaign timelines and weaken the moral argument.
- Modern heroes in first completion were rejected because they would make the historical reconstruction visually and narratively false.
- Oren as a combat boss was rejected because his wrongdoing is abuse of access, records, and trust; Rovan is the armed commander.
- Saving Qiao, preventing Liang's injury, or losing Rovan by script was rejected because these would turn canonical tragedy and accountability into player error or optional history.
- Graphic bodily injury was rejected; damaged structures, wagons, platforms, storehouses, and tools may still be shown clearly.
- Random physics, lethal horse crashes, and controllable cargo wagons were rejected because they undermine reproducibility and safety.
- Speed-first scoring was rejected because it would encourage abandoning people and objectives.
- Fully generated dialogue footage was rejected because historical evidence, localization, state transitions, and accessibility require controlled presentation.
- A new Stage 5 cheat was rejected because the shared catalogue already covers beginner access.
- Story-mode Automatic Highlights remain excluded; that feature is reserved for its approved Curated Mission scope.

## 4. Scope and inherited architecture

Stage 5 supports:

- Solo Story Mode.
- Same-device two-player co-op.
- Host-authoritative local-Wi-Fi two-player co-op.
- Keyboard and supported gamepads through abstract remappable input.
- English, Simplified Chinese, and German.
- Easy, Medium, Hard, Extreme, and Ultimate under shared unlock rules.
- Standard, Assisted, Cheat-Assisted, Continued, and validated recovery classifications.
- Canonical Replay and Stage 5 Chapter Challenge with historical roster restrictions.
- Post-clear Character Chronicle and noncanonical Mission Remix.

The canonical playable roster is young **Sheng Guo — Civic Apprentice** and **Liang Zhen — Field Protector**. Solo chooses one primary at briefing; co-op assigns both uniquely. Modern heroes are unavailable in first completion. Duplicate heroes remain prohibited.

The implementation remains TypeScript and Vite, Phaser presentation, framework-independent fixed-step deterministic simulation, DOM UI, host-authoritative Wi-Fi with bounded rollback and hashes, and IndexedDB transactional profiles with portable backup/import.

Stage 5 is a data-centric package. It adds historical hero graphs, ledgers, route data, transport profiles, historical weapon families, provisions, environmental states, enemy roles, Rovan's boss graph, two optional branches, five checkpoints, historical handoff state, Chronicle/Museum records, wardrobe manifests, and media without forking the permanent engine.

## 5. Narrative specification

### 5.1 Present-day evidence opening

Immediately after Stage 4, Sheng Guo, Kael, and the neutral archivist inspect sealed historical records at the regional evidence facility. The opening identifies the Stage 4 contradictions, authenticated sources, and unresolved questions. Detailed evidence remains pauseable, scalable, localized, screen-reader accessible, and reviewable through controlled UI.

The transition into play uses illustrated documents, old village views, and portraits of young Sheng and Liang. It explicitly labels the past as a corroborated dramatized reconstruction, not time travel, supernatural memory, or perfect omniscience.

### 5.2 Oren Rell's conspiracy

Oren, then a trusted steward, fabricates an emergency purchase order and gives Rovan authentic procedural knowledge. A false merchant convoy carries some legitimate goods while concealing weapons. Its infiltrators intend to disable the warning system, open the storehouse route, signal the larger force, seize reserves and the trade strongbox, and withdraw through a prepared mountain depot.

Oren expects money, safe passage, stolen wealth, and dishonest commercial connections. His belief that the raiders will rely on intimidation is self-deception rather than innocence. He knowingly enables armed entry and foreseeable harm.

### 5.3 Discovery and assault

Young Sheng detects inconsistencies among the purchase order, reserve ledger, merchant seal, and wagon weight. Su Yan's preserved duplicate receipts support his suspicion. When discovery becomes imminent, infiltrators attack before the full plan is ready.

Qiao Lan detects sabotage at the secondary gate, sounds the manual warning, and holds the damaged mechanism long enough for defenders to secure it. Her sacrifice is shown through reaction, cutaway, an empty post, and aftermath rather than graphic injury. Her action prevents the larger force from gaining rapid entry.

### 5.4 Reserve and storehouse defense

The defenders protect trade workers, reserve staff, storehouse evacuees, grain, medicine, seed, tools, and the trade strongbox. Oren gives misleading instructions as a noncombatant; gameplay suggests suspicion without omnisciently declaring guilt before evidence commits it.

At the Storehouse Platforms, Liang redirects a sabotaged wagon long enough for villagers to escape. He suffers the canonical permanent left-knee and lower-leg injury. Rovan attempts to finish the attack; Sheng intervenes, rescues Liang, and continues the pursuit.

### 5.5 Rovan's defeat

Rovan attempts to withdraw with selected records and reserve goods. Sheng must defeat him through the complete combat system. Rovan is disarmed, restrained, medically assessed, treated, and captured alive. Brann Holt's testimony, the concealed weapons, recovered goods, route/depot records, and Su Yan's receipts corroborate Oren's conspiracy.

Rovan is later transferred to regional authority and sentenced to 30 years for armed conspiracy, organized robbery, forged identities, and responsibility for the fatal assault. He dies from illness in custody 17 years later and never directs the modern network.

### 5.6 Month of Reckoning

A noncombat illustrated montage covers approximately one month:

1. Treatment of the injured and mourning for Qiao.
2. Depot discovery and evidence comparison.
3. Proof of Oren's agreement with Rovan without proof against young Tomas or other relatives.
4. Temporary guarded relocation of the household.
5. Sheng's proposal for individual regional judgment, restitution, protection of innocent relatives, and separate review.
6. Zhao Heng's rejection of that proposal under grief, fear, political pressure, and unwillingness to revisit authority.
7. Permanent family exile with basic provisions and safe passage but no individual hearings for innocent relatives.

Chen Wei, Qiao's husband, supports individual accountability after evidence clears uninvolved relatives. Zhao therefore cannot attribute collective exile to the victim's immediate family.

### 5.7 Present-day return and canonical outcome

Sheng acknowledges that stopping Oren was necessary, collective punishment was wrong, his resistance was insufficient, and later institutional reforms did not fully repair the original harm. Kael confirms separation from Tomas without instant absolution or compulsory reunion with his mother.

Every completion preserves one canon:

- Oren enabled the armed assault and is individually guilty.
- Qiao raises the warning and dies as the single defender killed.
- No civilian dies.
- Liang saves evacuees, receives his permanent injury, and survives because Sheng rescues him.
- One supply wagon and parts of the gate, storehouse entrance, warning platform, and workshop are damaged or lost.
- Rovan is genuinely defeated and captured alive.
- Mandatory evidence proves Oren's conspiracy.
- Sheng proposes individual judgment; Zhao rejects it and orders family-wide exile.
- Young Tomas and uninvolved relatives are punished for a crime they did not commit.
- Present-day Sheng recognizes both truths.
- Historical logistics evidence advances the investigation without identifying the modern sponsor.

Performance may change grade, avoidable protection, optional property, artifacts, achievements, and bounded inserts, never these facts.

## 6. Five-Act Warning Bell Defense

First-clear target is 40–50 minutes; experienced replay target is 28–35 minutes.

| Act | Region | Mandatory content | Optional/system focus | Checkpoint |
|---|---|---|---|---|
| 1 | Ledger Before Dawn | Compare order, ledger, seal, wagon weight; one attack | Evidence and Sheng/Liang fundamentals | CP1 Ledger Discovery |
| 2 | False Convoy at Old Trade Entrance | Convoy exposure, gate defense, Qiao warning, two encounters | Concealed weapons, barriers, mounted transition | CP2 Warning Raised |
| 3 | Communal Reserve Defense | Relay ride, evacuation and reserve defense, two encounters | Ledger Annex branch, provisions, fire response | CP3 Reserve Secured |
| 4 | Storehouse Platforms | Supply-wagon passage, storehouse interception, two encounters | Broken Wagon, injury/rescue | CP4 Storehouse Interception then transition state |
| 5 | Warning Gate | Final approach, one encounter, Rovan conclusion | Warning Workshop branch, Liang support, Measured Hand Stand | CP5 Measured Hand Stand |

Each optional branch adds at most one short engagement. Evidence, dialogue, cinematics, synchronized holds, loading, accessibility reading, and protected transitions suspend hidden objective pressure.

## 7. Four-Ledger Historical Defense Model

### 7.1 People Ledger

Three independently tracked units:

- Trade-entrance workers.
- Reserve staff.
- Storehouse evacuees.

States are **Secure**, **Strained**, and **Cleared**. Only designated warned objective actions or hazards may cause Strained. No civilian has ordinary Health or a death state. Qiao is excluded because her sacrifice is fixed canon, not a failed protection target.

### 7.2 Emergency Reserve Ledger

Aggregate categories:

- Grain.
- Medicine.
- Seed.
- Tools.
- Trade strongbox.

States are **Protected**, **Contested**, and **Secured**. One canonical wagon loss is excluded from grading. Additional avoidable loss changes recognition without contradicting the village's survival. Defender recovery portions are accounted separately and never reduce this ledger.

### 7.3 Warning and Perimeter Ledger

**Warning Raised** is mandatory through Qiao's action. Remaining perimeter quality resolves as **Contained** or **Strained**. The gate remains damaged in every outcome. Qiao's act cannot be prevented, repeated, or scored as a player action.

### 7.4 Historical Evidence Ledger

Four mandatory anchors move through **Identified**, **Authenticated**, and **Committed**:

1. Su Yan's duplicate receipts.
2. Concealed convoy weapons.
3. Brann Holt's testimony.
4. Route and depot records.

They cannot be missed, destroyed, duplicated, replaced, or invalidated. Oren's guilt commits only after post-capture comparison. Mandatory evidence grants no performance bonus because it cannot be lost.

## 8. Playable historical heroes

### 8.1 Complete kit contract

Each hero owns 15 normals: seven standing, three aerial, three ground-route, one dash, and one distinct low. Throws, Guard, Exact Block, Counter, Defense-consuming Combo Breaker, weapon actions, three initial Specials, and one fixed Ultimate remain separate.

First canonical completion fixes historical loadouts and costumes. Canonical Replay defaults to them; approved replay, Chapter Challenge, Mission Remix, Random Operations, and Academy contexts may use legal configuration as declared by their mode. Liang's injury never modifies his reusable character data.

### 8.2 Sheng Guo — Measured Hand

Identity: lower-damage interruption, redirection, defensive protection, safe restraint, disarm, and positional conversion. No armored rush, supernatural effect, or battlefield-dominance presentation.

| Route | Actions |
|---|---|
| Standing | Listening Palm; Balanced Elbow; Peaceful Release; Intercession Step; Reserved Reply; North Court Turn; South Court Pass |
| Aerial | Rafter Check; Descending Measure; Courtyard Turn |
| Ground | Settling Hand; Quiet Restraint; Measured Rise |
| Dash | Mediator's Entry |
| Low | Threshold Reap |

Initial techniques:

- `U` **Civic Arc** — close/rising rescue-space sequence with Resolve emphasis.
- `Forward + U` **Intervening Passage** — unarmored punishable angled carry away from protected space.
- `Backward + U` **Measured Reversal** — eligible-strike counter/turn with legal disarm and failed-counter recovery.
- `H` **Dawn Bell Accord** — primary-target interception ending in broad non-supernatural separation, high Resolve pressure, moderate Health damage, and legal co-op/rescue continuation.

### 8.3 Liang Zhen — Stone-and-Current Method

Identity: stronger direct and guard pressure, structure, leverage, controlled takedown, pursuit, and front-line control while remaining mobile and distinct from Mountain Guardian and River Scout.

| Route | Actions |
|---|---|
| Standing | Foundation Palm; Turning Forearm; Stonecourse Press; Advancing Bank; Receding Current; Skyward Leverage; Low Channel Turn |
| Aerial | Eave Guard; Falling Buttress; Crossing Current |
| Ground | Settling Weight; Anchor Fold; Returning Surge |
| Dash | Bridge-Line Shoulder |
| Low | Riverbed Reap |

Initial techniques:

- `U` **Confluence Guard** — rooted circular forearm/palm conversion ending in a rising check without automatic armor.
- `Forward + U` **Channel-Break Advance** — punishable lane-carry drive into trip or separation.
- `Backward + U` **Returning Anchor** — grounded-advance leverage catch with directional safe throw and failed-counter recovery.
- `H` **Stone Guides the Current** — primary-target brace, redirection, takedown, and broad separation with balanced Health and high guard/Resolve pressure.

### 8.4 Input and combat legality

Both heroes retain the permanent modern/classic input settings, remapping, German physical-key handling, keyboard/gamepad parity, standing/aerial/ground routes, low attack, cancels, scaling, relaunch budget, anti-infinite rules, defense resources, and co-op combo contracts. Exact frames, damage, meter, hit reactions, and cancel windows are Deferred Combat Lab data.

## 9. Reciprocal Rescue and control handoff

### 9.1 Storehouse Interception

Both historical heroes remain fully eligible. Rovan's resources begin here and carry through every later phase.

### 9.2 Broken Wagon

Evacuation and wagon redirection occur first. Liang successfully protects the evacuees, receives the fixed injury, and is rescued by Sheng. The player cannot prevent, cause, worsen, duplicate, or erase the injury.

Before the injury transition, the non-selected solo hero is an authored support actor only. That actor owns no hidden Health, Defense, Attack Bar, inventory, collision, damage, or checkpoint state.

Solo Sheng remains active. In a solo Liang route, the transition creates Sheng by mapping Liang's exact remaining Health, Defense, and Attack Bar percentages onto Sheng's corresponding maxima. Mapping may never increase any percentage or refill a resource. The protected transition ends active combo, hitstun, cancel, and temporary-status state for both solo routes; score, damage history, eligibility, ledgers, and boss state continue unchanged.

Liang's held assets move into a single-use support cache without duplication. The cache may contain only his equipped stage weapon at exact durability, if any, and one carried provision at exact type, if any. Dropped items remain in the world; objective objects and Rovan evidence never enter it. The cache may be claimed once after handoff, gives no replacement when empty, and stores exact contents plus claimed/unclaimed state in the checkpoint payload.

### 9.3 Measured Hand Stand

Sheng is the only mobile fighter for the final third. In co-op, the Liang player enters **Field Protector Support** and may:

- Warn one marked lane once.
- Brace the damaged gate once.
- Redirect one rolling-debris hazard once.
- Transfer one carried provision once.

Support cannot damage Rovan, replace Sheng's victory, become mandatory, duplicate resources, or restore Liang to mobility. Co-op performs no resource conversion: Sheng and Liang retain their real state until Liang enters support. Injury, support state, cache, boss transition, each action's used/available bit, and remaining resources are checkpoint-authoritative.

## 10. Enemy roster and difficulty

### 10.1 Core roles

- **False Merchant:** removes civilian disguise at combat start; concealed cudgel, simple flank, no re-disguise.
- **Torch Saboteur:** warned action against tagged empty structures, reserve exteriors, or warning equipment; visible interrupt/extinguish window; never targets people or indispensable evidence.
- **Wagon Guard:** pole, short shield, or heavy tool; slow-turning lane control and protection of another role's objective action.
- **Mounted Raider:** bounded horse charges and withdrawal pressure; zero Stability produces safe dismount and ordinary on-foot behavior without horse death.

### 10.2 Advanced roles

- **Route-Cutter Veteran — Extreme:** visible feints, angled denial, weapon changes, and pursuit control without route closure or off-screen actions.
- **Field Captain — Ultimate:** visible hand or whistle formation signal. Interrupting the signal cancels the formation. No hidden spawns or reinforcements.

Only designated Saboteurs, Wagon Guards, Veterans, and Captains use objective actions. Approaching completion caps at one solo and two staggered co-op actions against different targets.

### 10.3 Five-tier matrix

| Difficulty | Encounter identity |
|---|---|
| Easy | Core roles, fewer simultaneous attackers, longer windows, slower mounts, simpler Rovan feints |
| Medium | Canonical baseline |
| Hard | Better core coordination, protected Saboteurs, staggered riders, repeated-route punishment, delayed Rovan attacks |
| Extreme | Authored Veterans, extra mounted redirect, advanced on-foot counter route |
| Ultimate | Field Captains plus selected Veterans, complete legal Rovan toolkit |

Higher difficulty increases behavior, coordination, timing, composition, and pattern variety rather than excessive Health/damage inflation. Advanced roles never imply a modern sponsor connection. Optional branches remain achievable and warnings remain accessible.

### 10.4 Encounter baseline

Eight mandatory ordinary encounters plus Rovan's continuous boss:

| Difficulty | Approximate solo ordinary count |
|---|---:|
| Easy | 18 |
| Medium | 24 |
| Hard | 30 |
| Extreme | 34 |
| Ultimate | 38 |

Co-op adds approximately 35–40% complementary ordinary pressure. Simultaneous ordinary caps are four solo and six co-op. Mounted active-charge lanes cap at one solo and two staggered co-op. Veterans and Captains replace suitable ordinary slots rather than adding unbounded density. Exact counts remain validated balancing data.

## 11. Rovan Kest — Three-Phase Road-Cutter

### 11.1 Mounted Road-Cutter

Rovan uses bounded hooked-pole charges, angled passes, and withdrawal feints on an ordinary horse. Zero Stability causes safe retreat/dismount without horse death, civilian collision, or lethal crash.

### 11.2 Convoy Weapon Control

On foot, Rovan uses a short saber and shortened pole handle for lane cuts, legal weapon clashes, tagged-scenery throws, and warned nearby-raider commands. The Broken Wagon sequence, Liang injury, Sheng rescue, and Rovan withdrawal occur within this continuous encounter graph.

### 11.3 Road-Cutter's Last Stand

At the Warning Gate, Rovan uses compact strikes, elbows, trips, rough clinches, escape attempts, Exact Blocks, Counters, and one Defense-consuming Combo Breaker. Sheng remains the only mobile fighter; Liang's support stays bounded and nondamaging.

### 11.4 Boss invariants

- Rovan's resources carry across phases and never refill at transition.
- Objective results never modify his statistics.
- No armor transformation, rage immunity, hidden timer, reinforcements, voluntary loss, or scripted defeat.
- Rovan's weapons become evidence, never pickups.
- Legal Health, Defense, and Resolve victory precedes disarm, restraint, assessment, treatment, and live custody.
- Environment cannot defeat him or skip a phase.
- Higher difficulty adds readable complexity without missing tells or unavoidable mounted pressure.

## 12. Historical transport

### 12.1 Reserve Relay Ride

A two-to-three-minute Chase segment runs from Old Trade Entrance to Communal Reserve. Solo has one horse; co-op has one per hero. Compact mounted mappings use direction, `T`, `Z`, `G`, `U`, and eligible `H` through the unchanged engine.

Each horse owns Stability and withdraws safely at zero. A complete on-foot fallback preserves completion and regroups heroes at the reserve. Held weapons are stowed/restored with exact ownership and durability.

### 12.2 Reserve Wagon Passage

A sixty-to-ninety-second authored moving-platform defense carries supplies toward the storehouse. Players fight on the bed or alongside but never steer. Co-op may board together or split without mandatory arrangement.

The wagon cannot run over civilians, leave its route, or become permanently destroyed. Warned exterior damage affects Reserve performance. The later Broken Wagon is a separate fixed warned hazard and is never controllable. False-convoy wagons become evidence/scenery after exposure.

### 12.3 Transport invariants

- Transport is stage-local, nonpersistent, and absent from the Store.
- No free roaming, animal collision weapon, lethal crash, or random-physics outcome.
- Player and enemy horses share safe Stability rules.
- `STEADYRIDE` affects player horses only, not enemy horses, the supply wagon, or Broken Wagon.

## 13. Weapons, environment, and recovery

### 13.1 Historical Defender and Raider Tool Set

- **Village Gate Staff:** balanced reach, broad rescue arcs, controlled thrusts, modest guard pressure.
- **Carpenter's Work Axe:** slower guard/tagged-wood damage; cannot harm evidence, indispensable reserves, or protected structures.
- **Raider Short Saber:** fast non-gory precision, advance, controlled disarm; no bonus against restrained targets.
- **Wagon Hook Pole:** spacing, eligible loose-cargo pull, one tagged hazard redirect, separation; cannot pull people, bosses, horses, evidence, or fixed structures.

Sheng receives interruption/disarm/redirection interpretations; Liang receives structure/leverage/sweep/repositioning interpretations. Both have standing, aerial, low, ground, dash, pickup, throw, and finisher actions for every family. Shared `J`, ownership, handoff, durability, drop, disarm, throw, boundary, anti-infinite, checkpoint, and recovery rules apply.

Weapons appear only through authored racks, tools, or drops. They cannot be pre-equipped, stored, or purchased. Rovan's weapons remain evidence. Qiao's personal tool is a Museum artifact, not an ordinary pickup.

### 13.2 Deterministic Historical Infrastructure Network

| Region | Eligible infrastructure |
|---|---|
| Ledger Annex | Desks, shelves, shutters, loose crates; mandatory records indestructible |
| Old Trade Entrance | Gate beams, movable barriers, wagon covers, warning components |
| Communal Reserve | Handcarts, sacks, empty containers, shutters, fire buckets, tagged partitions |
| Storehouse Platforms | Pulleys, cargo stacks, timber, ramps, damaged wagon |
| Warning Gate | Barricades, bell-frame supports, cargo, route stones |

Eligible objects use **Intact → Damaged → Critical → Broken**, deterministic debris, and strict quotas. They may damage, stun, knock down, or separate eligible fighters but cannot kill/permanently injure civilians, destroy mandatory evidence or essential reserves, change Qiao or Liang, block the only route, defeat Rovan, or create uncontrolled physics.

Enemy sabotage, fixed canonical destruction, and player collateral are attributed separately. Solo/co-op hazard schedules are equivalent. Reduced effects preserve timing, warnings, and collision legality.

### 13.3 Historical Provision Recovery Set

| Item | Localized identity | Effect |
|---|---|---|
| Steamed Grain Bun | 蒸杂粮包 / Gedämpftes Getreidebrötchen | Health |
| Warm Tea | 热茶 / Warmer Tee | Defense Bar |
| Sesame Cake | 芝麻饼 / Sesamkuchen | Attack Bar |
| Communal Stew | 村社炖汤 / Gemeinschaftseintopf | Moderate all-three recovery |

Provisions come from clean personal baskets, approved defender supplies, safe handovers, or tagged containers. They never reduce the Reserve Ledger. Shared `J`, carry, handover, and eligible throw rules apply. Solo/co-op receive equivalent total value. Ordinary provisions do not persist between acts or duplicate through checkpoints. Communal Stew appears once, normally after Reserve Defense or behind a demanding branch. Effects are gameplay abstractions, not medical claims.

## 14. Optional Historical Preservation Branches

### 14.1 The Ledger Holds

**The Ledger Holds / 账册得存 / Das Hauptbuch bleibt** occurs during Reserve Defense. Players protect evacuating clerks, interrupt two warned sabotage actions, use fire buckets before the annex reaches Broken, and secure supplementary records.

Mandatory evidence remains indestructible. Success upgrades the historical trade-ledger Museum exhibit. A scorched result remains canon-compatible and never blocks completion.

### 14.2 The Warning Endures

**The Warning Endures / 警钟长鸣 / Die Warnung bleibt** occurs during the Warning Gate approach through a short maintenance-workshop route. Players defeat looters, protect the cabinet, recover Qiao's carpenter tool, and preserve an original warning component.

The artifacts explain Qiao's maintenance work. The branch cannot prevent, replay, or sensationalize her sacrifice.

### 14.3 Shared branch rules

- Both may complete in one eligible run.
- Neither gates canon, Rovan, Stage 6, S rank, or base Museum.
- Each grants five leaderboard bonus points and one achievement.
- Both together grant **Memory Defended**.
- Solo/co-op pressure remains equivalent.
- Cheat-Assisted play may reveal content and clues but grants no branch achievement, competitive score, or preservation record.

## 15. Scoring, rank, achievements, and rewards

### 15.1 Protection-First score

| Category | Base points |
|---|---:|
| Combat Mastery | 30 |
| People Protection | 25 |
| Reserve Stewardship | 20 |
| Infrastructure Discipline | 10 |
| Transport Control | 10 |
| Boss Discipline | 5 |

The two branches add up to ten leaderboard bonus points but never alter rank thresholds. S remains possible without either branch.

Fixed sacrifice, injury, wagon loss, gate damage, and unavoidable history never penalize. No general speed category exists. Solo and co-op use normalized separate leaderboards; co-op receives one shared rank with contribution summaries. Difficulty multiplier applies after base evaluation. Exact S/A/B/C/D thresholds remain validation data.

### 15.2 Achievements

1. **The Bell Before Dawn / 黎明前的钟声 / Die Glocke vor der Morgendämmerung** — eligible clear.
2. **The Ledger Holds / 账册得存 / Das Hauptbuch bleibt** — preserve ledger annex.
3. **The Warning Endures / 警钟长鸣 / Die Warnung bleibt** — preserve Qiao artifacts.
4. **Memory Defended / 记忆得守 / Bewahrte Erinnerung** — both branches in one eligible run.
5. **Every Evacuee Safe / 撤离者皆安 / Alle Evakuierten sicher** — all tracked People groups Secure/Cleared.
6. **Reserve for Tomorrow / 为明日留粮 / Vorrat für morgen** — every avoidable reserve category secured.
7. **Steady Through the Alarm / 警钟声中稳行 / Sicher durch den Alarm** — no forced ride dismount and supply wagon never Critical.
8. **The Road-Cutter Bound / 截路者伏法 / Der Straßenräuber gefasst** — capture Rovan after an Exact Block and Counter in his encounter.

No achievement requires co-op.

### 15.3 Rewards

- Any canonical clear: Stage 6, mandatory Chronicle/Museum records, approved historical-hero Mission access, and Store catalogue visibility.
- First eligible clear: itemized Credits.
- First A: text-free warning-bell profile emblem.
- First S: **Keeper of the First Warning / 初警守望者 / Hüter der ersten Warnung**.
- Cheat-Assisted: progression, difficulty access, canon, mandatory discovery, hero access, and catalogue visibility only; no score, rank, Credits, achievement, emblem, title, preservation record, or leaderboard entry.
- Continued or invalid competitive runs follow the same no-competitive-result boundary.

## 16. Visual and wardrobe specification

### 16.1 Young Sheng canonical default

Recognizable 26-year-old continuity from `GuoPhoto.jpg`, translated into the approved cel-shaded style. Lean silhouette; indigo-grey short cross-collar work jacket; warm-beige inner layer; dark trousers; cloth forearm wraps; flexible ankle boots; close records pouch; bronze stitching; text-free village-knot emblem. No elder robes, cane, loose sleeves, senior authority, or modern protective technology.

### 16.2 Liang canonical default

Distinct face, broader grounded 31-year-old silhouette; earth-brown wrap jacket; muted moss protective overshirt; stone-grey trousers; reinforced cloth wraps; sturdy work boots. Practical civic field protection, not military armor. Before Broken Wagon: no limp, brace, cane, or injury marker.

### 16.3 Store alternatives

**Historical Civic-Defender Interpretation:** modern respectful training interpretation. Sheng uses fitted slate-blue/ivory/bronze; Liang deep stone-blue/river-grey with broad belt, segmented guards, and heavier boots.

**Village Archive Commemoration Attire:** Sheng uses muted burgundy/navy with abstract warning-bell seam motif; Liang pine/charcoal with river-and-stone panels. No robes, capes, loose ornaments, readable writing, or exaggerated memorial imagery.

Alternatives are visual-only and available only in approved post-clear contexts. They change no stats, moves, hitboxes, weapons, or physics and must preserve ground combat, mounting, animation clearance, and Liang's pre-injury state.

### 16.4 Supporting visuals

Production must finalize Su Yan, Brann Holt, Qiao Lan, Chen Wei, Chen An, Zhao Heng, Oren Rell, Rovan Kest, the neutral archivist, historical villagers, raiders, horses, wagons, village infrastructure, evidence objects, and all costume/model sheets. Final visual identities remain production art tasks, not feature gaps.

## 17. Presentation, localization, music, and SFX

### 17.1 Hybrid Historical Presentation Contract

Presentation units:

1. Present-Day Evidence Opening.
2. Illustrated transition into corroborated past.
3. In-engine Qiao warning and respectful aftermath.
4. In-engine Liang injury/rescue/control handoff.
5. Illustrated Month of Reckoning montage.
6. Present-Day Return.

Flow clips use supplied start/end frames, one focal action, small existing-frame motion, stable axis, and minimal character movement. Complex fights, groups, handovers, and state changes remain in-engine or are assembled in editing. Flow footage contains no speech or embedded text. English, Simplified Chinese, and German subtitles, transcripts, speaker labels, optional Windows-generated narration, music, and SFX are added in post.

Every clip is independently skippable, Museum-replayable, and has a still-image fallback. AI artwork contains no generated readable document writing; evidence text is controlled UI.

### 17.2 The Warning Remembered Audio Suite

Seven original cues:

1. **Records under Lamplight** — present evidence.
2. **Before the Bell** — historical investigation.
3. **False Colours at the Gate** — exposed deception.
4. **The Bell Carries** — warning, ride, reserve defense.
5. **Timber and Duty** — wagon, Liang's stand, rescue.
6. **Cut the Road No More** — Rovan.
7. **What Judgment Left Behind** — investigation, exile, present return.

The warning-bell interval is the central motif. Historical music uses restrained acoustic plucked/bowed strings, bamboo flute, hand drums, wooden percussion, and low winds; present framing adds subtle modern ambience. Generated music has no voices, lyrics, recognizable melody, or artist imitation. Combat cues require loopable exploration, pressure, climax, and resolution stems.

SFX cover records/seals, concealed weapons, torches, buckets, gates, hoofbeats, wheels, timber, pulleys, and near/distant bell layers. Animal distress and graphic injury sounds are prohibited. Exact Block, Counter, Combo Breaker, charge, sabotage, and support remain mechanically distinct. Music ducks for narration, dialogue, warnings, and accessibility announcements. Meaningful sounds receive localized captions.

## 18. Briefing, Guide, Academy, accessibility, and cheats

### 18.1 Two-Layer briefing

Present orientation explains contradictions, sources, unresolved questions, and non-rewritable history. Historical deployment presents heroes, player configuration, difficulty, ledgers, transport, pickups, environment, spoiler-safe branches, eligibility, controls, and access settings.

First clear fixes heroes, loadouts, Ultimates, costumes, and unarmed start. The line “historical circumstances may change active responsibilities” warns about control transition without spoiling Liang's injury.

Post-clear Canonical Replay and Chapter Challenge remain Sheng/Liang-only. Mission Remix is visibly noncanonical. Configuration changes renew readiness; Wi-Fi peers validate matching versions.

### 18.2 Answer the Bell learning package

**Answer the Bell / 应钟而行 / Dem Ruf der Glocke folgen** is available from briefing, pause, and Help. Pre-clear content explains reconstruction, fixed canon, ledgers, transport, historical resources, warnings, handoff, spoiler-safe branch symbols, and eligibility. Post-clear expands with full context.

Academy lessons:

1. Measured Hand Foundations.
2. Stone and Current Foundations.
3. Protect before Pursuing.
4. Ride, Dismount, Defend.
5. Reciprocal Rescue, with deterministic solo partner.
6. Binding the Road-Cutter.

Lessons never gate progression, heroes, or standard moves. Liang retains his complete reusable kit. Free Practice supports approved configuration and My Combos recording.

### 18.3 Multimodal Historical Clarity

- Ledgers combine icons, shapes, labels, patterns, and screen-reader announcements.
- Threats combine target lines, direction markers, silhouettes, captions, audio, and optional vibration.
- Evidence supports scalable high-contrast controlled text, narration, keyboard/gamepad navigation, and transcripts.
- Objective interactions support hold, toggle, and reduced-input forms; no mandatory rapid repeat.
- Riding supports steering sensitivity, camera centering, and route guidance.
- Handoff announces hero, resources, support cache, and controls before resume.
- Co-op receives shared warnings and accessible pings without voice chat.
- Flash, shake, motion, particles, fire, debris, and crowd density reduce independently without changing simulation.
- Story may use skip or localized still-panel alternatives.
- Music, speech, bell, combat SFX, and accessibility announcements have separate volumes.
- Non-simulation access preserves eligibility; simulation-changing help is transparently Assisted.
- No option rewrites history, auto-completes an objective, or removes Rovan's genuine defeat.

### 18.4 Shared-cheat profile

No new Stage 5 code.

- Hero codes affect eligible ordinary combat state only and cannot change fixed history.
- `TRUSTYTOOLS` protects carried pickup families, not structures, wagons, mechanisms, or evidence weapons.
- `STEADYRIDE` protects player-horse Stability only.
- `QUIETCROWD` cannot remove Veterans, Captains, branches, Rovan, or required pressure.
- `FULLPANTRY` affects ordinary provision containers only and never adds stew or changes objectives.
- `HOMECOMING` restores the latest exact valid checkpoint.
- `SAFEPASSAGE` displays **Not Applicable in This Stage** because mandatory people/evidence cannot enter a completion-blocking permanent-loss state; it cannot preserve grading or optional branches.

Any active code marks the whole run Cheat-Assisted under the reward boundary in Section 15.

## 19. Persistence, networking, results, and replay

### 19.1 Five-Anchor Historical State Contract

Checkpoints:

1. Ledger Discovery.
2. Warning Raised.
3. Reserve Secured.
4. Storehouse Interception.
5. Measured Hand Stand.

Each snapshot stores active hero; Health, Defense, Attack, status; whether the solo non-selected hero is still presentation-only or has activated; mapped-resource provenance; weapons, ownership, durability, stow/drop; one-use cache contents and claimed state; four ledgers; branches/artifacts; horse/wagon; infrastructure/collateral; evidence; enemy/boss/surrender; support actions and used/available bits; score; difficulty; player count; eligibility; co-op authority; content/schema versions; and integrity hashes.

Restore cannot reroll, repair, improve, duplicate, restore consumed support, or change committed branch state. Verified crash/reload/disconnect/migration recovery preserves eligibility only from exact validation. One transactional Suspend Stage record may be created at a checkpoint and is consumed on resume.

Defeat or voluntary Continue from Checkpoint preserves canon and Stage 6 but marks Continued and removes competitive rewards. A fresh eligible attempt begins from the stage opening. Liang-to-Sheng transition cannot reverse or duplicate.

### 19.2 Deterministic co-op authority

Same-device uses one simulation; Wi-Fi uses approved host authority. No new participant joins mid-stage; the original peer may reconnect. Atomic ownership covers weapons, food, horses, branches, buckets, ledgers, support, and environment. Disconnect never despawns or rescales pressure.

Restricted proxy may follow, block, evade, and use conservative basics with real resources. It cannot choose branches, collect/throw weapons, consume provisions, spend Ultimate, initiate co-op attacks, or use Liang support.

If Sheng disconnects during Measured Hand Stand, the Liang player may accept safe-boundary **Historical Role Reassignment** and control Sheng while Liang support becomes inactive. No resources or score are added. Liang disconnection never blocks Sheng. Exact validated migration may preserve eligibility; severe desync, unverified correction, or excessive proxy/reassignment converts completion to Continued. All authority events are logged.

### 19.3 Fact, Performance, and Memory results

Result evaluation separates:

- **Fixed Historical Outcome** — Qiao, Liang, Rovan, Oren, exile.
- **Player Performance** — score, rank, difficulty, heroes, ledgers, transport, collateral, branches, boss, achievements, rewards.
- **Run Integrity** — Standard, Assisted, Cheat-Assisted, Continued, recovery, proxy, reassignment.

### 19.4 Chronicle, Museum, and Run Archive

Chronicle provides present and reconstructed timelines plus **Confirmed**, **Corroborated**, and **Unresolved** source labels. It distinguishes Oren's guilt from inherited blame and links Stage 4 to Stage 6.

Mandatory Museum content includes Su Yan records, concealed weapons, Brann transcript, Rovan routes/depots, weapon families, world/transport/enemy/hero/boss material, music, SFX, art, and presentation. Branches upgrade ledger and Qiao/warning exhibits. Controlled UI provides all readable document content.

Run Archive categories separate difficulty, solo/co-op, hero/pair, ruleset, integrity, and version. Eligible replay capsules retain inputs, versions, authority/checkpoint history, ledgers, score facts, and hashes. Canonical Replay, Chapter Challenge, and Mission Remix are always visibly distinct. Locked content exposes localized accessible spoiler-safe clues.

## 20. Data package requirements

Stage package data must declare stable identifiers and schemas for:

- Stage metadata, title localization, timeline position, and mode eligibility.
- Five acts, regions, transitions, checkpoints, and presentation gates.
- Eight ordinary encounter manifests and branch manifests by difficulty/player profile.
- Four ledgers, states, events, attribution, scoring, and result fields.
- Historical hero identities, moves, animation references, loadouts, costumes, and Academy lessons.
- Enemy roles, advanced variants, surrender states, and boss graph.
- Horse, supply wagon, Broken Wagon, stow/restore, Stability, and fallback state.
- Four weapons and complete hero affinity action references.
- Provisions, placements, difficulty quantities, ownership, and `FULLPANTRY` eligibility.
- Infrastructure state graphs, hazard schedules, debris quotas, and collateral attribution.
- Branches, artifacts, Museum upgrades, achievements, and localized clues.
- Score categories, bonus, multipliers, eligibility, rank thresholds, and rewards.
- Presentation, subtitles, transcripts, narration references, still fallbacks, music stems, SFX, and captions.
- Checkpoint payload, network authority, proxy/reassignment, replay, migration, and version hashes.
- Localization, accessibility, Guide, Help, briefing, and controller-prompt content.

All persistent identifiers are canonical and locale-independent. Localized labels, raw media names, or visual order may never serve as save keys.

## 21. History-to-Archive Acceptance Matrix

Release validation covers:

- Both solo starts and unique Sheng/Liang co-op.
- Every difficulty and advanced role.
- Fixed first-clear and every legal post-clear configuration.
- All eight encounters, branches, transport sections, and Rovan phases.
- Every ledger transition and attribution source.
- Every hero move, weapon affinity, provision, mount, wagon, environment, and support action.
- Injury, handoff, cache, support, reassignment, disconnect, and reconnect.
- Checkpoint, suspend, continue, crash, rollback, migration, replay, export/import, and Legacy.
- Score, rank, achievements, Credits, outfits, emblem, title, Museum, Chronicle, and Stage 6.
- Standard, Assisted, Cheat-Assisted, Continued, proxy, and reassigned integrity classes.
- Keyboard, German physical-key layout, remapping, gamepads, same-device co-op, and Wi-Fi.
- English, Simplified Chinese, German, captions, narration, transcripts, sorting, and layout.
- Screen reader, non-colour information, reduced effects, alternative inputs, and still fallback.
- Supported browsers, devices, quality profiles, saves, migration, and deterministic performance.
- Stable 60-FPS target and supported 30-FPS minimum without simulation-timing change.

Required negative proof:

- Qiao cannot be saved, killed differently, blamed on the player, or graphically depicted.
- Liang's injury cannot be prevented, caused, worsened, duplicated, or removed.
- Mandatory evidence cannot be missed, destroyed, duplicated, or rewritten.
- Fixed wagon/gate damage cannot penalize.
- Branches cannot gate S, canon, Rovan, or Stage 6.
- Rovan cannot lose to scenery, script, skipped phase, or custody shortcut.
- Horses cannot die or become collision weapons.
- No civilian death, off-screen loss, unavoidable crossing, infinite combo, unfair co-op trap, route softlock, reroll, or state improvement.
- No item, score, reward, branch, support action, achievement, or Store state duplication.
- No modern hero, technology, purchased move, or alternative costume in first canonical reconstruction.
- No generated readable document text.
- No accessibility or presentation setting changes authoritative simulation unintentionally.

Release requires zero unresolved Critical or High-severity defects.

## 22. Production appendices and data gates

### A. Exact frame data

The production move table must define startup, active, recovery, cancel windows, movement, hit/guard/Resolve effects, meter, scaling, relaunch contribution, invulnerability/armor flags, counter state, block response, ground/aerial legality, co-op behavior, boss resistance, and weapon variants for every Sheng, Liang, Rovan, enemy, mounted, and support action.

No frame value may create an infinite, unavoidable loop, unreactable objective attack, permanent ground trap, cross-lane ambiguity, or mismatch between 60-FPS target and 30-FPS supported presentation. Frame data is Combat Lab validation, not permission to alter action identity.

### B. Final artwork and asset register

The register must cover model sheets, age continuity, costumes, enemies, boss phases, horses, wagons, weapons, provisions, all five regions, damage states, evidence, ledgers, Museum objects, icons, story frames, Flow start/end frames, still fallbacks, achievements, emblem, store thumbnails, Guide/Academy diagrams, and localized UI-safe compositions.

Every asset records source/provenance, rights, prompt/reference package, version, resolution, crop-safe zones, animation/rig anchors, palette, accessibility contrast, language-free master status, approval, and replacement history. Final unresolved supporting-character identities are closed through this register before media lock.

### C. Encounter balancing

Balancing validates eight encounter manifests, five difficulties, solo/co-op transforms, branches, transport, ledgers, provisions, weapon access, environment quotas, Rovan transitions, recovery scarcity, score/rank thresholds, and objective windows. It must prove completion and S feasibility for both solo historical heroes and the co-op pair without branch dependence.

Balance data may tune counts, placement, timing, Health, damage, Defense, Resolve, Stability, durability, recovery, score thresholds, and multipliers within approved caps. It may not add hidden threats, remove warnings, inflate statistics excessively, change canon, or make a tool/loadout/partner compulsory.

### D. Final dialogue, localization, and media

Production authors the evidence opening, briefing, historical exchanges, Qiao reaction/aftermath, Liang rescue, Rovan custody, Month of Reckoning, Sheng/Zhao dispute, exile, present return, Kael response, and Stage 6 transition in all three languages.

All subtitles, captions, transcripts, speaker labels, terminology, names, achievements, clues, roles, evidence labels, and Museum commentary require linguistic and continuity review. English/German use **Sheng Guo** and **Liang Zhen**; Simplified Chinese uses **盛国** and **梁震**. Generated media remains text-free and speech-free unless separately authored and verified.

### E. Deferred production values

Deferred values include exact frames, damage, meter, State/Resolve/Stability values, encounter counts within baselines, placements, warning windows, rank thresholds, difficulty multipliers, Credit amounts, Store prices, proxy/reassignment tolerance, rollback/network thresholds, media duration, audio mix, performance budgets, and final art.

Deferred values are not open permission to change approved content. Any value that would alter canon, route, roster, mandatory victory, safety, accessibility, competitive equivalence, or reward boundaries requires a new explicit decision.

## 23. Specification review gate

Before implementation planning, a fresh builder must confirm that this specification provides a deterministic answer for:

- what occurs in every act;
- what may vary and what is fixed;
- who is playable and when;
- how every ledger changes;
- how the injury and control handoff operate;
- how solo, co-op, reconnect, and reassignment complete the final boss;
- how branches, scoring, achievements, rewards, and cheats interact;
- what checkpoint/replay state must persist;
- what localization/accessibility/media fallbacks exist;
- what remains production data rather than a missing feature decision.

Any builder question already answered by the approved record must be resolved in this document. Minor production calls may be marked as such. Only questions that materially change the approved product return to the user.

Implementation planning remains a separate future task and must not begin from this draft until the specification is reviewed and explicitly approved.

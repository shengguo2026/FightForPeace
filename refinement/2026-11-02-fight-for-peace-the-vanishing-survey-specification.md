# Fight for Peace — Curated Mission 3: The Vanishing Survey Specification

**Version:** 1.0 approved  
**Date:** 2026-11-02  
**Package:** `curated.vanishing_survey`  
**Timeline:** After Stage 6 and before Stage 7  
**Status:** Approved on 2026-11-02; fresh builder review passed; implementation planning has not begun  
**Implementation planning:** Not started; remains a separate future activity  

## 1. Intent and authority

This is the controlling product, content, narrative, gameplay, presentation, persistence, accessibility, and release-validation specification for Curated Mission 3 of *Fight for Peace*.

| Language | Title |
|---|---|
| English | **The Vanishing Survey** |
| Simplified Chinese | **消失的勘测资料** |
| German | **Die verschwundene Vermessung** |

The mission is a canon-compatible regional side story. It uses the permanent combat engine unchanged and adds mission data, authored encounters, temporary equipment, presentation, records, and rewards. `story_line.md` remains the continuity authority. Exact frames, numerical balance, economy values, geometry, final art, animation, audio, and browser budgets remain production work unless they expose a feature-level conflict.

## 2. Mission promise

An independent salvage ring steals portable landslide sensors, historical hazard maps, and a route-survey tablet from a regional civil-works depot. These instruments protect remote communities from floods and landslides. The thieves hide the genuine equipment among decoy cases and move it toward an abandoned cableway station for resale.

The heroes must identify, intercept, protect, and recover all five genuine items while safeguarding legitimate people and property. Careful observation matters as much as combat. The mission contains no Tomas, unknown-sponsor, or Meridian Compact evidence and must not imply such a connection.

Primary objective: **Recover and Secure**.

## 3. Goals and non-goals

### 3.1 Goals

- Deliver a 35–43 minute first clear and 24–31 minute experienced replay.
- Make evidence reading, carrier interruption, custody, and item condition understandable without color dependence.
- Preserve canonical recovery of every genuine item while grading efficiency and care.
- Support solo, same-device co-op, and local-Wi-Fi co-op with equivalent content.
- Make legitimate market civilians and property meaningful without creating escort frustration.
- Provide eight mandatory encounters, two optional branches, and one live-capture boss.
- Pilot Automatic Highlights only under the existing Curated Mission policy.
- Provide complete English, Simplified Chinese, and German presentation and accessibility.

### 3.2 Non-goals

- No new combat engine, hero, permanent weapon, mount, firearm, grenade, or vehicle-combat system.
- No campaign-conspiracy clue or change to Stages 1–6.
- No item destruction, permanent loss, civilian death, lethal fall, or completion softlock.
- No co-op-only content, reward, rank, or achievement.
- No generated readable text embedded in imagery.
- No gameplay power reward.

## 4. Inherited systems

The mission inherits without modification:

- Browser-first deterministic simulation and supported input remapping, including German physical-key handling.
- Unique-hero selection; duplicate heroes are forbidden.
- Standing, aerial, and ground combat; Defense Bar, Exact Block, counter, Combo Breaker, Attack Bar, Special and Ultimate loadouts, anti-infinite budgets, and cancel rules.
- Shared `J` pickup, carry, handoff, consume, drop, and throw rules.
- Temporary weapon durability, ownership, disarm, affinity, and checkpoint rules.
- Live-capture narrative policy.
- Story access under Cheat-Assisted play with competitive, economy, achievement, and prestige exclusions.
- Chronicle, Museum, Guide, Academy, Run Archive, profile backup/import, accessibility, localization, and replay policies.

## 5. Availability and configuration

Any canonical Stage 6 clear unlocks the mission. It never requires another Curated Mission, a score, rank, difficulty, purchase, or achievement. A later compatible installation opens immediately if the profile already satisfies the gate.

The Depot setup exposes:

- One of the four established village heroes in solo or two unique heroes in co-op.
- Standard loadout editing.
- Difficulty and ruleset.
- Input and accessibility settings.
- Automatic Highlight toggle, enabled by default.
- Spoiler-safe mission priorities and evidence tutorial.

The protected civil engineer is a radio coordinator, never playable or targetable.

## 6. Five-Link Evidence Chase

| Link | Location | Purpose |
|---|---|---|
| 1 | Regional Civil-Works Depot | Briefing, setup, manifest, safe identification exercise |
| 2 | Tram Maintenance Yard | Teach carrier interruption, inspection, tagging, first sensors |
| 3 | Terraced Salvage Market | Protect civilians/property while recovering sensors and archive |
| 4 | Cableway Service Incline | Machinery, item advances, Terminal Recovery Bay |
| 5 | Abandoned Cableway Station | Final sorting, custody, Ivo boss and Tablet recovery |

The mission has eight mandatory ordinary encounters plus Ivo. Two optional branches reconnect forward and are not required for S rank or completion.

## 7. Opening and genuine manifest

Shortly after a pre-dawn theft, the civil engineer explains the independent resale motive and the equipment’s public-safety purpose. The genuine manifest contains exactly five items:

1. Landslide Sensor A.
2. Landslide Sensor B.
3. Landslide Sensor C.
4. Historical Hazard-Map Archive.
5. Route-Survey Tablet.

Each item has at least three non-color identifiers selected from silhouette/dimensions, seal geometry, partial serial, handle/latch layout, and a controlled reference image. The three sensor cases remain individually identifiable. The Archive is long, flat, and twin-sealed. The Tablet case is slim with a recessed handle and diagonal seal.

The safe, untimed Depot exercise compares one genuine reference match, one decoy, and one unrelated container. It must not reveal later case solutions.

Unrelated containers are non-candidate scenery rather than a third evidence class. They use a clearly incompatible silhouette, ordinary-storage fixture, and localized accessibility description such as “not a survey case.” They have no inspection, marking, carrier, custody, condition, or debit state. The Depot example teaches that not every container is evidence; the Yard instance remains noninteractive scenery and cannot create objective pressure, penalties, or farming.

## 8. Identification and Evidence Tray

Every candidate follows:

`Unknown → Inspected → Marked Genuine/Decoy → Verified Genuine/Decoy`

Inspection is contextual and interruptible without penalty. It records evidence in the shared Evidence Tray. Genuine items match every required property; every decoy has at least two independent non-color inconsistencies.

Evidence Tray reading, screen-reader output, magnification, and language changes do not count as active time. First inspection and first valid mark are authoritative; repetition adds no facts or score.

Each candidate accepts exactly one authoritative mark. A correct mark immediately verifies the selected class. A wrong mark triggers localized corrective feedback, automatically verifies the true class, and adds one fixed major investigation-time debit. Correctly identifying a decoy adds the smaller fixed routine inspection-time debit. Both are deterministic additions to Resource and Active-Time Efficiency rather than clocks running during evidence reading; neither changes condition, custody, rank caps, or completion. Unknown candidates cannot be secured or weaponized. Blind attacks, physics, and interaction do not reveal authenticity. Verified decoys become noninteractive evidence scenery. Co-op conflicts, restore, and repeated interaction cannot duplicate a mark or debit.

In co-op, either hero may inspect and mark. Both receive the facts. Host-authoritative first valid input resolves simultaneous conflicts without pausing the other hero.

## 9. Genuine-item custody and condition

Each item independently records:

`Hostile Custody → Carried toward Exit → Dropped Candidate → Verified Genuine → Recovery Tagged → Council Custody`

A visible pickup channel precedes carrier movement. Interrupting it produces a fixed safe drop. After verification, a contextual tag locks the item against retargeting, movement, damage, and decoy confusion. The Council team performs the documented handoff during the next safe transition. Heroes never inventory or weaponize genuine cases.

If a carrier reaches an authored exit, the item records **Advanced to Next Interception**, retains identity and condition, and appears at the next authored location. Each item may advance at most twice. Advancement creates no extra wave. The Station has no item exit, and all five items canonically reach Council Custody.

Only a hostile exit between major route links counts as an advance. Sensor A moving from *The False Consignment* to *Shutter Transfer* within the Yard is a within-zone relocation and consumes no advance. A counted transition is `Carried toward Exit → Advance Recorded → Hostile Custody at Next Link`. An item that arrives at the Incline already at count two enters the Terminal Recovery Bay and cannot exit. An item arriving at count zero or one may leave the Incline, increment once, and remain at the Station even when its new count is two. No item can record a third advance. Relocation, advance count, next-link custody, and Bay lock state persist separately and cannot duplicate on restore.

Condition is:

`Intact → Scuffed → Damaged`

It never improves and never becomes Destroyed or unusable. Only a warned completed Rough Transfer or Hook Runner drag across a tagged obstacle reduces condition, at most twice per item. Ordinary attacks, guns, throws, drops, physics, carts, cranes, and incidental mistakes cannot change it. Route escape affects efficiency, not condition.

The ledger stores identity, evidence, custody, zone, condition, advance count/history, downgrade cause, inspection/marking, tag owner, and handoff state.

## 10. Tram Maintenance Yard

### 10.1 Encounter 1 — The False Consignment

- Presents Sensor A, two decoys, and one unrelated container.
- Provides a short pre-commit observation window.
- Uses Decoy Carriers, Salvage Brawlers, and one Equipment Guard.
- Teaches pickup interruption, safe drop, pressure inspection, decoy rejection, and recovery tagging.
- Allows Sensor A to advance into Encounter 2.

### 10.2 Encounter 2 — Shutter Transfer

- Presents Sensor B, two decoys, and any advanced Sensor A.
- Hook Runners operate deterministic service shutters.
- Shutters redirect but cannot trap, crush, seal, or alter condition.
- Escaped genuine items advance unchanged to the Market with one incident.
- Unverified decoys may leave without penalty. Once verified, a decoy locks in place as noninteractive evidence scenery and cannot be carried, retargeted, or moved again.

The evacuated Yard uses stationary trams, safe pits/returns, deterministic racks, carts, doors, and barriers. The first Surveyor’s Tripod is stored in an authorized rack. An advanced item replaces an authored case slot; it never adds a wave.

## 11. Terraced Salvage Market

Three public groups occupy lower, central, and upper terraces:

- Lower vendors.
- Central customers and stallholders.
- Upper workers and travelers.

Each follows `Occupied → Evacuating → Cleared`. People have no Health, death, grab, shield, follower, or environmental-vulnerability state. Only a marked intimidation or route block can cause one **Disrupted Evacuation** per group; Council staff still clear the group afterward. Cleared groups never return.

### 11.1 Encounter 3 — Clear the Terraces

- Introduces Sensor C, two decoys, and advanced Sensor A/B where applicable.
- Combines evacuation with Brawler and Carrier pressure.
- Advanced items replace slots and wait at holding markers.

### 11.2 Encounter 4 — Archive at the Switchback

- Introduces the Hazard-Map Archive and two matching decoys.
- Uses Hook Runner pallet routes, Guards, and unrecovered sensors.
- Introduces the first Salvage Pry Bar.
- Genuine exits advance unchanged to the Incline.

Legitimate stalls, goods, stairs, rails, shelters, signs, and untagged carts are protected. Clearly tagged ring-owned salvage objects remain legal combat objects. Only avoidable player-attributed damage affects property grading.

## 12. Cableway Service Incline

The Tablet was moved to the Station before hero arrival by a fixed, tracking-established action. This creates no player incident or condition loss.

### 12.1 Encounter 5 — Freight on the Rise

- Presents Market-advanced genuine items, three cableway decoys, Carriers, Hook Runners, and Guards.
- Items below two advances remain eligible to move.
- Capped items enter the Terminal Recovery Bay and cannot exit again.
- Warned handling/drag threats may still affect condition before verification and tagging.

### 12.2 Encounter 6 — Counterweight Crossing

- Uses the upper platform, guarded stairs, cart loading, and tagged obstacle drags.
- An eligible item loaded into the outbound cart advances to the Station unchanged.
- Other genuine items transfer safely after clear.
- Decoys fill unused slots and create no penalty.

The public-closed Incline always provides an accessible route, safe rails and catch returns. No case can fall, stick, vanish, or become unreachable.

## 13. Cableway machinery

Cable carts follow:

`Parked → Loading → Departure Warning → Moving → Destination Lock`

They cannot be steered or weaponized. They may carry candidate cases, including a genuine item, only through this declared state machine. Enemy loading requires a visible channel; interruption drops the item safely. Players cannot freely load or unload a cart. Only host-authoritative commitment records departure, movement, and a counted advance.

Optional boarding occurs only on marked platforms and always has an equivalent on-foot route. Same-device co-op uses shared-camera regrouping before objective states.

Cranes move among declared previewed positions through tagged controls. They cannot handle people, genuine items, or indispensable structures. Tagged ring-owned suspended cargo can affect eligible enemies only after a ground silhouette, directional sound, caption, non-color icon, and optional vibration warning. It cannot harm civilians, cases, custody objects, required interactions, or sole routes.

Counterweights are deterministic route and presentation elements with capped displacement, rails, catches, and reduced-motion equivalents. Prediction cannot commit a departure, advance, or cargo release.

## 14. Abandoned Cableway Station

### 14.1 Encounter 7 — The Sorting Hall

- Contains every Incline-advanced sensor/map item, three station decoys, and the Tablet tracking signal.
- Uses the standard salvage-ring roster.
- The Tablet remains inside Ivo’s reinforced upper-office case.
- A carrier reaching the upper platform creates a **Station Transfer Incident**, never loss or another route advance.

### 14.2 Encounter 8 — Seal the Lift

- Defeats the transfer team and secures the controls.
- Resolves candidates and tags every sensor/map item.
- A genuine case reaching the lift cage becomes **Secured in Lift Cage** and transfers automatically after clear with one retained incident.
- Every non-Tablet item reaches Council Custody before the boss.

The emergency lift remains stationary until Ivo’s declared attempt. It cannot cause lethal falls, trapping, or softlocks. No adds enter the boss fight.

## 15. Enemy roster and pressure rules

### 15.1 Core roles

- **Decoy Carrier:** channels one candidate pickup, cannot fight while carrying, drops safely, and alone may perform Rough Transfer.
- **Salvage Brawler:** punishable close fighter with no objective authority.
- **Hook Runner:** warned short combat pulls and tagged machinery/drag actions; never acts off-screen, through walls, or against protected people/interactions.
- **Equipment Guard:** finite Guard protecting routes and carriers; counterable by flank, throw, Exact Block, impact, or co-op pressure.

### 15.2 Difficulty specialists

- **Extreme — Case Rigger:** one visible, local, interruptible quick-haul harness attempt in selected encounters. It creates one faster route only.
- **Ultimate — Manifest Forger:** one visible counterfeit sleeve that may target only an authored eligible Unknown decoy retaining at least two other visible inconsistencies. Its overlay lifecycle is `Unknown + Unsleeved → Unknown + Sleeved → Inspected + Sleeved`. Inspection records the obscured field and false match as presented. Interrupting or removing the sleeve updates that Evidence Tray field and reveals the original clue without counting as repeat inspection. Genuine, inspected, marked, verified, tagged, and custody-secured cases are ineligible.

Rigger and Forger replace ordinary slots and never channel together on one case.

Specialist progression is cumulative: Extreme introduces Case Rigger, while Ultimate retains Rigger and adds Manifest Forger. They never target the same case or overlap objective channels. If both appear in one encounter, authored opportunities occur sequentially with a fair neutral interval. Their presence does not raise the active-enemy cap.

### 15.3 Active caps

| Difficulty | Solo | Co-op |
|---|---:|---:|
| Easy | 3 | 5 |
| Medium | 4 | 6 |
| Hard | 5 | 7 |
| Extreme | 5 | 7 |
| Ultimate | 6 | 8 |

Formations include False Escort, Hooked Route, Decoy Split, Rigged Transfer, and Counterfeit Screen. Solo permits one active genuine-item, evacuation, machine, harness, or sleeve pressure event. Co-op permits at most two staggered events against different reachable targets. Warnings state target, direction, consequence, and countdown. Off-screen objective actions are forbidden.

Difficulty increases coordination and validated timing pressure, not waves, hidden evidence, inconsistencies, simultaneous specialists, or primary Health inflation.

## 16. Temporary tool arsenal

### 16.1 Surveyor’s Tripod

A medium-durability, long control weapon emphasizing reach and spacing over damage. It has complete standing, directional, low/ground, aerial, wake-up, and repeat-protected grounded routes. Optional tagged uses include bracing a lightweight shutter, cable control, or empty cart; every use has an unarmed alternative.

### 16.2 Salvage Pry Bar

A high-durability, short Guard/environment tool with complete standing, directional, low, aerial, grounded, and route-ending routes. It may open tagged ring tool crates, barriers, or pallet locks, never genuine or protected objects.

Both use shared `T`, direction, aerial, ground, `J`, ownership, handoff, durability, disarm, affinity, checkpoint, and anti-infinite rules. Neither changes evidence, condition, custody, seals, tags, or civilians.

Medium provides two of each tool in solo and three of each in co-op. Easy may add one Tripod. Higher difficulties retain an accessible first instance. Tools cannot be pre-equipped, stored, or purchased.

## 17. Environment and Property Care

Approved lightweight objects in Yard, Market, Incline, and Station use `Intact → Damaged → Broken`. Tagged breakage may yield one safe panel, bar, lid, or frame throwable. Glass, live cable/electronics, counterweights, records, batteries, and safety equipment never become weapons.

Three ledgers exist:

1. Civil-Works Equipment.
2. Market/Public Property.
3. Cableway Safety Property.

Each grades:

- **Protected:** zero avoidable player incidents.
- **Disturbed:** one or two incidents.
- **Damaged:** three or more incidents.

One authored cluster counts once. Enemy damage, enemy-thrown heroes, required/accessibility actions, ring-owned objects, scripts, boss transitions, and protection actions are exempt. Deliberate player impacts into protected property attribute once. Genuine items, occupied civilian property, required rails, machinery, records, and controls are immune.

Environmental impacts obey collision cooldown, diminishing control, launch budgets, elite resistance, and boss vulnerability. Property affects collateral, results, and Archive only.

## 18. Boss — Ivo Serrin

**Ivo Serrin — The Fence Broker / 伊沃·塞林——销赃掮客 / Ivo Serrin – der Hehler**, age 42, is a former freight appraiser and auction intermediary who became an obscured-goods reseller. He is independent and has no link to Tomas, the sponsor, or the Compact.

### 18.1 Phase 1 — Reinforced Inventory

Ivo uses the genuine Tablet case as a finite separate Case Guard for standing, low, aerial, throw, and grounded pressure. Tablet condition is immune. Phase exit requires Guard break plus the Resolve threshold; the case then moves to a protected cradle.

### 18.2 Phase 2 — Appraiser’s Counter

Ivo uses a Pry Bar with close counters, grounded and aerial pressure, throws, and one warned exact-state player-tool disarm/pickup. He cannot delete a tool or remove it from the arena.

### 18.3 Phase 3 — The Last Cable

Phase 2 ends when Ivo crosses an authored low-Resolve threshold after completing the minimum readable Phase 2 exposure. A protected transition begins one warned gate/platform/cage sequence. Each completed step records one Escape Pressure incident and gives position/cover advantage, never a resource reset. Interruption before cage entry causes a short punishable stagger. Full cage entry records the third incident, triggers the safety brake, and returns Ivo to the arena; escape is impossible.

Either result enters **Final Appraisal**, a no-reset final combat state using shortened Phase 2 Pry Bar or unarmed routes according to exact weapon ownership. Ivo cannot retry the lift, recover Case Guard, summon enemies, or restore resources.

There are no adds, lethal falls, hidden life bars, or difficulty-exclusive phases. Shared Defense, counter, Combo Breaker, anti-infinite, and co-op rescue rules apply. Zero Resolve produces controlled, non-QTE live custody, medical assessment, Tablet verification, tagging, and Council handoff.

## 19. Optional branches and Museum

### 19.1 The Warning Bench / 预警工作台 / Die Warnwerkbank

After the Yard, clear a bounded Brawler/Guard group, interrupt one Rigger-style harness, and tag indestructible retired calibration plates, reference housing, and notes. The branch adds calibration art, engineer-history commentary, and an Atlas calibration layer.

### 19.2 Routes in the Margin / 图册边注 / Randnotizen der Wege

Before the Station sorting fight, open a protected-shelf route, defeat a bounded Hook Runner/Guard group, and secure three indestructible annotation folios through one custody interaction. The branch adds original annotations, community commentary, and a restored physical Atlas presentation.

Any clear unlocks the controlled localized digital **Regional Hazard Atlas**. Each branch layers its material. Completing both creates **Regional Hazard Atlas Restoration** and awards **Every Route Remembered / 每条道路皆被铭记 / Jeder Weg bleibt bewahrt** in an eligible run.

Branches are loss-proof, time-compensated, replayable, and never required for S, five-item recovery, Ivo, base Museum, or access. They grant no gameplay advantage.

## 20. Solo and co-op equivalence

Solo uses one hero and one active pressure event with sequential interactions and travel-aware timing. Co-op uses two unique heroes and at most two staggered events against different targets. It may divide inspection, defense, machinery, and custody roles within one map but adds no items, encounters, or completion rewards.

Every hero can perform every objective. Evidence, civilians, custody, condition, routes, machines, and handoffs are shared once-only authority. Same-device camera and regroup prevent splits. A downed partner extends only the later objective channel and never changes evidence. Ivo’s grabs allow partner rescue. Boss resources and lift steps are shared.

Solo and co-op have separately normalized records and informational contribution breakdowns. No content, rank, reward, achievement, or Museum entry requires co-op. The local-Wi-Fi host owns authoritative mission state.

## 21. Checkpoints, recovery, and network state

Five exact anchors exist:

1. Depot Departure.
2. Yard Cleared.
3. Market Cleared.
4. Incline Cleared.
5. Station Sealed.

There is no mid-boss checkpoint. Ivo restarts Phase 1 from the exact Station Sealed resources.

Snapshots include heroes, loadouts, resources, tools, provisions; all item, decoy, evidence, condition, custody, advance, tag and handoff data; civilians, property, branches, Museum; machines and environment; enemies and channels; Ivo, Tablet, case and lift; score, time, difficulty, ruleset, integrity, Highlight and network state.

Restore never improves, rerolls, erases, replenishes, duplicates, reverses, or reopens custody. Validated technical recovery and one consumed-on-resume suspension preserve eligibility. Defeat/voluntary Continue preserves completion and content but removes competitive, economy, achievement, and Highlight-prestige results.

Validated reconnect or host migration before resumed play preserves the co-op class. Solo continuation after partner loss marks **Party Changed**, changes only future safe-boundary rules, withdraws absent inventory safely, and yields access/mandatory records only.

## 22. Grade and scoring

The 100-point Survey Recovery Grade is:

| Category | Points |
|---|---:|
| Survey Item Integrity | 25 |
| Custody and Recovery Efficiency | 20 |
| Civilian and Property Care | 20 |
| Combat and Nonlethal Mastery | 25 |
| Resource and Active-Time Efficiency | 10 |

Each genuine item awards 5 for Intact, 3 for Scuffed, and 1 for Damaged. Civilian and Property Care splits 12/8. Active time excludes pause, Evidence Tray/access output, language changes, cinematics, loading, readiness, validated recovery, and compensated branch time.

A valid clear requires all five items in Council Custody, Ivo captured alive, all civilian groups Cleared, and a validated completion.

| Rank | Requirement |
|---|---|
| C | Valid clear below 60 |
| B | 60+ |
| A | 75+ |
| S | 90+ plus caps below |

S permits either one resolved route/Station incident or one Scuffed item, not both. One Damaged item caps A. Two or more Damaged items, or any Damaged property category, caps B. Wrong marks debit time only. Each branch adds five leaderboard points after rank and never gates S. Repetition and farming decay. Ineligible runs retain completion only.

## 23. Achievements and rewards

Eight eligible achievements:

1. **The Vanishing Survey / 消失的勘测资料 / Die verschwundene Vermessung** — eligible clear.
2. **The Warning Bench** — complete its branch.
3. **Routes in the Margin** — complete its branch.
4. **Every Route Remembered** — both branches in one eligible run.
5. **Every Case Intact / 每只箱体完好 / Jeder Koffer unversehrt** — all five Intact.
6. **No False Trail / 不入假途 / Keine falsche Spur** — no wrong classification.
7. **Market without Harm / 市集安然 / Markt ohne Schaden** — undisrupted groups and Protected Market.
8. **The Last Lift Stopped / 最后一趟缆车止步 / Die letzte Seilbahn gestoppt** — no completed Ivo lift step and live capture.

Any valid clear grants Chronicle, base Atlas, media/content entries, and replay/remix access. First eligible clear adds balance-defined Credits and records. First A grants a text-free Survey Triangle emblem. First S grants all four heroes the cosmetic-only **Survey Line Patrol / 勘测线巡护装 / Patrouillenfarbset der Vermessungslinie**. First Ultimate grants **Keeper of the Safe Routes / 安全路线守望者 / Hüter der sicheren Wege**.

No reward grants power or requires co-op, purchase, or a specific hero. Profile-once, bounded replay, and difference-only anti-farming apply. Ineligible clears receive base narrative, media, and Museum access only.

## 24. Recovery provisions

| Function | English | Simplified Chinese | German |
|---|---|---|---|
| Health | Terrace Vegetable Bun | 梯田蔬菜包 | Terrassen-Gemüsebrötchen |
| Defense | Mineral Barley Tea | 矿物大麦茶 | Mineral-Gerstentee |
| Attack | Dried-Fruit Seed Bar | 果干籽仁棒 | Trockenfrucht-Kernriegel |
| Balanced | Survey Crew Lunchbox | 勘测队餐盒 | Lunchpaket des Vermessungsteams |

Medium solo places two of each common item across Yard, Market, and Incline, plus one Lunchbox after Seal the Lift. Co-op adds one smaller common portion of each type, never a second Lunchbox. Easy adds one of each common type. Hard, Extreme, and Ultimate remove one, two, and three authored common items respectively; the Lunchbox remains.

Branches add no resource. Only safe authorized containers or handoffs provide provisions. They cannot be confused with cases or protected stall goods. Shared `J`, ownership, handoff, consumption, drop, throw, and checkpoint behavior is deterministic. `FULLPANTRY` excludes the Lunchbox, branches, tools, genuine cases, and rewards.

## 25. Automatic Highlights

The Curated-only system may record at most three highlights, one per family, from a 24-candidate cap:

- **Perfect Combo:** universal legal hero route.
- **Two Threats One Move:** one legal action affects two active hostiles.
- **Guardian Intervention:** prevents a carrier exit, Rough Transfer, Hook drag, Rigger harness, Forger sleeve, evacuation disruption, or Ivo lift step before state worsens.
- **Defensive Mastery:** Exact Block/Counter against a designated enemy or Ivo action into a clean, damage-free punish.
- **Team Harmony:** one hero completes an objective while the partner interrupts its threat and the state secures.
- **Environmental Ingenuity:** an approved object interrupts an objective actor and affects another hostile without protected harm.

Delay, warning repetition, item harm, wrong-mark farming, helpless/custody targets, harmless damage, and boss extension are excluded. Captures avoid distress, damage, downed, and custody imagery. Localized reason, attribution, and ruleset labels are required.

The feature is enabled by default but can be disabled before play. Reconstruction is local and creates no authority traffic. Highlights grant no score, reward, achievement, or progression. Privacy, export, deletion, and Museum-pin controls follow the shared policy.

## 26. Guide and Academy

The searchable Guide article is **Survey Recovery Operations / 勘测设备追回行动 / Bergung von Vermessungsausrüstung**. It explains manifest reading, evidence, inspection, marking, custody, condition, advances, tagging, civilians, property, machinery, tools, Ivo, grading, branches, rewards, Highlights, cheats, and accessibility without revealing case answers.

The Academy package is **Survey Recovery Drill / 勘测追回训练 / Übung zur Vermessungsbergung** with five spoiler-safe access-time lessons:

1. Read the Case.
2. Stop the Carrier.
3. Protect the Condition.
4. Clear the Market.
5. Work the Cableway.

Post-clear it adds **Break the Broker’s Escape**. Synthetic cases differ from mission assets. Demo, guided, test, free practice, tool/unarmed alternatives, configurable solo partner, optional unique-hero co-op, and My Combos tool routes use unchanged systems. Training transfers nothing and grants no access, power, economy, rank, achievement, or Highlight eligibility.

## 27. Cheat profile

No new cheat code is added.

- `SOFTERBLOWS` and `SAFEHEART` affect ordinary Health.
- `STEADYFEET` affects eligible knockdowns, not cableway safety returns.
- `IRONGUARD` affects hero Defense only.
- `BRIGHTSPIRIT` affects legal Attack gain.
- `STRONGHANDS` affects enemy Health/Ivo Resolve, not item condition, Case Guard, Guard durability, property, machinery, objectives, or civilians.
- `TRUSTYTOOLS` affects carried Tripod/Pry Bar durability only; it does not prevent disarm, ownership change, or Ivo pickup.
- `QUIETCROWD` reduces ordinary pressure but retains selected specialists, required routes, civilians, Ivo, and discoveries.
- `FULLPANTRY` affects ordinary eligible food only.
- `HOMECOMING` restores exact state.
- `STEADYRIDE` and `SAFEPASSAGE` display localized **Not Applicable** states.

Any active code marks the run Cheat-Assisted. Base clear, narrative, encountered records, and Museum content remain available; score records, Credits, achievements, cosmetics, titles, and Highlight prestige do not.

## 28. Presentation, localization, and accessibility

### 28.1 Opening

**Lines That Protect** is a skippable 16–24 second silent small-motion Flow/still sequence showing theft aftermath, manifest comparison, and route trace—not a complex depiction of the theft.

### 28.2 In-engine story

The briefing explains public purpose, manifest, evidence, condition, custody, safety, and configuration. Safe-transition updates report Yard, Market, Incline, and Station state. Ivo and Tablet evidence remains in-engine and contains no generated labels.

### 28.3 Ending

**Every Line Restored** shows Ivo in live custody, the earned item/property/civilian results, Council transfer, restored monitoring, and branch-shaped Atlas content without implying destruction or danger that did not occur.

Generated visuals use approved start/end frames, one focal action and camera axis, explicit gaze/hand/ownership, no speech or embedded text, and a two-failure simplification rule with still fallback.

English is default, with full Simplified Chinese and German dialogue, narration, subtitles, speaker labels, objectives, evidence, results, Guide, Academy, Museum, transcript, SFX captions, and Highlight reasons. Readable evidence exists only in controlled UI; optional Windows narration is separate.

Evidence uses text, shape, and screen-reader descriptions; color is supplemental. Warnings include target, direction, consequence, and countdown. Machinery uses silhouette, audio, caption, icon, and optional vibration. Hold/toggle, reduced input, subtitle/audio controls, reduced motion/shake/flash/particles/sway/height/background/debris preserve simulation timing and hitboxes. Every sequence is independently skippable and provides a localized recap.

## 29. Audio suite

Music family: **Lines That Must Remain / 必须留存的路线 / Linien, die bleiben müssen**.

| Cue | Function |
|---|---|
| The Missing Measure | Restrained Depot opening and briefing |
| False Consignment | Yard uncertainty and pursuit |
| Market of Many Hands | Humane public-space tension |
| Above the Old Cable | Airy mechanical Incline traversal |
| The Broker’s Last Lift | Three-layer Case Guard/counter/lift boss cue |
| Every Line Restored | Resolved civic ending |

Adaptive stems must never reveal authenticity. Carrier, handling, specialist, civilian, cart, cargo, lift, speech, and objective warnings duck music. Each evidence action, correction, tag, custody, advance, specialist, tool, Case Guard, machinery, and lift event has a distinct cue without leaking case identity before inspection.

Reduced-audio settings retain essential warnings. Generated candidates require human editing, loop preparation, provenance, creation-date commercial-rights verification, and no lyrics or language vocals.

## 30. Package, Archive, replay, and profile portability

`curated.vanishing_survey` declares package, combat, localization, evidence, scoring, Highlight, and replay versions plus asset/rules hashes. Local-Wi-Fi mismatch blocks readiness with localized correction instructions.

The competitive Archive stores configuration, score/rank/bonus, all item/decoy/evidence/civilian/property/branch/Museum facts, resources, machines, environment, enemies, Ivo, checkpoint, network, integrity, and Highlight facts. Ineligible history is separate. Personal-best comparison requires compatible content, scoring, difficulty, player count, heroes, loadout class, and integrity; older records become Legacy.

Compact replay stores inputs and deterministic events/hashes, never video. Compatible replays simulate. Incompatible replays show a localized timeline, manifest, results, and stored cards. Replay cannot grant, change, recover, or create competitive Highlights.

Uninstall preserves ownership, completion, rewards, Archive, Museum, Highlight pins/exports, Guide, and discovery while disabling play/replay until compatible reinstall. Profile export/import preserves all records, capsules, labels, integrity, Museum content, and rewards and clearly identifies missing/incompatible packages.

## 31. Release acceptance matrix

Release coverage must include:

- All four solo heroes and all six unique two-hero pairs.
- Five difficulties.
- Standard, Open, Assisted, Cheat-Assisted, Continued, and Party Changed classes.
- Remapped keyboard, German physical layout, supported gamepads, same-device co-op, local-Wi-Fi co-op, and supported browsers.
- 60-FPS target and stable 30-FPS minimum at the mission’s validated performance peak.
- All five links, eight ordinary encounters, two branches, all Ivo outcomes, and every reachable item, decoy, civilian, property, enemy, specialist, tool, provision, machine, environment, score, reward, Museum, Chronicle, and Highlight state.
- All five anchors, recovery paths, network paths, package/replay/Legacy states, uninstall/reinstall, and profile export/import.
- Complete English, Simplified Chinese, German, media, accessibility, and reduced-effects behavior.

Negative proof must demonstrate absence of:

- Item destruction, loss, substitution, identity change, or permanent wrong classification.
- Single-channel evidence or accessibility reading time entering score.
- More than two advances, escape-generated waves, or state farming.
- Civilian death/follower behavior, false property attribution, lethal cableway states, blocked sole routes, or softlocks.
- Missing or duplicated content, score, rewards, or Highlights.
- Ivo escape/death, Tablet damage, phase skip, or permanent player-weapon loss.
- Co-op gates or campaign-conspiracy contamination.
- Cheat-Assisted competitive/economy/prestige rewards.
- Highlight simulation influence, authority traffic, reward influence, privacy failure, or protected-image capture.
- Checkpoint, package, archive, replay, uninstall, reinstall, or profile corruption.
- Settings, frame rate, language, or accessibility choices changing gameplay outcomes.

Release requires zero unresolved Critical or High defects. Exact frames, values, economy, geometry, final assets, and browser budgets remain production validation unless they reveal a fundamental contradiction.

## 32. Completion criteria

Feature design is complete when:

- This document contains every approved mission decision without contradiction.
- A fresh builder review finds no material feature-level ambiguity.
- Any review gaps are refined and logged in `story_line.md` and `Features_Decisions.md`.
- The user approves the reviewed specification.

Implementation planning begins only after a separate explicit request.

## 33. Builder-review record

Fresh builder review was completed on 2026-11-02. Ten material consistency clarifications were reviewed and approved: counted cross-link advancement; verified-decoy locking; authoritative mark resolution and time debits; Manifest Forger sleeve legality; unrelated-container classification; cumulative specialist progression; Ivo's one-shot Last Cable and Final Appraisal transitions; controlling localized title; Terminal Recovery Bay eligibility; and cable-cart versus crane authority.

The final follow-up review returned **nothing important left**. The specification was approved on 2026-11-02. Implementation planning has not begun.

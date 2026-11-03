# Fight for Peace - Storm over Qinglan Product Content and Technical Specification

**Version:** 1.0 approval draft

**Date:** 2026-11-01

**Curated Mission title:** *Storm over Qinglan* / *青岚风暴* / *Sturm über Qinglan*

**Decision source:** `storm_over_qinglan_feature_story_line.md`

**Campaign continuity source:** `story_line.md`

**Shared game source:** `docs/superpowers/specs/2026-10-18-fight-for-peace-game-specification.md`

**Expanded-mode source:** `docs/superpowers/specs/2026-11-01-fight-for-peace-expanded-game-modes-specification.md`

## 1. Status, intent, and interpretation

This document converts the approved *Storm over Qinglan* decisions into a build-facing mission specification. It extends the permanent Combat Constitution and Curated Mission framework. It does not replace shared combat, controls, input abstraction, profile, economy, accessibility, localization, networking, deterministic simulation, Museum, Guide, Academy, cheat, Automatic Highlight, or media rules.

Interpretation priority:

1. Player safety, readable counterplay, accessibility, deterministic state, and profile integrity.
2. The shared game and expanded-mode specifications, campaign continuity, and this mission specification.
3. Validated mission action, encounter, economy, localization, and presentation data.
4. Candidate values and production placeholders.

**Confirmed** rules require a new approved design decision to change. **Production baseline** values may change through documented tuning without changing the feature model. **Deferred** work requires production or validation, not another product decision.

The selected documentation approach is a two-document handoff: `storm_over_qinglan_feature_story_line.md` remains the readable narrative and feature record, while this file owns build-facing contracts and acceptance. A single combined file was rejected because it would mix canon review with implementation state and validation detail.

## 2. Goals, non-goals, and anti-goals

### 2.1 Goals

- Deliver a complete 20-40-minute authored protective-duty case using the permanent combat engine.
- Make rescue, stabilization, positioning, defense, and restraint as meaningful as enemy defeat.
- Support every established hero in solo, same-device co-op, and local-Wi-Fi co-op.
- Provide deterministic storm hazards and recoverable objective pressure without civilian death or hidden failure clocks.
- Add replay value through conditions, two optional branches, five difficulties, grading, achievements, Highlights, and Museum records.
- Preserve the canon-compatible side-story boundary and show a crisis unrelated to the main villain network.
- Teach mission-specific interactions without exclusive power or access gating.

### 2.2 Non-goals

- No change to the Combat Constitution, input vocabulary, combo rules, defense rules, weapons framework, or difficulty unlock model.
- No new campaign hero, main-story clue, sponsor evidence, required technique, or permanent combat-power reward.
- No random weather simulation, civilian Health bars, hidden execution timer, lethal civilian outcome, or branching campaign ending.
- No firearm, grenade, playable mount, mounted enemy, pre-stage weapon, Store weapon, or vehicle-control system.
- No long escort AI, procedural route, open-world traversal, or live-service rotation.

### 2.3 Anti-goals

The mission fails its intent even if technically completable when it:

- rewards delaying rescue, accepting civilian harm, farming protected states, or destroying relief property;
- permits off-screen objective damage, unavoidable condition loss, checkpoint improvement, resource duplication, or route softlock;
- requires a specific hero, optional branch, purchase, co-op partner, pointer, colour, sound, motion effect, or cheat;
- makes weather timing depend on frame rate, physics nondeterminism, visual-effects settings, or network latency;
- implies that Mara is connected to Tomas or the sponsor;
- changes canonical survival based on grade;
- grants combat advantage through ownership, rank, or a paid package.

## 3. Package and availability contract

*Storm over Qinglan* is an optional Curated Mission package in the Mission Hub's permanent expandable case catalogue.

The package manifest must declare:

- stable case identity and package version;
- localized title and synopsis in English, Simplified Chinese, and German;
- **Canon-Compatible Side Story** label;
- campaign position 10-14 days after Stage 3 and before Stage 4;
- independent availability gate: Stage 3 completion, including Cheat-Assisted completion;
- supported solo, same-device two-player, and local-Wi-Fi two-player configurations;
- four eligible heroes and duplicate-hero prohibition;
- protective-duty objective and grading profiles;
- package dependencies and shared schema versions;
- rewards, Museum and Chronicle records, achievements, Academy lesson, and Highlight profile;
- localization, caption, screen-reader, reduced-effects, and input requirements;
- replay compatibility and migration metadata.

The package cannot require ownership or completion of another Curated Mission. Before Stage 3 completion, an installed entry presents a localized spoiler-safe clue. Installing it after the gate is satisfied makes it available immediately.

Uninstalling removes playable package assets but preserves compact completion, reward, achievement, Museum, Chronicle, and record facts. Reinstalling restores compatible access without regranting first-clear rewards. Incompatible historical runs remain labelled Legacy records rather than being silently deleted or compared against current ranks.

## 4. Inherited technical architecture

The mission remains a data-centric extension of the existing browser game:

- TypeScript and Vite application shell.
- Phaser 2D rendering and scene coordination.
- Framework-independent fixed-step deterministic simulation, candidate 60 Hz.
- DOM surfaces for Mission Hub, briefing, loadout, subtitles, Guide, Academy, pause, results, Museum, settings, and accessibility.
- Abstract actions for keyboard and supported gamepads, with remapping.
- Host-authoritative local-Wi-Fi play using frame-stamped input, bounded rollback, state hashes, version checks, reconnect, and authoritative recovery.
- IndexedDB profile persistence with transactional saves, backup/import, migration, and previous-known-good recovery.

The mission may extend content schemas for rescue groups, objective attackers, deterministic hazards, Hook Pole interactions, optional branches, Mara's phase graph, mission-specific results, and checkpoints. It may not fork shared combat or create mission-only input semantics.

## 5. Narrative and canonical state

### 5.1 Premise

A severe storm damages routes around Qinglan. Unaffiliated looters divert relief supplies and obstruct evacuation while a clinic team, bridge workers, and residents near a service tunnel remain endangered. Sheng Guo authorizes the response and Gao Wen coordinates locally.

### 5.2 Canonical outcome

Every valid completion produces one canon-compatible outcome:

- the clinic team reaches shelter;
- the bridge workers reach shelter;
- the tunnel residents reach shelter;
- relief distribution continues;
- Mara Venn is captured alive, medically assessed, and transferred into documented custody;
- local black-market records contain no Tomas, Garran, sponsor, or Meridian clue.

Final condition, optional branches, wagon exterior damage, and performance modify results and presentation only. They never contradict survival or create main-campaign divergence.

### 5.3 Presentation boundary

No text, dialogue, subtitle, codex entry, item, result, or environmental mark may imply that the storm was engineered, the relief looters were sponsored, or Mara serves the campaign antagonists. Cosmetic reuse of a sponsor-associated seal, uniform, equipment silhouette, or procurement marking is forbidden.

## 6. Player flow and route state

The required flow is:

`availability check -> package readiness -> hero/co-op selection -> difficulty/rules/loadout -> Storm Warning -> elder briefing -> mission start -> five route segments -> Mara capture -> After the Storm -> result evaluation -> transactional save -> Mission Hub/Museum`

First clear targets 30-40 minutes. Experienced replay targets 20-28 minutes.

| Segment | Mandatory objectives | Optional/system focus | Checkpoint |
| --- | --- | --- | --- |
| Relief Staging Yard | Repel looters; secure departure | Hook Pole and warning demonstration | Mission-start fallback |
| Runoff Road | Stabilize route; protect clinic case; shelter clinic team | Warning-post branch becomes available | CP1 after clinic shelter |
| Storm Cable Bridge | Cross; protect anchor; shelter workers | Secondary-anchor recovery | CP2 after shelter and finalized anchor |
| Service Tunnel Approach | Stabilize cover; shelter residents | Storehouse branch after shelter | CP3 after tunnel shelter |
| Relief Turnout | Protect wagon; defeat and capture Mara | Preboss resource choice and wagon state | CP4 immediately before Mara |

Optional branch entry and exit must return to the authored route without ambiguous backtracking, route trap, or encounter-order corruption. Branch rejection and completion are both checkpoint-safe.

## 7. Playable roster and co-op

Eligible heroes:

- Mountain Guardian;
- River Scout;
- Wind Sentinel;
- Fire Warden.

Every hero must be able to complete every objective alone using abstract interaction, defense, movement, and ordinary combat. Hero-specific weapon affinities may alter tactics but cannot change objective reach, rescue timing, Hook Pole necessity, or score ceilings.

Co-op teams contain two unique heroes. Duplicate selection remains prohibited. Co-op may split roles: one hero stabilizes, carries, guides, or operates a fixed rescue fitting while the other intercepts. Every such sequence requires a solo equivalent with a protected interaction window.

Shared-camera, respawn, partner rescue, combo handoff, friendly collision, resource ownership, pause/readiness, and network authority use inherited rules. Co-op adds approximately 35-40 percent ordinary pressure at Medium baseline but does not duplicate rescue groups, hazard schedules, specialists, objective attackers, Mara support, or reward containers.

## 8. Rescue group state machine

### 8.1 Group records

The mission owns three rescue group records:

| Group | Rescue segment | Contextual recovery | Shelter lock |
| --- | --- | --- | --- |
| Traveling clinic team | Runoff Road | Recover emergency case | CP1 shelter |
| Bridge-maintenance workers | Storm Cable Bridge | Fasten secondary safety anchor | CP2 shelter |
| Tunnel residents | Service Tunnel Approach | Reinforce tunnel shelter | CP3 shelter |

Each record includes stable group identity, current condition, condition incident count, grace state, recovery availability/outcome, evacuation phase, shelter lock, presentation variant, and result facts.

### 8.2 Condition state

The allowed states are **Secure**, **Strained**, and **Critical**. There is no dead, lost, captured, failed, bleeding-out, or hidden terminal state.

Legal downward transition triggers are limited to:

1. completion of a warned designated objective action by a Relief Snatcher or Timber Breaker;
2. failure to handle an authored runoff or debris event;
3. abandoning an active stabilization after its visible danger phase starts.

Ordinary attacks, collision, cosmetic rain, camera absence, off-screen simulation, enemy action after shelter lock, and cinematic events are invalid triggers. One event can remove at most one band and then activates grace. Concurrent events coalesce or queue without bypassing the cap.

At Critical, further valid incidents increment a bounded protection penalty but do not change condition or create failure. Score penalty has an authored maximum.

### 8.3 Recovery and shelter

Each group may complete its one contextual recovery once. If Strained or Critical, condition improves by one band. If Secure, condition remains Secure and a bounded route-safety bonus is stored. Recovery cannot be repeated after checkpoint restore, disconnect, revive, or branch replay.

Shelter arrival locks condition, recovery outcome, incident count, and result facts. Sheltered groups are removed from hostile targeting and hazard interaction. They may remain visible in safe presentation layers but not as combat bodies.

### 8.4 Warnings and fairness

Every condition-affecting threat requires:

- objective-attacker role marker;
- target line or tagged objective marker;
- readable anticipation and active windows;
- non-colour silhouette or shape treatment;
- priority SFX plus caption and screen-reader event;
- deterministic target and consequence;
- enough response time for every hero under the validated difficulty profile.

Difficulty may shorten bounded warning windows and combine threats but cannot hide roles, change state meaning, remove grace, or add instant condition loss.

## 9. Objective interactions

All prompts display current abstract-action bindings. Required interactions must support keyboard and gamepad and cannot rely on pointer precision.

When the Rescue Hook Pole is equipped, an eligible tagged rescue node creates a visible **Hook-Opportunity Focus**. Neutral `T` or its authored directional-`T` route selects the contextual Hook action through the existing weapon action graph. Without that focus, the same inputs retain ordinary Hook Pole attacks. Moving out of range or facing away releases focus. `J` retains its shared held-weapon throw/discard priority. Fixed fallback fittings are used empty-handed with Grab/Interact or the optional separate Interact binding. This is a builder-call clarification that introduces no new abstract input.

Stabilization supports hold, toggle, and reduced-input modes. If an alternative changes the gameplay window or grants extra reaction time, the run uses the Assisted record class. Pure input-form changes that preserve the window remain eligible under shared accessibility policy.

Protected solo windows pause or suppress invalid incoming pressure around the interaction. Co-op does not receive extra objectives for having a second player. Abandoning an interaction before its danger phase begins has no condition consequence; after the phase starts, one warned consequence may occur under the one-band cap.

Objective items cannot be consumed, thrown away into unreachable space, destroyed, sold, or replaced by `FULLPANTRY`. If dropped, they use deterministic recovery nodes. Carrying an objective item may change movement or action availability only within shared carry rules.

## 10. Optional branches

### 10.1 Warning relay

**Signal Through the Rain / 雨中信号 / Signal im Regen** contains one bounded Hook-focused encounter. Completion stores component recovery and relay restoration. Exactly one later runoff sequence gains a longer warning and the results ledger receives a bounded route-safety bonus.

The standard runoff warning remains fair and fully accessible when the branch is skipped. Branch completion cannot modify enemy damage, hero statistics, or permanent power.

### 10.2 Community storehouse

**Every Crate Accounted For / 物资一件不少 / Jede Kiste zählt** contains one bounded Snatcher-focused encounter. Marked blankets, repair materials, filters, and food cannot be consumed as ordinary items.

On return, each active hero receives exactly one ownership-aware Life, Defense, or Momentum recovery choice. Solo receives one; co-op receives one per hero. Choices cannot be duplicated by drop/pickup, reconnect, checkpoint restore, player join, or host migration.

### 10.3 Branch scoring and records

Branches are not required for S. Their score bonus offsets validated additional active time. Results store eligible, entered, completed, abandoned, and reward-choice facts independently.

Either completed branch expands the Qinglan Museum case. Both in one eligible run permit the combined achievement. Cheat-Assisted play may reveal narrative/Museum material but cannot award branch or combined mastery achievements.

## 11. Enemy content

### 11.1 Core roles

| Role | Combat purpose | Objective authority |
| --- | --- | --- |
| Pass Brawler | Close-range ordinary pressure | None |
| Relief Snatcher | Fast carrier and route pressure | May move marked loose supplies through warned actions |
| Hook Looter | Mid-range displacement and interaction interruption | None; cannot create condition loss directly |
| Timber Breaker | Slow heavy pressure with long recovery | May threaten tagged debris, anchor, or stabilization through warned actions |

### 11.2 Specialists

- **Rainstep Feinter, Extreme+:** delayed attacks and evasive movement. It cannot copy objective markers, warning SFX, target lines, or threat silhouettes.
- **Crew Caller, Ultimate:** one interruptible whistle reserves one authored synchronized action already inside the encounter budget. It cannot dynamically spawn beyond the budget.

### 11.3 Authority constraints

Only Snatcher and Breaker may execute designated objective actions. Solo concurrency is one objective attacker. Co-op concurrency is at most two with staggered warnings. No enemy may target a sheltered group, protected dialogue, checkpoint restore, briefing, or inactive branch objective.

Enemy visuals use improvised civilian/work clothing, patched rain gear, and scavenged tools. No firearm, grenade, military armour, sponsor seal, campaign-faction uniform, or futuristic equipment is permitted.

All ordinary enemies use inherited Health, Defense, Resolve, anti-infinite, surrender, restraint, disarm, environmental-damage, and co-op pressure rules.

## 12. Encounter baseline

The mandatory sequence is:

1. Staging Yard: Brawlers plus one Snatcher.
2. Runoff approach: Brawlers plus first Hook Looter.
3. Clinic rescue: Snatchers plus one Timber Breaker.
4. Bridge entrance: Brawlers and Hooks in narrow lanes.
5. Anchor defense: one Breaker plus staggered Snatchers.
6. Lower tunnel: Brawlers and Hooks under deterministic debris.
7. Tunnel stabilization: Breaker-led pressure plus one Snatcher route.
8. Relief Turnout: full core roster without exhausting boss resources.
9. Mara Venn boss.

Optional warning relay emphasizes Hook Looters. Optional storehouse emphasizes Snatchers.

### 12.1 Initial solo population targets

| Difficulty | Mandatory ordinary enemies | Content rule |
| --- | ---: | --- |
| Easy | ~16 | Hook delayed until bridge; one mandatory Breaker |
| Medium | ~22 | Full core teaching sequence |
| Hard | ~25 | Stronger combinations, same role set |
| Extreme | ~27 | Feinter only after first rescue |
| Ultimate | ~30 | Feinter plus Caller at turnout/storehouse, never with Mara |

Optional enemies are outside these totals. Counts are playtest baselines, not serialized rules. Composition changes may not violate objective-attacker concurrency, warning budgets, civilian boundaries, branch optionality, or boss support limits.

An encounter cannot activate until required civilians are inside the designated protection boundary. Mara may receive at most one non-replenishing Phase-1 support group. No add group appears in Phase 3.

## 13. Rescue Hook Pole and weapons

### 13.1 Rescue Hook Pole

The pole is a portable shared-schema long weapon obtained at the Staging Yard with `J`. It stores instance identity, owner, location, integrity, affinity/action profile, disarm/drop state, throw state, and deterministic recovery node.

Combat identity:

- controlled pull and spacing;
- wide but non-dominant coverage;
- tagged debris redirection;
- lower raw damage priority than dedicated damage weapons.

Authored rescue permissions:

- move tagged light timber;
- draw a tagged supply case into reach;
- fasten the bridge safety line;
- redirect the authored rolling-debris event.

Explicitly invalid targets include civilians, Mara, all ordinary enemy bodies through objective logic, vehicles, large boulders, indispensable structures, and untagged physics props.

Mandatory progress never depends on the portable instance. Fixed rescue fittings satisfy required bridge and tunnel actions. If the pole remains tactically relevant after loss, one deterministic recovery node may restore the same instance/state; it cannot create a new full-integrity copy.

`TRUSTYTOOLS` protects carried weapon integrity according to shared cheat rules but does not protect fixed fittings, anchor state, timber, wagon exterior, or objective actions.

### 13.2 Other weapon profiles

- **Wooden Cudgel:** existing short-blunt profile, eligible Pass Brawler drop.
- **Short Utility Hook:** existing short control-tool profile, eligible Hook Looter drop.
- **Mara recovery hook/handle:** boss-only state and custody evidence; never a player pickup.

The mission has no pre-stage weapon, firearm, grenade, Store weapon, mount, or vehicle weapon. `STEADYRIDE` reports localized Not Applicable.

## 14. Storm hazards and environmental combat

### 14.1 Determinism

Hazard events are authored and seeded. The authoritative simulation owns event index, target lane, anticipation start, active window, result, and cooldown. Rendering may interpolate but cannot determine collision or outcome.

Solo and co-op use the same event schedule. Frame rate, VFX settings, camera visibility, and network latency cannot reseed or shift events. Rollback replays the authoritative event rather than creating a new one.

### 14.2 Runoff

Runoff occupies authored lanes and uses direction arrows/lines, ground treatment, priority sound, caption, and screen-reader cue. The warning relay branch may extend one authored warning but cannot change the lane or consequence.

### 14.3 Debris and timber

Falling debris uses fixed patterns and ground silhouettes. It may affect enemies and tagged timber. Unstable timber has Intact, Damaged, and Broken states. Only selected pieces may create one safe throwable fragment inside the environmental-object quota.

Debris cannot block the only route, bury an objective item, strike sheltered civilians, land during protected interaction, or create an unbounded chain reaction.

### 14.4 Bridge and anchor

Bridge sway is presentation plus bounded authored movement pressure. It is not a physics platform and cannot randomly collapse. The anchor states are Secure, Threatened, and Stabilized. Threatened remains recoverable, and no state can destroy the bridge or block completion.

### 14.5 Relief wagon

The wagon is nonrideable objective/environmental cover. Exterior components may break through authored actions. Indispensable relief cargo is invulnerable and non-consumable. The wagon cannot roll before Mara's single Phase-3 brake action and cannot leave the playable area.

Hazards pause during briefing, dialogue, checkpoint restore, synchronized loading/readiness, protected interaction, and result transition.

## 15. Mara Venn boss graph

### 15.1 Identity and fairness

Mara Venn / 玛拉·文, 37, **the Storm Jackal / 暴雨豺狼 / der Sturmschakal**, is an independent former salvage/recovery leader turned black-market relief looter. She has no campaign-villain connection.

She uses inherited Health, Defense, Resolve, Exact Block, Counter, defense-consuming Combo Breaker, damage scaling, juggle limits, anti-infinite rules, throws, knockdown, ground-state rules, co-op pressure, and surrender/capture presentation.

### 15.2 Phase 1 - Recovery Hook Control

- Long spacing, sweeps, controlled pulls, and tagged timber redirection.
- At most one authored support action within the existing threat budget.
- Hook has visible integrity and may be broken or disarmed.
- Pulls require readable anticipation and cannot pull both heroes into one unavoidable attack.
- Eligible grab supports the shared tagged partner-rescue response.

Phase 1 ends at the first of either a legal hook break/disarm or the authored Phase-2 threshold. If the threshold arrives while the hook is intact, a non-damaging transition has the hooked extension jam against reinforced cover and separate, leaving Mara with the short handle. A legal break/disarm uses the same boss-only long-hook-to-handle conversion; the separated part is noninteractive evidence and never a pickup. This builder-call clarification guarantees forward progress without requiring the player to target weapon integrity.

### 15.3 Phase 2 - Pry-Bar Clinch

- Entered through the first Phase-1 exit condition above.
- Mara retains the shortened reinforced handle as a boss-only pry-bar.
- Compact body strikes, clinch entries, counters, short throws, and wagon-cover repositioning.
- Failed grapples have punishable recovery.
- Phase transition is invulnerable only for the minimum shared presentation window and grants no score farm.
- The serial boss graph cannot skip this phase. Phase 3 remains locked until the transition and at least one bounded Phase-2 decision cycle complete; exact threshold and minimum duration are tuning data.

### 15.4 Phase 3 - Brake Release

- At low Resolve, Mara attempts exactly once to release the wagon brake.
- Multimodal warning identifies Mara, the brake, target direction, and interrupt window.
- Successful interruption produces one bounded stagger.
- Failure damages one exterior wagon component and reduces route-protection score.
- Failure cannot destroy cargo, cause civilian harm, fail the mission, or automatically bar S.
- After resolution, Mara uses shorter desperation strings and receives no reinforcements.

### 15.5 Defeat

Zero combat outcome transitions through Resolve break, controlled restraint, medical assessment, and live custody. The result stores hook state, brake attempt/outcome, wagon exterior state, support-group state, and capture. Mara's equipment becomes evidence only.

## 16. Recovery items and ownership

| Category | Item | Medium solo | Medium co-op |
| --- | --- | ---: | ---: |
| Life | Warm Rice Porridge / 热米粥 / Warmer Reisbrei | 2 | 3 |
| Defense | Mineral Citrus Water / 矿物柑橘水 / Mineral-Zitruswasser | 2 | 3 |
| Momentum | Sesame-Nut Bar / 芝麻坚果条 / Sesam-Nuss-Riegel | 2 | 3 |
| Balanced | Qinglan Rescue Meal / 青岚救援餐盒 / Qinglan-Rettungsmahlzeit | 1 | 1 |

Easy adds one of each common category. Hard removes one authored common item, Extreme two, and Ultimate three. The balanced meal remains at the secured residents' shelter before Relief Turnout on every difficulty.

Items appear only at safe route points or shelters, not active civilian danger zones. Shared `J` carry, consume, throw, ownership, handoff, checkpoint, and anti-duplication rules apply. Co-op quantities do not imply one container per hero; ownership becomes explicit at pickup or optional-branch selection.

The storehouse choice is separate from these counts. `FULLPANTRY` affects ordinary eligible containers only and cannot create objective supplies, Hook Poles, fixed rescue tools, branch crates, or the balanced meal beyond its authored rule.

## 17. Grade, score, and anti-exploit model

The result uses four components totaling 100:

| Component | Maximum | Required facts |
| --- | ---: | --- |
| Rescue condition | 45 | Three final conditions, incidents, recoveries, shelter locks |
| Route and relief protection | 20 | Anchor, relay, wagon exterior/brake, crates, authored hazards |
| Combat mastery | 25 | Legal offense, defense, restraint, variation, no farmed protected states |
| Resource and active-time efficiency | 10 | Eligible resources, continues, active time, branch compensation |

Rank caps:

- all groups Secure: S eligible;
- one or more final Strained: maximum A;
- one or more final Critical: maximum B;
- a recovered group ending Secure remains S eligible.

Candidate thresholds are C on clear, B at 60, A at 75, and S at 90 plus all groups Secure. Final values are tuned separately for difficulty, solo, and co-op without requiring a hero, move, branch, purchase, or perfect execution.

Active time excludes pause, cinematics, loading, synchronized holds/readiness, protected dialogue, and validated network recovery. Branches apply bounded time compensation. Scenery, repeated harmless actions, sheltered/protected actors, surrendered enemies, invulnerable transitions, and intentionally delayed rescue produce no exploitable score.

Cheat-Assisted clears store completion and narrative access but no score, rank, Credits, Hero Mastery, competitive record, mastery achievement, emblem, or title.

## 18. Achievements and reward transactions

The mission defines eight achievements with stable identities and localized title/description/hint text:

1. After the Storm.
2. Signal Through the Rain.
3. Every Crate Accounted For.
4. Qinglan Stands Together.
5. Everyone Sheltered.
6. Hook, Brace, Rescue.
7. The Wagon Holds.
8. Guardians in the Downpour.

The co-op achievement cannot be required by Museum completion, rank, solo progression, or package completion.

First eligible clear transaction grants:

- itemized bounded Credits;
- case completion;
- Canon-Compatible Side Story Chronicle entry;
- Qinglan Community Rescue Archive base record;
- approved mission artwork and music access.

First A grants the text-free Qinglan Rescue Knot profile emblem. First S grants the localized Storm Responder profile title. Branches update Museum material. Rewards contain no statistics, move, Ultimate, weapon, combat outfit, difficulty access, campaign gate, or required content.

The completion transaction must be idempotent across retry, reconnect, result-screen reload, browser crash, backup/import, reinstall, and version migration. Rank improvements grant only the approved one-time differential reward and cannot replay first-clear grants.

## 19. Presentation, localization, and audio

### 19.1 Storm Warning

The 25-35-second skippable opening shows the storm, blocked access, clinic vehicle, damaged bridge, and distress signal. Sheng Guo authorizes the operation; Gao Wen is established as on-site coordinator.

### 19.2 In-engine scenes

Briefing/loadout explains three groups, condition bands, objective markers, and rescue priority. Rescue arrivals, branch results, Mara's entrance, hook transition, brake attempt, capture, and condition-dependent responses remain in-engine or use bounded still inserts so runtime state remains accurate.

### 19.3 After the Storm

The 30-45-second skippable coda shows shelter, relief distribution, Mara's medical assessment/custody, and repair. Inserts may reflect group conditions and branches without depicting death or changing canon.

Generated footage contains no embedded text, dialogue, subtitles, logo, signature, or language-dependent signage. English, Simplified Chinese, and German subtitles and transcripts cover all mandatory content. Both cinematics support skip, replay, transcript, caption settings, and Museum access.

### 19.4 Music and SFX

The **Hands through the Rain** family contains:

- Rain over Qinglan;
- Road beneath the Runoff;
- Guide Them Home;
- The Storm Jackal;
- Shelter Lights.

Music uses restrained strings, wooden percussion, low drums, rain-like shakers, warm winds, and a small community motif. It must not mask objective warnings.

Rain, runoff, thunder, anchor, debris, Hook Pole, supplies, shelter, interaction, and transition effects remain separate mixer groups where required. Decorative thunder cannot reuse warning timing/timbre. Priority warnings have captions and non-audio equivalents. Generated audio remains candidate material until edited, provenance-recorded, and cleared for commercial use.

## 20. Automatic Highlight profile

At most three Highlights are selected, with at most one per family. Detection reads deterministic event facts and does not change simulation.

| Family | Qinglan qualification |
| --- | --- |
| Perfect Combo | Universal legal perfect-combo rule, hero-normalized |
| Two Threats One Move | Universal two-threat rule without objective farming |
| Guardian Intervention | Prevent committed Snatcher, Breaker, runoff, debris, anchor, or wagon threat before loss |
| Defensive Mastery | Exact Block/counter a Breaker objective strike or Mara hook, then legal damage-free punish |
| Team Harmony | One hero stabilizes while partner interrupts, followed by shelter arrival without sequence loss |
| Environmental Ingenuity | Hook/debris redirection interrupts objective attacker and meaningfully affects another hostile |

Candidate evidence stores group/objective identity, pre/post state, responsible hero or team, threat commitment, prevented outcome, frame/time facts, assistance label, and screenshot-safe presentation point.

Screenshots prefer intervention or successful resolution and must not frame civilians as injured. Detection cannot reward deliberate delay, intentional condition loss, repeated warning farming, protected actors, or assisted settings without the correct label. Highlights grant no power or score.

## 21. Checkpoints and deterministic restoration

### 21.1 Checkpoint locations

- CP1: clinic team sheltered.
- CP2: bridge workers sheltered and anchor finalized.
- CP3: tunnel residents sheltered.
- CP4: Relief Turnout immediately before Mara.
- Mission start: fallback before CP1.

### 21.2 Snapshot payload

Each snapshot includes:

- package/case/ruleset/schema versions and deterministic seed/index;
- route segment, encounter, branch access, dialogue, and protected-state markers;
- every group condition, incident, grace, recovery, evacuation, and shelter fact;
- emergency case, anchor, tunnel reinforcement, relay, crate, Museum-pending, wagon, brake, and objective state;
- hazard event index and timber, fragment, bridge, runoff, and environment state;
- enemy identities, roles, combat states, surrender/restraint, and resolved encounters;
- hero identity, resources, lives/continues, position, combat state, loadout, cheats, assistance, and ownership;
- every ordinary item and weapon identity, integrity, ammunition if inherited, carrier, location, consumption, and recovery node;
- score components, active time, rank-cap facts, achievement progress, Highlight candidates, and anti-farm counters;
- network authority, peer identity, acknowledged input frame, rollback/recovery, reconnect, and host-recovery facts.

### 21.3 Restore invariants

Restore cannot:

- reroll hazards or warnings;
- improve a condition, anchor, timber, wagon, or branch outcome;
- respawn consumed or removed supplies;
- repair or duplicate a weapon;
- repeat recovery, reward, achievement, or Museum grants;
- reopen a completed/abandoned branch;
- reset active time or anti-farm counters;
- change hero ownership or objective-item ownership;
- reposition actors to create a score, safety, or route advantage beyond approved safe restore nodes.

Validated technical recovery may preserve competitive eligibility under the shared policy. Ordinary continues retain shared consequences and remain recorded.

## 22. Results, replay, and Museum record

The result record includes:

- stable case/package/ruleset versions;
- difficulty, record class, player configuration, heroes, loadouts, cheats, assistance, and input/network mode;
- total score, component ledger, rank, caps, active time, continues, and technical recovery;
- each group condition, incidents, recovery, shelter, and presentation variant;
- relay, crates, anchor, tunnel, Hook, timber, wagon, brake, hazard, and branch facts;
- enemy/specialist and Mara outcomes;
- item/resource use and ownership facts needed for explanation;
- achievements, rewards, Chronicle, Museum, media, and Highlight references;
- deterministic/replay compatibility and Legacy status.

Comparable records remain separated by difficulty, player count, hero configuration where required by shared rules, loadout/ruleset, and compatible version. The results screen itemizes all four grade components and clearly explains rank caps.

Tiered Curated replay retention keeps compact facts for every result, full capsules for category bests, five recent Curated runs, pinned replays, and Museum-pinned Highlights. Pruned capsules become clearly labelled text-only records rather than disappearing.

## 23. Guide, Academy, accessibility, and cheats

### 23.1 Rescue Operations card

On first launch, show a localized card explaining:

- Secure, Strained, and Critical;
- designated objective-attacker icon;
- current bindings;
- one-band-per-event and grace;
- contextual recovery;
- shelter lock;
- no hidden death/execution timer.

The card remains accessible from Guide and pause. Every new objective interaction receives one safe demonstration before combat pressure.

### 23.2 Storm Rescue Drill

Installing the package adds an optional Academy lesson under Resources, Equipment, and Environments. Its steps are demonstration, guided practice, independent trial, and optional mastery for:

- interrupting an objective attacker;
- completing stabilization;
- redirecting tagged debris with the Hook Pole;
- guiding a practice group to shelter.

The lesson grants no exclusive move, stat, reward power, or mission gate.

### 23.3 Accessibility

Required information is redundant across icon, silhouette, localized text, audio, caption, role marker, and target line as appropriate. Screen readers announce condition changes, objective threats, recovery availability, shelter lock, branch choice, and brake attempt.

Rain, lightning, bridge sway, particles, shake, reflections, and camera motion have independent reductions without timing changes. Stabilization supports hold/toggle/reduced-input alternatives. Every menu and mission prompt is usable without pointer; every objective is completable without colour, sound, or motion effects. Caption and subtitle safe areas account for co-op HUD and 1280x720 presentation.

### 23.4 Cheats

Applicable hero cheats plus `QUIETCROWD`, `FULLPANTRY`, and `HOMECOMING` retain shared scope. `TRUSTYTOOLS` affects carried weapons only. `STEADYRIDE` and `SAFEPASSAGE` show localized Not Applicable reasons. No Qinglan-specific cheat exists.

Cheat activation marks the run immediately and persistently as Cheat-Assisted. It cannot be cleared by checkpoint restore, reconnect, host migration, or disabling the cheat later.

## 24. Network and authority requirements

The host owns:

- route and encounter activation;
- rescue conditions, grace, recovery, and shelter locks;
- hazard schedules and objective-warning state;
- item/weapon identity and ownership;
- branch state and resource choices;
- Mara phase, hook, brake, wagon, restraint, and capture;
- score, achievements, Highlights, checkpoints, and result transaction.

Peers submit frame-stamped abstract inputs. Objective interactions use authoritative start, progress, interruption, completion, and consequence facts. Prediction may animate local intent but cannot commit a rescue transition, pickup, resource choice, brake outcome, reward, or achievement.

Reconnect and host recovery restore the last validated authoritative state. Version/package mismatch blocks readiness with a localized repair path rather than entering a divergent simulation. Network delay cannot lengthen or shorten the authoritative hazard schedule; client presentation may buffer warnings within the shared policy.

## 25. Performance and reduced-effects contract

The supported target is 60 FPS with a supported 30-FPS minimum presentation mode while simulation timing remains unchanged. Production budgets must cover peak Relief Turnout and Mara scenes, rain layers, warnings, two heroes, ordinary enemies, debris, breakable exterior state, subtitles, captions, and Highlight capture eligibility.

Reduced effects may lower or disable:

- rain streak density and splash particles;
- lightning flash intensity;
- bridge sway rendering;
- camera shake and motion;
- reflection quality;
- decorative debris and background activity.

It may not alter hazard start/end frames, hitboxes, warning duration, objective state, enemy count, AI decisions, scoring, or network authority. If Automatic Highlights exceed the supported budget, capture may disable gracefully without losing result facts, achievements, Museum progress, or pins; the selection toggle and assisted/performance label follow the expanded-mode specification.

## 26. Case-to-Archive Acceptance Matrix

### 26.1 Configuration coverage

Validate:

- every hero in solo;
- representative unique co-op pairs covering heavy/mobile, close/ranged, and twin synergy profiles;
- Easy, Medium, Hard, Extreme, and Ultimate;
- Standard Loadout, Open Loadout, Assisted, and Cheat-Assisted records;
- same-device and local-Wi-Fi co-op;
- supported browsers, 60 target, 30 minimum, reconnect, rollback, and host recovery;
- keyboard, supported gamepads, remapped bindings, pointer/touch UI surfaces, screen reader, captions, reduced effects, and stabilization alternatives;
- English, Simplified Chinese, and German, including overflow and subtitle safe areas.

### 26.2 Content coverage

Validate:

- every legal condition transition, grace, Critical penalty cap, recovery state, and shelter lock;
- both branches skipped, entered, abandoned, completed individually, and completed together;
- every core role and difficulty specialist under concurrency limits;
- Hook Pole pickup, action, throw, drop, disarm, break, cheat, deterministic recovery, and absence;
- Cudgel and Utility Hook drops and anti-duplication;
- every runoff, debris, timber, bridge, anchor, wagon, and protected-state case;
- all Mara phase transitions, hook break/disarm, support group, grab rescue, brake interrupt/failure, and capture;
- every checkpoint and restore invariant;
- all grade caps, achievements, one-time rewards, rank improvements, Museum upgrades, media unlocks, and Highlight families;
- package install, late install, update, uninstall, reinstall, migration, mismatch, and Legacy behavior.

### 26.3 Required negative tests

Prove that the mission cannot produce:

- civilian death or completion-blocking protected-target loss;
- off-screen or untelegraphed condition damage;
- two-band loss from one event;
- condition change after shelter lock;
- softlock from losing the Hook Pole or objective item;
- inaccessible branch return or route trap;
- hazard reroll, item respawn, weapon repair, condition improvement, or branch reopening after restore;
- duplicated resource choice, first-clear reward, achievement, Highlight, or Museum grant;
- score from sheltered/protected/surrendered actors or repeatable harmless interactions;
- unpredictable bridge collapse, wagon cargo destruction, mount state, firearm/grenade content, or sponsor clue;
- co-op-only completion requirement or solo-infeasible interaction;
- simulation difference caused by effects, language, input device, frame presentation, or Highlight capture.

### 26.4 Release gate

Release requires:

- zero unresolved Critical or High-severity defects;
- deterministic replay and state-hash evidence for the supported matrix;
- no reward, profile, checkpoint, rescue, or package-lifecycle integrity failure;
- complete localized mandatory text, subtitles, captions, hints, achievement descriptions, and screen-reader labels;
- approved performance evidence at the supported target/minimum;
- recorded commercial-use provenance for final generated media;
- signed content, continuity, accessibility, localization, and QA acceptance.

## 27. Production appendices and data gates

### A. Exact frame data

Before implementation lock, the move-data catalogue must define startup, active, recovery, hit/block effects, movement, cancel routes, Defense/Resolve effects, combo scaling, ground/aerial eligibility, objective authority, and AI decision windows for Mara, all enemy roles, and Hook Pole actions.

Frame values remain Deferred until animation timing and 60-Hz playtests exist. They must preserve visible counterplay, shared defense rules, anti-infinite protections, solo objective feasibility, and 30-FPS presentation readability.

### B. Final artwork and asset register

The production register must enumerate character/enemy/boss sheets, route backgrounds and parallax layers, objective states, weapons, food, icons, warnings, HUD, branch/Museum/achievement/emblem/title assets, cinematic start/end frames, VFX, captions, and localization-safe presentation.

Every asset records identity, dimensions, state variants, language dependence, ownership/provenance, commercial-use status, accessibility role, compression target, memory estimate, and fallback. Final art may not introduce sponsor marks, military identity, embedded text, firearms, grenades, mounts, or contradictory civilian injury.

### C. Encounter balancing

Balance sheets must record by difficulty and player configuration:

- population and spawn order;
- role and specialist budgets;
- objective-attacker concurrency;
- warning and grace windows;
- condition penalty and recovery opportunities;
- hazard schedule;
- enemy Health/Defense/Resolve/damage;
- Mara phase thresholds and support budget;
- item placement and recovery values;
- active-time targets, score weights, thresholds, caps, and branch compensation.

Tuning may adjust candidate values but cannot change route order, canonical survival, three-state meanings, specialist difficulty gates, optionality, no-mount/no-firearm scope, boss identity, or reward fairness.

### D. Localization, dialogue, and media

Final delivery requires complete EN/zh-Hans/DE string tables, speaker/timing records, subtitles, captions, transcript entries, Guide/Academy content, screen-reader labels, result explanations, achievement hints, and package error/recovery text.

Final media requires edited masters, loudness/mix validation, no embedded language content where prohibited, skip/replay tests, Museum linkage, source/provenance records, and commercial-use approval.

### E. Deferred values

Deferred values include exact credit grants, replay-credit cap, frame data, spawn coordinates, final warning/grace timing, final grade thresholds, exact performance budgets, package download size, final artwork, animation, dialogue wording, subtitle timing, music/SFX masters, and complete acceptance evidence.

These deferrals do not reopen the approved feature model.

## 28. Specification review gate

This specification is ready for implementation planning only after:

1. builder review finds no implementation-blocking product gap;
2. any builder-call clarification is recorded here without altering approved intent;
3. the user approves this document;
4. implementation planning is explicitly requested in a later step.

Approval of this specification does not itself authorize implementation or an implementation plan.

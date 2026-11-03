# Fight for Peace - Storm over Qinglan Feature and Story-Line Decisions

**Status:** Approved design record

**Last updated:** 2026-11-01

**Curated Mission title:** *Storm over Qinglan* / *青岚风暴* / *Sturm über Qinglan*

**Chronology:** Approximately 10-14 days after Stage 3 and before Stage 4

**Scope:** The mission's canon-compatible story, route, rescue model, encounters, content baselines, presentation, rewards, records, and acceptance boundary.

This document packages the approved *Storm over Qinglan* decisions from `story_line.md` into a focused narrative and feature reference. It extends the permanent Combat Constitution and the approved Curated Mission framework. It does not change Stage 3, Stage 4, the main campaign, or the shared combat engine.

## Decision labels

- **Confirmed** - an approved direction that may not be changed through ordinary tuning.
- **Production baseline** - an approved starting quantity or composition that may change through validated playtesting without altering the feature model.
- **Deferred** - production work still required; not an unresolved design direction.

## 1. Intent and selected documentation approach

The mission gives the established heroes a compact protective-duty case in which rescue, stabilization, and restraint matter as much as fighting. It demonstrates that not every crisis belongs to Tomas or the hidden sponsor network and shows Qinglan as a capable community rather than a passive victim.

Two documentation approaches were considered. A single combined story-and-technical file would reduce file count but mix canon review with implementation contracts. The approved approach uses this focused story/feature record alongside a separate build-facing specification. This keeps campaign continuity readable while preserving an unambiguous production handoff.

## 2. Mission identity and boundaries

- **Confirmed:** A severe mountain storm causes landslides, runoff, damaged communications, and blocked evacuation routes around Qinglan.
- **Confirmed:** Unaffiliated relief looters exploit the emergency to steal marked supplies and obstruct evacuation.
- **Confirmed:** The operation is not connected to Tomas Rell, Garran Voss, the unknown sponsor, or the Meridian network and yields no sponsor evidence.
- **Confirmed:** The primary objective is **Rescue and Evacuation** rather than pursuit, conquest, or treasure recovery.
- **Confirmed:** Mountain Guardian, River Scout, Wind Sentinel, and Fire Warden are selectable. No new hero is introduced.
- **Confirmed:** All three endangered groups survive canonically. Performance changes condition, grading, recognition, and presentation rather than the story outcome.
- **Confirmed:** Weather is presentation plus deterministic authored hazards, never uncontrolled random simulation.
- **Confirmed:** The mission contains no firearm, grenade, playable mount, mounted enemy, pre-stage weapon, or permanent combat-power reward.

## 3. Canon-compatible story

A regional storm crosses the Silvermist Highlands shortly after the village patrol's Stage 3 rescue operation. Qinglan's warning relay is damaged, runoff blocks the mountain road, a clinic vehicle becomes trapped, the cable bridge loses part of its safety system, and residents shelter near an unstable service tunnel.

Sheng Guo authorizes an immediate civil-protection response. Gao Wen, recovered from the Stage 3 incident, coordinates locally. The selected hero or unique two-hero team travels to the Qinglan Relief Staging Yard, where opportunistic looters are already diverting emergency goods.

The heroes secure the yard, free the traveling clinic team, evacuate bridge-maintenance workers, and guide the tunnel residents to shelter. Optional diversions restore a damaged storm-warning relay and recover ordinary community relief crates. At the Relief Turnout, the looters launch a final attack on the relief wagon.

Their leader, Mara Venn, presents the theft as salvage, but the marked relief cargo, blocked routes, and endangered evacuations make her choice unambiguous. The heroes defeat and restrain her alive. Qinglan continues relief distribution and repairs after the storm. Mara's local black-market records identify buyers but contain no campaign-villain clue.

## 4. Five-Segment Rescue Circuit

**Production baseline:** First clear targets 30-40 minutes; experienced replay targets 20-28 minutes. The route contains approximately eight mandatory ordinary encounters, two optional combat branches, and Mara's boss encounter.

The authored flow is:

`Storm Warning -> elder briefing and loadout -> Relief Staging Yard -> Runoff Road -> optional warning relay -> Storm Cable Bridge -> Service Tunnel Approach -> optional storehouse -> Relief Turnout -> Mara capture -> After the Storm -> results`

### 4.1 Qinglan Relief Staging Yard

- Repel looters stealing relief goods.
- Introduce the Rescue Hook Pole and objective-attacker iconography.
- Demonstrate one deterministic debris warning in a protected learning context.
- Establish that marked relief supplies are objectives rather than consumable food.

### 4.2 Runoff Road - Traveling Clinic Team

- A clinic vehicle is trapped behind fallen timber.
- The heroes stabilize the route, prevent medicine theft, recover the emergency case when needed, and protect a short move to a nearby shelter.
- The group is not escorted through the remainder of the mission.
- Checkpoint 1 follows shelter arrival.

### 4.3 Storm Cable Bridge - Maintenance Workers

- The heroes cross the partially usable bridge and respond to warned runoff lanes.
- A damaged anchor assembly moves through Secure, Threatened, and Stabilized states.
- The secondary safety anchor is this group's recovery opportunity.
- Workers follow a short authored route to shelter.
- Checkpoint 2 follows shelter arrival and finalized anchor state.

### 4.4 Service Tunnel Approach - Sheltering Residents

- Two approach encounters build the mission's highest rescue pressure.
- Unstable timber cover uses Intact, Damaged, and Broken states.
- Reinforcing the shelter is this group's recovery opportunity.
- Residents reach a protected shelter before later combat begins.
- Checkpoint 3 follows shelter arrival.

### 4.5 Relief Turnout - Wagon Defense and Mara

- The rescued groups remain beyond a safe combat boundary.
- One ordinary defense encounter uses the full core enemy roster.
- The relief wagon supplies cover and breakable exterior components; indispensable cargo cannot be destroyed.
- Checkpoint 4 is immediately before Mara.
- Mara's live capture completes the case.

## 5. Rescue-condition model

Each rescued group owns one shared condition:

- **Secure:** no unresolved meaningful protection loss.
- **Strained:** one meaningful protection band has been lost.
- **Critical:** two meaningful bands have been lost; the group remains alive and completable.

Ordinary contact, incidental collisions, cosmetic rain, off-screen activity, and attacks after shelter lock cannot lower condition. A band is lost only when:

1. a designated objective attacker completes a clearly warned action;
2. an authored runoff or debris hazard is not handled; or
3. an active required stabilization is abandoned after its visible danger phase begins.

One event removes at most one band and is followed by a protection grace period. Critical never becomes civilian death, mission failure, or a hidden bad ending. Later mistakes may reduce the bounded objective score but cannot invalidate canonical survival.

Each group has one contextual recovery:

- clinic emergency case;
- bridge secondary safety anchor;
- tunnel shelter reinforcement.

A completed recovery restores one band. If the group is already Secure, it grants a small route-safety result bonus instead of combat power. Shelter arrival permanently locks the final condition.

Solo receives protected interaction windows. Co-op may divide stabilization and defense roles but never becomes mandatory. Difficulty changes pressure and combinations rather than condition meanings. An S rank permits a recovered mistake and therefore does not demand mathematical perfection.

## 6. Optional branches

### 6.1 Signal Through the Rain / 雨中信号 / Signal im Regen

The branch leaves Runoff Road before the bridge. Looters are removing batteries and weather instruments from a damaged cliffside warning post. Recovering the components and restoring the relay gives one later runoff sequence a longer multimodal warning and grants a bounded route-safety result bonus.

The branch is optional. Standard rescue timing remains fair without it.

### 6.2 Every Crate Accounted For / 物资一件不少 / Jede Kiste zählt

The branch leaves the main route after the tunnel rescue and before Relief Turnout. The heroes recover marked blankets, repair materials, water filters, and emergency food from a community storehouse.

Returning the crates grants one ownership-aware choice of Life, Defense, or Momentum recovery per active hero before the boss. The supplies are present-run resources, not permanent upgrades or rare medicine.

### 6.3 Branch records

- Either branch expands the **Qinglan Community Rescue Archive / 青岚社区救援档案 / Qinglaner Rettungsarchiv**.
- Each branch has an achievement using its localized title.
- Completing both in one eligible run grants **Qinglan Stands Together / 青岚同心 / Qinglan hält zusammen**.
- Branches are not required for S and compensate their additional active time with bounded score.
- Cheat-Assisted completion may reveal Museum material but grants no branch mastery achievement.

## 7. Enemy roster and encounter pressure

### 7.1 Core roles

- **Pass Brawler:** ordinary close-range pressure.
- **Relief Snatcher:** fast carrier moving marked supplies toward a visible withdrawal point.
- **Hook Looter:** mid-range controller who can pull heroes away from interactions or move loose supplies through clearly warned actions.
- **Timber Breaker:** slow heavy role with long-recovery actions against tagged debris, anchor, or objective states.

Only Relief Snatchers and Timber Breakers possess designated objective actions. Solo permits one objective attacker at a time. Co-op permits at most two with staggered warnings.

### 7.2 Difficulty specialists

- **Extreme - Rainstep Feinter:** readable delayed strikes and evasive footwork; it cannot imitate objective warnings.
- **Ultimate - Crew Caller:** one interruptible whistle reserves an authored synchronized flank or objective-pressure action without exceeding the encounter budget.

The faction wears patched rain capes, improvised work clothing, and scavenged tools. It has no firearm, grenade, military armour, sponsor equipment, or shared supply seal. Defeated enemies may surrender or be restrained; there are no executions.

### 7.3 Encounter baseline

1. Staging Yard: Pass Brawlers plus one Relief Snatcher.
2. Runoff approach: Brawlers plus the first Hook Looter.
3. Clinic rescue: Snatchers plus one Timber Breaker.
4. Bridge entrance: Brawlers and Hooks in narrow lanes.
5. Anchor defense: one Breaker plus staggered Snatchers.
6. Lower tunnel: Brawlers and Hooks under debris warnings.
7. Tunnel stabilization: Breaker-led pressure plus a Snatcher route.
8. Relief Turnout: full core roster before Mara.

The warning-post branch emphasizes Hook Looters. The storehouse branch emphasizes Snatchers.

**Production baseline, mandatory solo route:** Easy 16 ordinary enemies; Medium 22; Hard 25; Extreme 27 including Rainstep Feinter; Ultimate 30 including Feinter and Crew Caller. Optional encounters are outside these totals.

Easy delays Hook Looter until the bridge and uses one mandatory Breaker. Medium presents the full core sequence. Hard strengthens combinations. Extreme introduces Feinter only after the first rescue. Ultimate places Crew Caller in the final wagon defense and optional storehouse, never alongside Mara.

Co-op adds approximately 35-40 percent ordinary threat through complementary lanes rather than doubling specialists, objective attackers, hazards, or boss support. Rescue thresholds and hazard schedules do not change. No encounter starts before required civilians are inside their protection boundary.

## 8. Rescue Hook Pole and pickup scope

The portable **Rescue Hook Pole** is acquired with `J` at the Staging Yard. It follows the shared long-weapon lifecycle: hero affinities, integrity, disarm, drop, throw, breakage, ownership, checkpoints, and `TRUSTYTOOLS`.

Its identity is controlled pull, wide spacing, and tagged debris redirection rather than dominant damage. Authored uses include:

- moving light timber;
- drawing a supply case into reach;
- fastening a bridge safety line;
- redirecting one rolling-debris hazard.

It cannot pull civilians, bosses, large boulders, vehicles, or indispensable structures. Mandatory progress never depends on retaining it: fixed fittings exist at objective nodes and deterministic recovery is limited to locations where the portable pole remains tactically relevant.

**Builder-call clarification:** While the Hook Pole is equipped and the hero faces an eligible tagged rescue focus, `T` or the authored directional-`T` route selects the contextual Hook action through the existing weapon graph. Outside that focus, the same inputs remain ordinary weapon attacks. `J` retains the shared held-weapon throw/discard meaning. Fixed fallback fittings use empty-hand Grab/Interact or the optional separate Interact binding. No new mission-only action is introduced.

Other pickups use existing profiles:

- **Wooden Cudgel**, dropped by Pass Brawlers;
- **Short Utility Hook**, dropped by Hook Looters.

Mara's reinforced hook and shortened handle remain boss equipment and custody evidence, not pickups. No weapon is available as a pre-stage loadout or permanent Store purchase.

## 9. Storm environment

- Runoff uses deterministic lane profiles with directional visual, audio, caption, and non-colour warnings.
- Falling debris follows fixed seeded patterns with visible ground silhouettes.
- Debris may affect enemies or tagged timber but cannot create unbounded physics outcomes.
- Unstable timber uses Intact, Damaged, and Broken states. Selected pieces may produce one safe throwable fragment within the environmental quota.
- Bridge sway is authored presentation and bounded movement pressure; the bridge cannot collapse randomly.
- The anchor cannot be damaged beyond recovery.
- The wagon's exterior may break while indispensable supplies remain protected.
- Hazards pause during briefings, rescue dialogue, checkpoint restoration, and protected interactions.
- Solo and co-op share the same schedule.
- Reduced effects change rain streaks, sway, camera movement, particles, shake, lightning, and reflections without altering hazard timing.

## 10. Mara Venn - the Storm Jackal

**Mara Venn / 玛拉·文**, age 37, is known as **the Storm Jackal / 暴雨豺狼 / der Sturmschakal**. She once led a legitimate salvage and road-recovery crew, then knowingly diverted goods into black-market resale and organized opportunistic looting. Her route, anchor, cargo, and tool knowledge is credible but does not excuse stealing marked relief supplies or obstructing evacuations.

### 10.1 Boss phases

1. **Recovery Hook Control:** long spacing, controlled pulls, sweeps, tagged timber redirection, and at most one authored support action inside the threat budget.
2. **Pry-Bar Clinch:** after hook break or disarm, Mara retains the short reinforced handle and uses body strikes, clinch entries, counters, short throws, and wagon-cover repositioning.
3. **Brake Release:** at low Resolve, Mara attempts once to release the wagon brake toward the runoff slope. Interruption causes a short stagger. Failure damages one exterior component and reduces protection grading without destroying cargo or failing the mission. No further reinforcements appear.

**Builder-call clarification:** Phase 2 begins at the first of a legal long-hook break/disarm or Mara reaching the authored Phase-2 threshold. If the threshold comes first, a non-damaging transition jams the hooked extension against reinforced cover and separates it, leaving the short handle. A break/disarm likewise converts the boss-only equipment to its handle state; the detached part is noninteractive evidence. The serial graph cannot skip Phase 2, and Phase 3 cannot begin until the Phase-2 transition and at least one bounded Phase-2 decision cycle complete. Exact thresholds and minimum duration remain tuning data.

Mara uses shared Health, Defense, Resolve, Combo Breaker, scaling, anti-infinite, transition, and co-op pressure rules. She cannot pull both heroes into an unavoidable attack or use civilians as shields. One tagged co-op rescue response applies to her eligible grab.

Defeat ends with Resolve break, controlled restraint, medical assessment, and live custody. Her local records reveal only black-market buyers.

## 11. Recovery catalogue

| Category | English | Simplified Chinese | German |
| --- | --- | --- | --- |
| Life | Warm Rice Porridge | 热米粥 | Warmer Reisbrei |
| Defense | Mineral Citrus Water | 矿物柑橘水 | Mineral-Zitruswasser |
| Momentum | Sesame-Nut Bar | 芝麻坚果条 | Sesam-Nuss-Riegel |
| Balanced | Qinglan Rescue Meal | 青岚救援餐盒 | Qinglan-Rettungsmahlzeit |

**Production baseline:** Medium solo uses 2 Life, 2 Defense, 2 Momentum, and 1 balanced meal. Medium co-op uses 3 of each common category and 1 balanced meal. Easy adds one of each common category; Hard removes one authored common item, Extreme two, and Ultimate three. The balanced meal remains before Relief Turnout on every difficulty.

The optional storehouse choice is separate. Items appear at shelters and safe route points, use shared `J` behavior, and are gameplay abstractions rather than medical claims. Objective supplies cannot be consumed or replaced. `FULLPANTRY` affects ordinary eligible containers only. Restore preserves consumption and ownership exactly.

## 12. Grading and anti-farming

The 100-point **Objective-First Protective Duty Grade** is:

| Component | Points |
| --- | ---: |
| Rescue condition | 45 |
| Route and relief protection | 20 |
| Combat mastery | 25 |
| Resource and active-time efficiency | 10 |

Rank caps:

- all three groups Secure: S remains possible;
- any group finally Strained: maximum A;
- any group finally Critical: maximum B;
- a recovered group finishing Secure does not lose S eligibility.

Mara's successful brake action reduces route protection without automatically blocking S. Candidate thresholds are C for a clear, B at 60, A at 75, and S at 90 plus all groups Secure. Final thresholds are separately validated by difficulty and player configuration.

Active time excludes pause, cinematics, synchronized holds, loading, and protected dialogue. Scenery destruction, harmless repetition, surrendered enemies, sheltered civilians, and protected boss phases provide no farmable value. Cheat-Assisted play stores the approved narrative result but no score, grade record, Credits, mastery achievement, or prestige reward.

## 13. Achievements, rewards, and Museum

The eight achievements are:

1. **After the Storm / 风雨之后 / Nach dem Sturm** - reward-eligible clear.
2. **Signal Through the Rain / 雨中信号 / Signal im Regen** - complete the warning-post branch.
3. **Every Crate Accounted For / 物资一件不少 / Jede Kiste zählt** - complete the storehouse branch.
4. **Qinglan Stands Together / 青岚同心 / Qinglan hält zusammen** - complete both branches in one eligible run.
5. **Everyone Sheltered / 人人安然 / Alle in Sicherheit** - all three groups finish Secure.
6. **Hook, Brace, Rescue / 钩、固、救 / Haken, sichern, retten** - perform all three contextual recoveries and one Hook Pole redirection.
7. **The Wagon Holds / 救援车屹立 / Der Wagen hält** - interrupt Mara's brake release and preserve every exterior wagon component.
8. **Guardians in the Downpour / 暴雨守护者 / Wächter im Wolkenbruch** - both co-op heroes complete a rescue interaction and a tagged partner defense.

The co-op achievement is not required for S, Museum completion, or solo rewards.

First eligible clear grants itemized Credits, the case Chronicle, the Qinglan Community Rescue Archive, and mission art/music entries. First A grants the text-free **Qinglan Rescue Knot** emblem. First S grants the localized **Storm Responder** title. Rewards are bounded currency, presentation, Museum recognition, or cosmetics, never combat power.

Cheat-Assisted completion unlocks narrative, Chronicle, Museum, art, and music access but grants none of the eight achievements, Credits, rank, emblem, or title.

## 14. Presentation and audio

### 14.1 Opening and briefing

The 25-35-second skippable **Storm Warning** opening shows weather crossing Qinglan, blocked routes, the clinic vehicle, damaged bridge, and a distress signal reaching the village. Sheng Guo authorizes the response. Gao Wen acts as local coordinator.

The in-engine briefing and loadout explain the three groups, visible condition bands, designated warnings, and rescue priority. Generated source footage contains no embedded text, dialogue, subtitles, logos, or language-dependent signage.

### 14.2 Coda

The 30-45-second skippable **After the Storm** coda shows every group sheltered, continued relief distribution, Mara's medical assessment and documented custody, and community repair. Bounded still inserts reflect final conditions and optional branches without changing canonical survival.

English, Simplified Chinese, and German subtitles and transcripts cover all mandatory content. Both cinematics unlock for Museum replay.

### 14.3 Music family

**Hands through the Rain** contains:

- **Rain over Qinglan** - opening and briefing;
- **Road beneath the Runoff** - traversal and ordinary combat;
- **Guide Them Home** - rescue pressure;
- **The Storm Jackal** - Mara;
- **Shelter Lights** - coda and Museum.

The family uses restrained strings, wooden percussion, low drums, rain-like shakers, warm winds, and a small community motif. Ambience and SFX remain separate from gameplay warnings. Thunder cannot imitate a warning. Essential cues receive priority, captions, and non-audio equivalents. Generated audio is edited candidate material subject to provenance and commercial-use verification.

## 15. Automatic Highlights

The mission keeps universal **Perfect Combo** and **Two Threats One Move** rules and adds rescue-aware interpretations:

- **Guardian Intervention:** prevent a committed Snatcher, Breaker, runoff, debris, anchor, or wagon threat before loss.
- **Defensive Mastery:** Exact Block or counter a Breaker objective strike or Mara hook action, then complete a legal damage-free punish.
- **Team Harmony:** one hero stabilizes while the other interrupts, followed by safe arrival without condition loss during the sequence.
- **Environmental Ingenuity:** Hook Pole or debris redirection interrupts an objective attacker and meaningfully affects another hostile.

Candidates store the protected group, objective state, responsible hero, prevented outcome, and frame facts. Screenshots prefer intervention or successful resolution rather than apparent civilian injury. The system never rewards deliberate delay or damage, remains capped at three Highlights and one per family, labels assisted rules, changes no simulation, and grants no gameplay reward.

## 16. Checkpoints, records, and replay

Four checkpoints follow clinic shelter, bridge shelter/finalized anchor, tunnel shelter, and arrival at Relief Turnout before Mara. Mission start is the fallback before Checkpoint 1.

Snapshots preserve:

- group conditions, incidents, recovery use, and shelter locks;
- emergency case, anchor, tunnel reinforcement, relay, relief crates, branch, and pending Museum state;
- hazard seed/index and timber, fragment, wagon, and environment state;
- resolved enemies;
- hero resources, lives/continues, loadouts, cheats, carried objects, weapon ownership/integrity/location, and consumed items;
- score, active time, grade facts, achievement and Highlight candidates;
- co-op authority, reconnect, and technical-recovery history.

Restore cannot reroll hazards, respawn supplies, improve conditions, repair wagon damage, duplicate weapons, or reopen branches.

Result records preserve case/version, difficulty, player configuration, heroes, loadouts, ruleset, objective ledger, conditions, branches, anchor/wagon/brake/Hook/environment facts, enemy outcomes, resources, achievements, Museum and Highlight references, active time, continues, and recovery/network events. Comparable categories remain separate. Replay uses approved tiered Curated retention. Validated technical recovery may preserve eligibility; ordinary continues follow shared rules and remain recorded.

## 17. Guide, Academy, accessibility, and cheats

First launch shows a localized **Rescue Operations** card covering condition meanings, objective-attacker markers, current bindings, one-band-per-event, recovery, and the absence of a hidden death timer. It remains available in Guide and pause. Each new rescue interaction receives one safe demonstration before pressure.

Installing the case adds the optional **Storm Rescue Drill** to Academy's Resources, Equipment, and Environments course. Demonstration, guided practice, independent trial, and optional mastery cover objective interruption, stabilization, Hook redirection, and shelter arrival. It grants no exclusive technique or power and never gates access.

Rescue threats use icons, silhouettes, localized text, sound, captions, visible markers, and target lines. Screen readers announce transitions. Stabilization supports hold, toggle, and reduced-input alternatives. No objective depends only on pointer, audio, colour, or motion. Simulation-changing assistance produces Assisted records.

Applicable hero cheats and `QUIETCROWD`, `FULLPANTRY`, and `HOMECOMING` retain their shared behavior. `TRUSTYTOOLS` protects carried weapons but not fixed fittings. `STEADYRIDE` is Not Applicable because there is no mount. `SAFEPASSAGE` is Not Applicable because no group or indispensable supply can enter a completion-blocking loss. No mission-specific cheat is added.

## 18. Acceptance boundary

The **Case-to-Archive Acceptance Matrix** covers:

- all four heroes and representative unique co-op pairs;
- Easy through Ultimate;
- Standard Loadout, Open Loadout, Assisted, and Cheat-Assisted records;
- solo, same-device co-op, and local-Wi-Fi co-op;
- every rescue state, recovery, shelter lock, branch, enemy role, specialist, weapon, hazard, Mara phase, brake outcome, and capture path;
- checkpoint, reconnect, authoritative recovery, replay, Highlight, achievement, Museum, and reward behavior;
- install, update, uninstall/reinstall, migration, version mismatch, and Legacy records;
- EN, zh-Hans, and DE;
- keyboard, gamepad, remapping, pointer/touch UI, screen reader, captions, reduced effects, and alternative stabilization;
- deterministic browser/network behavior at the supported 60-FPS target and 30-FPS minimum without simulation changes.

Release requires zero unresolved Critical or High-severity defects and explicit evidence against civilian death, off-screen objective damage, rescue or route softlocks, checkpoint rerolls, duplicated items/rewards, route traps, restore improvements, and score/resource exploits.

## 19. Deferred production work

The following remain production work rather than open feature decisions:

- exact frame data and cancel windows for Mara and mission-specific actions;
- final spawn coordinates, populations, warning windows, score thresholds, and item placements;
- final artwork, animation, VFX, cinematics, dialogue, subtitle timing, music, and SFX masters;
- exact credit values and bounded replay-credit rules;
- package size and performance budgets validated on the supported browser/device matrix;
- final localized strings and accessibility QA;
- final encounter balancing and Case-to-Archive evidence.

These values must remain data-defined and cannot change the approved chronology, canonical survival, rescue-state meanings, objective fairness, combat constitution, reward boundary, or absence of sponsor evidence.

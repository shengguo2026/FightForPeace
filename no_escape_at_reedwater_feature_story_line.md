# Fight for Peace - No Escape at Reedwater Feature and Story-Line Decisions

**Status:** Approved design record

**Last updated:** 2026-11-02

**Curated Mission title:** *No Escape at Reedwater* / *芦水渡口：无处可逃* / *Kein Entkommen in Schilfwasser*

**Chronology:** Approximately four weeks after Stage 3, following *Storm over Qinglan* and before Stage 4

**Scope:** The mission's canon-compatible story, guest-hero model, route, apprehension systems, encounters, content baselines, presentation, rewards, records, and acceptance boundary.

This document packages the approved Reedwater decisions from `story_line.md` and `Features_Decisions.md` into a focused narrative and feature reference. It extends the permanent Combat Constitution and approved Curated Mission framework. It does not change Stage 3, Stage 4, the main campaign, or the shared combat engine.

## Decision labels

- **Confirmed** - an approved direction that may not be changed through ordinary tuning.
- **Production baseline** - an approved starting quantity or composition that may change through validated playtesting without altering the feature model.
- **Deferred** - production work still required; not an unresolved design direction.

## 1. Intent and selected documentation approach

Reedwater is a lawful protective-duty case about dismantling coercive control while preserving life, public safety, and due process. It proves that force in *Fight for Peace* can stop exploitation without becoming revenge, introduces Lin Lan through service rather than destiny, and gives players a replayable network-control mission unrelated to Tomas or the hidden sponsor.

Two documentation approaches were considered. A single story-and-technical file would reduce file count but mix canon review with build contracts. The approved approach uses this focused story/feature record alongside a separate product and technical specification. This keeps campaign continuity readable while providing an unambiguous production handoff.

**Documentation scope call:** Reedwater is specified as a mission/content extension of the approved shared game and Expanded Modes design, not as a greenfield replacement for those foundations. Its optional-package content is entitlement-neutral: “DLC” does not mean “paid,” and pricing or one-versus-two-purchase local-Wi-Fi policy remains a global commercial decision rather than part of Reedwater's story or mechanics.

## 2. Mission identity and boundaries

- **Confirmed:** An independent extortion group controls the **Reedwater Ferry District / 芦水渡 / Fährbezirk Schilfwasser**, imposes illegal tolls, confiscates property, and attacks travelers who refuse payment.
- **Confirmed:** The Regional Civil Protection Council issues a lawful live-capture order for the commander and his three principal lieutenants.
- **Confirmed:** The primary objective is **Nonlethal Apprehension**.
- **Confirmed:** The incident contains no Tomas, Garran Voss, sponsor, Meridian, or main-campaign evidence.
- **Confirmed:** The mission uses a ferry market, warehouse, crane yard, loading platform, and a ferry deck on a ferry already secured at berth.
- **Confirmed:** The player never controls a ferry, boat, or motorbike. The mission adds no vehicle-simulation rule.
- **Confirmed:** The mission never changes the permanent Combat Constitution.

## 3. Canon-compatible story

Reedwater begins an ordinary working morning under illegal control. Cassian Rook's group blocks the public crossing, demands unauthorized tolls, confiscates travel documents and property, and uses a signal relay, cargo winch, and motorbike as a prepared escape network. After a traveler refuses payment and is threatened, the Regional Civil Protection Council authorizes a coordinated live-capture operation.

Lin Lan, a village-born regional civil-protection liaison stationed at Reedwater, briefs the selected hero or unique two-hero team. The heroes enter through the market, protect travelers, clear public routes, and drive the extortion group toward its prepared exits. They capture the relay lieutenant in the warehouse, the winch lieutenant in the crane yard, and the bike captain at the loading platform. Missed interruptions create bounded later pressure but never let a target disappear or make the case unwinnable.

Cassian begins his last escape on an ordinary motorbike. If the heroes break its Stability before the ferry barrier, he dismounts safely; otherwise, he reaches the barrier and makes a counterable deck entry. The ferry remains stationary and empty of civilians. Cassian then fights with disciplined baton checks, counter-control, and one final emergency-gate attempt. His Resolve is broken, he is restrained, medically assessed, and transferred into documented live custody.

At the conclusion, confiscated property and records are returned, illegal toll structures are removed, normal ferry passage resumes, and Lin observes the restored crossing. The case expands the world's civil-protection work without advancing or contradicting the main villain mystery.

## 4. Lin Lan - Reed Warden

- **Confirmed identity:** **Lin Lan / 林澜**, age 27, titled **Reed Warden / 芦水卫 / Wächterin von Schilfwasser**. Lin is the family name; Lan is the given name.
- **Confirmed background:** She originates from the village and now works as a regional civil-protection liaison at Reedwater.
- **Confirmed combat identity:** Circular footwork, redirection, short strikes, and Qinna-derived restraint form a complete solo-capable, data-defined kit inside the shared Combat Constitution.
- **Confirmed guest model:** Lin is selectable on the first Reedwater attempt alongside Mountain Guardian, River Scout, Wind Sentinel, and Fire Warden. Solo selects one of five; co-op selects any two different heroes. Duplicate heroes remain prohibited.
- **Confirmed independence:** Every objective and rank is achievable by every eligible solo hero. Lin is never required.
- **Confirmed staging:** If unselected, Lin coordinates from a safe command post. If selected, a neutral Council dispatcher carries command-post messages so Lin is never depicted in two places.
- **Confirmed unlock:** Any valid clear, including Cheat-Assisted completion, permanently unlocks Lin for Academy, Curated Missions, completed Mission Remixes, and Random Operations. She remains unavailable in canonical Story Mode and Chapter Challenge.
- **Confirmed pre-clear restriction:** Guest Lin is usable only in Reedwater and the Reedwater Apprehension Drill, grants no pre-clear Mastery or wider eligibility, and retains player-recorded combo demonstrations when her full Academy profile unlocks.
- **Deferred:** Final model sheet, animation set, voice performance, exact move catalogue, and frame data.

## 5. Five-Link Closing Net

**Production baseline:** First clear targets 30-40 minutes; experienced replay targets 20-28 minutes. The route contains approximately eight mandatory ordinary encounters, two optional branches, and Cassian's continuous multi-part confrontation.

The authored flow is:

`The Toll at Dawn -> briefing and loadout -> Ferry Market Entry -> optional Right to Passage -> Ferry Warehouse -> Crane Yard -> optional Secure Every Line -> Loading Platform -> Mounted Toll Run -> secured Ferry Deck -> Cassian custody -> Passage Restored -> results`

### 5.1 Ferry Market Entry

- Protect vendors and travelers, break the illegal toll line, and open a safe evacuation route.
- Teach nonlethal restraint, protected scenery, objective warnings, and Escape-Network Ledger markers.
- Force Cassian's group toward the warehouse without permitting an early permanent escape.

### 5.2 Ferry Warehouse

- Fight through Enforcers and Signal Runners.
- Capture the relay lieutenant alive.
- Resolve the reinforcement relay as Disabled or Used.
- Checkpoint 1 follows relay resolution and documented custody.

### 5.3 Crane Yard

- Introduce Mooring Hook control and deterministic warned cargo interactions.
- Capture the cargo-winch lieutenant alive.
- Resolve the cargo winch as Disabled or Used.
- Checkpoint 2 follows winch resolution and documented custody.

### 5.4 Loading Platform

- Use deterministic motorbike lanes and safe-dismount rules.
- Capture the bike captain and remove mounted support while leaving Cassian's motorbike Active.
- Checkpoint 3 stores the bike captain's custody and Active motorbike.
- Cassian's Mounted Toll Run resolves the motorbike as Disabled or Used.

### 5.5 Secured Ferry Deck

- Checkpoint 4 follows the mounted phase and stores Cassian's exact carried state.
- Fight Deck Counter-Control and The Last Tollgate without ordinary reinforcements.
- Complete Resolve break, controlled incapacitation, restraint, medical assessment, and documented custody.

## 6. Escape-Network Ledger and One-Way Escape Budget

The visible Ledger tracks the **reinforcement relay**, **cargo winch**, and **Cassian's motorbike**. Each begins **Active** and resolves exactly once as **Disabled** or **Used**. It never resets through restore, continue, reconnect, rollback, or host migration.

- **Used relay:** Adds exactly one non-replenishing ordinary reinforcement group at the next eligible encounter: two Toll Enforcers on Easy or Medium, three on Hard and above. It adds no specialist or objective action.
- **Used winch:** Grants Cassian's group one advantageous loading-platform position and one destructible cover piece. It never creates an unavoidable cargo attack.
- **Used motorbike:** Produces one clearly warned escape and counterable deck-entry sequence. It grants no extra Health, damage, armour, or permanent advantage.
- **Disabled asset:** Improves route-control scoring and reduces later pressure, but grants no free boss damage or early capture.

Missing all three interruptions remains fair and completable. Consequences cannot combine into an unavoidable formation. Difficulty changes interception pressure and window length, not consequence identity or warning clarity. Solo and co-op use the same three assets.

## 7. Civic Safety and Custody Contract

Three public-safety zones are tracked:

1. ferry-market vendors and travelers;
2. warehouse and crane-yard workers;
3. ferry waiting-area passengers.

Each moves visibly from **Occupied** to **Evacuating** to **Cleared**. Heroes open and briefly defend a safe route; civilians follow short authored movement rather than persistent escort AI. Civilians have no Health bar, cannot die, and face no hidden timer.

Only a marked intimidation or route-blocking action may create one bounded **Disrupted Evacuation** penalty for a zone. Council personnel still finish the evacuation. Cleared zones become untargetable and cannot reopen. The final ferry deck is empty before Cassian arrives.

The relay lieutenant, winch lieutenant, bike captain, and Cassian require Resolve break, controlled incapacitation, visible restraint, appropriate medical assessment, and documented custody. Solo receives a protected restraint window; co-op may divide restraint and defense. Key targets cannot die, vanish off-screen, fall into the river, or be struck during custody. Ordinary enemies may surrender, withdraw, or enter group custody. Rails, catch nets, and authored arena returns prevent drowning and lethal falls.

Passenger shelters, ferry safety equipment, ordinary commerce cargo, and mooring controls are protected scenery. Only avoidable player-caused damage reduces collateral grading. Required route actions, designated breakables, enemy damage, and mandatory transitions never do.

## 8. Optional branches

### 8.1 The Right to Passage / 通行之权 / Recht auf freie Passage

After the market and before the warehouse, the heroes enter the toll office to recover confiscated permits, extortion receipts, and ordinary personal property while protecting two voluntary witnesses during a short Council handoff. The records reveal only the relay channel and runner route.

Completion lengthens the relay warning and grants a bounded civilian-protection bonus. The standard warning remains fair when the branch is skipped.

### 8.2 Secure Every Line / 缆索全安 / Jede Leine sichern

After the crane yard and before the loading platform, the heroes recover emergency mooring lines, restore opened safety cabinets, defeat a bounded Cargo Controller group, and avoid protected ferry-equipment damage.

Completion grants each active hero one ownership-aware Life, Defense, or Momentum recovery choice before Cassian. It never disables an escape asset automatically.

### 8.3 Branch records

Either branch expands the **Reedwater Civic Passage Archive / 芦水渡通行档案 / Schilfwasser-Archiv der freien Passage**. Completing both in one reward-eligible run grants **Reedwater Stands Free / 芦水无阻 / Schilfwasser bleibt frei**. Neither branch gates S, Lin's unlock, live capture, base Museum completion, or a fair interception. Cheat-Assisted completion may reveal Museum material but grants no branch achievement.

## 9. Enemy roster and difficulty expression

- **Toll Enforcer:** Baton-and-shield guard pressure, shove, and route blocking. Only its marked intimidation may disrupt evacuation.
- **Signal Runner:** Fast evasive relay activator. Only Runners and the relay lieutenant may resolve the relay as Used.
- **Cargo Controller:** Heavy hook-and-rope control around tagged barriers and crane controls. Only Controllers and the winch lieutenant may resolve the winch as Used.
- **Bike Interceptor:** Ordinary mid-class mounted lane pressure followed by safe dismount into close combat at zero Stability. Bike Interceptors and the bike captain cannot resolve Cassian's motorbike.
- **Ferry Feinter:** Extreme specialist using delayed baton attacks, depth steps, and counter bait that cannot imitate civilian, custody, or escape warnings.
- **Lockdown Captain:** Ultimate specialist deploying one destructible barrier and one authored two-lane formation inside the encounter budget. It cannot seal the only route, summon indefinitely, or join the final deck fight.

Solo permits one designated objective action at a time. Co-op permits at most two staggered actions against different targets, never during custody. Easy delays Cargo Controllers and confines bikes to a teaching area; Medium uses the complete core; Hard improves combinations; Extreme and Ultimate add their specialists.

The group uses mismatched ferry workwear, toll batons, hooks, ropes, ordinary motorbikes, and improvised barriers. It has no firearms, grenades, military identity, sponsor marks, executions, or lethal crashes.

## 10. Two-Tool Custody Arsenal

### 10.1 Mooring Hook

A long control tool with distinct standing, aerial, and ground routes. It emphasizes spacing, pulls, sweeps, Resolve pressure, and interaction with tagged light barriers, lines, and cargo. It cannot pull civilians, restrained targets, Cassian, bikes, the ferry, protected scenery, or indispensable equipment.

### 10.2 Short Restraint Baton

A compact tool with distinct standing, aerial, and ground routes. It emphasizes quick recovery, interruption, guard and Resolve pressure, and lower reach/raw Health damage. It never auto-captures or bypasses Resolve.

Both use shared `T`/directional-`T` attacks and `J` pickup, throw, and discard rules. A held weapon is set aside before the default restraint interaction unless a separate Interact binding is available. Neither tool is mandatory, pre-equipped, sold in the Store, or persisted between missions.

**Production baseline:** Medium solo provides two authored Hooks and two Batons; co-op adds one Baton; Easy adds one further Baton; higher difficulties retain access to both classes. `TRUSTYTOOLS` affects carried tools only. `STEADYRIDE` is Not Applicable.

## 11. Deterministic Working-Waterfront Environment

- **Market:** Awnings, barriers, carts, and stalls provide reactions and one ordinary barrier fragment. Vendor property remains protected.
- **Warehouse:** Shutters, racks, rope bundles, and handcarts provide cover and redirection without trapping heroes or sealing the route.
- **Crane yard:** Seeded suspended cargo uses silhouettes, priority audio, captions, and non-colour warnings. Tagged cargo may be stopped, redirected, or released against enemies, never civilians, restrained targets, or essential equipment. The separately tracked winch remains the escape asset.
- **Loading platform:** Deterministic bike lanes, safety barriers, cargo cover, and the Lockdown Captain's single destructible barricade use warned, capped collisions. Broken barriers never open lethal falls.
- **Ferry deck:** Bollards, ropes, secured crates, cabin corners, rails, and catch nets support capped wall reactions and safe arena returns. Ferry sway and water motion are presentation only.

All events use authored deterministic state and identical solo/co-op schedules. Environmental damage obeys shared damage, Resolve, scaling, bounce, stun, and anti-infinite limits. Reduced effects preserve timing. Protected, expendable, rescue-sensitive, and required scenery use redundant classification.

## 12. Boss - Cassian Rook, The Tollmaster

**Cassian Rook - The Tollmaster / 卡西安·鲁克——渡口霸主 / Cassian Rook - der Fährzollherr**, age 43, is a dismissed ferry traffic and cargo-flow supervisor. He falsified fees, confiscated cargo, intimidated complainants, and later built an independent extortion network while calling coercion “order and protection.” His ferry knowledge comes from former legitimate work. He has no campaign-villain connection.

His visual identity uses a dark navy and weathered-rust ferry coat, forearm guard, gloves, boots, plain mounted helmet, and reinforced toll baton, with no military, Council, sponsor, or futuristic marks.

### 12.1 Phase 1 - Mounted Toll Run

Warned lanes, braking sweeps, baton passes, and readable dismount actions occur on the loading platform. Bike Stability is separate from Cassian's Health, Defense, and Resolve. Zero Stability before the escape threshold resolves the motorbike as Disabled and causes a safe dismount plus punish window. Reaching the ferry barrier resolves it as Used and starts the counterable deck entry. Cassian's combat resources never reset.

### 12.2 Phase 2 - Deck Counter-Control

Cassian uses baton checks, guard pressure, body counters, low sweeps, clinches, trips, and short throws. Failed counters and grapples recover visibly. He may disarm a held weapon but cannot remove it permanently or throw it into the river.

### 12.3 Phase 3 - The Last Tollgate

At low Resolve, Cassian braces near a portable fare barrier, uses short counter strings and controlled barrier repositioning, then attempts one telegraphed emergency-gate action. Interruption staggers him. Success narrows one lane and adds destructible cover but cannot trap a hero, seal the only path, or prevent capture. No final reinforcements appear.

Cassian obeys shared Defense, Exact Block, Counter, defense-consuming Combo Breaker, combo scaling, anti-infinite, throw, environmental-vulnerability, and co-op pressure rules. Eligible grabs permit partner rescue, and mounted actions target one readable lane.

## 13. Eight-Encounter Closing Net

1. **Market Toll Line:** Enforcers and restraint, no objective action.
2. **Market Evacuation:** Enforcer pressure, one Signal Runner, and marked intimidation.
3. **Warehouse Approach:** Enforcers and Runners.
4. **Relay Control Room:** Relay lieutenant, limited support, asset resolution, and custody.
5. **Crane Yard Entry:** Cargo Controllers and Enforcers with cargo and Hook teaching.
6. **Winch Control:** Winch lieutenant, Controllers, one mobile support role, asset resolution, and custody.
7. **Loading-Platform Approach:** Bike warning lesson with Enforcers.
8. **Bike Captain and Platform Control:** Mounted support removal and third lieutenant custody; Cassian's motorbike remains Active.
9. **Cassian:** One continuous three-part confrontation with no final ordinary adds.

**Production baseline mandatory non-boss population, including lieutenants:** Easy 17; Medium 23; Hard 26; Extreme 28; Ultimate 31. Co-op adds roughly 35-40% ordinary split pressure without duplicating unique threats, specialists, assets, or custody targets. Optional branch encounters sit outside this baseline.

## 14. Recovery catalogue

The **Ferry Worker Provision Set** is:

- Life: **Steamed Fish Rice Bowl / 清蒸鱼饭 / Gedämpfter Fisch mit Reis**;
- Defense: **Citrus Barley Tea / 柑橘麦茶 / Gersten-Zitrus-Tee**;
- Momentum: **Peanut-Sesame Crisp / 花生芝麻酥 / Erdnuss-Sesam-Krokant**;
- balanced: **Reedwater Work Lunchbox / 芦水渡工餐盒 / Schilfwasser-Arbeitermahlzeit**.

**Production baseline:** Medium solo provides 2/2/2 plus one lunchbox; co-op 3/3/3 plus one. Easy adds one of each common item. Hard, Extreme, and Ultimate remove one, two, and three authored common items. The lunchbox always remains after bike-captain custody and before Cassian. Branch recovery is separate. Items use safe placement, shared `J`, ownership, handoff, checkpoint, and objective non-consumption rules. `FULLPANTRY` affects eligible ordinary containers only.

## 15. Apprehension-First Civic Duty Grade

The 100-point grade uses:

- **Live Apprehension and Escape-Network Control:** 45;
- **Civilian Safety and Collateral Restraint:** 25;
- **Combat and Restraint Mastery:** 20;
- **Resource and Active-Time Efficiency:** 10.

A valid clear requires Cassian and all three lieutenants in documented live custody. Candidate thresholds are C for clear, B at 60, A at 75, and S at 90, validated separately by difficulty and solo/co-op profile.

S permits one Used asset and one Disrupted zone but requires at least two assets Disabled, two zones undisrupted, and S-band collateral. Two Used assets or two disruptions cap rank at A; all three of either cap it at B. Major avoidable protected-property damage caps rank at B. Cassian's successful gate action reduces points but does not automatically block S. Branches are optional and their active time is compensated.

Pause, cinematics, loading, synchronized readiness, protected custody, and validated network recovery do not count as active time. Surrendered/restrained targets, civilians, protected presentations, repeatable barriers, harmless destruction, and transitions cannot be farmed. Cheat-Assisted clears remain unranked and noncompetitive.

## 16. Achievements and rewards

The eight achievements are:

1. **No Escape at Reedwater / 芦水渡口：无处可逃 / Kein Entkommen in Schilfwasser** - reward-eligible authenticated clear.
2. **The Right to Passage / 通行之权 / Recht auf freie Passage** - complete that branch.
3. **Secure Every Line / 缆索全安 / Jede Leine sichern** - complete that branch.
4. **Reedwater Stands Free / 芦水无阻 / Schilfwasser bleibt frei** - complete both branches in one eligible run.
5. **Every Route Closed / 三路尽封 / Jeder Fluchtweg geschlossen** - disable all three assets.
6. **Safe Passage for All / 众人安渡 / Sichere Passage für alle** - clear all zones undisrupted without major protected-property damage.
7. **The Last Gate Stays Open / 最后一门不落 / Das letzte Tor bleibt offen** - interrupt the emergency gate while preserving protected deck components.
8. **Guardians at the Crossing / 渡口双卫 / Wächter an der Überfahrt** - both co-op heroes complete a custody interaction and tagged partner defense.

Any valid clear unlocks Lin under her approved restrictions plus the Chronicle, base Museum record, artwork, and music. First reward-eligible clear grants itemized Credits. First A grants the text-free **Open Passage** emblem; first S grants **Keeper of Safe Passage / 安渡守护者 / Hüter der sicheren Passage**. Co-op is never required for solo rewards or Museum completion. Cheat-Assisted completion grants access unlocks but no score, rank, Credits, Mastery, achievement, emblem, title, or prestige reward. No reward grants combat power.

## 17. Presentation and audio

### 17.1 The Toll at Dawn

A 25-35-second skippable opening shows a normal Reedwater morning, the illegal toll line, a non-graphic refusal and blocked passage, the relay/winch/motorbike network, and Council authorization reaching Lin. Selected heroes appear in the following in-engine briefing rather than generated footage.

### 17.2 Briefing and Passage Restored

The adaptive briefing explains Cassian, the Ledger, civilian zones, protected scenery, custody, Lin's guest status, current bindings, difficulty, loadout, and co-op readiness. A neutral dispatcher replaces Lin's command-post dialogue when she is selected.

The 30-45-second skippable **Passage Restored** coda shows medical custody, returned documents/property, toll-barrier removal, safe public passage, resumed ferry activity, and Lin. Bounded inserts may reflect asset, disruption, collateral, and branch states without changing canon.

Generated footage uses stable compositions and small motion and contains no embedded text, dialogue, subtitle, logo, or language-dependent signage. English, Simplified Chinese, and German subtitles/transcripts cover mandatory content. Both cinematics unlock in the Museum.

### 17.3 River Without Tolls music family

1. **Reedwater Before the Bell** - opening and briefing;
2. **Close the Crossing** - market and warehouse;
3. **Lines Under Tension** - crane yard and winch pressure;
4. **The Tollmaster's Last Run** - Cassian;
5. **Passage Restored** - coda and Museum.

The palette uses plucked strings, woodblocks, restrained hand drums, low strings, river ambience, and a small ferry-bell motif. Bells and horns cannot imitate warnings. Motorbike, relay, winch, crane, barrier, restraint, ferry, rope, water, and custody SFX remain mixer-separated and receive captions and non-audio equivalents. Generated audio requires editing, provenance, and commercial-use verification.

## 18. Automatic Highlight profile

Reedwater retains universal **Perfect Combo** and **Two Threats One Move** rules and adds mission mappings:

- **Guardian Intervention:** Prevent a committed evacuation disruption, relay/winch activation, motorbike escape, or emergency-gate consequence.
- **Defensive Mastery:** Exact Block or Counter an eligible Enforcer, Ferry Feinter, or Cassian baton action, then complete a legal damage-free punish.
- **Team Harmony:** One hero completes evacuation or custody while the partner interrupts a designated threat, followed by zone clearance or documented custody.
- **Environmental Ingenuity:** Use a Mooring Hook, cargo, handcart, shutter, or barrier to interrupt an objective actor and meaningfully affect another hostile.

Candidates store verified state facts, responsibility, assistance, and deterministic frame evidence. Screenshots favor intervention, cleared passage, or secured custody rather than distressed civilians or helpless restrained targets. The system selects at most three and at most one per family, never rewards delay, warning provocation, Active assets, protected damage, or boss extension, and changes no rewards or simulation.

## 19. Persistence, recovery, and records

The **Four-Gate Custody Snapshot** uses:

- **CP1:** relay resolution and lieutenant custody;
- **CP2:** winch resolution and lieutenant custody;
- **CP3:** bike-captain custody with Cassian's motorbike Active;
- **CP4:** post-Mounted Toll Run with motorbike outcome and Cassian's exact carried state before Deck Counter-Control.

Mission start is the fallback before CP1. Snapshots preserve civilian, asset, pending consequence, custody, branch, environment, collateral, enemy, hero, item, score, reward, Highlight, version, assistance, cheat, and network-authority facts.

Restore cannot reroll, reactivate, repeat, reopen, repair, respawn, duplicate, or improve state. In particular, CP4 cannot replay Mounted Toll Run, change the motorbike result, or restore Cassian. Results retain the complete case ledger. Curated tiered replay retention, comparable record categories, validated technical recovery, and recorded ordinary continues follow shared rules.

## 20. Player support, accessibility, and cheats

First launch presents a localized **Apprehension Operations** card explaining Ledger states, civilian states, Resolve, restraint, custody, protected scenery, bike Stability, current bindings, and the absence of civilian death or permanent early escape. It remains available from Guide and pause.

The **Reedwater Apprehension Drill** teaches relay/winch interruption, evacuation, restraint with and without a held weapon, Mooring Hook control, bike Stability, and emergency-gate interruption through demonstration, guided practice, independent trial, and optional mastery.

Objective information uses icon, silhouette, text, audio, captions, target lines, and screen-reader announcements. Reduced water, crane, bike, reflection, particle, flash, shake, and motion settings preserve simulation timing. Restraint and evacuation support hold, toggle, and reduced-input forms. Simulation-changing help is Assisted. No objective requires pointer, colour, audio, or motion.

Applicable hero cheats plus `QUIETCROWD`, `FULLPANTRY`, and `HOMECOMING` retain shared behavior. `QUIETCROWD` cannot remove Cassian, lieutenants, custody, or asset decisions. `TRUSTYTOOLS` affects carried tools only. `STEADYRIDE` and `SAFEPASSAGE` show Not Applicable. No Reedwater-specific cheat is added.

## 21. Warrant-to-Archive acceptance boundary

Validation covers all five heroes solo and all ten unique pairs; all five difficulties; Standard Loadout, Open Loadout, Assisted, and Cheat-Assisted; solo, same-device, and local-Wi-Fi; supported browsers; 60-FPS target and stable 30-FPS minimum without simulation changes.

It covers every asset and civilian combination, all 64 combined asset/civilian grading sets, branch, custody, enemy, specialist, conditional reinforcement, weapon, environment, Cassian phase, emergency-gate, checkpoint, result, Highlight, reward, package, Legacy, Lin-access, localization, input, and accessibility path.

Release requires negative proof against civilian or custody-target death, permanent Cassian escape, off-screen or unwarned objective change, repeated consequences, softlocks, lethal water falls or crashes, random ferry movement, restore improvement, rerolls, duplication, repeated unlocks/rewards, farming, mandatory co-op/Lin, and unintended sponsor continuity. No Critical or High-severity defect may remain open.

## 22. Deferred production work

The feature model is complete. Production must still author and validate exact frame data, action timings, interception windows, rank thresholds per difficulty and player count, encounter budgets, damage/Resolve values, Lin's final move catalogue and art, all final artwork and animation, voice and media assets, performance budgets, browser/device coverage, localization strings, and balance telemetry. These are implementation and tuning tasks, not unresolved feature decisions.

## 23. Continuity locks

- Reedwater remains a canon-compatible side story, not a mandatory campaign chapter.
- It occurs after Qinglan and before Stage 4 but never requires Qinglan ownership or completion.
- It does not alter finalized Stage 1, Stage 2, or Stage 3 events.
- It reveals no sponsor clue and cannot be retrofitted into Tomas's plot without a new approved continuity decision.
- Lin's Curated-Mission unlock never changes her Story Mode or Chapter Challenge exclusion.
- The ferry remains stationary environment; motorbikes remain non-playable mission pressure.
- The combat engine remains permanent and unchanged; all Reedwater behavior is data-defined content.

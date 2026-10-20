# Fight for Peace — Product, Game, and Technical Specification

**Version:** 0.3 review draft  
**Date:** 2026-10-20  
**Source of truth for decisions:** `Features_Decisions.md`  
**Initial delivery target:** Stage 1 Representative Vertical Slice

## 1. Document status and interpretation

This specification consolidates the approved product and combat design for *Fight for Peace*. Unqualified declarative requirements are normative. Tables marked **Combat Lab Candidate** contain exact, versioned starting values that must be implemented as data and validated in playtests before they may be promoted to **Validated**. Assets marked **Pending Production** do not yet exist and must never be presented as final artwork.

The priority order is:

1. Player safety, readable counterplay, and deterministic simulation.
2. Confirmed rules in this specification and `Features_Decisions.md`.
3. Validated per-action and per-encounter data.
4. Candidate tuning values.

Working move names and hero archetype titles may change during final naming and localization without changing their approved gameplay functions.

## 2. Product vision

*Fight for Peace* is a browser-based 2D belt-scrolling action game inspired by classic arcade brawlers and distinguished by fighting-game depth. Its heroes value peace and use force only to protect their village, loved ones, and community from specific threats. Each stage provides its own conflict, locations, enemies, boss, weapons, conclusion, and reason to fight.

The combat engine is persistent across the game. New stages are data-defined content packages that add narrative, environments, encounters, enemies, bosses, items, weapons, patterns, endings, and eventually additional unique heroes.

### 2.1 Design pillars

- **Peace is the purpose:** violence protects people and restores safety; surrender and rescue are meaningful outcomes.
- **Brawler readability, fighter depth:** movement and basic routes remain approachable while cancels, defense, ground play, aerial conversion, and cooperative handoffs reward mastery.
- **Complete, unique heroes:** every hero is a specific person from the village, cannot be duplicated in one team, and owns character-specific routes without losing solo viability.
- **No hidden unfairness:** legal transitions, resource costs, warnings, difficulty effects, and store trade-offs are visible and data-defined.
- **Accessible completion, honest records:** openly documented cheats may carry beginners through every stage and difficulty while Cheat-Assisted results remain clearly separated from skill- and economy-bearing play.
- **Deterministic browser play:** solo, same-device co-op, local-Wi-Fi co-op, replays, Combat Lab, and automated tests use the same simulation rules.

## 3. Scope and game modes

### 3.1 Required modes

- Solo.
- Same-device two-player co-op with explicit controller assignment.
- Local-Wi-Fi two-player co-op using host-authoritative deterministic simulation.
- Player Academy for lessons, practice, trials, and combo recipes.
- Developer Combat Lab for frame, collision, state, resource, and networking diagnostics.

Two participants may not select the same hero. Temporary Guest mode participates in a session but retains no permanent progression. Persistent participants retain their own verified results and progression.

### 3.2 Stage flow

`Mode → profiles and devices → stage and difficulty → unique heroes → skippable intro → elder briefing, loadout, and optional cheats → readiness → gameplay → ending → results and save`

Loadouts can be edited in the briefing, co-op lobby, eligible between-stage preparation, and Academy. They remain locked during an active encounter.

## 4. Narrative and localization

English is the default language. Simplified Chinese and German are required at release. Narrative art and generated video contain no embedded language-dependent words. Titles, dialogue, subtitles, prompts, warnings, and captions are rendered as interface layers from stable localization keys.

The village elder is visually based on a personal photo supplied with the creator's consent. The elder analyzes threats, sets goals, and motivates the heroes. Skipped dialogue remains available through a localized recap or transcript.

Every stage introduction supports:

- A skippable video with captions and independent audio controls.
- A still-art fallback using the same story information.
- An elder briefing with objective, peaceful stakes, warnings, and loadout access.

Missing localized runtime data falls back to English and records a diagnostic; release validation treats missing required translations as an error.

## 5. Platform, browser support, and controls

### 5.1 Platform

The game is desktop-browser first. Tier 1 targets current desktop Chrome, Edge, Firefox, and Safari after an explicit compatibility matrix is validated. Capability gates test rendering, Web Audio, keyboard, gamepad, IndexedDB, visibility handling, WebRTC, and optional camera/fullscreen support. A missing optional capability disables only its dependent feature.

### 5.2 Default keyboard actions

| Action | Default | Meaning |
|---|---:|---|
| Move / directional modifier | `W/A/S/D` | Horizontal and stage-depth movement |
| Attack | `T` | Standing, directional, contextual ground, and aerial attack routes |
| Jump | `Z` | Neutral or directional jump |
| Special | `U` | Fixed or loadout-assigned Special |
| Guard | `G` | Guard, Exact Block, Counter, Grab Escape, or approved chord modifier |
| Ultimate | `H` | Full-meter Ultimate |
| Grab / interact | `J` | Grab, pickup, use, throw, or weapon throw |

All physical controls map to abstract gameplay actions and are remappable for keyboard and gamepad. Labels follow the character printed by the active keyboard layout; on German QWERTZ, the printed `Z` remains Jump even when the browser physical code differs.

An optional abstract Dash binding replaces the double-tap gesture. An optional abstract Low Attack binding replaces the dash-state `T + G` chord.

### 5.3 Direction resolution

Forward and Backward use facing at input acceptance. Up and Down retain stage-depth meaning. Keyboard directional ties use the most recently pressed cardinal direction; analog input uses the dominant axis after dead-zone processing. Assisted Facing never changes a directional Special or Ultimate after its input is accepted.

## 6. Runtime movement and targeting

- Ground navigation is free belt-scrolling movement with normalized diagonals.
- Manual Facing is the default; Assisted Facing is optional per local player.
- Explicit left/right attack input overrides Assisted Facing.
- Assisted Facing cannot retarget an active combo and never controls defensive facing.
- Double-tapping any direction produces a short non-invulnerable dash.
- Neutral and directional jumps are supported.
- Airborne correction is limited and cannot instantly reverse momentum.
- Allies use soft collision; enemies occupy space but cannot create permanent body traps.
- Movement is immediate. Offensive actions may use one queued input; defensive precision uses real press timestamps.

## 7. Combat model

### 7.1 Action categories

The runtime supports standing, aerial, low, downed-target ground, dash, grab, weapon, Special, Ultimate, Counter, Combo Breaker, and cooperative actions. Every action is an authored data record; sprite pixels never determine timing or collision.

### 7.2 Structured branching and freestyle cancels

Every hero shares the same input grammar but owns a unique sparse combo graph. Repeated neutral `T` performs a dependable three-action fallback. Directional inputs select character-specific routes and finishers.

The three-action route is a foundation, not a maximum combo length. Explicit cancel links may continue into aerial, ground, weapon, Special, Ultimate, premium dash, grab, or cooperative actions. A transition declares:

- source action and destination action;
- hit, guard, or whiff contact condition;
- allowed simulation-frame window and early buffer;
- target state and range requirements;
- meter and quota costs;
- resulting target reaction.

Invalid cancels spend nothing and do not become delayed standalone attacks. Normal combat uses subtle rejection feedback; Academy and Combat Lab expose the exact reason.

### 7.3 Target-owned combo context

The first confirmed hit opens a combo context owned by the defender. It persists only while the target remains non-actionable or an explicit continuation seam remains open. It closes on actionable recovery, expired continuation, protected recovery, Combo Breaker, or boss Resolve Burst.

The context owns damage scale, hit-stun budget, juggle budget, wall/ground-bounce quotas, ground-route use, breaker use, dash-bridge use, and meter-gain decay. Changing attackers in co-op never resets these values. Changing targets creates a different context.

### 7.4 Anti-infinite requirements

- Move-weighted hit-stun budget with forced safe separation at exhaustion.
- Move-weighted juggle budget with protected landing at exhaustion.
- Move-level damage proration with a candidate 30% ordinary damage floor.
- One ordinary wall rebound and one ordinary ground bounce per combo as the candidate baseline.
- One premium attack-to-dash bridge per continuous combo.
- At most one optional ground extension followed by one ground finisher.
- Re-knockdown never refreshes the ground route.
- Protected recovery closes the previous context and grants no hit confirmation, meter, or continuation.

These rules apply to heroes, enemies, bosses, weapons, and cooperative attackers.

### 7.5 Ground and low combat

Ground combat is a contextual downed-target follow-up, not a persistent grappling mode. A knockdown is tagged either `terminalKnockdown` or `opensGroundWindow`.

When a grounded hero is close enough and facing a marked target with an open ground window, `T` and eligible directional-`T` inputs use a Ground-Opportunity Focus. Without that valid focus, the same inputs retain standing meanings. Moving or facing away releases the focus. Both cooperative heroes share the marked target's extension-and-finisher allowance.

Low attacks target standing enemies. During an active dash, `T + G` selects the hero's low branch instead of the ordinary `Dash + T` action. In this chord `G` does not Guard, Exact Block, or spend Defense. Low attacks may lower hurtboxes under explicitly high attacks but grant no invulnerability and remain normally guardable. Clean hits may stagger; counter-hits or tagged finishers may trip and open a ground window. Hit-stun decay prevents low-attack loops.

### 7.6 Defense

**Normal Guard:** frontal committed guard, candidate 150-degree arc. It reduces health damage and spends Defense meter. Direction held before `G` sets facing; direction entered while held requests a committed pivot.

**Exact Block:** a fresh `G` press immediately before contact. Candidate core window: five fixed frames ending on contact. Success prevents damage and Defense cost, restores candidate 15% Defense once per incoming action, and creates tagged deflect advantage. Holding or tapping repeatedly cannot create repeated attempts.

**Counter:** fresh direction toward the attacker plus `G` shortly before contact. Candidate window: three frames. Success negates an eligible contact, deals character-specific damage, starts an ordinary combo context, and restores candidate 25% Defense. Failure does not fall back to Guard and has candidate 20–30 frames of recovery.

**Guard Crush:** incoming guard damage that reaches zero Defense receives normal reduction, then produces candidate 24–30 frames of stagger. Voluntary spending cannot trigger Guard Crush.

**Combo Breaker:** `G + H` during eligible hit-stun, aerial juggle, or an open ground sequence. It requires and spends 75% Defense, is limited to one use per incoming combo, deals no damage, closes the context, and produces protected separation.

At zero Defense, normal Guard is unavailable, but Exact Block and Counter remain available. Passive recovery begins only below the 25% safety floor after approximately 1.5 seconds without guarding, attacking, or taking damage, and stops at 25%.

### 7.7 Attack meter

Attack meter caps at 100%. Authored per-action gain is awarded on legal enemy contact, reduced by an independent combo meter-gain budget, and never generated by whiffs, allies, protected targets, Supers, or team finishers. Ordinary tagged cancels add no surcharge; destination actions pay their normal cost. Rare premium cancels use Attack meter, with 25% as the candidate cost. Any Ultimate consumes the full bar.

### 7.8 Grabs and throws

`J` uses deterministic context and direction. With an occupied hand it throws the held object. With empty hands, direction plus `J` prioritizes a standing grab; neutral `J` prioritizes an eligible nearby item before neutral grab. Optional separate Grab and Interact bindings are supported.

A grab permits at most one `T` extension followed by a neutral/directional `J` throw, a second-`T` release strike, or an explicitly linked `U` finisher. Timeout produces a separating shove. Grab Escape uses one fresh `G` attempt in a telegraphed candidate 10–12-frame window; success costs no meter. Released targets receive candidate 30-frame re-grab protection.

One tagged partner assist may connect during a hero grab. It does not reset budgets, steal the target, or create a second extension. Ordinary thrown enemies may damage one primary secondary enemy before their body hitbox disables.

## 8. Founding heroes

### 8.1 Mountain Guardian

Calm, grounded village craftsperson and waterworks keeper. Strengths are guard reads, close control, grounded routes, throws, stable launches, and deliberate power.

| Category | Working actions |
|---|---|
| Standing | Mason's Touch; Brace Elbow; Gatepost Hammer; Stone Shoulder; Anchor Hook; High Bank Lift; Low Bank Sweep |
| Aerial | Rafter Palm; Stonefall Knee; Cornerstone Sweep |
| Ground | Settling Palm; Lockgate Press; Foundation Rise |
| Dash | Rampart Charge |
| Low | Faultline Reap |
| Core Specials | Stonewake Palm (`U`); Gatebreaker Advance (`Forward + U`); Rising Rampart (`Backward + U`) |
| Signature Ultimate | Rivergate Oath (`H`) |

### 8.2 River Scout

Warm, alert village messenger and river-path guide. Strengths are mobility, aerial pursuit, repositioning, and converting launches.

| Category | Working actions |
|---|---|
| Standing | Reed Tap; Turning Current; Open Channel Kick; Rapids Step; Ebb Heel; Northbank Arc; Southbank Slide |
| Aerial | Reedwing Tap; Current Chase; Bank-Switch Arc; Ebbturn Heel |
| Ground | Skipping Current; Rising Eddy |
| Dash | Rapid Crossing |
| Low | Undertow Slide |
| Core Specials | Current Crescent (`U`); Gale Wheel (`Forward + U`); Ebbstep Return (`Backward + U`) |
| Signature Ultimate | Tempest Crossing (`H`) |

### 8.3 Representative routes

**Mountain:**

- Foundation: `Mason's Touch → Brace Elbow → Gatepost Hammer`.
- Aerial conversion: `High Bank Lift → jump chase → Rafter Palm → Stonefall Knee`.
- Low/ground: `Faultline Reap counter-trip → Settling Palm → Lockgate Press or Foundation Rise`.

**River:**

- Foundation: `Reed Tap → Turning Current → Open Channel Kick`.
- Aerial conversion: `Northbank Arc → jump chase → Reedwing Tap → Current Chase`.
- Low/ground: `Undertow Slide counter-trip → Skipping Current → Rising Eddy`.

## 9. Specials, Ultimates, and loadouts

Neutral `U` and neutral `H` are permanent hero signatures and cannot be replaced. `Forward + U` and `Backward + U` begin with core Specials and may be reassigned to compatible acquired moves. `Up + U` and `Down + U` begin empty. All four directional `H` slots begin empty. Empty slots never fall back to another move.

All owned moves remain permanently available for later re-equipping. Purchased and challenge-earned versions are mechanically identical. Every revealed gameplay move has a free Academy trial and can be acquired through Credits or its dedicated Mastery/Academy challenge. Unlocks are tactical sidegrades, never required upgrades.

## 10. Cooperative combat

- Cooperative launch, pursuit, handoff, and finishers use explicit tags and shared target budgets.
- A handoff never resets scaling, stun, juggle, bounce, ground, dash, or breaker state.
- Team finishers use Invite and Confirm. Both heroes must be eligible and explicitly participate.
- Candidate team-finisher cost is 50% Attack meter from each hero; both costs commit atomically.
- A successful team finisher closes the combo context with protected separation or knockdown.
- Friendly attacks do not damage, stagger, launch, block, confirm, generate meter, or consume allied projectiles.
- Enemies may use authored group attacks with a shared telegraph and threat-budget reservation.

## 11. Items and weapons

### 11.1 Stage 1 weapon core

Heroes start ordinary stages unarmed. Weapons come only from authored stage placements, containers, contextual interactions, or dropped/disarmed enemies and require explicit `J` pickup.

Stage 1 validates:

- **Canal Workstaff:** complete melee core with standing, aerial, and ground routes; Mountain affinity emphasizes bracing and stable launch; River affinity emphasizes vaulting and redirection.
- **Iron Gate Handwheel:** recoverable throwable validating block, Exact Deflect, eligible Counter return, deterministic landing, reclaim priority, and integrity.

Weapons have deterministic lifecycle profiles, authored integrity costs, Ready/Worn/Critical presentation, tagged clashes, tagged disarming, and deterministic landing correction. The final action resolves before break. Disarmed weapons reserve candidate 45 frames of reclaim priority after legal landing, then become neutral. Stage-spawned and intentionally thrown weapons are neutral when available.

Weapon combat uses the same combo contexts and anti-infinite rules. Equipping a melee weapon replaces the ordinary `T` graph with the weapon core plus limited hero-affinity overrides; defensive systems remain available.

### 11.2 Environmental combat and breakable scenery

Environmental combat uses authored deterministic interactions rather than unrestricted physics. A damaging contact requires an eligible move or reaction tag plus sufficient remaining knockback force. Passive impact damage combines authored surface damage with a capped force contribution and remains inside ordinary scaling, stun, juggle, meter, and anti-infinite rules. Active hazards are separate authored actions with explicit defense profiles and anti-trapping recovery.

Breakable objects progress through authored Intact, Damaged or Loosened, Critical, and Broken states using `breakPower` and object thresholds. Important states use non-color visual, motion, sound, and caption cues. An ordinary breakable creates at most one interactive fragment; all other pieces are cosmetic.

Interactive fragments are Weapon Core entities in the `improvisedDebris` category:

- **Light:** throw-only and normally consumed or disabled after its authored impact.
- **Long:** one or two shared melee actions plus throw and limited integrity.
- **Heavy:** slow pickup and movement, one committed strike or throw, and optional authored frontal protection.

Pickup, ownership, landing, clash, disarm, checkpoint, co-op, and carry-boundary behavior reuse the weapon lifecycle. Compact debris does not require the Workstaff's complete move graph. `TRUSTYTOOLS` affects applicable integrity only and cannot override consumption, hazards, region boundaries, throws, drops, or disarms.

Each target-owned combo contains one `environmentImpactUsed` allowance. Its first eligible passive collision may deal full environmental target damage. A continuing wall rebound also consumes the wall-rebound quota; a ground bounce also consumes the ground-bounce quota. A terminal slam consumes the environmental allowance but no unused rebound quota. Later passive contacts may damage scenery or force safe separation but cannot produce another full environmental damage event or refresh control budgets.

Both heroes share these target-owned allowances. Bosses and resistant heavy enemies convert ordinary environmental contact into capped Health damage, increased Resolve pressure, and braced reaction; full slam, rebound, or knockdown is available only during Stagger Break or another declared vulnerable phase. Supers, team finishers, and boss transitions may destroy several objects visually but resolve one bundled environmental damage event.

Environment state is canonical and declares one persistence policy: persistent, encounter-restored, checkpoint-saved, consumed, story-controlled, or decorative cleanup. A normal region targets no more than one major hazard or impact surface, two minor breakables, and one usable fragment at once; boss phases may exceed this only under authored Threat and presentation budgets.

Scenery is categorized as hostile, expendable, protected, rescue-sensitive, or optional preservation content. Required destruction never creates unavoidable blame, harsh mission failure, or Credit loss. Scenery destruction alone grants no score or meter. Bounded recognition is reserved for meaningful tactical outcomes and may occur only once per target combo; repeated safe farming ceases to reward.

Difficulty preserves force, defense, timing, and damage rules while expanding enemy awareness and authored combinations. Teaching uses a safe first exposure, Academy exercise, Guide entry, move-list eligibility tags, transient confirmation, accessibility emphasis, and Combat Lab diagnostics. Functional states and interactive fragments survive adaptive-quality reduction.

Stage 1 proves one impact surface, one multi-state breakable yielding one usable fragment, one active mill or canal hazard, one co-op redirect, and one Resolve-gated boss interaction. This Representative Environmental Slice is a vertical-slice requirement; a full destruction catalogue is not.

### 11.3 Later-stage advanced ranged and explosive weapons

Grenades, revolvers, machine guns, dedicated armed enemies, and their final media are post-Stage 1 expansion content. The Stage 1 architecture may retain extensible schema fields or optional placeholder Lab tests, but these are not acceptance gates.

Advanced weapons are scarce physical stage pickups with finite ammunition. They cannot be pre-equipped, stored between stages, placed in Special or Ultimate slots, or obtained permanently from the Store. Cosmetic variants may be sold without changing access or ammunition.

`J` picks up, throws, or discards the held weapon. `T` and direction plus `T` use its authored graph. Neutral fire uses a deterministic narrow soft-target cone; directional fire selects authored lane or movement behavior. A firearm-equipped dash-state `T + G` retains priority as the hero's low attack, while `G` alone remains defense. Compatible `U` and `H` actions retain their established resource rules.

A safe close-range co-op `J` interaction uses Invite and Confirm to transfer a weapon. Directional `J` away from the partner forces an ordinary throw, and combat throws may use an authored catch window. One physical pickup is never duplicated for co-op.

Grenade tap-release performs a quick throw. Holding `T` begins bounded committed aiming with a landing preview; release throws, direction adjusts the zone, and no fuse cooking occurs. A machine-gun burst is one authored offensive action rather than an uncontrolled stream.

The combat roles are:

- **Revolver:** few precise, high-interruption shots with recovery and escalating target resistance.
- **Machine gun:** finite short bursts for pressure and crowd control, with lower per-hit damage, movement cost, recoil, and anti-pin resistance.
- **Grenade:** very limited delayed area control, strong knockback, and eligible environmental interaction with a clear danger zone.

Ranged actions use the existing combo context and only authored weapon-cancel links. They never reset scaling, stun, juggle, bounce, breaker, or environmental state. Boss interruption converts through Resolve and phase rules.

Only dedicated enemy roles use firearms or explosives. Their silhouette, aim or throw tell, warning zone, firing pause, defensive response, and Threat Budget cost are explicit. Eligible shots may be guarded or Exact Blocked; only tagged techniques deflect or return them. Grenade blasts are primarily evade-oriented and cannot create unavoidable patterns.

Ammunition belongs to the physical weapon and transfers with it. Revolvers use a small fixed shot count and remain throwable when empty. Machine guns use one finite pool, each burst spends its declared amount, and the empty weapon remains throwable. Grenade bundles disappear after their final grenade. There is no ordinary player-controlled reload or persistent ammunition inventory; rare authored resupplies restore only compatible ammunition up to the profile maximum.

Checkpoints save exact ownership, position, ammunition, grenade count, condition, pickups, and consumed resupplies. Empty fire produces bounded dry feedback but no meter, confirmation, or combo continuation. `TRUSTYTOOLS` does not preserve ammunition, and the initial cheat catalogue gains no infinite-ammunition code.

Higher difficulties change armed-enemy intelligence, contested placement, optional acquisition, and combinations rather than player weapon rules. Presentation is stylized, non-gory, multi-channel, and independently reducible without removing warnings. Validation must cover deterministic targeting, ammunition, arbitration, transfers, checkpoints, replay, networking, reconnect, accessibility, environment interaction, cheats, and performance before later-stage production media is approved.

### 11.4 Later-stage mounted and vehicle encounters

Horses, motorbikes, wagons, and comparable vehicles are post-Stage 1 authored encounters. They are not universal free-roaming systems, pre-stage equipment, or Stage 1 acceptance requirements.

All mounted content uses abstract remappable actions and one of three profiles: assisted-forward **Chase**, bounded-free-movement **Arena**, or managed-range **Escort**. Directions steer; `T` attacks; `Z` jumps or evades where supported; `G` performs the profile's defense; `U` uses a mounted Special; and an eligible full-meter `H` uses a mounted Ultimate.

The mount supplies shared movement, collision, defense, and basic attack rules. Each hero contributes a compact kit containing neutral and directional attacks, an eligible jump or evasive attack, one mounted Special, and an eligible mounted Ultimate. Purchased on-foot moves work only when they explicitly declare a mounted-compatible variant. Dismounting restores the saved on-foot loadout.

Hero Health, Defense, and Attack Bar persist unchanged through mounting and dismounting. Stability is the only additional mounted resource. Direct attacks declare whether they affect Health, Defense pressure, Stability, or a combination; collisions primarily damage Stability. At zero Stability the rider enters a telegraphed critical state, and a further qualifying hit produces an authored crash or forced dismount. Riding never refills hero resources.

Mounted `G` may be a Defense-consuming guard or brace, a committed movement evasion, or an explicitly compatible Exact Block or Counter. Mounted attacks build the normal Attack Bar and `H` consumes it fully. Separate mounts have separate Stability; a shared vehicle has one shared value. Checkpoints save mount, roles, Stability, objectives, and exact hero resources.

Co-op configurations are authored as Parallel Riders, Driver and Fighter, or Escort Formation. Both players remain simultaneously active in same-device play. Single-player uses deterministic companion behavior, contextual commands, or safe role switching. Local-Wi-Fi shares canonical vehicle state, and one crash or disconnect invokes an authored rescue, catch-up, proxy, or checkpoint response rather than automatically failing the partner.

Mounts are acquired and left only at story-authored boundaries. Dedicated mounted enemies use roles such as pursuer, blocker, flanker, boarder, ranged harasser, support driver, elite, or phased boss; the system does not convert every enemy to every vehicle. Boss crashes use Resolve and safe phase transitions.

Only mounted-compatible environmental objects resolve at speed. Capped speed and force may open routes, slow pursuers, reduce Stability, or create co-op opportunities. High-speed fragments are cosmetic unless explicitly authored as cargo or mounted weapons.

Mounted actions contribute to normal stage scoring and may receive an optional section grade, but grades never block story, difficulty, or essential combat power. Cheat-Assisted riding retains story and difficulty access but no score, Credits, grade, achievements, or mastery.

Cheats retain their declared resource boundaries: Health modifiers do not prevent Stability loss; `STEADYFEET` does not prevent an authored crash; `IRONGUARD` does not protect Stability; `STRONGHANDS` does not multiply Stability, objective damage, speed, or collision force; and `TRUSTYTOOLS` does not protect mounts.

First exposure provides a localized control card and safe practice. Academy later offers optional riding lessons, and explicit assistance may adjust steering, speed, warnings, or lane correction. Independent shake, speed-line, flash, blur, vibration, and audio controls preserve essential cues.

Production begins with one complete placeholder-first motorbike-pursuit vertical slice that validates both separate riders and driver/fighter play, deterministic replay, input devices, checkpoints, networking, accessibility, performance, and difficulty behavior. Horseback, wagon, and further encounters follow only after the reusable contracts pass. This later expansion slice is distinct from the Stage 1 Representative Vertical Slice.

## 12. Enemies, boss, and difficulty

### 12.1 Stage 1 roster

- **Pressed Recruit:** basic pressure and morale behavior; may flee or surrender.
- **Bridge Shield:** defense and lane control.
- **Canal Runner:** flanking and aerial pressure.
- **Rope Overseer:** grabs and forced repositioning.
- **Sling Lookout:** ranged control with authored warnings.
- **Black-Iron Enforcer:** Hard-and-higher challenge enemy with a new formation problem.
- **Sluice Commander:** multi-phase boss using the shared combat, defense, Resolve, weapon, and anti-infinite vocabulary.

Coerced workers are non-combatants. Surrendered or fleeing enemies are no longer legal targets.

### 12.2 Enemy coordination

Enemy offense uses a shared deterministic Threat Budget. Actions reserve authored costs, while idle roles flank, reposition, or prepare. The scheduler rejects overlaps without reasonable counterplay and enforces global and per-hero pressure limits. AI uses visible state and authored perception delay, never future player input.

Target selection uses role-aware scoring with commitment. Defense uses tiered capability profiles: basics have Guard and simple recovery, specialists receive selected advanced defenses, elites may combine bounded options, and bosses have the broadest phase-visible toolkit.

### 12.3 Boss rules

Boss Resolve absorbs extended control until depleted. Depletion produces a clearly telegraphed Stagger Break where full routes become legal under boss-specific budgets. Phase thresholds queue safely: the threshold-crossing action completes, limited carryover accumulates, and transition begins at a safe point. Off-screen attacks require explicit capability, directional warning, and distinct audio.

### 12.4 Difficulties

Easy, Medium, and Hard begin unlocked. Completing the released campaign on Hard permanently unlocks Extreme; completing it on Extreme unlocks Ultimate. A declared Cheat-Assisted completion may satisfy these access gates so less-experienced players can encounter higher-profile enemies and formations, but it does not create a Standard, Open, ordinary Assisted, ranked, or skill-achievement clear. Difficulty changes enemy behavior, move availability, coordination, roster variants, resources, and bounded statistics, but never hero controls, learned cancel rules, or defensive timing windows.

Medium is the reference experience. Higher difficulties introduce advanced variants, new formations, selected challenge enemies, and stronger decision quality rather than relying on inflated health and damage.

## 13. Stage 1 — The Broken Water Pact

An armed faction seizes the shared river gate, diverts the village's water, and coerces workers. After attempted negotiation, the elder asks the heroes to free the workers, restore water, and prevent further harm. The defeated Commander may surrender or be captured. Evidence of an outside sponsor creates the next-stage hook after Stage 1 resolves its local conflict.

The eight beats are:

1. Dry fields: movement, basic offense, Guard, and simple pressure.
2. Occupied bridge: lane control, throws, formation pressure, first strong co-op opportunity.
3. Worker rescue and first recovery cache.
4. Working mill: ground routes, Canal Workstaff, the representative breakable and debris profile, environmental impact, and machinery danger.
5. Investigation and preparation breath.
6. Canal route: mixed roles, aerial pressure, ranged warnings, and group attacks.
7. Gate courtyard: elite readiness exam and Hard+ challenge substitution.
8. Multi-phase Sluice Commander, river restoration, civilian safety, and sponsor evidence.

## 14. Combat Lab and Academy

### 14.1 Combat Lab

The Combat Lab exposes input history, action state, target context, hitboxes, hurtboxes, frame timing, cancel windows, resource values, damage scale, stun and juggle budgets, ground-route state, weapon integrity, AI decisions, deterministic hashes, rollback, and presentation-event deduplication. It supports instant reset, configurable opponents, slow motion, and frame stepping.

Environmental diagnostics additionally expose move eligibility, remaining knockback force, surface profile, predicted damage, `breakPower`, object state, passive-impact allowance, wall and ground-bounce consumption, hazard defense profile, fragment lifecycle, persistence policy, and deterministic event identity. Later optional Lab extensions may expose mount profile, speed, Stability, role, advanced-weapon target choice, ammunition, burst state, and pickup arbitration without making those systems Stage 1 acceptance requirements.

### 14.2 Academy

The Academy uses **Transparent Map with Progressive Lessons**:

1. Foundation: movement, defense, and safe normal routes.
2. Conversion: directional, aerial, low, and ground continuations.
3. Resource: Specials, premium dash bridges, Ultimates, and team actions.
4. Freestyle: visible cancel graph, free practice, and player recipes.

Stage 1 also provides one environmental exercise covering eligible impact, break states, the usable fragment, hazard response, and cooperative redirect. Mounted and advanced-weapon lessons unlock only when their later-stage content is introduced.

All legal destinations and conditions for the currently revealed and equipped graph are visible. Academy teaches representative grammar rather than every combination. My Combos stores abstract-action recipes, not video, and can record, name, save, replay, practice, and delete legal routes across remapped controls.

Free Practice and a dedicated Cheat Practice filter allow revealed cheat configurations. Recipes record canonical cheat identifiers whenever their conditions depend on modified meter, damage, weapon, or reaction rules. Authored lessons, exams, mastery trials, and technique-acquisition challenges use their declared rules and reject arbitrary cheats with a localized explanation; Cheat Practice awards no Credits, Hero Mastery, achievements, or technique ownership.

## 15. Progression, store, records, and saves

### 15.1 Profiles and persistence

IndexedDB is the canonical local store. Saves are versioned, transactional, checksummed, and retain a previous known-good snapshot. Schema migration preserves the original until success. Only one tab may write a profile. Profiles store versioned cheat-registry state, reusable hero-specific preferences, canonical Cheat-Assisted result metadata, and a separate highest Cheat-Assisted completion difficulty.

Profiles can be exported to and imported from a versioned portable backup. Import validates and previews the data, supports compatible merge or selected-profile replacement, creates a recovery snapshot, and never silently overwrites. Cloud accounts are not required.

### 15.2 Economy

Score is run-specific. Credits are persistent, gameplay-earned, and never sold for real money. Hero Mastery is non-spendable progression. One shared Credit wallet serves all heroes; each hero has an independent Mastery track.

Payouts itemize completion, difficulty, rank, first clear, discoveries, achievements, Academy challenges, and Hero Mastery. Replays retain bounded rewards without daily timers or expiring bonuses. Co-op partners receive full shared completion/rank payout rather than splitting a pool. Cheat-Assisted results award no score, rank, Credits, Hero Mastery, or challenge-derived payout.

### 15.3 Store

The permanent catalogue contains Wardrobe, Training Hall, Technique Library, and Profile Collection. There are no loot boxes, rotating stock, personalized prices, or artificial scarcity. Cosmetics and gameplay style are separate selections. Combat styles are transparent sidegrades and may not change universal timing windows or authored attack frame timing.

Standard and Open Loadout records remain separate. Standard uses default style, original neutral/forward/back Specials, empty optional Special and directional Ultimate slots, and the signature neutral Ultimate. Visual cosmetics and stage pickups remain allowed. Open permits any legally owned compatible loadout.

### 15.4 Records

Per-stage records include score, rank, clear time, highest difficulty, combo damage and hit count, damage taken, hero, mode, co-op status, combat style, move loadout, and content version. Achievement groups cover Story, Stage Mastery, Hero Mastery, Combat Technique, Discovery, Co-op, Academy, and Difficulty.

Environmental telemetry records eligible impacts, rewarded tactical outcomes, broken-object categories, fragment use, hazard contacts, cooperative redirects, boss Resolve interactions, and preservation objectives without rewarding scenery destruction by itself. Later stages may add mounted-section grades and advanced-weapon statistics as versioned optional record fields.

Cheat-Assisted play preserves story/checkpoint completion, stage and campaign access, cinematics, endings, transcripts, bestiary and special-enemy discoveries, weapon/item discoveries, Guide/gallery entries, relevant permanent Store catalogue reveals, narrative Story achievements, and Extreme/Ultimate access. It creates a separate noncompetitive record of highest Cheat-Assisted completion difficulty and never overwrites legitimate Standard, Open, or Assisted bests. It cannot grant competitive time/combat records, Stage/Hero Mastery, Combat Technique, co-op challenge, Academy challenge, or Difficulty achievements.

## 16. User interface and accessibility

Text-heavy interfaces use DOM UI around the Phaser canvas. Required destinations are Continue, Play, Academy, Village Store, Collection and Records, Guide, and Settings. Pause provides Resume, Move List, How to Play, Controls, Accessibility and Audio, Objective, Restart from Checkpoint, and Return to Village.

Critical warnings, defense profiles, prompts, and condition states use icons, shape, motion, text, and/or audio rather than color alone. Essential audio information has localized sound captions. Reduced motion, independent shake/flash/particle controls, detailed combat HUD, remapping, and simulation-changing Assisted Rulesets are supported. Assisted results remain separate where timing integrity matters, but story and ordinary progression remain available.

### 16.1 Guide and How to Play

Guide is a localized text reference distinct from Academy's learning-by-doing activities. Its chapters are Getting Started; Controls and Remapping; Movement and Facing; Standing, Aerial, Low, and Ground Combat; Guard, Exact Block, Counter, and Combo Breaker; Combos, Cancels, Scaling, and Anti-Infinite Rules; Specials, Ultimates, and Loadouts; Grabs, Weapons, Food, and Containers; Environmental Combat and Hazards; Solo and Co-op; Difficulty and Special Enemies; Score, Credits, Mastery, Store, and Records; Accessibility and Assisted Rulesets; Academy and My Combos; Elder's Secrets; and Glossary. Mounted Encounters and Advanced Ranged Weapons appear when their content is introduced.

English, Simplified Chinese, and German authored explanations use stable localization keys and English fallback diagnostics. Input examples render the current profile/device bindings. Stable mechanical facts come from the same rules and action data used by Move Lists and Academy. Essential content remains usable without video, animation, sound, a mouse, or a physical keyboard. Briefings, Move Lists, Store entries, Academy, pause, and post-defeat choices may deep-link to a relevant article.

### 16.2 Cheat-Assisted play

All beginner-oriented cheats and presets are openly documented from first launch in **Guide → Elder's Secrets**. They are not gated by failure, story, achievements, Credits, difficulty, or Academy. Future novelty codes may be secret, but assistance codes may not be progression-gated.

Each cheat has a stable ASCII identifier and localized card containing its name, scope, exact effect, conflicts, preset membership, and progression consequences. Keyboard users may type an identifier; input is case-insensitive, ignores surrounding whitespace, and treats spaces, hyphens, and underscores as equivalent. Misspellings are never guessed. Gamepad and pointer users select the same card directly and never need an on-screen keyboard. Gamepad navigation uses remappable abstract menu actions.

Hero-scoped modifiers affect only their selected hero. Session-scoped modifiers affect the whole team. Any accepted modifier marks the entire run **Cheat-Assisted**. Both co-op participants must accept that reward consequence, and every session-scoped change requires both participants' confirmation.

Cheats can be configured in lobby, briefing, and eligible checkpoints. Solo pause may propose and accept a change; co-op pause uses synchronized consent and applies only at a safe resume boundary. Active combat input never enters a code. The first accepted activation permanently marks that run even if every cheat is later disabled. HUD, pause, readiness, and results show Cheat-Assisted status; results retain the canonical codes and first activation point. Saved preferences start disabled on a new run unless the player explicitly chooses to reuse them.

Cheats are explicit modifiers inside the canonical deterministic engine, not a second simulation. Objective/story triggers, warnings, boss thresholds, capped carryover, protected transitions, surrender logic, legal boundaries, anti-infinite budgets, and replay/network rules remain active. Replays, checkpoints, saves, and My Combos store canonical identifiers rather than localized labels or raw typed input.

## 17. Media and asset pipeline

Codex-generated images contain no text. Google Flow with Veo is the preferred cinematic-generation tool; Google Flow Music with Lyria is preferred candidate source material for music. Generated media requires human review, editing, rights/provenance tracking, and browser-ready export. Gameplay SFX uses a separate low-latency SFX/foley pipeline.

Characters use anchored model sheets and exact-frame animation strips. Startup, active, recovery, collision, armor, and cancel behavior remain simulation data. Effects scale by action importance and obey a bounded screen budget without suppressing critical information.

Assets use stable logical identifiers in modular manifests with source tool/model, prompt, date, references, provenance, human edits, rights records, locale/quality variants, fallbacks, hashes, dependencies, delivery bundles, and compatibility versions.

## 18. Technical architecture

### 18.1 Client

- TypeScript and Vite.
- Phaser as 2D renderer and scene coordinator.
- Framework-independent fixed-step simulation core, candidate 60 Hz.
- Canonical environmental object, integrity, hazard, fragment, persistence, and target-owned environmental-quota state. Later schema versions may add mount, Stability, role, ammunition, targeting, resupply, and advanced physical-ownership records.
- DOM interface for menus, HUD, briefings, subtitles, Guide/How to Play, cheat configuration, Academy, store, records, and settings.
- Explicit platform adapters for input, IndexedDB, files, Web Audio, capability checks, manifests, visibility, and WebRTC.
- One action/snapshot/event bridge between canonical simulation and disposable presentation.

Solo, same-device co-op, network host/client, replays, Lab scenarios, and headless tests execute the same simulation and content schemas.

### 18.2 Local-Wi-Fi networking

The host owns frame order, accepted actions, random seed, spawn decisions, and canonical state. Peers exchange frame-stamped abstract actions, predict local input, use bounded rollback for late remote input, exchange hashes, and recover from authoritative snapshots. Stable presentation-event identifiers prevent duplicate audiovisual feedback during resimulation.

Pairing uses short-lived room/QR signaling when available and two-way QR or copy/paste WebRTC packages as an offline fallback. Before readiness, peers validate game version, protocol version, deterministic-rules hash, content manifest, cheat-registry hash, and canonical session-wide cheat configuration. A mismatch blocks readiness rather than silently changing either player's state.

Interruption handling uses short recovery grace, restricted survival proxy, rejoin snapshot, and host migration. Unrecoverable sessions preserve the last confirmed checkpoint instead of guessing progress.

### 18.3 Performance and loading

Simulation rate remains fixed while rendering adapts independently. Auto Quality reduces decorative background animation, cosmetic particles and debris, post-processing, lighting, and internal resolution in order, never critical cues, functional break states, or interactive fragments. Staged predictive bundles guarantee the menu shell, selected heroes, stage essentials, common combat presentation, and first encounter before play, then prefetch later encounters at safe boundaries.

## 19. Representative Vertical Slice acceptance

The slice is complete only when it provides the full Stage 1 journey from intro and briefing through ending, results, and saved progression. It must prove:

- All three play modes.
- Both unique founders and their approved core actions.
- Both Stage 1 weapons acquired during play.
- The Representative Environmental Slice: one impact surface, one multi-state breakable with one usable fragment, one active hazard response, one co-op redirect, and one Resolve-gated boss interaction.
- Five core enemies, Hard+ Enforcer, and multi-phase Commander.
- Combat, defense, anti-infinite, co-op, weapon, scoring, Credits, profile, save, loadout, remapping, Guide, and Cheat-Assisted foundations.
- One representative Academy route.
- English, Simplified Chinese, and German narrative presentation.
- English, Simplified Chinese, and German Guide and cheat-card presentation, including keyboard and gamepad-only activation.
- Generated-media integration pilot and still-art fallback.
- Data-driven content loading and deterministic replay.
- Tier 1 capability/performance checks and no progression-blocking defects.

Complete final media polish, every purchased move, every achievement, and Ultimate-difficulty completion are production scope beyond slice acceptance. Mounts, vehicles, revolvers, machine guns, grenades, dedicated armed enemies, and their production encounters are later-stage expansion content. Optional placeholder compatibility experiments do not become Stage 1 acceptance gates.

# Appendix A — Purchased technique catalogue

**Status: Production Candidate 0.2.** These entries satisfy the approved loadout and sidegrade model but become approved content only through review of this specification and later Combat Lab validation. Credit prices are intentionally represented by stable effort bands until economy pacing is validated.

## A.1 Mountain Guardian candidate Specials

| Technique | Compatible slots | Tactical purpose | Candidate frames S/A/R | Trade-off | Band |
|---|---|---|---:|---|---|
| Skybreak Column | `Up + U`, `Backward + U` | Vertical pressure pillar and anti-air conversion | 11/7/25 | Narrow ground coverage; punishable recovery | Medium |
| Bedrock Snare | `Down + U` | Short-lived ground-pressure trap for lane denial | 18/90/24 | Slow setup; one active snare maximum | Medium |
| Cairn Return | `Backward + U` | Absorb one eligible strike, then shove to safe control range | 6/12/27 | Loses to grabs and unblockables; no automatic combo | Medium |
| Terraced Advance | `Forward + U` | Two-step advancing pressure with optional second commitment | 13/6+7/26 | High guard value but unsafe if second step whiffs | Medium |

## A.2 River Scout candidate Specials

| Technique | Compatible slots | Tactical purpose | Candidate frames S/A/R | Trade-off | Band |
|---|---|---|---:|---|---|
| Waterspout Rise | `Up + U`, `Backward + U` | Rising lane-shift anti-air | 8/9/29 | Narrow horizontal reach and committed landing | Medium |
| Undertow Marker | `Down + U` | Delayed current mark that redirects one eligible follow-up | 17/120 duration/22 | Low direct damage; mark expires and cannot stack | Medium |
| Wake Needle | `Forward + U` | Fast, narrow projectile for pursuit confirmation | 9/3/20 | Weak crowd coverage and guard damage | Medium |
| Backflow Feint | `Backward + U` | Retreat, then optional forward return strike | 5/0/12 retreat; 7/4/24 return | Return is punishable on prediction; no invulnerability | Medium |

## A.3 Mountain Guardian candidate directional Ultimates

| Technique | Slot | Role | Candidate frames S/A/R | Full-meter payoff |
|---|---|---|---:|---|
| Gate of Dawn | `Forward + H` | Advancing rescue assault | 9/18/34 | Carries a threat away from civilians or partner |
| Still Mountain | `Backward + H` | Defensive reversal | 5/14/38 | Intercepts eligible pressure and creates wide separation |
| Summit Divide | `Up + H` | Anti-air and vertical Resolve break | 8/20/35 | High Resolve damage against airborne or staggered boss |
| Riverbed Verdict | `Down + H` | Circular lane-control finisher | 12/24/40 | Broad crowd clear with terminal protected knockdown |

## A.4 River Scout candidate directional Ultimates

| Technique | Slot | Role | Candidate frames S/A/R | Full-meter payoff |
|---|---|---|---:|---|
| Floodline Passage | `Forward + H` | Long pursuit and carry | 7/25/32 | Converts distance into a controlled corner escape |
| Moon-Tide Return | `Backward + H` | Evasive rescue reversal | 5/16/36 | Evades an eligible lane and returns through the attacker |
| Skycurrent Spiral | `Up + H` | Aerial pursuit finisher | 7/22/34 | Converts a launch into high airborne control before protected landing |
| Deepwater Ring | `Down + H` | Depth-axis crowd redirection | 10/26/38 | Repositions surrounding enemies without extended stun lock |

## A.5 Function-inspiration audit

The official *Fatal Fury: City of the Wolves* material was reviewed as a **function vocabulary**, not as a source of shippable content. Its [battle-mechanics manual](https://www.snk-corp.co.jp/webmanual/fatalfury-cotw/battle/?lang=en-US) demonstrates character-specific command moves, directional simplified Specials, crouching and aerial actions, feints, move braking, enhanced Specials, combination branches, and multiple super tiers. The official [Arcade Style command list](https://www.snk-corp.co.jp/us/games/fatalfury-cotw/guide/img/command_sp_arcade_eng.pdf) and [Smart Style command list](https://www.snk-corp.co.jp/us/games/fatalfury-cotw/guide/img/command_sp_smart_eng.pdf) also show a useful spread of universal combat functions: ground and air projectiles, rising anti-air actions, advancing carry, counters, command grabs, stance/run branches, aerial falls, low follow-ups, and multi-stage sequences.

*Fight for Peace* adopts only that level of abstraction. The candidate library therefore covers projectile control, anti-air, advancing pressure, reversal, command reposition, trap/set-play, branching pursuit, aerial correction, feint/brake, charge/release, delayed echo, ally rescue, crowd separation, and Resolve pressure. It does **not** reuse an SNK move name, character identity, motion sequence, distinctive pose, animation, timing, trajectory, effects package, voice line, or complete command package.

## A.6 Later-hero seed roster and base techniques

These are expansion seeds, not guaranteed stage order or final personal identities. Each hero is a unique village resident and remains fully functional without purchased techniques.

| Working hero | Village role and combat identity | `U` | `Forward + U` | `Backward + U` | Fixed `H` |
|---|---|---|---|---|---|
| Forest Warden | Trail keeper; route traps, branching pursuit, counter-positioning | **Trailcord Cast** — a narrow tethering line that checks approach without long stun | **Hartstep Pursuit** — a two-part advancing route with a deliberate second commitment | **Canopy Reversal** — retreating hook into anti-air interception | **Greenway Muster** — crosses three threatened lanes and finishes by clearing a safe center |
| Herbal Guardian | Village healer; precise disruption, rescue positioning, conditional Defense support | **Bitterleaf Palm** — short cone that disrupts guarded formations | **Pulseway Step** — fast palm sequence that carries one target away from an ally | **Calm Pulse Return** — timing counter that restores a small amount of the hero's Defense only on valid interception | **Breathkeeper's Circle** — separates nearby threats and restores limited team Defense when it interrupts an authored dangerous attack; never restores Health |
| Forge Keeper | Toolsmith; charge/release, armor reads, heavy guard pressure | **Cinderline Fist** — short, slow pressure wave with strong guard damage | **Bellows Drive** — chargeable armored advance with distance-dependent commitment | **Anvil Rise** — compact rising anti-air with punishable landing | **Hearthquake Oath** — three grounded impacts that break formation and heavily pressure boss Resolve |
| Bell Sentinel | Watch keeper; delayed echoes, feints, cadence branches, lane control | **Resonance Pulse** — slow durable wave whose value is space rather than raw damage | **Procession Step** — advancing strike followed by a delayed echo at the original contact point | **Echo Guard** — intercept that places its returning hit behind the attacker | **Great Bell Accord** — timed expanding rings that redirect crowds and create a short rescue corridor |

## A.7 Later-hero purchased Special candidates

| Hero | Technique | Compatible slots | Function | Candidate frames S/A/R | Defining trade-off | Band |
|---|---|---|---|---:|---|---|
| Forest Warden | Branch Vault | `Up + U`, `Backward + U` | Vaulting anti-air and short aerial conversion | 7/6/21 | Weak against grounded crowds; no strike invulnerability | Medium |
| Forest Warden | Rootline Snare | `Down + U` | One delayed ground trap for lane denial | 19/120 duration/25 | One active; low direct damage; visible setup | Medium |
| Forest Warden | False Trail | `Backward + U` | Retreating feint with optional side-switch return | 5/0/13; return 8/4/22 | Readable return and punishable recovery | Medium |
| Forest Warden | Four-Path Pursuit | `Forward + U` | Three-hit route with one depth-axis branch | 10/4+4+4/25 | Final branch spends juggle budget and cannot loop | Medium |
| Herbal Guardian | Needlewind Lift | `Up + U`, `Backward + U` | Precision anti-air that leaves target near an ally handoff | 7/7/28 | Narrow hit region; no invulnerability | Medium |
| Herbal Guardian | Meridian Sweep | `Down + U` | Low disruption and short trip opportunity | 9/5/20 | Reduced stun/knockdown against elites and bosses | Medium |
| Herbal Guardian | Miststep Veil | `Backward + U` | Evasive depth shift with a brief non-damaging feint | 5/0/18 | No invulnerability and no automatic punish | Medium |
| Herbal Guardian | Three-Pulse Chain | `Forward + U` | Confirmable pressure sequence ending in separation | 8/3+3+4/23 | Low single-hit damage and unsafe final pulse on whiff | Medium |
| Forge Keeper | Flueburst Lift | `Up + U`, `Backward + U` | Armored vertical strike and anti-air | 9/8/31 | Armor loses to grabs/piercing; long recovery | Medium |
| Forge Keeper | Quench Stamp | `Down + U` | Delayed steam zone that weakens guard pressure | 17/90 duration/24 | One active zone; clear warning; low damage | Medium |
| Forge Keeper | Tempered Shell | `Backward + U` | Absorb one eligible strike, then shoulder separation | 6/12/29 | Loses to grabs/unblockables; no combo on late absorb | Medium |
| Forge Keeper | Hammerfall Chain | `Forward + U` | Two committed heavy advances with high guard value | 15/5+7/30 | Second hit is optional but very unsafe on whiff | Medium |
| Bell Sentinel | High Chime | `Up + U`, `Backward + U` | Vertical resonance pillar and anti-air conversion | 8/6/27 | Narrow horizontal coverage | Medium |
| Bell Sentinel | Low Toll | `Down + U` | Floor pulse that trips light targets | 14/5/23 | Slow startup; bosses receive only Resolve pressure | Medium |
| Bell Sentinel | Silent Measure | `Backward + U` | Special feint/brake that changes cadence | 4/0/14 | No damage and can be punished if overused | Medium |
| Bell Sentinel | Peal Sequence | `Forward + U` | Branching cadence string with early or late exit | 11/4+4+6/26 | Full sequence is unsafe and consumes high stun budget | Medium |

## A.8 Later-hero purchased directional Ultimate candidates

| Hero | Technique | Slot | Role | Candidate frames S/A/R | Full-meter payoff | Band |
|---|---|---|---|---:|---|---|
| Forest Warden | Sunlit Trail | `Forward + H` | Pursuit and rescue carry | 8/22/34 | Drives a chosen threat through a safe lateral route | High |
| Forest Warden | Warden's Return | `Backward + H` | Counter-reversal | 5/15/38 | Intercepts eligible pressure and returns to the ally side | High |
| Forest Warden | Crownpath Judgment | `Up + H` | Aerial pursuit and Resolve break | 7/21/35 | Converts a launch into high vertical Resolve damage | High |
| Forest Warden | Safe Grove | `Down + H` | Trap conversion and crowd clear | 11/26/40 | Consumes the active snare, if present, for a broad protected knockdown | High |
| Herbal Guardian | Swift Relief Passage | `Forward + H` | Rescue-route assault | 7/20/33 | Carries one attacker away and grants the partner brief grab immunity | High |
| Herbal Guardian | Returning Pulse | `Backward + H` | Defensive reversal | 5/16/38 | Wide separation plus bounded team Defense on valid interruption | High |
| Herbal Guardian | Sky Meridian | `Up + H` | Anti-air precision finisher | 7/20/34 | High aerial Resolve damage with protected landing | High |
| Herbal Guardian | Sanctuary Circuit | `Down + H` | Circular control | 10/25/40 | Clears surrounding enemies; no Health restoration | High |
| Forge Keeper | Furnace Road | `Forward + H` | Armored formation breaker | 11/24/39 | Long carry and exceptional guard pressure; grabs still beat armor before contact | High |
| Forge Keeper | Tempered Return | `Backward + H` | Heavy counter | 6/17/41 | Converts one eligible heavy hit into wide separation | High |
| Forge Keeper | Chimney Crown | `Up + H` | Vertical anti-air and crowd launch | 9/22/38 | Broad vertical coverage with high recovery if it misses | High |
| Forge Keeper | Village Anvil | `Down + H` | Grounded Resolve finisher | 14/28/44 | Large local shockwave and protected knockdown; no distant reach | High |
| Bell Sentinel | Procession of Dawn | `Forward + H` | Advancing echo sequence | 8/24/35 | Leaves two delayed control echoes behind the route | High |
| Bell Sentinel | Echoes Home | `Backward + H` | Evasive reversal | 5/16/37 | Returns through the attacker and clears the partner's lane | High |
| Bell Sentinel | Bell-Tower Ascent | `Up + H` | Vertical cadence finisher | 8/23/36 | Multi-beat anti-air with strong Resolve damage | High |
| Bell Sentinel | Common-Ground Peal | `Down + H` | Expanding crowd redirection | 11/30/42 | Three readable rings move threats outward without extended stun | High |

## A.9 Catalogue boundaries

- Store techniques are hero-owned; they cannot be equipped by a different hero merely because the input slot matches.
- Each future hero launches with the three base Specials and one fixed signature Ultimate shown above. Purchased Specials may fill `Up + U` and `Down + U` or replace `Forward + U`/`Backward + U`; purchased directional Ultimates may fill `Forward/Backward/Up/Down + H`. Plain `H` is never replaced.
- No purchased technique may dominate its base counterpart in damage, safety, control, meter efficiency, and cooperative value simultaneously.
- Every purchased technique receives a free Academy trial and a dedicated acquisition challenge as well as a Credit price.
- Final personal names, stage introductions, fiction, move names, animation, and balance require character review and Combat Lab validation before promotion from candidate status.

Every candidate must receive original animation, silhouette, timing, effects, audio, trade-offs, cooperative application, and village-rooted fiction. Existing commercial fighting-game names, animation sequences, voice lines, timings, or complete command packages are prohibited source material.

# Appendix B — Candidate exact frame data

**Status: Combat Lab Candidate 0.2 at 60 fixed simulation frames per second.** `S/A/R` means startup/active/recovery frames. Values are exact for this candidate version, not claims of final balance. Multi-hit active notation uses `first active + gap + next active`. Landing recovery applies after touching ground. Exact hitboxes, damage, guard damage, proration, meter gain, stun cost, and juggle cost are separate versioned fields in the action data.

## B.1 Mountain Guardian normal actions

| Action | Input/context | S/A/R | Candidate cancel destinations |
|---|---|---:|---|
| Mason's Touch | Neutral `T` starter | 5/3/9 | Brace Elbow, Stone Shoulder, High Bank Lift, Low Bank Sweep |
| Brace Elbow | Second neutral `T` | 7/3/12 | Gatepost Hammer, High Bank Lift, Stonewake Palm |
| Gatepost Hammer | Third neutral `T` | 11/4/19 | Hit-confirm Ultimate; premium dash bridge |
| Stone Shoulder | `Forward + T` | 12/5/18 | Gatepost Hammer; Gatebreaker Advance on hit/guard |
| Anchor Hook | `Backward + T` | 8/3/14 | Mason's Touch on hit; safe separation otherwise |
| High Bank Lift | `Up + T` | 10/4/20 | Jump chase on hit; Rising Rampart |
| Low Bank Sweep | `Down + T` | 9/4/17 | Ground Opportunity on tagged knockdown |
| Rafter Palm | Air `T` | 5/4/8 landing | Stonefall Knee; Cornerstone Sweep |
| Stonefall Knee | Air `Forward + T` | 9/6/14 landing | Terminal air route; hit-confirm Ultimate where legal |
| Cornerstone Sweep | Air `Up/Down + T` | 8/5/12 landing | Stonefall Knee on hit |
| Settling Palm | Ground-focus `T` | 8/4/15 | Lockgate Press; Foundation Rise |
| Lockgate Press | Ground-focus `Forward + T` | 10/18/20 | Ground route closes |
| Foundation Rise | Ground-focus `Backward + T` | 12/5/23 | Relaunch follow-up only when juggle/ground quotas permit |
| Rampart Charge | Dash `T` | 9/5/18 | Terminal or authored Special on hit |
| Faultline Reap | Dash `T + G` | 8/5/22 | Ground Opportunity only on eligible trip |

## B.2 River Scout normal actions

| Action | Input/context | S/A/R | Candidate cancel destinations |
|---|---|---:|---|
| Reed Tap | Neutral `T` starter | 4/3/8 | Turning Current, Rapids Step, Northbank Arc, Southbank Slide |
| Turning Current | Second neutral `T` | 6/3/10 | Open Channel Kick, Northbank Arc, Current Crescent |
| Open Channel Kick | Third neutral `T` | 9/4/16 | Hit-confirm Ultimate; premium dash bridge |
| Rapids Step | `Forward + T` | 7/4/13 | Open Channel Kick; Gale Wheel on hit/guard |
| Ebb Heel | `Backward + T` | 8/3/15 | Reed Tap on whiff-punish hit |
| Northbank Arc | `Up + T` | 8/4/16 | Jump chase on hit |
| Southbank Slide | `Down + T` | 9/6/18 | Ebb Heel or Current Crescent on hit |
| Reedwing Tap | Air `T` | 4/4/7 landing | Current Chase; Bank-Switch Arc; Ebbturn Heel |
| Current Chase | Air `Forward + T` | 7/5/10 landing | Tempest Crossing at full meter where legal |
| Bank-Switch Arc | Air `Up/Down + T` | 8/6/12 landing | Current Chase on hit |
| Ebbturn Heel | Air `Backward + T` | 6/4/9 landing | Safe air separation; Reedwing Tap only on authored confirm |
| Skipping Current | Ground-focus `T` | 6/4/12 | Rising Eddy |
| Rising Eddy | Ground-focus `Forward + T` | 9/5/20 | Relaunch chase only when juggle/ground quotas permit |
| Rapid Crossing | Dash `T` | 6/5/15 | Gale Wheel on hit; terminal side switch otherwise |
| Undertow Slide | Dash `T + G` | 6/7/24 | Ground Opportunity only on eligible trip |

## B.3 Core Specials and signature Ultimates

| Hero | Action | S/A/R | Candidate defensive property | Candidate cancel rule |
|---|---|---:|---|---|
| Mountain | Stonewake Palm | 12/4/22 | None | Standard Special destination |
| Mountain | Gatebreaker Advance | 16/8/28 | Armor frames 6–15; loses to grabs/piercing | From selected pressure confirms |
| Mountain | Rising Rampart | 7/8/30 | Strike-invulnerable frames 1–6 | Reversal or anti-air; punishable recovery |
| Mountain | Rivergate Oath | 10/24/42 | Cinematic protection after valid first contact | Full meter; closes context |
| River | Current Crescent | 10/3/20 | None | Standard projectile destination |
| River | Gale Wheel | 8/3+2+3+2+4/23 | None | From selected advancing confirms |
| River | Ebbstep Return | 6/4 return/26 | Hurtbox retreat frames 3–10; no invulnerability | Return strike requires authored branch |
| River | Tempest Crossing | 8/26/40 | Cinematic protection after valid first contact | Full meter; closes context |

## B.4 Later-hero core Specials and signature Ultimates

| Hero | Action | S/A/R | Candidate defensive or spatial property | Candidate cancel rule |
|---|---|---:|---|---|
| Forest | Trailcord Cast | 13/4/22 | Tethers light targets for 30 frames; heavy targets resist pull | Standard Special destination; one tether maximum |
| Forest | Hartstep Pursuit | 9/4+5/23 | Depth branch accepted on frames 13–18 | Second step only on hit/guard or explicit commitment |
| Forest | Canopy Reversal | 6/5/27 | Hurtbox retreat frames 2–5; upper interception frames 6–10 | Counter-confirm only; punishable miss |
| Forest | Greenway Muster | 9/24/41 | Cinematic protection after valid first contact | Full meter; terminal safe-center placement |
| Herbal | Bitterleaf Palm | 11/5/21 | Short cone; 18-frame formation-disruption tag on eligible enemies | Standard Special destination |
| Herbal | Pulseway Step | 8/3+3+4/20 | Carries one target laterally without crossing locked boundaries | Final palm only on hit/guard |
| Herbal | Calm Pulse Return | 5/5 counter/26 | Counter window frames 3–7; valid intercept restores 8 Defense | Counter-confirm only; loses to grabs/unblockables |
| Herbal | Breathkeeper's Circle | 10/22/40 | Protection after contact; valid danger interrupt restores 12 team Defense | Full meter; terminal; no Health restoration |
| Forge | Cinderline Fist | 14/4/25 | Slow ground wave; high guard damage, low hit damage | Standard Special destination |
| Forge | Bellows Drive | 16–34 charge/7/30 | Armor frames 7 through first contact; distance scales with charge | Release commits; loses to grabs/piercing |
| Forge | Anvil Rise | 8/7/32 | Strike-invulnerable frames 1–6 | Reversal or anti-air; punishable recovery |
| Forge | Hearthquake Oath | 13/5+6+8/45 | Cinematic protection after first valid ground impact | Full meter; terminal local-area finisher |
| Bell | Resonance Pulse | 12/3/23 | Slow durable projectile; one pulse maximum | Standard Special destination |
| Bell | Procession Step | 10/4 + 18 delay + 4/26 | Delayed echo remains at first contact point | Exit before echo or commit to echo-confirm branch |
| Bell | Echo Guard | 7/5 counter/25 | Counter window frames 4–8; return hit appears on far side | Counter-confirm only; loses to grabs/unblockables |
| Bell | Great Bell Accord | 11/6+8+10/42 | Expanding rings cannot repeatedly hit the same target | Full meter; terminal crowd-redirection finisher |

## B.5 Purchased-technique timing and branch rules

The S/A/R values in Appendix A are exact Candidate 0.2 registry values. The following rules remove ambiguity from the compact tables:

| Family | Exact candidate rule |
|---|---|
| Optional second commitment | Input opens 2 frames before first contact and closes 8 frames after hit/guard; whiff branches are disabled unless the move explicitly says otherwise |
| Three-part cadence/route | Each next branch has a 7-frame buffer and a 10-frame confirm window; a missing input exits into the listed recovery |
| Counter/absorb | Listed active frames are the eligibility window; invalid contact never auto-corrects into a hit; failed counters use their complete recovery |
| Trap/zone | Duration begins on the first armed frame after startup; only one per owning hero; replacement safely expires the older entity without a hit |
| Delayed echo | Echo timing is deterministic from original contact or placement; the echo cannot reset proration, juggle, ground, or stun budgets |
| Purchased Ultimate | Consumes the full Attack bar on accepted input; meter is not spent if the action is rejected by an illegal state; accepted actions close the current cancel context |
| Defense restoration | Cannot exceed the normal maximum, cannot restore Health, and cannot trigger from scenery, friendly actions, or an already-interrupted attack |

All purchased-move records must also define hitbox and hurtbox frames, movement samples, damage, guard damage, meter gain, proration, stun and juggle costs, knockback, depth-axis displacement, legal targets, co-op handoff tags, and replay schema version before implementation. A move is not “exact” merely because S/A/R is present.

## B.6 Universal candidate timing constants

| Constant | Candidate value |
|---|---:|
| Fixed simulation rate | 60 Hz |
| General offensive buffer | 6–9 frames by category |
| Special-cancel example window | 7 frames before through 10 frames after contact |
| Exact Block | 5 frames ending at contact |
| Counter | 3 frames ending at contact |
| Failed Counter recovery | 24 frames |
| Guard pivot | 5 frames |
| Guard Crush | 27 frames |
| Grab route decision | 45 frames |
| Grab Escape | 11 frames |
| Re-grab immunity | 30 frames |
| Weapon reclaim priority | 45 frames after legal landing |
| Team-finisher confirmation | 30 frames |
| Combo Breaker cost | 75% Defense |
| Premium cancel cost | 25% Attack meter |

## B.7 Frame-data coverage and extension rule

Candidate 0.2 covers both founders' complete unarmed Representative Vertical Slice actions, all six candidate heroes' core Specials and signature Ultimates, and the complete candidate purchased-technique timing catalogue. Weapon-core, weapon-affinity, ordinary-enemy, challenge-enemy, and boss action tables are intentionally not fabricated before their move lists are authored. They must use the same versioned schema—startup, active, recovery, collision, movement, defense properties, contact conditions, cancel windows, resource effects, reactions, and anti-infinite costs—and must be added to this controlled appendix before the corresponding content can be promoted from production authoring to release-ready status.

# Appendix C — Final artwork and asset bible register

**Status: No final artwork is currently approved.** This is an explicit production state, not an omitted requirement. Final assets enter the release manifest only after visual review, gameplay-scale validation, rights/provenance review, and approval. The elder portrait additionally requires the creator's supplied reference photo.

## C.1 Recommended visual target

The production candidate is **illustrated 2D martial folklore**: strong arcade-readable silhouettes and key poses in the foreground, painterly rural depth layers behind them, handcrafted materials, restrained line texture, and clear effect geometry. It supports the warmth of village life and the force of fighting-game impacts without turning the villagers into military superheroes. Gameplay silhouettes and danger cues take priority over surface detail; generated story artwork contains no embedded text because English, Simplified Chinese, and German subtitles are rendered by the game.

This is a direction for concept review, not final art approval. Final style approval requires one common lineup sheet, one gameplay-scale mockup, one story still with three subtitle-safe crops, and one crowded encounter stress image before full production begins.

| Asset group | Required deliverables | Current state | Final-approval gate |
|---|---|---|---|
| Elder | Model sheet, neutral portrait, briefing poses, subtitle-safe crops | Pending creator photo and generation | Identity likeness, consent, text-free image, EN/ZH-CN/DE subtitle safety |
| Mountain Guardian | Turnaround, palette, 15 normal strips, defense, grab, Specials, Ultimate, weapon affinity | Pending visual-identity approval | Stable silhouette/proportions, exact strip counts, readable anchors/hurtboxes |
| River Scout | Turnaround, palette, 15 normal strips, defense, grab, Specials, Ultimate, weapon affinity | Pending visual-identity approval | Stable silhouette/proportions, mobility readability, exact strip counts |
| Forest Warden | Turnaround, trail-tool sheet, base/purchased move key poses, trap and tether effects | Future-hero seed | Asymmetric route-keeper silhouette; cord readable without resembling a conventional fantasy ranger |
| Herbal Guardian | Turnaround, satchel/hand-wrap sheet, precision-palm poses, support cue variants | Future-hero seed | Open-hand precision and practical healer identity; support effects distinct from Health restoration |
| Forge Keeper | Turnaround, workwear sheet, charge/armor poses, heat and steam effect states | Future-hero seed | Upright toolsmith silhouette distinct from Mountain Guardian; clear charge levels and armor windows |
| Bell Sentinel | Turnaround, watch-keeper regalia, cadence poses, pulse/echo timing sheets | Future-hero seed | Circular audio-visual language remains readable without relying on sound or color alone |
| Stage 1 environments | Dry fields, bridge, mill, canal, gate courtyard, boss arena, restored-river ending; representative impact surface, multi-state breakable, active hazard, and interactive fragment | Pending production | Depth-lane clarity, hazard and integrity states readable, functional layers separable from cosmetic debris, subtitle/HUD safe, performance budget |
| Enemies | Five core archetypes, Enforcer, Commander phases, surrender/flee states | Pending production | Role silhouette, non-color telegraphs, difficulty-variant readability |
| Weapons and items | Workstaff, Handwheel, food, containers, condition/break states, one Stage 1 improvised-debris profile | Pending production | Pickup readability, separate detachable layers, lifecycle-state clarity, interactive debris distinct from cosmetic debris |
| Story media | Intro clips, briefing stills, ending stills/video, still fallback | Pending production | No embedded words, continuity, skip/caption/fallback support, rights record |
| UI/VFX | HUD icons, defense profiles, warnings, impact tiers, accessibility variants | Pending production | Non-color-only meaning, reduced-motion variant, critical-cue protection |

The visual-style selection itself remains a production decision. A candidate image may not be labeled final merely because it was generated successfully.

## C.2 Controlled final-art package

Every final asset record contains: immutable asset ID, subject and action ID, source prompt or human brief, generator/tool and model/version where applicable, source references and permissions, creator approval date, crop/atlas derivatives, localization-safe-area result, gameplay-scale readability result, performance tier, reduced-motion or still fallback, checksum, and replacement history. The approval path is `brief → concept → selected concept → production master → gameplay validation → final`.

For each playable hero, the minimum final package is:

1. front/side/back turnaround and proportional grid;
2. expression and dialogue-pose sheet;
3. gameplay palette plus non-color accessibility distinctions;
4. idle, locomotion, jump, fall, land, hurt, knockdown, recovery, block, Exact Block, Counter, breaker, grab, throw, pickup, weapon, and defeat/safe-withdrawal actions;
5. every normal, core Special, equipped purchased Special, fixed Ultimate, and equipped directional Ultimate with anticipation/contact/recovery keys;
6. shadow, hit-spark anchor, weapon-grip, effect-origin, hitbox/hurtbox guide, and depth-footprint layers separated from painted pixels;
7. portrait, selection, briefing, results, Academy, and store renders derived from the approved model rather than independently redesigned.

AI-generated work remains editable source material. Human review must correct anatomy, continuity, costume topology, hand/weapon grip, village symbolism, prohibited embedded text, and action readability before final approval. The elder likeness is generated only after the creator supplies the intended personal photo and confirms its use.

# Appendix D — Candidate Stage 1 encounter and balance tables

**Status: Combat Lab Candidate 0.2.** Medium is the reference profile. Counts describe simultaneous encounter composition targets, not forced spawn totals; pacing may use sequential sub-waves while preserving the same threat limits.

## D.1 Candidate action threat costs

| Action family | Threat cost |
|---|---:|
| Light poke / simple approach strike | 12 |
| Standard short combo | 20 |
| Shield lane denial | 18 |
| Ranged sling shot | 18 |
| Launcher or aerial pursuit | 26 |
| Grab or forced reposition | 30 |
| Heavy guard-pressure action | 32 |
| Coordinated two-enemy group attack | 52 total reserved |
| Off-screen-capable warned attack | 28 plus warning reservation |
| Boss major technique | 40–60 by response demand |

## D.2 Candidate difficulty profiles

| Profile | Global threat budget | Per-hero pressure cap | AI perception floor | Resource direction | Roster direction |
|---|---:|---:|---:|---|---|
| Easy | 48 solo / 76 co-op | 46 | 24 frames | Extra food; forgiving placements | Reduced core combinations |
| Medium | 68 solo / 108 co-op | 62 | 18 frames | Reference placements | Full story-critical core roster |
| Hard | 82 solo / 128 co-op | 70 | 14 frames | Slightly reduced recovery | Elite variants; Enforcer appears |
| Extreme | 96 solo / 148 co-op | 78 | 11 frames | Sparse but fair recovery | Advanced formations and group attacks |
| Ultimate | 108 solo / 166 co-op | 84 | 9 frames | Tight validated recovery | Full/master variants and rare teams |

Exact Block and Counter windows remain unchanged across profiles.

## D.3 Medium reference encounter composition

| Beat | Solo candidate | Co-op candidate | Mechanic and resources |
|---|---|---|---|
| 1. Dry fields | 3 Recruits, then 2 Recruits + 1 Shield | 4 Recruits, then 3 Recruits + 1 Shield | Basic route, Guard; one food container |
| 2. Occupied bridge | 2 Recruits + 1 Shield; then 1 Runner joins | 3 Recruits + 1 Shield + 1 Runner | Lane control, throw, first handoff; one recovery pickup |
| 3. Worker rescue | 2 Recruits + 1 Overseer | 3 Recruits + 1 Overseer | Grab escape/rescue; cache after civilians are safe |
| 4. Working mill | 1 Shield + 1 Runner + 1 Overseer | 1 Shield + 2 Runners + 1 Overseer | Ground route, machinery hazard, representative impact surface and breakable fragment, Canal Workstaff; food barrel |
| 5. Investigation | No forced combat | No forced combat | Story clue, loadout-safe checkpoint, recovery breath |
| 6. Canal route | 1 Shield + 1 Runner + 1 Lookout, then Overseer | 1 Shield + 2 Runners + 1 Lookout + Overseer | Ranged warning, mixed roles, Handwheel placement |
| 7. Gate courtyard | 2 Recruits + Shield + Runner + Lookout | 2 Recruits + Shield + 2 Runners + Lookout | Elite recombination; Hard+ substitutes one Enforcer |
| 8. Commander | Commander; one phase-authored support pair maximum | Commander; support budget divided across both heroes | Resolve, weapons, queued phases; checkpoint before fight |

## D.4 Encounter invariants

- Threat budget and per-hero pressure caps must both pass before commitment.
- No overlapping True Unblockables without an escape route.
- Off-screen attacks require simulation-defined visibility checks and minimum warning.
- Co-op scaling changes composition and pressure, not simply enemy health.
- Surrendered, fleeing, and coerced characters are not attack targets.
- Hard+ additions change mechanics, equipment, or formation behavior, not palette alone.
- Food and weapon locations are authored and reproducible per difficulty.
- Environmental eligibility, force, break state, passive-impact allowance, hazard response, fragment state, and checkpoint restoration are deterministic and reproducible per difficulty.
- The boss cannot begin a new phase until both heroes reach safe actionable states.

## D.5 Candidate concurrency and warning limits

These limits supplement—not replace—the threat budget. A low-cost action still cannot begin when its concurrency class is full.

| Profile | Committed attackers solo/co-op | Hostile projectiles visible solo/co-op | Simultaneous hard crowd-control sources | Group-attack cooldown | Minimum off-screen warning |
|---|---:|---:|---:|---:|---:|
| Easy | 2 / 3 | 1 / 2 | 1 | 360 frames | 72 frames |
| Medium | 3 / 4 | 2 / 3 | 1 | 300 frames | 60 frames |
| Hard | 3 / 5 | 2 / 3 | 1 | 260 frames | 54 frames |
| Extreme | 4 / 6 | 3 / 4 | 1 | 220 frames | 48 frames |
| Ultimate | 4 / 6 | 3 / 4 | 1 | 180 frames | 45 frames |

An authored group attack counts as one hard crowd-control source but reserves its full combined threat cost. A projectile that has become harmless scenery no longer consumes the projectile limit. Warnings are simulation events and cannot be shortened by performance mode, animation blending, camera position, or network latency compensation.

## D.6 Store-move and hero-pair balance rules

- The stock kit of every hero must clear every mandatory solo encounter on Medium without a purchased move, combat-style outfit, or directional Ultimate.
- A purchased technique may improve one or two dimensions—damage, guard pressure, control, safety, mobility, meter value, rescue utility—but must give up at least one relevant dimension against the move it replaces.
- In a standardized ten-second punish test, a sidegrade may exceed its stock counterpart's raw damage by at most 8% unless its safety, range, crowd control, or meter efficiency is materially worse. This is a diagnostic boundary, not the sole balance metric.
- Traps, delayed echoes, marks, steam zones, and similar owned entities share a per-hero limit of one unless a move explicitly consumes the previous entity. They never reset scaling or control budgets.
- Defense restoration is capped per encounter segment and cannot be chained between two Herbal Guardians because duplicate heroes are prohibited. It never restores Health.
- All six candidate heroes produce 6 solo validation cases and 15 unique two-hero pairings. Every pair must have at least one practical launch handoff, one rescue interaction, and one way to separate overlapping threats, but no pair receives an exclusive mandatory solution.
- Co-op damage tests use shared enemy scaling and handoff scaling. A pair is not balanced by simply halving each hero's solo contribution.

## D.7 Encounter telemetry and acceptance bands

Each encounter records difficulty, hero/loadout, player count, clear time, damage taken, Defense spent/restored, Attack meter earned/spent, Combo Breakers, Exact Blocks, Counters, ground extensions, juggle and stun budget exhaustion, off-screen hits, warnings missed, food surplus, weapon use, eligible environmental impacts, passive-impact quota use, break states, fragment use, hazard contacts, co-op redirects, preservation results, rescue events, downs, disconnect recovery, and boss phase carryover.

Candidate Medium acceptance bands for the Stage 1 vertical slice are:

| Measure | Regular encounter target | Commander target |
|---|---:|---:|
| First-clear duration, solo | 35–90 seconds | 180–300 seconds |
| First-clear duration, co-op | 40–105 seconds | 210–330 seconds |
| Unwarned off-screen damaging hits | 0 | 0 |
| Mandatory purchased moves | 0 | 0 |
| Continuous non-actionable control on a hero | no sequence above 90 frames without breaker/escape opportunity | no sequence above 105 frames without breaker/escape opportunity |
| Food remaining at checkpoint on a clean Medium clear | 0–2 authored pickups | 0–1 entering reward state |

Targets guide investigation; they do not automatically nerf creative high-skill clears or invalidate accessibility settings. Outliers are reviewed with replay traces and cause tags.

## D.8 Promotion criteria for candidate numbers

Candidate frame and encounter data becomes **Validated** only after deterministic replay tests, solo and co-op playtests, keyboard and gamepad execution checks, anti-infinite searches, accessibility review, Easy/Medium completion by intended audiences, Hard/Extreme stress tests, and boss/resource telemetry review. Promotion records the data version and does not rewrite historical scores or replays.

# Appendix E — Cheat-Assisted catalogue and verification

**Status: Confirmed feature design; numerical effects are fixed unless later playtesting identifies a progression or softlock defect.** These modifiers are intentionally stronger than Assisted accessibility settings and therefore use the separate Cheat-Assisted reward category.

## E.1 Individual codes

| Canonical code | Scope | Exact effect | Preserved rules |
|---|---|---|---|
| `SOFTERBLOWS` | Hero | Incoming Health damage is multiplied by `0.5` | Hit reactions, knockdowns, grabs, launches, hazards, and control budgets remain |
| `SAFEHEART` | Hero | Health cannot decrease; supersedes `SOFTERBLOWS` | Hit reactions, knockdowns, grabs, pushes, launches, objectives, and story triggers remain |
| `STEADYFEET` | Hero | Eligible knockdowns resolve as a bounded standing stumble with safe original displacement | Health damage, ordinary hitstun, grabs, launches, and control budgets remain; mandatory scripted safe placement still resolves |
| `IRONGUARD` | Hero | Blocks and Combo Breakers consume no Defense | True Unblockables, failed-Counter recovery, Guard facing, action legality, and breaker reuse restrictions remain |
| `BRIGHTSPIRIT` | Hero | Attack Bar remains full | A new Ultimate cannot begin during an active Ultimate, illegal state, or protected boss transition |
| `STRONGHANDS` | Hero | Outgoing Health and Resolve damage is multiplied by `2.0` | Scaling, boss thresholds, carryover caps, phase queues, surrender, and protected states remain |
| `TRUSTYTOOLS` | Hero | Weapons used by the hero lose no integrity and cannot break from integrity depletion | Throws, drops, disarms, transfers, stage hazards, landing validation, and deterministic recovery remain |
| `QUIETCROWD` | Session | Uses Easy-profile commitment/concurrency and per-hero pressure limits | Selected difficulty's roster, variants, moves, formations, boss phases, objectives, and story remain |
| `FULLPANTRY` | Session | Each eligible authored food container adds one deterministic recovery item within placement/reachability limits | Required weapons, objective items, container identity, and deterministic spawn order remain |
| `HOMECOMING` | Session | Team defeat restores the latest valid checkpoint without exhausting continues; if no checkpoint exists, restart the stage | Canonical checkpoint snapshot, current Cheat-Assisted state, and story/encounter invariants remain |

Conflicting or superseded cards remain visible and explain their effective state before confirmation. No modifier removes mandatory enemies, bosses, objectives, cinematics, endings, or difficulty-specific content.

## E.2 Preset bundles

| Canonical preset | Included codes | Intended use |
|---|---|---|
| `FIRSTSTEPS` | `SOFTERBLOWS`, `IRONGUARD`, `HOMECOMING` | Forgiving first play while preserving damage, reactions, and defeat pressure within each checkpoint |
| `CALMBATTLE` | `SOFTERBLOWS`, `QUIETCROWD`, `FULLPANTRY`, `HOMECOMING` | Experience selected-difficulty enemies and mechanics with lower simultaneous pressure and more recovery |
| `PEACEFULPATH` | `SAFEHEART`, `IRONGUARD`, `HOMECOMING` | Recommended guaranteed story-completion route while preserving enemy reaction feedback |
| `UNSTOPPABLE` | `SAFEHEART`, `STEADYFEET`, `IRONGUARD`, `BRIGHTSPIRIT`, `STRONGHANDS`, `TRUSTYTOOLS`, `HOMECOMING` | Full power-fantasy and experimentation |

Selecting a preset expands it into visible ordinary codes. Adding or removing a component produces a **Custom Cheat Configuration**; there is no hidden preset-only effect.

## E.3 Activation, disclosure, and persistence

- All ten codes and four presets are available in Elder's Secrets from first launch.
- Selecting a card provides Add, Remove, Preview in Academy, and Apply actions as appropriate; selection never silently activates a modifier.
- After the first defeat, the results screen may neutrally link to Retry, Academy, Accessibility, and Elder's Secrets, but it never automatically activates or prescribes a cheat.
- Hero-scoped preferences may persist per profile. Session-scoped configuration is reviewed per run. Temporary Guests retain no code-card or preference state after the session.
- Co-op loses reward eligibility as a team. Hero-scoped effects may differ by participant, but both participants acknowledge the full configuration and any change that first marks the run.
- Cheat-Assisted completion may unlock the next stage and global difficulty tier and preserves narrative/discovery state, but awards no score, rank, Credits, Hero Mastery, challenge achievements, or competitive result.
- Narrative Story achievements are allowed only when their definition tests story occurrence rather than performance. Reward components that would normally grant Credits or mastery are suppressed and itemized as unavailable under Cheat-Assisted play.

## E.4 Verification matrix

Verification covers every individual code, all four presets, pairwise coverage across the ten codes, the `SAFEHEART`/`SOFTERBLOWS` conflict, and explicit high-risk combinations involving no-Health/no-knockdown, unlimited breaker use, repeated Ultimates, doubled boss damage, weapon disarm/hazard recovery, difficulty-specific `QUIETCROWD`, mixed weapon/food containers, and every checkpoint position.

The matrix spans solo, same-device co-op, and local-Wi-Fi co-op; keyboard-only and gamepad-only navigation; English, Simplified Chinese, and German; pre-stage, pause, checkpoint, and co-op-consent activation; save/export/import/migration; replay metadata and deterministic hashes; Academy Free/Cheat Practice and authored restrictions; reward suppression and narrative/access preservation; bosses, surrender, objectives, stage endings, and difficulty unlocks.

Acceptance requires zero progression corruption, zero peer desynchronization, zero accidental activation, correct reward categorization, correct next-tier unlocking, and no configuration that prevents mandatory content from completing. Exhaustive testing of all `2^10` combinations is not required when pairwise coverage and explicit risk cases cover the interaction space.

## 20. Specification review gate

This document is ready for user review. Approval authorizes implementation planning, not immediate implementation. Changes requested during review are incorporated here and the consistency audit is repeated before a plan is written.

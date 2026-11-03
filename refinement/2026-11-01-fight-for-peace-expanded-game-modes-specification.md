# Fight for Peace — Expanded Game Modes Specification

**Date:** 2026-11-01  
**Status:** Approved Phase 4 specification; ready for future implementation planning  
**Scope:** Mission Mode, Chapter Challenge, Academy, Guide integration, Campaign Chronicle, Automatic Highlights, shared records, cheats, persistence, networking, localization, accessibility, and validation  
**Authoritative inputs:** `Features_Decisions.md`, `story_line.md`, the shared game specification, and approved Stage 2 and Stage 3 records

## 1. Purpose

This specification consolidates Phase 4 of *Fight for Peace*: the game modes that extend the authored campaign without changing its combat engine or confusing canonical history with practice, remix, generated, or optional content.

The design serves four player needs:

1. experience and replay authenticated character history;
2. play handcrafted canon-compatible protective-duty side stories;
3. generate deterministic repeatable operations for short sessions;
4. master completed campaign chapters, heroes, and combat systems.

The expanded modes must remain understandable to beginners, meaningful to experienced players, viable in solo and co-op, usable with keyboard and gamepad, and honest about canon, rewards, assistance, and competitive eligibility.

## 2. Goals and non-goals

### 2.1 Goals

- Preserve one permanent Combat Constitution across Story, Mission, Chapter Challenge, and Academy activities.
- Separate canonical history, canon-compatible side stories, non-canonical remix, generated play, practice, and competitive records visibly and structurally.
- Support single-player, same-device co-op, and local-Wi-Fi co-op wherever a content package declares that configuration.
- Give every mode a clear unlock rule, preparation flow, objective contract, result model, persistence model, and validation gate.
- Allow Curated Missions and generated-operation content to expand without compulsory DLC ownership chains or mandatory power.
- Keep all essential facts, controls, rules, and results accessible in English, Simplified Chinese, and German.
- Preserve progression and content access for Cheat-Assisted players while separating competitive and economy rewards.

### 2.2 Non-goals

- No redesign, fork, or replacement of the shared combat engine.
- No online matchmaking, account requirement, or global online leaderboard in this phase.
- No procedural assembly of arbitrary full stages.
- No mandatory Story facts, sponsor evidence, endings, or required power inside paid or optional Curated Missions.
- No expiring missions, daily energy, rotating scarcity, loot boxes, or system-clock reward pressure.
- No automatic cloud upload of saves, replays, highlights, analytics, screenshots, or personal data.
- No requirement to complete Academy content before progressing through Story Mode.

## 3. Permanent constraints

### 3.1 Combat Constitution

Every mode executes the same deterministic combat rules, move data, defense systems, anti-infinite budgets, weapon and mount contracts, enemy capability profiles, and difficulty principles. New heroes, enemies, weapons, mounts, environments, bosses, and objective logic are data-defined content. Behavior-preserving maintenance may improve performance, security, accessibility, tooling, or compatibility; it may not change validated combat behavior silently.

### 3.2 Unique heroes

Each hero represents a unique person. Two players cannot select the same hero in any mode, including generated, practice, and remix content. Each persistent participant owns that hero's outfit, combat style, loadout, and eligible progression state.

### 3.3 Difficulty

Easy, Medium, Hard, Extreme, and Ultimate retain the campaign's Authored Multidimensional Difficulty Profiles. Difficulty may change enemy eligibility, coordination, decision speed, pressure, resources, bounded statistics, and authored formations. It may not change player controls, hero move properties, Exact Block, Counter, cancel or Combo Breaker timing, essential warnings, or Combat Constitution legality.

### 3.4 Canon labels

Every selectable activity declares one of these labels before launch:

| Label | Meaning |
|---|---|
| **Canonical** | The depicted participants and outcome are part of the campaign history. |
| **Canon-compatible Side Story** | The event can occur within the timeline but contains no mandatory campaign fact. |
| **Non-canonical Remix** | Authored combat is replayed with participants or conditions that do not rewrite history. |
| **Generated Operation** | Deterministic system-generated civil-protection work with no canonical narrative claim. |

Practice, Cheat-Assisted, Assisted, Continued, Standard Loadout, and Open Loadout are result or ruleset labels, not canon labels.

## 4. Top-level navigation

The primary game destinations remain **Continue**, **Play**, **Academy**, **Village Store**, **Collection and Records**, **Guide**, and **Settings**.

Within **Play**, the top-level playable structures are:

- **Story Mode** — authored campaign and mandatory story-integrated historical Chronicles;
- **Mission Mode** — Character Chronicles, Mission Remix, Curated Missions, and Random Operations;
- **Chapter Challenge** — post-campaign authored-stage mastery and competitive local records.

Academy is a separate learning destination. Campaign Chronicle and the Village Scoreboard live under Collection and Records rather than becoming additional game modes.

## 5. Mission Mode

### 5.1 Archive-led Mission Hub

Mission Mode opens through one Archive-led Mission Hub. Its four destinations use distinct visual frames while sharing one accessible navigation system:

- Character Chronicles use Village Museum and Archive records.
- Mission Remix uses clearly non-canonical reconstructed scenarios.
- Curated Missions use authored civil-protection case files.
- Random Operations use a civil-protection operations board.

Locked entries show localized, spoiler-safe clues rather than concealed blank tiles. The Hub supports pointer, keyboard, gamepad, touch-capable navigation, visible focus, screen readers, text scaling, high contrast, and non-color state cues.

Every mission card exposes, when known and spoiler-safe:

- localized title and canon label;
- era or timeline placement;
- objective family;
- supported solo/co-op configurations;
- eligible or fixed participants;
- available difficulties;
- completion, best rank, discoveries, achievements, and Museum links;
- installed, unavailable, incompatible, Legacy, or missing-content state.

### 5.2 Character Chronicles

Character Chronicles use **Paired Chronicle Records** arranged by campaign chronology.

When a Chronicle contains mandatory campaign truth, Story Mode launches it at the appropriate investigation point with historically correct participants. After first completion it remains available in Mission Mode as **Canonical Replay**.

First completion:

1. validates the canonical result;
2. displays **Record Authenticated**;
3. stores its Archive and Museum state;
4. unlocks the corresponding Mission Remix immediately.

The unlock requires no purchase, score threshold, rank, or higher-difficulty clear. Canonical Replay and Remix share one versioned authored mission package so objectives, fixes, environments, and deterministic state cannot drift into contradictory copies.

### 5.3 Mission Remix

Mission Remix permits eligible unlocked heroes to replay authenticated Chronicle combat without rewriting campaign history. It always displays **Non-canonical Remix** before selection and in results.

The mode may provide free hero selection subject to unique-hero, content-ownership, spoiler, and eligibility rules. Remix results use separate records and cannot replace canonical participant records. Any mission-only hero permitted by the relevant unlock remains excluded from canonical Story and Chapter Challenge unless a separate Story decision admits that hero.

### 5.4 Curated Missions

#### 5.4.1 Content boundary

Curated Missions are handcrafted **Canon-compatible Side Stories**. “Curated Missions” is the player-facing name; DLC describes packaging and distribution but does not imply that a package is paid.

A Curated Mission may deepen characters and communities and add dialogue, achievements, environments, weapons, mounts, enemies, bosses, optional heroes, music, cosmetics, and Museum content. It may not contain a fact required to understand the main campaign, mandatory sponsor evidence, a required ending, required combat power, or required progression.

Players who do not install or acquire a case cannot lose access to an essential hero, starting or required technique, difficulty, campaign fact, ending, or required system.

#### 5.4.2 Permanent Expandable Case Catalogue

The initial four cases are the beginning of a permanent catalogue, not a closed set. Every case declares:

- stable case ID and package version;
- localized title and canon label;
- campaign-timeline position and independent Story gate;
- objective family and grading profile;
- supported player configurations and hero rules;
- content and asset dependencies;
- reward namespace;
- localization and accessibility manifests;
- replay, record, migration, and optional Automatic Highlight profile.

New cases are inserted chronologically. Hub filters include timeline, location, objective family, installed state, completion, best rank, and eligible heroes. Installed or acquired cases never expire or rotate out.

No case may require ownership of another optional case. Related cases may show additional continuity dialogue when earlier records exist, but every case supplies a self-contained recap. Stable IDs and versioned migration preserve compatible records and replays; incompatible historical results remain visible as Legacy records.

Same-device co-op uses one local installation. Local-Wi-Fi uses **Compatible Package on Every Device**: both peers must hold and validate the same case package and gameplay assets before readiness. The host never streams or silently substitutes mission content. A future commercial guest-pass may authorize access, but the guest must still download and validate the package. Whether a paid case requires one or two purchases remains a separate commercial decision.

Uninstalling a case removes launch access but preserves completion, records, rewards, and hero-unlock state. Lin Lan's unlock remains permanent. If her reusable hero assets remain installed, she stays selectable in approved modes; otherwise the UI shows **Unlocked—Assets Not Installed** until reinstall. Reinstallation restores access without another clear. Missing, mismatched, or incompatible packages block local-Wi-Fi readiness with a precise localized explanation.

#### 5.4.3 Story-timeline availability

Curated Missions use content-access gates rather than mastery gates:

| Mission | Story gate |
|---|---|
| *Storm over Qinglan* | Stage 3 completed |
| *No Escape at Reedwater* | Stage 3 completed |
| *The Medicine Road* | Stage 5 completed |
| *The Vanishing Survey* | Stage 6 completed |

Before its gate, an installed case shows only a spoiler-safe clue. Access never requires score, rank, difficulty, Credits, another Curated Mission, or another optional package. Cheat-Assisted Story completion satisfies the gate. Installing a case after satisfying its gate makes it available immediately. The Hub recommends chronology but does not force it; Reedwater does not require Qinglan despite occurring afterward.

#### 5.4.4 Initial case catalogue

**Storm over Qinglan / 青岚风暴 / Sturm über Qinglan**  
Approximately 10–14 days after Stage 3 and before Stage 4. Mountain Guardian, River Scout, Wind Sentinel, and Fire Warden rescue three endangered groups through short routes after a severe storm while independent relief looters exploit damaged access. Content includes a storm-damaged pass, cable bridge, runoff, timber cover, deterministic debris hazards, Rescue Hook Pole, relief-looter variants, and a raider-lieutenant boss. The Museum record documents Qinglan's rescue network. The case introduces no hero and contains no Tomas or sponsor evidence.

**The Medicine Road / 送药之路 / Die Medizinroute**  
After Stage 5's present-day investigation and before Stage 6. The four established heroes protect a clinic cargo vehicle, clear roadblocks, defend two repair stops, recover marked supply cases, and enter bounded motorbike pursuit sections against an independent road gang. Content includes a forest road, service tunnel, stone viaduct, remote clinic, Tire Iron, Folding Road Baton, Road Blockers, Bike Harriers, Cargo Snatchers, ranged Lookouts, and a mounted-to-dismounted road-gang boss. Essential delivery remains canonically successful; performance controls the result grade and presentation.

**The Vanishing Survey / 消失的勘测档案 / Die verschwundenen Vermessungsdaten**  
After Stage 6 and before Stage 7. The four established heroes recover landslide sensors, hazard maps, and a sealed survey tablet from an independent salvage ring. Authentic and decoy cases use accessible visual evidence. Genuine items cannot be destroyed; an escaped carrier moves the item to a later authored interception. Content includes a tram yard, terraced market, abandoned cableway station, cable carts, shutters, racks, cranes, suspended cargo, Surveyor's Tripod, Salvage Pry Bar, Decoy Carriers, Salvage Brawlers, Hook Runners, equipment guards, and a reinforced-case fence-broker boss.

**No Escape at Reedwater / 芦水渡口：无处可逃 / Kein Entkommen in Schilfwasser**  
Approximately four weeks after Stage 3 and after Qinglan chronologically, but before Stage 4. A lawful operation in **Reedwater Ferry District / 芦水渡 / Fährbezirk Schilfwasser** dismantles an independent extortion commander's motorbike, winch-route, and signal-relay escape network before live capture. Content includes ferry market, warehouse, crane yard, loading platform, ferry deck, Mooring Hook, Short Restraint Baton, Toll Enforcers, Signal Runners, Cargo Controllers, Bike Interceptors, and a mounted-to-dismounted Tollmaster boss. The player never controls a boat.

Reedwater introduces **Lin Lan / 林澜**, title **Reed Warden / 芦水卫 / Wächterin von Schilfwasser**, age 27. Her full solo-capable kit uses circular footwork, redirection, short strikes, and Qinna-derived restraint within the Combat Constitution. She is the case guest and unlocks after completion for Academy, Curated Missions, completed Mission Remixes, and Random Operations. She is never required and is excluded from canonical Story and Chapter Challenge.

#### 5.4.5 Protective Duty objectives and grading

The initial objective families are Rescue and Evacuation, Mobile Escort, Recover and Secure, and Nonlethal Apprehension.

Every result uses an **Objective-First Protective Duty Grade**:

1. primary objective condition;
2. protection, restraint, and collateral control;
3. combat mastery;
4. resource and active-time efficiency.

Mission-specific priorities are:

- Qinglan — rescued-group condition and evacuation-route safety;
- Medicine Road — convoy condition, protected cargo, and stolen-case recovery;
- Vanishing Survey — genuine equipment recovered, carriers intercepted, and costly decoy errors avoided;
- Reedwater — live capture, disabled escape routes, civilians protected, and collateral restrained.

C/B/A/S thresholds are authored per case, difficulty, and solo/co-op profile. S denotes excellent rather than perfect play and cannot require a particular hero, move, route, purchase, or mutually exclusive choice. A failed attempt may be retried but does not authenticate the case Chronicle or grant clear rewards.

#### 5.4.6 Optional Prestige Rewards

Every first clear grants itemized Credits, the case's Museum record, and its Canon-Compatible Side Story Chronicle entry. Reedwater also grants Lin Lan's approved content-access unlock.

Optional objectives and higher ranks may award themed costumes, profile emblems, titles, artwork, music, or Museum collectibles. They never award exclusive required power, mandatory evidence, main-story progression, a required technique, or a paid statistical advantage.

Replays grant bounded Credits under the shared anti-farming rules. First-clear and rank-improvement bonuses are non-repeatable. Cheat-Assisted clears preserve completion, side-story viewing, Museum access, and Lin Lan's content-access unlock while granting no score, rank, Credits, Hero Mastery, prestige reward, or competitive achievement.

#### 5.4.7 Automatic Highlights

Curated Missions experiment with **Event-Tagged Replay Highlights**. A presentation-only observer consumes stable deterministic combat and objective events without modifying simulation state, AI, timing, damage, randomness, networking, or score.

When enabled, it retains no more than 24 compact candidates containing frame IDs and verified facts. It captures no continuous screenshots. Results save and appear immediately; deterministic replay then reconstructs candidate stills one at a time. Reconstruction is skippable, cancelable, allowed to reduce image resolution, and may fall back to localized text.

The system selects no more than three diversified highlights and at most one per family:

1. **Perfect Combo / 完美连段 / Perfekte Kombo**;
2. **Two Threats One Move / 一石二鸟 / Zwei Gegner ein Zug**;
3. Guardian Intervention;
4. Defensive Mastery;
5. Team Harmony;
6. Environmental Ingenuity.

Perfect Combo requires one uninterrupted target context, at least three distinct actions, at least two route families, no rejected cancel or repeated-action spam, no damage received, an intentional legal conclusion, and hero-normalized impact/efficiency. Two Threats One Move requires one authored action to create a meaningful outcome on at least two active hostile targets; repeated contacts on one target, props, allies, protected targets, and invulnerable contacts do not count.

Selection merges nearby candidates, assigns the strongest applicable family, and ranks tactical impact, difficulty, risk, efficiency, rarity, and objective protection. Hero normalization prevents high-hit-count or high-damage kits from dominating. Co-op cards identify Player 1, Player 2, or Team. Assisted or Cheat-Practice results carry their ruleset label. Highlights never grant score, rank, Credits, Mastery, or achievements.

Capture defaults On for new profiles. Settings → Presentation and each case-selection screen expose a persistent toggle. Same-device co-op shares the display setting; local-Wi-Fi devices choose independently. Capability preflight may recommend Off but cannot silently disable a supported feature. Sustained performance pressure stops optional candidate collection gracefully.

Guide owns the complete localized criteria. Case selection shows the toggle, concise purpose, six localized family icons/names, and **View Highlight Criteria**. Result cards expose **Why Was This Selected?**, and Museum pins retain the reason and Guide link. Academy has no required highlight lesson.

Highlight images are **Ephemeral by Default, Pin to Keep**. Leaving results discards unpinned image pixels while Run Archive retains compact facts and a compatible replay reference. Export or **Pin to Museum Highlights** preserves the image. Pins use a compressed 1280×720 internal representation; clean export uses PNG, and localized card export may place title and reason outside the clean image.

Each persistent profile initially holds 50 pinned highlight images. The UI warns before the limit, never silently deletes pins, deduplicates identical images by content hash, and supports filter, rename, export, unpin, and confirmed deletion. Backup offers image-inclusive and metadata-only forms. Removing an image never removes the run record. Persistent co-op players manage their own pins; same-device duplicates reuse storage, local-Wi-Fi copies remain local, and Guests may export but cannot pin persistently.

Curated replays use **Tiered Replay Retention with Pin Guarantee**. Every result permanently retains compact Run Archive metadata, score facts, and localized Highlight explanations. Full deterministic capsules are retained for the personal best in each comparable Curated category, the five most recent Curated runs per profile, every manually pinned replay, and every run containing a Museum-pinned Highlight. A Museum pin guarantees **View Replay Moment** while its replay remains version-compatible.

Older unpinned, non-best capsules may compact under storage pressure. Their facts and explanations remain with **Replay No Longer Retained**, but playback and still reconstruction become unavailable. Incompatible updates preserve pinned images, reasons, facts, and Legacy status while disabling inaccurate simulation. Unpinning permits normal compaction only when no other retention rule protects the capsule. Profile backup offers full-capsule and metadata-only forms.

Automatic Highlights release behind a **Curated-Only Validation Gate**. All four cases must prove identical combat hashes and outcomes with capture On or Off, no highlight-specific network traffic, bounded cost, immediate result persistence, reliable authored-replay detection, human quality review, complete localization, accessible operation, correct backup/export/storage behavior, and zero reward influence. Nothing uploads automatically. Failure may disable capture without deleting records or pins. Expansion to Story, Random Operations, Chapter Challenge, or another mode requires separate approval and validation.

### 5.5 Random Operations

#### 5.5.1 Objectives and content pool

Random Operations is a deterministic seeded module with two initial objectives:

- **Defeat** — five role-aware waves in a compatible arena;
- **Safeguard** — protect a generated person or important object until visible extraction or recovery completes.

It uses a **Spoiler-Safe Validated Content Pool**. Only cleared Story content enters. Arenas are bounded authored combat spaces with profiles declaring objective compatibility, spawn/extraction nodes, navigation and camera limits, hazards, breakables, supported player counts, enemy-size limits, and pressure caps. Heroes enter after their profile unlock; enemy families enter after their originating stage; difficulty specialists retain their floors.

The initial release excludes Story bosses, cinematics, mounts, and unique scripted hazards unless a later dedicated profile validates them. Context tags prevent implausible target/arena combinations. A saved operation retains its resolved content when the live pool expands.

#### 5.5.2 Selection and generation flow

The flow is:

`objective → solo/co-op and profiles → difficulty → unique heroes and loadouts → generate → briefing → start`

Difficulty is selected before generation because it changes eligibility and budgets. Changing difficulty creates a distinct manifest from the same root seed. Generation never adapts secretly to observed player performance.

#### 5.5.3 Defeat structure

Defeat uses a **Five-Act Escalation** targeting 10–15 minutes:

1. core-role orientation;
2. complementary role combination;
3. specialist or advanced-formation pivot;
4. mixed coordination crisis;
5. elite- or captain-led command formation without a Story boss.

Resources persist. Waves 2 and 4 grant one ownership-aware Life, Defense, or Momentum cache choice per active hero. Intermissions skip only with unanimous readiness. A wave ends after active enemies are defeated, surrender, or complete an authored withdrawal.

#### 5.5.4 Safeguard structure

Safeguard uses **Three-Phase Visible Extraction** targeting 8–12 minutes:

1. establish the perimeter;
2. protection pressure with visible extraction progress;
3. secure the transfer.

Only designated and clearly warned objective attacks can damage the target. Person targets use Secure, Strained, Critical, and Compromised; object targets use Stable, Damaged, Critical, and Lost. Compromised/Lost fails the operation; people are incapacitated or emergency-evacuated rather than killed. One midpoint stabilization may restore one band. Target condition outweighs clear speed.

#### 5.5.5 Co-op transformation

Random Operations uses **Shared Budget with Split Pressure**. The initial co-op target is approximately 35–45 percent more total threat than solo, not doubled enemies, Health, damage, objective pressure, or duration. Added pressure uses ordinary units, complementary roles, a second readable lane, and limited support.

Enemy attention distributes across heroes. Co-op adds at most one major concurrent action; Safeguard permits at most two staggered objective attackers. Target thresholds and extraction duration remain identical to solo. Disconnects use the established restricted proxy without mid-wave despawn or rescaling. Solo and co-op records are separate.

#### 5.5.6 Rewards and records

The **Objective-First Operations Ledger** ranks objective performance, combat, efficiency, and difficulty in that order. Rewards may include completion, difficulty, rank, first clear, achievements, bounded Hero Mastery, and replay Credits. Generated operations never award mandatory story progress, sponsor evidence, essential techniques, or required power.

Failure stores progress information but grants no score, rank, Credits, or competitive result. Cheat-Assisted operations remain playable but grant no competitive or economy rewards.

Every result records the root seed, resolved manifest, versions, optional name, objective, arena, difficulty, heroes, player count, ruleset, loadout category, score, rank, active time, damage, best combo, resources, objective facts, and recovery events.

#### 5.5.7 Saving and sharing

An operation may be saved from briefing or result after success or failure. Results expose **Save Operation**, optional naming, **Replay Now**, **Update Name**, and **Save as Copy** where relevant.

Sharing uses two forms:

- compact code containing seed, objective, difficulty, player-count profile, generator/content identifiers, and checksum;
- portable `.ffp-operation` containing the complete resolved manifest.

Exact replay preserves generated content while allowing another eligible hero configuration with separate records. Changing objective, difficulty, or player count creates **Regenerate Variant**. Missing content is listed; no silent substitution occurs. Incompatible operations remain archived/exportable, while **Create Updated Variant** creates a new copy.

#### 5.5.8 Anti-exploit and validation

Random Operations uses **Completion-Bound Integrity**: no daily limits, energy, expiring bonuses, or system-clock dependencies. Generation and sharing award nothing. First-clear bonuses are per objective/difficulty/player-count category, not seed. Rank improvement pays only the delta. Replay completion remains modest. Comparable competition requires the same seed, version, difficulty, player-count profile, and loadout category.

Release uses a **Seed-to-Result Validation Matrix** with at least 10,000 generated manifests per objective, difficulty, and solo/co-op profile. It covers routes, visibility, reachability, roles, budgets, targets, hazards, resources, determinism, browsers, localization, inputs, accessibility, saves, sharing, rollback, reconnect, migration, economy, tampering, and anti-exploit behavior. No Critical or High-severity defect may remain.

## 6. Chapter Challenge

### 6.1 Unlock and catalogue

Chapter Challenge is a separate top-level mode. It unlocks permanently when the player reaches the current installed campaign ending under Standard, Open, Assisted, or Cheat-Assisted Story rules. Expansion never relocks it. Each newly added main-campaign stage becomes eligible after that stage is completed in Story.

Only authored main-campaign stages enter. Character Chronicles, Mission Remix, Curated Missions, and Random Operations do not. Ordinary stages allow unlocked canonical Story heroes with unique selection. Soren Beck, Chen Yue, Lin Lan, and other Mission-only heroes remain excluded. Kael joins only after his canonical Story unlock. Historical Stage 5 remains restricted to young Sheng Guo and Liang Zhen; all-hero historical play belongs to Mission Remix.

### 6.2 Ranked runs and practice

Chapter Challenge uses **Full-Run Ranking with Safe Practice**. A Ranked Full Chapter begins from the authored start after difficulty, heroes, and loadouts are confirmed. Cinematics skip by default but may be viewed before timing. The complete route, objectives, branches, encounters, pickups, environments, and boss remain.

Checkpoints create deterministic recovery snapshots but are not freely selectable during a ranked attempt. Validated crash, reconnect, and host-migration recovery may preserve eligibility. One transactional single-use Suspended Chapter Run may be stored at an authored checkpoint.

After defeat:

- **Retry Chapter** starts a new ranked attempt from the beginning;
- **Continue from Checkpoint** completes the stage as an unranked Continued Run;
- severe unverified recovery or excessive proxy control also converts to Continued rather than erasing completion.

Checkpoint Practice allows any checkpoint reached in Story or Chapter Challenge, with free restarts and legal configurations. It awards no score, rank, Credits, achievements, Mastery, or competitive record and may deep-link to Academy, Move List, and Guide.

### 6.3 Stage-Normalized Mastery Score

Every stage prioritizes objective mastery, combat mastery, resource efficiency, and active simulation time using stage-, difficulty-, and solo/co-op-specific authored values. Objective protection outranks speed where appropriate.

C/B/A/S thresholds come from validated routes. S requires strong performance but not perfection, mutually exclusive branches, or one compulsory hero, purchase, move, weapon, or combo. Standard and Open Loadout categories remain separate; Assisted records remain separate; Cheat-Assisted and Continued Runs have no competitive result.

Results itemize completion, difficulty, rank, first-rank, achievement, and improvement rewards. Replay rewards remain bounded. S may grant prestige cosmetics, Museum presentation, profile titles, or badges, never required power.

### 6.4 Release validation

The **Chapter-to-Archive Acceptance Matrix** covers every stage, eligible hero, representative pair, difficulty, player count, loadout/ruleset, historical roster boundary, expansion gate, scoring component, rank band, reward, checkpoint/retry/suspension/recovery path, Scoreboard and Archive category, replay class, export/import, backup, migration, compaction, and Legacy state.

Deterministic results must reproduce across supported browsers, languages, devices, quality levels, display rates, save/resume, reconnect, rollback, and host migration. Tests reject injection, reward duplication, farming, rank-delta overpayment, invalid hero access, corrupt replays, and incompatible launch. No Critical or High-severity defect may remain.

## 7. Village Scoreboard, Run Archive, and replays

Collection and Records contains a **Two-Layer Village Scoreboard**:

1. best comparable eligible records by mode, content, difficulty, player count, hero configuration, ruleset/loadout, and version;
2. a Complete Run Archive for every score-bearing result plus separately labelled noncompetitive activity.

Practice, failed, Cheat-Assisted, and Continued attempts never masquerade as competitive scores. Legacy versions remain visible but are not silently compared with current versions. Storage pressure may compact old unpinned details while preserving best records; it never silently deletes a best or pinned record.

Chapter Challenge uses **Versioned Replay Capsules** containing abstract inputs, seed, content/rules versions, co-op authority history, and hashes rather than video. Profiles retain the personal-best replay per category, five recent eligible Chapter Challenge replays, and every pinned replay. `.ffp-replay` import/export is validated. Incompatible updates preserve score and rank as Legacy but disable inaccurate playback. Incompatible suspended runs are archived and restarted under the current version.

## 8. Academy

### 8.1 Curriculum

Academy uses a **Seven-Course Progressive Academy**:

1. Orientation and Controls;
2. Combat Foundations;
3. Defense and Survival;
4. Conversion and Combo Grammar;
5. Resources, Equipment, and Environments;
6. Hero and Co-op Specialization;
7. Mastery and Freestyle.

The existing Foundation, Conversion, Resource, and Freestyle cancel layers remain nested inside this structure.

Every authored lesson follows:

`Demonstration → Guided Practice → Independent Trial → Optional Mastery Goal`

Failure has no penalty and supports instant retry. Slow motion, input history, timing indicators, current bindings, captions, and accessibility assistance remain available.

### 8.2 Access and learning states

Basic lessons are available from first launch. Hero courses unlock with heroes; mounts, advanced weapons, environments, specialists, and spoiler-sensitive content unlock after introduction. Every revealed technique has a free trial.

An optional placement assessment may grant **Access Granted** to higher tiers without granting skipped rewards, technique ownership, or false completion.

Each persistent profile tracks:

- **Available**;
- **Practiced** after guided work;
- **Certified** after independent trial;
- **Mastered** after optional mastery goal.

Free Practice is always available. Guests retain no Academy progress. Story never requires Academy completion.

### 8.3 Move Library and My Combos

The Move Library exposes every currently revealed legal destination, contact condition, resource requirement, and target-state condition from authoritative move/cancel data. Academy teaches representative grammar rather than every mathematical combination.

My Combos records abstract-action recipes, not video. A recipe may store hero, weapon, move sequence, timing, meter, starting target state, hit count, damage, transitions, and canonical cheat configuration where relevant. Players can record, name, save, replay, practice, and delete legal routes across remapped controls.

Cheat Practice and Free Practice may use revealed cheats. Authored lessons, examinations, technique-acquisition challenges, and mastery trials retain their declared rules and do not accept arbitrary cheats.

## 9. Guide and Campaign Chronicle

### 9.1 Reference versus Practice Contract

Guide is the localized searchable reference. It owns text, diagrams, current-binding cards, examples, glossary, cheat documentation, Automatic Highlight criteria, and deep links. It grants no reading reward and requires no reading completion.

Academy owns interactive demonstration, guided practice, independent certification, optional mastery, Free Practice, and declared challenge rewards.

Both consume one authoritative source for controls, costs, cancel conditions, move properties, defense rules, and highlight criteria. Guide remains usable without video, audio, precision timing, pointer, or physical keyboard. Academy never becomes the only source of an essential explanation. Neither gates Story.

### 9.2 Campaign Chronicle

Museum and Archive contains **Campaign Chronicle / 战役纪事 / Kampagnenchronik** rather than adding another top-level destination.

Its sections are Campaign Timeline, Stage Chapters, Interludes, Character Paths, Historical Chapters, and Complete Story after campaign completion. It reveals only completed canonical content, supports search, bookmarks, text scaling, contrast, keyboard/gamepad use, and screen readers, and links to unlocked art, cinematics, music, transcripts, evidence, and character records.

Curated Missions appear in a separate **Canon-Compatible Side Stories** volume. Remix and Random Operations never become campaign canon. Personal choices appear under **Personal Paths** without changing the canonical campaign timeline. Story Mode remains the source of every essential fact when it occurs.

## 10. Cross-mode Cheat-Assisted play

Applicable cheats are available in Story Mode, Chapter Challenge, Character Chronicles, Mission Remix, Curated Missions, and Random Operations. Academy permits them only in Free Practice and Cheat Practice.

Any active modifier marks the whole run Cheat-Assisted. Hero-scoped effects may differ by participant; session-scoped changes require co-op consent. Codes are configured only at approved preparation, checkpoint, pause, or synchronized safe boundaries. Disabling a code later never restores eligibility.

The registry contains twelve individual codes and four visible customizable presets. The new session-scoped `SAFEPASSAGE` prevents mandatory protected people or objects from crossing their visible Critical condition into a completion-blocking failed, dead, Compromised, Lost, or permanently destroyed state. It preserves damage presentation, warnings, escort movement, route work, evidence identification, escape-network tasks, combat, bosses, and required inputs; it never completes an objective automatically. Optional preservation assets remain vulnerable unless their loss would block completion. Random Operations Safeguard stops at Critical instead of Compromised/Lost.

`SAFEPASSAGE` is included in `PEACEFULPATH` and `UNSTOPPABLE`. All codes and presets are openly documented in Guide → Elder's Secrets and selectable without keyboard text entry.

Cheat-Assisted play preserves content access, Story and checkpoint progress, stage/campaign completion, difficulty access, cinematics, transcripts, relevant discoveries, narrative Story achievements, and declared noncompetitive hero/content unlocks. It grants no score, rank, Credits, Hero Mastery, prestige reward, competitive record, mastery/challenge achievement, or Difficulty achievement.

## 11. Networking and deterministic authority

All modes reuse the established host-authoritative deterministic simulation with local prediction, bounded rollback, hashes, authoritative snapshots, short recovery grace, restricted survival proxy, host migration, synchronized courtesy hold, and fixed simulation with independent adaptive presentation.

Mode-specific manifests, objective state, scoring facts, eligibility, cheat registry, and content manifests are authoritative deterministic data. Particles, camera shake, highlight collection, screenshot reconstruction, menu animation, and similar presentation remain outside canonical state.

Local-Wi-Fi readiness validates game version, protocol version, deterministic-rules hash, content manifest, mode package versions, hero eligibility, and cheat-registry hash. A mismatch blocks readiness with a localized correction path. Optional Highlight capture never adds network traffic or changes peer hashes.

## 12. Persistence and migration

IndexedDB remains the canonical local store. Writes are versioned, transactional, checksummed, and retain a known-good snapshot. One tab may write a profile. Portable backup validates and previews compatible merge or selected-profile replacement and creates a recovery snapshot.

Expanded-mode persistence includes:

- Chronicle authentication and Remix unlocks;
- Curated case installation, timeline gates, grades, rewards, records, and Museum state;
- stable case IDs and package versions;
- Random Operation seeds, resolved manifests, names, histories, and imported files;
- Chapter Challenge eligibility, suspension, records, replay capsules, and Legacy entries;
- Academy learning states and My Combos;
- Campaign Chronicle reveal state and personal paths;
- Highlight preferences, metadata, pins, and optional image-inclusive backup;
- canonical cheat identifiers and Cheat-Assisted result metadata.

No update silently substitutes missing content, recalculates old ranks, reclassifies canon, deletes a best/pinned record, or rewrites a saved operation. Incompatible material remains visible and exportable where safe, with a reason and an explicit current-version copy or restart path.

## 13. Localization and accessibility

English, Simplified Chinese, and German use authored localization keys with English diagnostic fallback. User-authored names remain presentation data and are sanitized and length-bounded.

Every essential status uses text, icon, shape, motion and/or audio rather than color alone. Essential audio has captions. Menus support keyboard, gamepad, pointer, touch-capable UI, focus indicators, screen readers, text scaling, contrast, reduced motion, and reduced effects. Input examples render current abstract-action bindings.

Generated operations, Curated objectives, protected-target states, rank facts, canon labels, cheat consequences, Highlight reasons, missing-content reports, replay incompatibility, and unlock clues must remain understandable without audio, animation, mouse, or embedded text inside artwork.

## 14. Security and privacy

- No account is required for local progression or local-Wi-Fi pairing.
- Imported `.ffp-operation`, `.ffp-replay`, and profile files require schema, version, checksum, size, identifier, and content validation.
- Imported names never execute markup or code.
- Highlight images, analytics, replays, saves, and diagnostics are never uploaded automatically.
- Export is explicit and reports what the file contains.
- Pairing tokens remain short-lived and carry no gameplay saves or progression.
- Competitive eligibility depends on deterministic validation rather than hidden surveillance.

## 15. Release acceptance

The expanded-mode release gate combines mode-specific matrices with shared requirements.

### 15.1 Required coverage

- all supported browsers and declared performance tiers;
- single-player, same-device co-op, and local-Wi-Fi co-op;
- all eligible heroes and representative legal pairs;
- Easy through Ultimate where unlocked;
- Standard, Open, Assisted, Cheat-Assisted, practice, Continued, and Legacy categories;
- English, Simplified Chinese, and German;
- keyboard-only and gamepad-only operation;
- screen reader, captions, non-color cues, reduced motion/effects, and audio-independent completion;
- save, reload, backup, merge, replace, migration, corruption recovery, and storage pressure;
- rollback, reconnect, host migration, focus loss, synchronized pause, and proxy boundaries;
- reward suppression, anti-farming, rank improvement, record separation, and unlock ownership;
- import/export, missing content, incompatible versions, sanitized names, checksums, and tampering;
- canon labels, spoiler gates, Chronicle authentication, Remix separation, and Campaign Chronicle reveals.

### 15.2 Blocking conditions

Release is blocked by any open Critical or High-severity defect in mandatory progression, deterministic synchronization, save integrity, content access, objective completion, reward eligibility, record classification, accessibility, localization, import security, or privacy.

Exact frame data, numerical score thresholds, encounter budgets, Credit values, performance budgets, and content-specific tuning remain production data, but they must pass the approved matrices before release.

## 16. Deferred and production-owned work

The following remain deliberately unresolved rather than implicitly decided:

- whether any Curated Mission package is free or paid;
- final Lin Lan model sheet, voice, exact move data, and audiovisual treatment;
- final maps, encounter compositions, boss values, objective thresholds, grading bands, Credit payouts, achievements, cosmetics, artwork, music, dialogue, and cinematics for each case;
- later Curated Mission catalogue entries;
- exact Random Operations arena/target/profile catalogue and production balance values;
- final Chapter Challenge score/rank thresholds and stage-specific tuning;
- final Academy lesson scripts, demonstrations, exercises, and reward amounts;
- exact Automatic Highlight normalization benchmarks and measured performance limits;
- any online leaderboard, account, cloud-save, workshop, or public sharing service;
- any future expansion of Automatic Highlights beyond Curated Missions.

These production values may tune approved data without changing mode identity, canon boundaries, fairness guarantees, Combat Constitution behavior, or acceptance rules.

## 17. Phase 4 completion statement

Phase 4 feature design is complete and this specification is approved. Implementation must follow this document together with the shared game specification and authoritative continuity files. If a conflict is discovered, the permanent Combat Constitution, locked Stage 1/Stage 2 story outcomes, `story_line.md` continuity rules, and the most recently approved explicit decision take precedence until the documents are reconciled.


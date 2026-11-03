# Fight For Peace — Campaign Review: Full Picture, Gaps and Recommendations

**Date:** 2026-11-03
**Sources read:** everything Guo supplied in `refinement/` on 2026-11-03 (now moved to the repository root, `docs/superpowers/specs/` and `docs/production/`: `story_line.md`, `Features_Decisions.md`, the shared game specification, the expanded game modes specification, the Stage 3–8 specifications, the four Curated Mission specifications and feature records, and `campaign_music_direction.md`), plus the repository roadmap, the Stage 2 specification and decision log, the Stage 2 prompt files and `FLOW_LESSONS.md`.
**Status:** all recommendations accepted by Guo on 2026-11-03; see Part 4.
**Companion documents:** `docs/review/07-stage3-production-readiness.md` (the close check of Stage 3), `docs/superpowers/plans/2026-10-21-roadmap.md` (updated implementation plan), and `FightForPeace/codex_prompts_stage3.md` in the Pictures repository (numbered Stage 3 prompts).

---

## Part 1 · The full picture

### 1.1 What the game is

*Fight For Peace* (和平之战) is a 2D belt-scrolling martial-arts brawler for the browser (TypeScript, Vite, Phaser, deterministic 60 Hz simulation), played solo, in same-device co-op or in local-Wi-Fi co-op, in English, Simplified Chinese and German. Its single moral rule is that strength exists to protect peace: heroes rescue, restrain and capture, never execute; defeated enemies who surrender or flee are no longer targets; every boss is captured alive and handed to lawful institutions.

The combat engine is now a permanent **Combat Constitution**: every later stage, side story, hero, mount and boss is data on top of one fixed rule set (standing, aerial, low and ground combat; Guard, Exact Block, Counter, Combo Breaker; Health, Defense and Attack bars; cancels, target-owned combo context, scaling and anti-infinite limits; weapons, environment, co-op legality; abstract input; deterministic resolution).

### 1.2 The story in one paragraph

A river village, led by the wise elder **Sheng Guo (盛国)**, survives an occupation of its water gate (Stage 1), grows prosperous, and is infiltrated by **Tomas Rell**, whose staged rescue opens the way for Marek Vane's raid on the greenhouses (Stage 2). Tomas is the son of **Oren Rell**, the village steward who betrayed it forty years earlier; the previous elder, **Zhao Heng**, punished the whole family with exile, and young Sheng Guo objected but complied. Tomas turns that real injustice into a lifelong revenge, defrauds his wife's family, isolates his son **Kael**, and buys support from brokers who, without his knowledge, belong to the **Meridian Compact**, a commercial-criminal consortium that manufactures crises so independent communities must sell themselves cheaply. Over eight stages the heroes rescue, protect and investigate; Kael learns the truth and leaves his father; Tomas discovers he was always disposable and finally gives up revenge; and the three steering leaders, **Han Weiming**, **Rhea Calder** and **Damon Kess**, are exposed and captured. Peace is built, not won: *"Strength does not create peace. It protects the chance to build it."*

### 1.3 The eight stages

| # | Title (EN / 中文) | Time | Setting | Selectable heroes | Boss (captured alive) | Mandatory sponsor clue | Outcome |
|---|---|---|---|---|---|---|---|
| 1 | The Broken Water Pact / 破裂的水源盟约 | Year 0 | River gate, mill, canals | Mountain Guardian, River Scout | Sluice Commander | Damaged shipment seal + incomplete order code | Water restored |
| 2 | Prosperity Under Siege / 繁荣危局 | +3 years | Greenhouse and aquaponics complex | + Wind Sentinel, Fire Warden | Marek Vane, the Gilded Jackal | Same seal + route marker → abandoned depot | Raid fails, Tomas expelled, formula quarantined |
| 3 | Shadows over the Herb Mountain / 药山阴影 | +18 months | Silvermist Highlands: switchback, Qinglan, Moonbell Basin, Echo Quarry, Broken Ridge Camp, High Winch Terrace | the four village heroes | Garran Voss, the Ridge Wolf | Damaged invoice → regional procurement cutout | Four captives rescued, Tomas escapes |
| 4 | The Weight of Inheritance / 传承之重 | +6 weeks | Changling Trade Road, waystation, evidence facility | the four | Kael Rell (Soren and Chen Yue as Resolve-limited rivals) | Cutout ↔ Tomas's old commercial broker | Kael captured, reviews evidence, chooses neutrality |
| 5 | The Bell Before Dawn / 黎明前的钟声 | 40 years before Stage 1 (framed from the present) | Old village: trade entrance, communal reserve, storehouse, warning gate | young Sheng Guo, Liang Zhen (only) | Rovan Kest, the Road-Cutter | Rovan's trial archive and the old logistics network | Oren's guilt proven; the family exile shown as unjust |
| 6 | The Price of Leverage / 筹码的代价 | +18 months | Modern bridge, logistics district, solar yard, robot bay | the four | Procurement Recovery Marshal | Recovery order + concealed subsidies → Damon's shell consultancy | Tomas learns he was disposable, keeps the evidence |
| 7 | The Hidden Ledger / 隐秘账簿 | +9 months | Yunzhou: consultancy, freight exchange, Forum archive | the four + Kael (guest) | Silas Kern, the Erasure Chief | Three matching ledgers reveal the Meridian Compact and its three leaders | Tomas surrenders, Kael's Wayfarer Watch cooperates |
| 8 | Fight for Peace / 为和平而战 | days later | Compact coordination complex | the four + Kael | Rhea Calder (final boss); Damon and Han captured as noncombatants | Complete archives for restitution | Compact ends, Three-Horizon Peace ending, credits |

Every stage resolves its own conflict, ends with one reliable clue, has two optional branches and a Museum discovery, a grade, achievements, two Store outfits per hero, a recovery-food family, a seven-cue music family, a teaching package, and a release acceptance matrix (Stage 3 has most but not all of these; see the Stage 3 review).

### 1.4 Side content and modes

| Content | What it is | Opens after |
|---|---|---|
| **Character Chronicles** | Canonical replays of history (Stage 5 is the first) plus Kael's Wayfarer Watch protection mission | Story progress |
| **Mission Remix** | Any Chronicle replayed with any unlocked hero, non-canonical | First Chronicle clear |
| **Curated Missions** (canon-compatible side stories, optional, free or paid later) | 1 *Storm over Qinglan* (storm rescue, boss Mara Venn), 2 *The Medicine Road* (convoy escort), 3 *The Vanishing Survey* (recover genuine equipment, decoys), 4 *No Escape at Reedwater* (live capture of Cassian Rook; introduces Lin Lan, the Reed Warden) | Stage 3 (1 and 4), Stage 5 (2), Stage 6 (3) |
| **Random Operations** | Generated civil-protection jobs: *Defeat* (five waves) and *Safeguard* (hold until help arrives) | Stage progress |
| **Chapter Challenge** | Ranked single-stage runs with a stage-normalized mastery score | Campaign stages cleared |
| **Academy** | Seven-course curriculum (Demonstration → Guided → Trial → Mastery), one drill package per stage | Always; lessons unlock with content |
| **Guide** | Searchable reference, never required | Always |
| **Village Museum and Archive** | Pictures, cinema, music, artifacts, Sponsor Dossier, Campaign Chronicle, Highlights | Always; fills with play |
| **Store and Wardrobe** | Credit-bought visual-only outfits (Stage Service + Village Heritage per stage per hero), purchased Specials/Ultimates as sidegrades | Stage progress |
| **Elder's Secrets** | Twelve open cheat codes and four presets; any code marks the run Cheat-Assisted (story yes, rewards no) | First launch |

### 1.5 Heroes

| Hero | Who | Style | Playable in Story |
|---|---|---|---|
| Mountain Guardian (山神) | Village craftsman, about 38 | Grounded palms, elbows, sweeps (Stone branch of Liang's method) | 1–4, 6–8 |
| River Scout (河神) | River guide, about 22 | Light kicks, taps, spins (Current branch) | 1–4, 6–8 |
| Wind Sentinel (风神) | Twin sister, 18 in Stage 2 | Karate-derived speed and redirection | 2–4, 6–8 |
| Fire Warden (火神) | Twin brother, 18 in Stage 2 | Sanda, kickboxing, Qinna control | 2–4, 6–8 |
| Sheng Guo — Civic Apprentice | The elder at 26 | Measured Hand civic defense (15 named normals) | 5 only |
| Liang Zhen — Field Protector | Later Master Liang, 31 | Stone-and-Current Method (15 named normals) | 5 only |
| Kael Rell | Tomas's son, 24–28 | Pressure boxing and chain wrestling | Boss in 4; guest in 7–8 |
| Soren Beck, Chen Yue | Kael's companions | Savate; judo and emergency response | Remix and Random Operations only |
| Lin Lan — Reed Warden | Regional liaison, 27 | Circular footwork, Qinna restraint | Curated Missions, Remix, Random Operations |

### 1.6 Growth of the world

Technology arrives step by step and never wins on its own: Stage 3 better patrol clothing, radios, maps and sample storage; Stage 4 evidence seals, body-worn recording, early printed houses and the new bridge under construction; Stage 5 none (history); Stage 6 utility robots, finished bridge, solar microgrid; Stage 7 a regulated support robot as a gameplay system and mature protective wearables; Stage 8 mature humane systems, with manual overrides still essential. Mounts move from horses (3, 5) to utility bikes (4) and motorbikes (6) to short cargo-bike and response-bike sections (7, 8).

### 1.7 Music

Each stage has a seven-cue family on one Authored Adaptive Score architecture: Water Held Back, Prosperity Under Siege (done), Mist and Resolve, Burden of Blood, The Warning Remembered, A Village Tested Again, Lines behind the Ledger, Strength in Service of Peace; plus Five Waves, One Stand and Until Help Arrives for Random Operations. A five-note village motif, a three-note sponsor motif (hidden until Stage 7) and a Wayfarer motif (from Stage 4) tie them together.

---

## Part 2 · Gaps and recommendations

Severity: **A** blocks or changes work that is about to start, **B** needs a decision before the stage or system it touches, **C** clean-up.

### A · Decide now

**G1 · Tomas's age contradicts the locked Stage 2 description (A).**
`story_line.md` makes Tomas about 52 in Stage 2: he was about nine at the exile, the exile was about forty years before Stage 1, Stage 2 is three years after Stage 1, and his wife Xu Lian is 50 and two years younger. The locked Stage 2 decision log, the Stage 2 model sheet (#040) and every Stage 2 still show him in his late sixties.
*Recommendation:* keep every Stage 2 event and picture and add one canon fact: Tomas is 52; his hair turned grey early, and the stooped, frail "elderly" stranger was part of the deception. Stage 3 shows him upright, about 54, grey-haired, sharper and better dressed. This changes no locked event, keeps the child-victim side of his grievance, and keeps everyone else's ages. **Decided by Guo on 2026-11-03: this option.** Recorded in `story_line.md` (character table, Tomas Rell); the Stage 3 Tomas prompts draw him at about 54.

**G2 · Outfits are promised in gameplay, but the animation pipeline makes every redesigned outfit a full redraw (A).**
Heroes are key-pose sprite sheets generated per action (about 45 sheets per hero today). Stage 2 solved Store outfits as **colour swaps**: each outfit render keeps the default silhouette and areas so the game can recolour every sprite. The Stage 3–8 decisions now say outfits are "meaningful visual redesigns rather than palette swaps", usable in play, plus free canonical default changes at Stages 3, 6 and 8 (Stage 3: trail boots instead of sandals, weather layers). A redesign that changes the silhouette means regenerating every sheet of that hero: about 4 × 45 sheets for the Stage 3 default change alone, and thousands of images by Stage 8.
*Recommendation:* run a short spike during M3–M5 that compares (1) a 2D cut-out rig with swappable outfit parts (one parts sheet per outfit), (2) layered overlays on the current sheets (jacket, boots, accessories as separate transparent layers), and (3) the Stage 2 rule, colour swap in play, with the full redesign shown in menus, portraits, victory poses and cinematics. Decide before the animation volume grows in M5–M8. Until then, the Stage 3 prompt file draws the default evolution and the Store outfits as model sheets and renders only, and draws new Stage 3 gameplay sheets (weapons, horses, rescue) in the existing default outfit so they match every other sheet.

**G3 · The refinement copy of `Features_Decisions.md` had lost the 2026-10-21 to 2026-10-31 decisions (A, fixed in this PR).**
Your refinement copy started from an older file: section 13 (review decisions D1–D11, the title, the founders' Stage 2 kits, input prompts, the portable build, and save and continue) was missing, and two network lines and one specification line had gone back to "preserves the last confirmed checkpoint", which contradicts the 2026-10-31 rule that local-Wi-Fi co-op has no continuable save. I restored section 13 unchanged and put the save rule back in both files. Your Stage 3–8, modes and cheat changes are kept.

**G4 · Documents live in two places with different names (A, needs your OK).**
The new specs cite `docs/superpowers/specs/…` and `docs/production/campaign_music_direction.md`, but the files are in `refinement/`, and the repository root still holds the older `Features_Decisions.md` and game specification.
*Recommendation:* in a follow-up PR, move the specs to `docs/superpowers/specs/`, the music direction to `docs/production/`, replace the two root files with the merged refinement versions, and keep `refinement/` as your drop folder for new drafts. One source of truth prevents the G3 problem from happening again.

**G5 · Scope against time (A, planning).**
The slice plus Stage 2 was estimated at about 106–114 weeks with a test round after every milestone. The approved design now adds six stages, four Curated Missions, a Character Chronicle, Mission Mode, Random Operations, Chapter Challenge and the full Academy. Even with shared systems built once, the updated roadmap estimates about another 209 weeks (four years) at the same rhythm, or about 180 weeks if test rounds are combined once the engine is frozen.
*Recommendation:* plan three releases instead of one finished game: **Release 1** Stages 1–3 with *Storm over Qinglan*; **Release 2** Stages 4–5 with Mission Mode, *No Escape at Reedwater* and *The Medicine Road*; **Release 3** Stages 6–8 with *The Vanishing Survey*, Random Operations and Chapter Challenge. Bundle content milestones into fewer, larger test rounds once the engine is stable. Details are in the updated roadmap.

### B · Decide before the stage or system it touches

**G6 · Two versions of Kael's meeting with his mother (B, before Stage 8 writing).**
§8.7 has three states (accepted, declined, deferred) and places Xu Lian's invitation after Kael's first independent Wayfarer mission; continuity rule 19 repeats that. Stage 8 places the invitation in the final epilogue with **Meet Now / Reply and Meet Later / Not Yet**, and says Not Yet is not a rejection, so a "declined" state no longer exists.
*Recommendation:* make the Stage 8 version authoritative (it is the later, reviewed decision), store `meet_now`, `meet_later`, `not_yet`, and update §8.7, rule 19 and §16 Phase 1 item 4.

**G7 · The Wayfarer Watch Chronicle is referenced but not designed (B, before Release 2).**
Kael's first independent protection mission unlocks Kael for free-selection modes, starts Soren and Chen Yue's unlock path, and (in §8.7) triggers the invitation. No specification exists for it, and "the son's Chronicle" in §9.2 has no route, objectives or placement.
*Recommendation:* specify one short Character Chronicle (working title *The Road Between*), set between Stages 4 and 7 and opening after Stage 6, with Kael, Soren and Chen Yue as the canonical trio protecting a mountain caravan. Its first clear unlocks Kael for free modes.

**G8 · Playable kits are missing for the new heroes (B).**
Sheng Guo and Liang Zhen have complete kits (15 named normals, Specials, Ultimates). Kael has only a boss kit (Stage 4) but becomes playable in Stages 7–8; Lin Lan, Soren and Chen Yue have styles but no move lists.
*Recommendation:* write each kit in the format of the Stage 5 hero contract before its content wave (Kael and Lin Lan for Release 2, Soren and Chen Yue with the Wayfarer Chronicle). Without them, the art prompts for their pose sheets cannot be written.

**G9 · Tomas's backstory chapters have no placement (B, Stages 4–7).**
§9.6 promises several short chapters (courtship, marriage and parenthood, the family's exclusion, the fraud, the separation, Kael's isolation, the recovery of Xu Lian's records) that appear "when the investigation makes them relevant", but no stage lists them.
*Recommendation:* Stage 4 *Truth Under Seal* carries the separation and custody chapter, Stage 5's present-day frame the exile and Oren's teaching, Stage 6 the fraud and Tomas's fortune, and Stage 7 the recovery of the records. Each is two or three still-and-small-motion shots with transcript.

**G10 · The founding heroes still have no personal names (B, before Stage 3 localization).**
Every other recurring character has a personal name, and the Museum's formal records and the Stage 8 credits *Those Who Built Peace* will need one for Mountain Guardian and River Scout.
*Recommendation:* decide the two names (with Chinese forms) before Stage 3 dialogue is written; role titles stay the in-game names.

**G11 · Many visual identities are still open (B, per release).**
Open: Stage 3's six expedition members and the signal-hut operator; Xu Lian, Xu Tao, Xu Rong, Xu Decheng; Zhao Heng, Oren, Qiao Lan, Chen Wei, Chen An, Su Yan, Brann Holt, Rovan, Lin Mei, Liang Zhen (young and old); Han, Rhea, Damon, Silas; the Stage 3–8 enemy factions.
*Recommendation:* the Stage 3 prompt file proposes the Stage 3 cast as anchor model sheets for your review. Do the same per release wave so only the cast you are about to build is designed.

**G12 · The Combat Constitution freezes the engine, so the engine must be complete before it freezes (B, roadmap).**
Later content needs mechanics that the slice does not build: horse and wagon hazards (3, 5), utility and cargo bikes (4, 7), heavy machine gun and fictional concussion devices (6–8), shields and emitters (7–8), the support robot (6–8), historical solo handoff (5), protected-unit condition ladders (3–8) and evidence lifecycles (4, 7, 8).
*Recommendation:* add a "Constitution audit" milestone after Stage 2 that lists every Stage 3–8 and Curated Mission mechanic and proves each one is expressible as data in the frozen engine. Anything that is not becomes an engine task before the freeze (added to the roadmap as M24).

**G13 · Every later stage invents its own condition ladder (B, engineering).**
Stage 3 Secure/Strained/Critical, Stage 4 Secure/Disturbed/Recovered, Stage 7 Protected/Disrupted/Emergency Extracted and Preserved/Reconstructed/Essential Core, Stage 8 Secure/Delayed/Emergency Assisted and Complete/Reconstructed/Essential Set, plus five Curated variants.
*Recommendation:* build one generic **protected-unit** module (states, once-only completed hostile actions, lock on safe, checkpoint-safe), one **evidence lifecycle** module, and one **100-point grade with caps** module, and express each stage's ladder as data. This is in the roadmap as M25.

### C · Clean-up (I can do these once you confirm)

- **G14** `story_line.md` still marks some items Unresolved that later stages answered (for example Xu Lian's stage assignments: disclosure in Stage 4, lawful notice in Stage 7, invitation in Stage 8). Narrow those lines.
- **G15** The Sluice Commander's custody after Stage 1 is undefined. One line in the Stage 2 Museum text ("held, then transferred to the regional authority") closes it without touching Stage 1.
- **G16** Stage 3's research beat mentions laboratory mice. Keep it in text only; no lab animals appear in art or video (the Stage 3 prompts follow this).
- **G17** Phases 5 and 6 were still headed "active" and continuity rule 16 was numbered twice. Fixed in this PR.

---

## Part 3 · What changed in this PR

1. `refinement/` added to the repository as you supplied it.
2. `refinement/Features_Decisions.md`: section 13 restored; two network lines put back to the 2026-10-31 save rule (G3).
3. `refinement/2026-10-18-fight-for-peace-game-specification.md`: the interruption sentence put back to the 2026-10-31 save rule (G3).
4. `refinement/story_line.md`: Phases 5 and 6 marked completed; duplicate rule number fixed (G17).
5. This review, the Stage 3 close check, and the updated roadmap.

The Stage 3 prompt file is in the Pictures repository PR, because Codex reads it from there.

---

## Part 4 · Decisions of 2026-11-03 and what was done

Guo accepted every recommendation in Part 2 and in the Stage 3 close check.

| Gap | Done |
|---|---|
| G1 Tomas's age | Recorded in `story_line.md`; Stage 3 prompts draw him at about 54. |
| G2 Outfits | Decided 2026-11-03: no rig and no overlays (spike dropped); outfits seen in play get full key-pose sheets. Scope (default evolution only, or Store outfits too) is recorded in the roadmap's campaign decision 4. |
| G3 Lost decisions | §13 and the save rule restored. |
| G4 File locations | Specifications moved to `docs/superpowers/specs/`, the music direction to `docs/production/`, `story_line.md`, `Features_Decisions.md` and the feature records to the repository root; the stale root copies were replaced. `refinement/` is now an empty drop folder with a README. |
| G5 Scope | Three-release plan in the roadmap. |
| G6 Reunion choice | `story_line.md` §8.7, rule 19 and Phase 1 item 4 now use Stage 8's Meet Now / Reply and Meet Later / Not Yet, stored as `meet_now`, `meet_later`, `not_yet`. |
| G7 Wayfarer Chronicle | *The Road Between* recorded in `story_line.md` §8; specified before M38. |
| G8 Playable kits | Recorded in `story_line.md` §8; Kael and Lin Lan before Release 2, Soren and Chen Yue with *The Road Between*. |
| G9 Backstory chapters | Placement table in `story_line.md` §9.6. |
| G10 Founders' names | Decided: **Shi Lei / 石磊** (Mountain Guardian) and **Lan Xi / 澜溪** (River Scout), recorded in `story_line.md` and `Features_Decisions.md`. |
| G11 Visual identities | Stage 3 cast designed in the Stage 3 prompt anchors; later casts per release (roadmap A6). |
| G12 Constitution audit | Roadmap M24. |
| G13 Shared condition, evidence and grade modules | Roadmap M25. |
| G14 Stale lines | Xu Lian's stage assignments confirmed in `story_line.md`. |
| G15 Sluice Commander | Custody line added to the `story_line.md` character table. |
| G16 Lab animals | Text only; no animals in any Stage 3 prompt. |
| G17 Labels | Fixed. |
| Stage 3 S3-1 to S3-12 | Written into the Stage 3 specification (§7.2, §14, §15, §16, appendix E and new §22, version 1.1), with English, Chinese and German names for every achievement, encounter and other new name. |


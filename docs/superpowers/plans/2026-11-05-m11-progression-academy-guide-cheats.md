# M11 Progression, Academy, Guide and Cheats Implementation Plan

**Goal:** a finished Stage 1 run is worth something. The results screen shows a score, a rank from a data-defined 100-point grade and an itemized Credits payout; the profile keeps Standard and Open records, achievements and Hero Mastery. The Village Store sells the D10 slice catalogue (one Special, one directional Ultimate and one outfit per founder, two profile badges) and owned moves can be equipped in the briefing. The Academy runs one representative route of lessons (Demonstration → Guided Practice → Independent Trial → Mastery Goal) plus Free Practice, technique trials and My Combos. The Guide is a localized reference with control cards and examples drawn from each player's current bindings, and its Elder's Secrets chapter holds the twelve cheat cards and four presets of Appendix E; any accepted cheat marks the run Cheat-Assisted.

**Architecture:** `packages/sim` gains `cheats/` (the canonical registry, code parsing, conflict resolution, the per-run `CheatState` in the world and the effects at the existing seams: `dealDamage`, Defense costs, the Attack meter, weapon integrity, knockdown reactions, the director's pressure profile, food and continues) and `stage/score.ts` (the data-defined 100-point grade with caps, ranks and the run score). Stage files gain `grade:` and `score:` sections; `packages/data/progression/progression.yaml` holds the store catalogue, price bands, payout table, Hero Mastery levels, achievements and the Academy route, compiled into the generated module with the rest of the data. `packages/platform` gains `progress/` (payout, store, achievements, mastery, records, My Combos, Academy states) on save schema version 2 with a v1 → v2 migration. `apps/game` gains the Store, Academy, lesson, My Combos and Guide screens, the cheat card screens (Elder's Secrets, the briefing and pause entries) and an extended results screen.

**Spec:** spec §14.2, §15.2–15.4, §16.1, §16.2, Appendix E; `Features_Decisions.md` §9 (economy, store, records, achievements, difficulty unlocks), §10.3 (Academy), D10; roadmap row M11 and the M11 guardrails (data-defined grade categories, weights and caps; achievements and Store items keyed by content ID; Credits ledger per profile).

## Global constraints

- Everything from M0–M10 still applies (deterministic integer simulation, data-driven kits and stages, no key letters in player-facing text, every shell text in EN / ZH-CN / DE).
- **Cheats are explicit modifiers inside the one engine.** No second simulation; they are world state, encoded and hashed. Objectives, warnings, boss thresholds, carryover caps, surrender and anti-infinite budgets stay active.
- **Rewards come only from validated results.** Practice runs (a later start beat from the Lab), Cheat-Assisted runs and Guests earn no Credits, rank, score records or Mastery. Credits never leave except through a purchase.
- **Prompts are abstract actions.** Lessons, Guide examples, control cards and recipe playback render each player's current binding for their active device.
- **No hidden prerequisites.** Basic Academy lessons and every Elder's Secrets card are available from first launch.

## Candidate rules

| Item | Candidate value | Source |
|---|---|---|
| Stage 1 grade | 100 points: Rescue 35, Investigation 25, Continues 20, Time 20; a worker left behind caps the rank at A | guardrail M11, D8 |
| Ranks | S ≥ 90, A ≥ 75, B ≥ 55, otherwise C | candidate |
| Score | enemies sent home 150, defeated 100, fled 50; worker 500, clue 300, evidence 1000; best combo 40 per hit; time bonus 5 per second under the slowest par; each continue −1000; × difficulty (80 / 100 / 125 / 150 / 175 %) | §15.2 (score is run-specific) |
| Payout | completion 300; difficulty +0 / 100 / 200 / 300 / 400; rank C 0, B 100, A 200, S 300; one-time: first clear 1000, first time at a rank B 100 / A 200 / S 400, every clue in one run 200, achievements as listed, Academy certification 100 and mastery 150 per lesson, Hero Mastery level 100 | F&D §9 layered payout |
| Price bands | low 300 (badges), medium 800 (outfits, Specials), high 1500 (directional Ultimates) | F&D §9 bands |
| Store reveal | Specials, outfits and the first badge from first launch; directional Ultimates after the first Stage 1 clear; the second badge after the "The River Flows Again" achievement | F&D §9 progressive catalogue |
| Dual path | Hero Mastery level 3 with a hero grants its Special, level 5 its directional Ultimate (no Credits needed) | F&D §9 revealed dual-path |
| Hero Mastery | a validated clear with the hero: 100 + 25 per rank step; level every 300 points, up to 10 | F&D §9 |
| Standard / Open | Standard: default Specials and Ultimates (outfits allowed); any equipped catalogue move makes the run Open; in co-op one Open hero makes the team Open | §15.3 |
| Records | per content ID and category `<standard|open>.<solo|coop>.<difficulty>`: best score, rank, time, combo hits and damage, lowest damage taken, heroes, loadout, version; Cheat-Assisted runs only raise a separate highest Cheat-Assisted difficulty | §15.4 |
| Achievements | 8 for Stage 1, one per group (Story, Stage Mastery, Hero Mastery, Combat Technique, Discovery, Co-op, Academy, Difficulty); only Story is allowed under Cheat-Assisted (its Credits are suppressed) | §15.4 |
| Academy route | "First Steps": Move and Jump, the hero's Foundation chain, Guard and Exact Block, Special and Ultimate; states Available, Practiced, Certified, Mastered | §14.2 |
| Free Practice | the Lab world with any owned or trial move, and the Cheat Practice filter (cheats allowed, no rewards) | §14.2 |
| My Combos | records abstract actions with frame offsets from Free Practice; name, save, replay (playback through the hero), practice, delete; up to 20 per profile | §14.2 |
| Guide | the 16 chapters of §16.1, searchable, with control cards and examples from current bindings; Elder's Secrets holds the cheat cards | §16.1 |
| Cheats | 12 codes and 4 presets (Appendix E); typed codes are case-insensitive, ignore surrounding spaces and treat space, hyphen and underscore alike; never guessed | §16.2, App. E |
| Cheat activation | lobby, briefing and solo pause; co-op needs both players to confirm; the first accepted cheat marks the run for good; saved hero preferences start disabled unless reused | §16.2, E.3 |
| Stage 1 relevance | `STEADYRIDE` and `SAFEPASSAGE` stay visible with "no effect in this stage" | E.1 |

## Tasks

- [ ] Cheat registry, parser and effects in the simulation; Cheat-Assisted marking in the run (tests).
- [ ] Data-defined 100-point grade, ranks, caps and run score; best combo counters (tests).
- [ ] Progression data (store, bands, payout, mastery, achievements, Academy route) compiled from YAML (tests).
- [ ] Save schema v2 with a v1 → v2 migration; payout, store, achievements, mastery, records, My Combos and Academy states (tests).
- [ ] Results screen: score, rank, payout ledger, records, achievements, Standard/Open and Cheat-Assisted marking.
- [ ] Village Store with Wardrobe, Training Hall, Technique Library and Profile Collection; outfits drawn in the game; briefing loadout with owned moves.
- [ ] Academy: the route, lessons with current-binding prompts, Free Practice and Cheat Practice, technique trials, My Combos.
- [ ] Guide chapters with search and control cards; Elder's Secrets cheat cards with typed and selected activation; Cheat-Assisted in HUD, pause, readiness and results.
- [ ] EN / ZH-CN / DE text, browser tests (`e2e/m11.spec.ts`), Guo_tests.md M11 section, version 0.11.0.

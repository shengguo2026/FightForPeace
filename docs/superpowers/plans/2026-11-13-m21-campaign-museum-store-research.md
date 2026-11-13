# M21 · Campaign, Museum, Store and research

Roadmap: `2026-10-21-roadmap.md`, M21 and Stage 2 decisions 1, 2 and 4. Spec: Stage 2 §14
(achievements, Museum and Archive, Store and wardrobe, formula research), §15 (teaching,
Guide, cheats), Appendix A (purchased-move catalogue); F&D §9.1 (Village Museum and
Archive), §9 store rules; F&D §13 (founders' Stage 2 outfits); story line §6.1, §6.2 (the
twins' outfits). Version 0.21.0, rules version `m21`, state format 18, save version 3.

## Scope

- **Campaign layer as data** (`progression.yaml` → `campaign:`): the stage list in Story
  Mode order with each stage's content ID and unlock rule. Stage 1 is always open; Stage 2
  (`story.stage2.prosperity-under-siege`) opens once Stage 1 has been completed once on
  the profile (any full run, Cheat-Assisted included: story progress is narrative). Stage
  select lists every stage of the data, locked ones with their condition; a later Story
  Mode order or Stage Challenge mode reads the same list. Stage 2 is playable from the
  shell (solo, same-device co-op, Wi-Fi host), with its own briefing; the Stage 1 intro and
  ending cinematics stay Stage 1 only (Stage 2 chapters are M22).
- **Stage 1 → Stage 2 continuity on one profile**: Credits, wardrobe, techniques, Hero
  Mastery and records carry over unchanged; Stage 1 plays exactly as before. A finished run
  records the stage as completed (`campaign.completed`).
- **Save version 3** with a migration from slice profiles (versions 1 and 2): typed
  `campaign`, `museum`, `sponsorDossier` and `research` records (the M10 reserved slots);
  Stage 2 records an M20 Lab run kept under the provisional `story.stage2` key move to the
  stable content ID; a profile that already cleared Stage 1 gets Stage 2 opened and the
  Stage 1 Museum entries its clears earned. The original is kept until the migrated copy
  is written (M10 rule).
- **Twelve Stage 2 achievements** (§14.1) with new data rule kinds: `preservation` grade,
  `response` grade without rewinds, `stats` (all of several run counters with min/max),
  `capture` (route, gun outcome with rounds, no completed Scorched Claim), `branch`
  (one branch completed) and `branches` (all completed in one run). Only *Peace in the
  Glasshouse* is narrative (earned in Cheat-Assisted play, without Credits).
- **Run counters** for those rules (state format 18): Reciprocal Handoffs and Twin
  Guardians' Accord landed, Signalman calls made and broken, Control Breaches stopped and
  completed, Ledger damage from the breaching grenade.
- **Museum** (village menu): Picture, Cinema, Music, Sound, Collection and Investigation,
  all entries data (`museum:`) with stable IDs, localized names and unlock rules (`always`,
  `clear` of a stage, `branch` completed, `evidence` secured). It indexes the Stage 1
  media already installed (story pictures, the intro and ending, the Stage 1 music cues, a
  curated set of sounds) and Stage 2's three branch artifacts and records. Pages of a stage
  that is not open yet are not shown (no spoilers); locked entries of an open stage show as
  undiscovered without their names. Guests can look but keep nothing. Viewing state is
  saved; the media stay installed assets.
- **Sponsor Dossier** (Investigation): confirmed facts and the current theory, each fact
  unlocked by its evidence (Stage 1 sponsor evidence, the Stage 2 weapon crate seal). No
  empty slots or fixed counts (F&D §9.1).
- **Formula research milestone 1** (§14.4): four milestones as data; completing Stage 2
  completes *Quarantine and Provenance* and records the inputs for *Independent
  Replication* (the provenance ledger when the Medicinal Preparation Room was completed).
  Fictional, non-actionable text only.
- **Store**: two Stage 2 outfits for each of the four heroes (Greenhouse Builder, Harvest
  Heritage; Channel Patrol, Lantern Festival; Greenhouse Response, Prosperity Festival;
  Pump-House Response, Ember Heritage), revealed when Stage 2 opens, placeholder colour
  treatment until their art exists (as the slice outfits).
- **Purchased-move catalogue (Appendix A)** for the twins: two optional Specials (`Up` and
  `Down` + Special) and one directional Ultimate sidegrade (`Backward` + Ultimate) each, as
  catalogue actions in the hero YAML with frame data, store entries (with the Hero Mastery
  path) and an Academy trial through Free Practice. A data test proves no bought move beats
  the starting option in its slot on range, startup, recovery and damage at once.
- **Technique Library**: the Store's technique group lists every hero's catalogue moves
  with their input, slot, tactical purpose and a Preview.
- **Move Preview for complex moves** (decision 4): showcase routes are data
  (`showcases:` in each hero YAML, two or three freestyle chains per hero, one twin pair
  route each for a Reciprocal Handoff with a demonstration partner). A Preview screen plays
  a route with the existing deterministic pilot on a training dummy, looping, with the
  input steps underneath in the player's bindings and the current step highlighted; Pause,
  Step and Half speed; *Try it* switches to guided practice of the same route (steps tick
  off as they land). Preview buttons: Academy recipes and showcases, the Technique Library,
  My Combos. CI replays every showcase and fails when a step does not connect.
- **What's New briefing** (§15 layer 1): shown once per profile before the first Stage 2
  run, and any time from the Academy: the twins, mounted pursuit and Stability, the
  Preservation Ledger, Stage 2 weapons, ownership-aware containers, new enemy roles.
- **Stage 2 Academy lessons** (§15): a second Academy route. Hero lessons for both twins
  use the M11 lesson runner; *drill* lessons open the M17/M18/M19 test rooms with a goal
  read from their records: Reciprocal Handoff and Twin Accord (with a demonstration
  partner), mounted Stability and rescue, revolver, grenade return, support-gun disarm,
  Preservation, ownership-aware containers and new enemy roles.

## Deferred

- Final outfit art (colour treatment stays), Museum layouts and the Stage 2 media, music
  and chapters (M22); final names of the twins' catalogue moves (candidates, see below).
- Story Mode (fixed order) and Stage Challenge mode (campaign decision 2: later).
- Every number (prices, Credits, achievement thresholds, frame data) is a candidate.

## Candidate names to confirm

- Wind Sentinel: *Crosswind Arc* (`Up` + Special), *Low Gust Sweep* (`Down` + Special),
  *Eye of the Storm* (`Backward` + Ultimate).
- Fire Warden: *Kindling Uppercut* (`Up` + Special), *Hearth Sweep* (`Down` + Special),
  *Banked Coals* (`Backward` + Ultimate).

## Tests

- `packages/platform/test/m21.test.ts`: campaign unlock, stage content IDs, the save
  migration from version 1 and 2 profiles (slice fixtures), Museum and Dossier unlocks
  (clears, branches, Cheat-Assisted, Guest), research milestone, every Stage 2 achievement
  rule from crafted results, outfit reveal and purchase.
- `packages/sim/test/m21.test.ts`: the new run counters, catalogue moves load and play,
  every showcase route connects step by step (CI gate), the sidegrade rule.
- `packages/data/test/data.test.ts`: campaign, Museum and showcase data validate.
- Golden replays re-recorded for rules `m21`.
- `apps/game/e2e/m21.spec.ts`: Stage 2 locked then open after a Stage 1 clear, Stage 2
  starts from stage select, the Museum sections, buying a Stage 2 outfit, a Preview loop
  with step highlight and Try it, What's New, a Stage 2 Academy lesson.

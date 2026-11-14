# Lessons learned (Stages 1–3, M0–M22)

This file records every step we missed or had to correct compared with the original plan, so the prompt files and specs for Stages 4–8, the Curated Missions and the other modes don't repeat them. Read it, then run the **pre-flight checklist** at the end before writing any new stage's prompt files.

Each lesson has four parts: **what happened**, **where it was caught**, **the fix**, and **the rule** to follow from now on.

Related files:

- Google Flow clip lessons are kept in one place and not repeated here: [`FightForPeace/FLOW_LESSONS.md`](https://github.com/shengguo2026/Pictures/blob/main/FightForPeace/FLOW_LESSONS.md) in the Pictures repo (copy in the project files at `art/FLOW_LESSONS.md`).
- Which file the game uses for each asset, and every review note: [`FightForPeace/APPROVED_VARIANTS.md`](https://github.com/shengguo2026/Pictures/blob/main/FightForPeace/APPROVED_VARIANTS.md).
- Manual test steps and the fixes after each test round: [`Guo_tests.md`](Guo_tests.md).

Status on 2026-11-14: Stage 1 and Stage 2 art is delivered except the armed-walk and walk/flee sheets AW01–AW25 (AW01–AW12 approved, AW13–AW25 open). Stage 3 #001–#160 are approved, the rest is open, and #362–#380 were added on 2026-11-13. **Stage 4 prompts will only be written after a spec readiness review of Stage 4**, like the Stage 3 close check in `docs/review/07-stage3-production-readiness.md`.

---

## A · Missing sprite sheets (movement coverage)

The biggest and most repeated gap. Three times a whole class of sheets was found missing only when Guo played the build.

### A1 · Hero walk cycles repeated half a cycle

- **What happened:** in all four approved hero walk sheets, cells 4–6 were copies of cells 1–3. The same leg and the same arm always led, so the heroes slid instead of stepping. The prompt asked for "a full cycle", and the generator ignored it. River then needed three more tries: v2 kept the same arm forward in both halves, and v3 kept one forearm raised (a jog, not a walk). v4 was approved.
- **Caught:** Guo's M7 tests, 2026-11-08 ("the legs do not move step by step"), and the M10 tests, 2026-11-09 (River's raised forearm).
- **Fix:** redo prompts in `codex_redo_walk_cycles.md` that name the leading leg and arm in every cell (cell 1: right foot forward, left arm forward; cell 4: left foot forward, right arm forward), say "cells 4 to 6 must NOT repeat cells 1 to 3", and end with a "check before finishing" sentence. Saved as `_v2` next to the approved file so nothing was overwritten before review.
- **Rule:** every walk, run or flee prompt spells out the contact, down and passing pose of each cell with the leading leg and arm, forbids repeating the first half, and ends with the self-check. The review compares cell 1 with cell 4 (different leg in front, arms swapped) before approving. The arms are relaxed and swing low unless the character carries something.

### A2 · Heroes had no armed walk sheets (Stage 1, then again in Stage 2)

- **What happened:** the prompt lists had stance and attack sheets for each weapon but no sheet for walking while holding it. In the game a hero holding a weapon froze in one pose and slid.
  - **Stage 1:** no staff or handwheel walk for any hero. Wind Sentinel and Fire Warden had no Stage 1 weapon sheets at all, so their hands were empty.
  - **Stage 2:** the same gap for the lance, revolver and support gun, even though the Stage 1 gap had been fixed two weeks earlier and Stage 3 got its armed walks (Batch 11) on 2026-11-10. Stage 2 was considered "complete", so nobody went back to it. The first stand-in (normal walk with the weapon drawn beside the hero) looked like a floating weapon.
- **Caught:** Stage 1 in the M7 tests (2026-11-08) and the M10 tests (2026-11-09, Wind and Fire). Stage 2 in the M22 tests (2026-11-13).
- **Fix:** Stage 1: 4 staff/handwheel walks for Mountain and River (`codex_redo_walk_cycles.md`), 10 sheets for Wind and Fire (`codex_m10_findings.md`). Stage 2: AW01–AW12 in `codex_prompts_stage2_armed_walks.md` (lance, revolver, support gun × 4 heroes). The game switches to a walk sheet automatically when it is imported.
- **Rule:** build a **coverage matrix** of hero × weapon before writing prompts. Every cell needs a stance/attack sheet **and** a walk sheet with the weapon held steady, for **every** hero who can pick that weapon up, including heroes added later in the campaign. The armed-walk prompt attaches the model sheet, the IDLE sheet and the weapon sheet, and names which pose of the weapon sheet is the carry pose.

### A3 · Enemies and villagers had no real walk, run or flee cycles

- **What happened:** the planned enemy sheets gave the normal walk four cells, but the flee or withdrawal run only two (turn and one stride). Characters with a changed state had a single pose: the Road Rider on foot, the Marauder after losing his revolver, Marek in Scorched Claim. The two villagers who walk out of their rooms (annex worker, botanist) slid on one pose. Stage 3 had the same pattern: two walk poses per enemy, a flee pose only for two enemy types, no walk for the dismounted rider, one pose for each freed villager and for Tomas's withdrawal.
- **Caught:** Guo's M22 tests, 2026-11-13. Before that, the "Verify Stage 2 art" check on the same day reported Stage 2 as complete, because it compared the delivered files with the prompt list, not the prompt list with what the game needs.
- **Fix:** AW13–AW25 at the end of `codex_prompts_stage2_armed_walks.md` (8 flee runs, 3 extra walks, 2 villager walks). Stage 3 #362–#380 at the end of `codex_prompts_stage3.md` (13 enemy, 6 villager).
- **Rule:** for every character in the stage (enemies, boss, NPCs, villagers, escorts, captives), list **every way it moves on screen**: walk, run, flee or withdraw, walk away after rescue, walk while carried or escorted, and every state variant (dismounted, disarmed, phase 2, injured). Each of these needs its own cycle of at least 4 cells, preferably 6, with the legs alternating as in A1. A character that only ever stands needs nothing, and the prompt file says so. A "completeness" check always compares the game's movement states with the prompt list, not just the prompt list with the delivered files.

### A4 · Fleeing characters faced the wrong way

- **What happened:** the sprite rules say every pose faces right and the game mirrors it. The Stage 2 exit sheets were drawn facing the other way from Stage 1, and the villagers' running sheet was drawn already running left, so the game's mirror turned both around: they ran left while facing right.
- **Caught:** Guo's M21 tests, 2026-11-13 (enemies). The villager version was found right after the M21 merge and needed a second PR (#44).
- **Fix:** all eight Stage 2 enemy types and the rescued workers now face the way they run, with a unit test for each.
- **Rule:** the facing rule ("faces right in every pose, **including flee, exit and run-home poses**; the game mirrors it") is in every character prompt. The review notes the facing of every pose, and a sheet that faces left is either redone or recorded with a flip flag at import. The game has one test that walks every actor type left and right and checks its facing.

---

## B · Size and consistency of sprite sheets

### B1 · Heroes changed size between sheets

- **What happened:** the generator does not keep "standing height about 400 px". Mountain's staff sheets came out about 12 % smaller than his idle sheet, so heroes shrank when they picked up a weapon. About 40 action sheets were drawn up to 35 % larger, so heroes grew when they attacked. The ground line also moves by up to 17 px between sheets.
- **Caught:** M7 tests, 2026-11-08 (shrink with a weapon) and M11 tests, 2026-11-09 (grow when attacking).
- **Fix:** each sheet that differs gets a draw scale (`SHEET_SCALE`, and `REFIT` for crowded cells) in `tools/art/import_art.py`. Since then every review measures the standing height and the ground line against the IDLE sheet and records the scale (see the Stage 3 rows of `APPROVED_VARIANTS.md`).
- **Rule:** every gameplay-sheet prompt attaches the character's IDLE sheet and says "exactly as tall as on the attached idle sheet". The review measures height and ground line for **every** sheet, not only the anchors, and the import sets the scale in the same PR. Before a stage's art is called done, run a check that every sheet of a character draws within ±3 % of its idle height.

### B2 · Weapons on the floor were a different size than in the hands

- **What happened:** every loose weapon was drawn at one shared size, so the handwheel on the floor was about twice as wide as in a hero's hands, and the staff on the floor was too short.
- **Caught:** M10 tests, 2026-11-09.
- **Fix:** each loose or thrown weapon is drawn at the size the hero sheets show it in hand.
- **Rule:** every prop sheet states the object's size relative to hero height ("about as long as a hero is tall"), and the spec states one in-hand size per weapon that both the hero sheets and the floor sprite follow.

### B3 · Generator defects that recur on almost every batch

- **What happened, and where each was caught (all in Claude's reviews of Pictures deliveries):**
  - Black, opaque background between arms and legs: 13 Stage 2 hero sheets.
  - A figure cut off by the cell edge (#103 Twin Accord pose 3), or toes clipped by a few pixels.
  - Broken alpha: three Claim Hand sheets arrived at about 25 % opacity.
  - Magenta fringe along hair and outlines: most Stage 3 River and Wind redraws (#106 onwards).
  - Objects drawn in the neighbouring cell: the thrown support gun in cell 5 (#117, #123), a second lance in pose 1 (#111).
  - Things the prompts forbid: helmet decals, motion arcs, pseudo-text on signs and papers.
  - Icons and props redesigned instead of copied: #314 v1 drew a bladed spear, an assault rifle and a pineapple grenade.
- **Fix:** Claude fixed most of these at review (gap clean-up, alpha rebuild, magenta despill, painting out); the rest were regenerated or edited. From Stage 2 #058 on, prompts ask for a clear margin inside each cell and fully transparent gaps.
- **Rule:** every sheet prompt carries the standard clauses: clear margin inside the cell, every gap fully transparent, no object of one pose in another pose's cell, no decals, motion lines or text, and "copy the object exactly from the attached prop sheet, do not redesign it" with the prop sheet attached. Run an automatic pre-check on every delivery before reviewing by eye: alpha range, pixels touching a cell edge, magenta pixels, enclosed opaque black areas.

### B4 · Model sheets that looked too much alike or off-style

- **What happened:** Wind Sentinel and Fire Warden v1 had semi-realistic faces and colours too close to River Scout. Fire's lower body copied his sister's. In the line-ups, Tomas and the council escort resembled the elder, and the Stage 2 Enforcer looked like the Stage 1 one. The grey horse got the same teal ID stripe as the dun. The v1 bike sheet replaced the emblem with the ID mark.
- **Caught:** the Stage 2 asset review (`docs/review/05-stage2-asset-review.md`, 2026-10-25) and the anchor reviews of Stage 2 (#039–#057) and Stage 3 (#001–#014).
- **Fix:** regenerated or edited anchors before any gameplay sheet used them.
- **Rule:** make and approve the anchors (model sheets, line-ups, marks, vehicles, style frame) first. Review them as a **cast**, side by side with every existing character: silhouette, palette, hair, face and age must be clearly different from everyone else, and every ID colour or mark unique. Later prompts attach the approved version (`_v2` where one exists).

---

## C · Story, spec and scope gaps found late

### C1 · Character facts that contradicted each other

- **What happened:** `story_line.md` made Tomas 52 in Stage 2, while the locked Stage 2 description said late sixties. The founding heroes had no personal names, although credits and Museum records needed them.
- **Caught:** the campaign review, 2026-11-03 (gaps G1 and G10).
- **Fix:** Tomas is early fifties and his frail look was an act; Stage 3 draws him upright at about 54. The founders are Shi Lei 石磊 and Lan Xi 澜溪.
- **Rule:** keep a character table (name in EN/ZH/DE, age per stage, look per stage) and check every new stage's spec against it before any prompt is written.

### C2 · Outfit pipeline decided after the Stage 3 prompt file was written

- **What happened:** Stage 3 promised redesigned outfits in play, but the pose-sheet pipeline makes every outfit a full redraw. The decision (no rig; only the free default evolution gets full sheets, Store outfits stay colour swaps) came after the Stage 3 file existed, and the file grew from 211 to 349 pictures with a new Batch 3.
- **Caught:** campaign review gap G2, decided 2026-11-03.
- **Rule:** before writing a stage's prompt file, know which outfits get full sheets in that stage and count the sheets per hero (about 35 per redraw).

### C3 · Story clips with people kept failing in Google Flow

- **What happened:** Stage 2 clips needed many retries (camera moves, walking, handovers, vanishing props, invented text, "Audio generation failed"). For Stage 3 we generated a start frame **and** an end frame for every clip so Flow only had to fill the motion between them, and it still did not work as expected: the first Stage 3 clip with people (H01) failed three times (audio errors, a stray caption, the elder walking off, a zoom in the middle), and Flow's 1280x720 output is softer than our 1536x864 stills.
- **Caught:** throughout the Stage 2 clip runs; decided by Guo on 2026-11-10.
- **Fix:** Stage 3 decision: story scenes with people are **still sequences**: the approved start picture with a slow zoom or pan, a 1 s cross-fade to the end picture, localized subtitles in the calm bottom fifth, music under it, tap to advance and skippable. The game's cinematic player got this still-sequence mode. **Google Flow clips are used only for the people-free title or intro loops** (Stage 3 F01). All Flow lessons are in `FLOW_LESSONS.md`.
- **Rule:** plan every new story scene as a still sequence with a start and end picture, subtitles in all three languages, and a transition (cross-fade, zoom, pan). Plan the number of Flow clips per stage at **one** (the title loop) and never more than a few people-free shots; write each with the template in `FLOW_LESSONS.md`. Don't plan any clip whose action needs walking, a handover or a camera move.

### C4 · Music generation ignored key and structure

- **What happened:** Garran's states 06B and 06C came out in D minor and F minor instead of C minor, even with the key first in the prompt, and one clipped at +0.7 dB. The "six stingers" file came back as one 2-minute piece. Title loops did not join seamlessly.
- **Caught:** Claude's measurement of every delivery (Stage 3 music review, 2026-11-03; Stage 2 title loop).
- **Fix:** pitch-shifted to C minor, cut the stingers from phrase ends, crossfaded loop ends.
- **Overall:** Flow music worked much better than Flow video, but most cues still needed a correction (pitch shift, peak trim, cutting) and some needed a regeneration with an adjusted prompt, so every cue costs review and editing time.
- **Rule:** every music delivery is measured (length, LUFS, peaks, tempo, key) before approval. Cues that must layer or switch share key and tempo, stated first in the prompt, and a pitch shift is the planned fallback. Stingers are cut from a longer cue rather than asked for as several pieces in one file.
- **Rule (fewer cues):** plan **fewer music files** for later stages. Reuse existing cues where the mood fits (exploration beds, stingers, the elder's theme, village and Museum music) and only commission what is new to the stage, typically one exploration cue, one combat cue and one boss cue. Make boss states from one long cue cut into sections instead of four separate generations, and cut stingers from the stage's own cues. The music direction document (`docs/production/campaign_music_direction.md`) names 7 cues per stage today; trim that list per stage before writing its music prompts.

### C5 · Whole categories of assets had no prompt list

- **What happened:** no stage has prompt lists for ambience, sound effects or narration, so M22 shipped synthesized placeholders and subtitles only. Stage 1 music is still placeholder loops except the victory stinger. Stage 2 effect sheets and the Museum collection pictures existed only as placeholders until they were noticed.
- **Caught:** the "Verify Stage 2 art" check and the M22 build, 2026-11-13; the Museum collection in the M22 tests.
- **Rule:** a stage's media pack lists every asset category the spec mentions (pictures, clips or still sequences, music, stingers, ambience, effects, UI icons, Museum entries, narration text), and for each one says either "prompted in file X" or "placeholder until milestone Y".

---

## D · Repository and workflow slips

### D1 · Stray files in the Pictures repo

- **What happened:** writing the Stage 3 #362–#380 prompts through the shell broke on quoting and created 13 files named `Subject: …` in `FightForPeace/` (commit `8cd67df`). Pictures PR #44 removed them.
- **Rule:** write prompt files with a file editor, never with a shell heredoc containing quotes. Run `git status` and `git diff --stat` before every commit and confirm only the intended files are listed.

### D2 · Two people push to Pictures `main`

- **What happened:** Guo uploads art from his PC while Claude pushes prompt files and fixes. A replaced file (06B C minor) could have been brought back by a push from a stale clone.
- **Rule:** always `git pull` before pushing to Pictures, on both sides. After pushing a replacement file, tell Guo to pull before his next upload.

### D3 · Prompt files must be on Pictures `main` for Codex

- **What happened:** three times (walk redo, M10 findings, Stage 2 armed walks) the prompt file was first only in the project files or on a PR branch, and Guo had to ask for it on `main` so Codex could read it.
- **Rule:** new or extended prompt files go straight to `FightForPeace/` on Pictures `main` as a docs-only commit, and the reply links the file on `main`.

### D4 · Documents drifted out of date

- **What happened:** `APPROVED_VARIANTS.md` still listed P06–P11 as pending and had the N01 row backwards. The game repo's `docs/art/stage2/approved-variants.md` and the project-files copy were behind. The portable `README.txt` still said "milestone M12". The refinement copy of `Features_Decisions.md` had lost the 2026-10-21 to 2026-10-31 decisions, and documents lived in two places with different names (campaign review G3, G4).
- **Rule:** one source of truth per document, and the other copies point to it. The PR that imports or approves an asset also updates `APPROVED_VARIANTS.md`. Each milestone checks the README and version strings.

### D5 · Delivered art is not automatically in the game

- **What happened:** Stage 1 and 2 art sat in the Pictures repo while the game drew placeholders, until M6 (first real art) and M22. Even in M22 some items stayed placeholders (outfits as a tint, Stage 2 effects).
- **Rule:** every prompted asset names the milestone that brings it into the game. Each media milestone ends with a list: delivered and used, delivered but deferred (with the milestone), not delivered.

---

## E · Game-code issues found in manual tests

These were fixed in code, but the pattern matters for every new stage.

| What happened | Caught | Rule |
|---|---|---|
| Text not localized: names and words over heads, the controls bar, the pause line (M11); the riding move list (M22) | M11 and M22 tests | Every visible string goes through the text tables. Each new HUD element gets an e2e check in Chinese. |
| Co-op "ghost": a new enemy reused the number of a kneeling one, so both shared a picture | M11 tests (took two rounds) | Entity ids are never reused while the old entity is still on screen. |
| Player 2 joining a solo run got Player 1's hero | M11 tests | The "no hero twice" rule is checked on every join path, not only in hero select. |
| Names of fled enemies stayed on screen; the boss's winch ring stayed after the surrender | M11 tests | Every state that removes an actor also removes its labels and markers. |
| Title music lost before the first click (browser autoplay rule) | M11 tests | Audio requested before the first input is queued and started on that input. |
| Lab panels stayed open in an Academy lesson | M21 tests | Leaving a screen closes everything it opened. |
| Museum and Store missing an icon, a second menu level and previews | M21 tests | New menus follow the existing pattern: icon, two levels for long lists, a preview for every buyable item. |
| CI flakes: Firefox dash double-tap, a WebKit subtitle check that read too early, a timing-sensitive performance test | M3, M22 and the hero-size fix | Browser tests step by simulation frames and wait for state, never for wall-clock time. |

---

## Pre-flight checklist: before writing any new stage's prompt files

Run this for Stage 4 onwards, each Curated Mission and every other mode. Stage 4 starts only after its spec readiness review.

**Spec and story**

1. The stage spec has passed a readiness review (like review 07 for Stage 3), and its open decisions are closed.
2. Every character's name (EN/ZH/DE), age and look match the character table (C1).
3. It is decided which outfits get full sheets in this stage, and the sheet count per hero is known (C2).

**Coverage matrix (write it at the top of the prompt file)**

4. Every playable hero × every weapon of the stage has stance/attack sheets **and** an armed walk (A2). Heroes added since the last stage are included.
5. Every character has every on-screen movement as a cycle of 4–6 cells: walk, run, flee or withdraw, walk away after rescue, and each state variant (dismounted, disarmed, phase change, injured). Characters that never move are listed as "stands only" (A3).
6. Every story scene is a still sequence with a start and end picture, localized subtitles and a transition; the stage plans one Flow clip (the title loop) and none with people (C3).
7. The music list is the smallest that works: existing cues reused where they fit, new cues only for what is new, boss states and stingers cut from longer cues (C4).
8. Music, stingers, ambience, effects, UI icons, Museum entries and narration text each say "prompted in file X" or "placeholder until milestone Y" (C5).
9. Every asset names the milestone that brings it into the game (D5).

**Prompt text**

10. Locomotion prompts name the leading leg and arm in every cell, forbid repeating the first half, and end with the self-check (A1).
11. Every character prompt says it faces right in every pose, including flee and exit poses (A4).
12. Every gameplay sheet attaches the model sheet and the IDLE sheet and says "exactly as tall as the idle sheet"; armed sheets also attach the weapon sheet (B1).
13. Every prop states its size relative to hero height (B2).
14. The standard clauses are in: cell margin, transparent gaps, nothing in a neighbouring cell, no decals, motion lines or text, copy props exactly from the attached sheet (B3).
15. Anchors come first in the file, are reviewed as a cast for distinct looks and unique ID colours, and later prompts attach the approved version (B4).

**Back-apply and publish**

16. Every new lesson found while writing is also checked against the stages already prompted, even ones that are "complete" (A2: the Stage 2 armed walks were missed this way).
17. The prompt file is written with a file editor, `git status` shows only the intended files, and it is pushed to Pictures `main` after a `git pull` (D1–D3).
18. A new lesson found later is added to this file in the same PR as its fix.

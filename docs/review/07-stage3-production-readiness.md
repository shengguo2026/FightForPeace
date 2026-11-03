# Review 07 · Stage 3 Close Check — "Shadows over the Herb Mountain"

**Date:** 2026-11-03
**Reviewed:** `refinement/2026-11-01-fight-for-peace-stage-3-specification.md` (1.0, approved-design draft ready for builder review), `refinement/stage3_feature_story_line.md`, `story_line.md` §4 (Stage 3), `campaign_music_direction.md`, the Stage 2 and Stage 4–8 specifications (for comparison), and the Pictures repository (existing anchors).
**Verdict:** Stage 3 is sound in story and systems, but it is the lightest of the six new stage specifications. Stages 4–8 later fixed several things that Stage 3 still leaves open. Twelve items need a decision before the Stage 3 build milestone (M27); none blocks M3. The proposals below are my recommendations; the Stage 3 prompt file uses them, so you can approve them by approving the pictures.

---

## 1 · What is solid

- **Story.** A clear rescue-first stage: research purpose → kidnapping → four rescues across five areas → Tomas seen and escaping → Garran captured → invoice → Tomas reaches a lowland shelter. The "no false chase" rule (Tomas is never a failed objective) is well protected.
- **Research boundary.** The Silvervein Moonbell is shown, never explained as usable medicine. All visuals are non-actionable.
- **Route.** 12 mandatory encounters, one boss, two branches, five checkpoints, 40–50 minute first clear. Consistent with Stage 2 pacing.
- **Systems.** Mountain horse, three medium weapons, finite revolver, four food families, Rope Trapper restraint with partner rescue, Garran's three phases, quarry and winch interactions, all inside the Combat Constitution.
- **Presentation.** Music family, cinematic rules (no embedded text, still fallback, skippable) and the Flow lessons are already written into the spec.

## 2 · Items to decide

| # | Item | Problem | Recommendation |
|---|---|---|---|
| S3-1 | **Condition ladder uses "delay"** | §7.2 grades captives Secure / Strained / Critical by "timely stabilization" and "severe delay". The shared rules forbid hidden timers, and Stages 7–8 already switched to deterministic counts. | Use the Stage 7–8 model: each captive has a fixed number of authored hostile actions in its protected zone. **Secure** = 0 completed, **Strained** = 1, **Critical** = 2 or more. A completed action is a visible, interruptible enemy action (a raider pulls a rope, a lantern is kicked over). No clock. The Signal Hut "time band" becomes an encounter-count band in the same way. |
| S3-2 | **No 100-point grade** | Stages 4–8 define a 100-point stage grade with caps; Stage 3 defers it. | Rescue condition 35, conservation record 15, Garran live capture and counterplay 20, combat quality 20, optional branches 10. A Critical captive caps the grade at A; Cheat-Assisted has no grade. Use the shared grade module (roadmap M25). |
| S3-3 | **No achievements** | Catalogue deferred. | Eight: *Mist Lifts* (clear the stage), *Every Voice Home* (all four captives Secure), *Signal Restored* (Signal Hut), *Shelter Remembered* (Herbalist Shelter), *Both Paths Walked* (both branches in one run), *Steady on the Switchback* (no horse Stability break on Normal or higher), *Hook Unhooked* (disarm Garran in each phase), *Paper Trail* (examine the invoice and open its Sponsor Dossier page). |
| S3-4 | **Stable IDs missing** | Stages 4–8 name their package IDs. | `story.stage3.herb_mountain`; branches `branch.stage3.signal_hut`, `branch.stage3.herbalist_shelter`; Museum record `museum.stage3.silvermist_ecology_folio`; dossier entry `dossier.stage3.damaged_invoice`. |
| S3-5 | **Signal Hut operator is unnamed** | Has a state record but no identity, and needs a model sheet. | **Wei Shan (魏珊)**, 29, Qinglan's radio keeper: practical, short hair under a knit cap, olive rain shell, headset around the neck. Rescued, not playable. |
| S3-6 | **Museum record is unnamed** | "Non-actionable illustrated mountain-ecology record". | **Silvermist Ecology Folio** (银雾生态图册): illustrated pages of the basin, the plant without dosage or preparation, the people who gather it. |
| S3-7 | **Outfit names and the free default evolution are undefined** | §14.4 names the two Store sets but not the per-hero designs or the default change. | **Default evolution** (all four): trail boots instead of sandals or soft shoes, a light weather layer in the hero's colour, a small chest radio, a leaf-shaped first-aid pouch; silhouettes and marks unchanged. **Mountain Rescue Outfit**: high-visibility trim, rope harness, helmet with lamp, colour stays the hero's. **Highland Gathering Festival Attire**: embroidered vest or sash, woven belt, festival ribbon in the hero's colour, Qinglan pattern borders. Per-hero details are in the prompt file (§K). Note G2 in the campaign review: Stage 2 outfits are colour swaps, Stage 3 asks for redesigns, so in-play outfits need the outfit pipeline decision. Tomas is about 54 (decided 2026-11-03). |
| S3-8 | **Encounter names** | 12 encounters have no names, which makes balancing notes and tests hard to read. | Lower Switchback: *Hoofprints in the Mud*, *Rope across the Trail*. Qinglan: *Empty Drying Racks*, *The Watch Path*. Moonbell Basin: *Mist over the Beds*, *Two Voices in the Reeds*. Echo Quarry: *Loose Scaffold*, *Hammer Line*, *Cart Rails*. Broken Ridge Camp: *Outer Fence*, *Lantern Row*, *Ren Xia's Enclosure*. Boss: *Chief of the Broken Ridge*. |
| S3-9 | **Sample record states** | The conservation record exists, but its states are unnamed. | **Documented** (sample and notes safe), **Disturbed** (container knocked over and refilled from the main route), **Recovered** (found after loss in a later area). Mandatory continuity is always restored by the main route, as the spec requires. |
| S3-10 | **Cinematic shot list deferred** | §16.2 lists minimum beats but no shots. | 15 Flow clips plus 4 stills, listed in the prompt file: title loop; research update; partnership map; gathering at the ledge; return with the demand; departure; radio intercept; planning cabin; cart-tunnel escape; Garran restrained; private case; reunion; seals compared; Tomas at the lowland shelter; final panorama. All clips are short, with a locked camera and small motion, joined in editing. |
| S3-11 | **Garran's boss music layers** | Cue 6 exists; the layers are unnamed. | Three layers that follow his phases: *Hookstaff* (stone percussion and low strings), *Clinch* (hand drums close, breath flute bends), *Winch* (iron chain rhythm and full strings). Plus a capture stinger that resolves into the Mist and Resolve motif. |
| S3-12 | **Bandit visual identity** | Garran's raiders need a look that is not a faction symbol (the sponsor must stay hidden). | Weathered charcoal and ochre clothing, a dull-red rope armband, scarves, no emblem. Garran adds a dull-red vest and the Quarry Hookstaff. |

## 3 · Smaller notes

- **Tomas's look (campaign review G1, decided 2026-11-03).** About 54, upright, grey-haired, in a dark travelling coat; the Stage 2 frailty was an act.
- **Shared assets with *Storm over Qinglan*.** Qinglan Hamlet, Gao Wen and the Signal Hut should be built once and reused by that Curated Mission; the prompt file marks them `SHARED`.
- **Mounted kit.** Reuse each hero's bike kit names and moves on the horse (same input mapping, horse timing). This avoids a new move list and new Guide entries.
- **"No new Stage 3 cheat code is required"** in §15 and `STEADYRIDE` in the cheat list say the same thing in two ways; reword §15 to "Stage 3 adds STEADYRIDE".
- **Laboratory mice.** Mentioned in the research update text only; never shown.
- **Builder review.** The spec asks for a builder review (§21). Do it at the start of M27, after the Constitution audit (M24), so it can confirm the condition model (S3-1) against the shared module.

## 4 · What I changed

Nothing in the Stage 3 specification yet. These proposals are applied in the prompt file and the roadmap only. When you approve them, I will write them into the specification (sections 7.2, 14, 16 and appendix E) in one edit.

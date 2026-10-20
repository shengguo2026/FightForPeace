# Fight for Peace — Review Findings and Open Decisions

**Review of:** `Features_Decisions.md` and `2026-10-18-fight-for-peace-game-specification.md` (v0.3), plus `favicon.svg` and `GuoPhoto.jpg`
**Date:** 2026-10-20
**Status:** Awaiting your decisions

## How to answer

Each decision below has options and a recommended one (marked ★). Reply with either:

- **"Accept all recommendations"**, or
- only the overrides, e.g. `D3: B, D4: you decide C, rest accepted`.

After that I fold the answers into both documents, then deliver the technical evaluation and the two prompt lists.

Overall verdict: the combat design is unusually thorough and internally consistent. The real gaps are in three places: **who and what things look like** (art direction, heroes, elder, setting), **a few undefined game rules** (defeat/continues, Team Attack key, P2 keyboard), and **feasibility of the vertical-slice scope**, especially art volume and local-Wi-Fi netcode.

---

## Part 1. Decisions needed

### D1. The elder's likeness and age

**Finding.** The feature list says the elder is "the village's wise elder" and is based on your photo. The photo shows a man of working age with short black hair and metal-frame glasses, not an elder. The spec never says whether the likeness is aged up.

**Feasibility note.** Google Flow/Veo restricts generating video from photos of real, identifiable people, and the decision log already says not to depend on Flow's Avatar feature. The safe pipeline is: Codex turns the photo into a **stylized illustrated character sheet**, and only that illustration (never the raw photo) goes into Flow as an ingredient or start frame.

| Option | What it means |
|---|---|
| **A ★** | Age-progress your likeness to about 65–70: same face shape, eyes, and glasses, with grey hair, a short grey beard, and traditional elder clothing. Clearly recognizable as you, and fits "wise elder". |
| B | Keep your current age, and reframe the role as a young "village head / scholar-advisor" rather than an elder. Only needs a text change. |
| C | Use your likeness for another character (for example the Mountain Guardian), and design the elder from scratch. |

### D2. Visual style

**Finding.** Appendix C only *recommends* "illustrated 2D martial folklore" and leaves the style decision open. Every image and video prompt depends on it, so it must be fixed before generation.

| Option | What it means | AI-generation risk |
|---|---|---|
| **A ★** | **Cel-shaded illustrated characters** (clean ink outlines, flat colours with 2–3 shade tones) over **painterly backgrounds**. | Lowest. Flat colours and clear outlines keep characters consistent from image to image and are easy to clean up and recolour. |
| B | Fully painterly characters and backgrounds (the spec's candidate taken literally). | High. Painterly rendering drifts between generations, and it is hard to keep a sprite consistent across 100+ poses. |
| C | Hi-bit pixel art, closest to *Final Fight* or *Captain Commando*. | High. AI pixel art is inconsistent at grid level and needs heavy manual pixel cleanup. |

### D3. Cultural setting and technology era

**Finding.** The world's culture and era are never stated. Stage 1 is clearly pre-industrial (slings, water mills, handwheels, canals). But the confirmed later content adds **revolvers, machine guns, grenades, and motorbikes**, which implies an early-20th-century or modern world. That is a tonal and visual conflict that every prompt must resolve. Your photo, the favicon glyph, and the Chinese localization suggest an East-Asian flavour, but that is not written down anywhere.

| Option | What it means |
|---|---|
| **A ★** | A fictional **Chinese-inspired river village** (stone arch bridges, water mills, canal locks, tiled roofs, terraced fields) in a timeless pre-industrial style. The **outside sponsor** brings foreign industrial technology, so later stages escalate visually from black iron armour to firearms and motorbikes. That escalation becomes part of the story, and the firearms content stays coherent. |
| B | The same village, but strictly pre-modern. Firearms and motorbikes are dropped or reskinned (crossbows, fire-lances, horses, carts). |
| C | A pan-cultural fantasy village with no specific cultural reference. |

### D4. Founding heroes' look: gender, age, build

**Finding.** Final names, ages, genders, and visual designs are unresolved, but they are needed before any character art. The archetypes are: Mountain Guardian (calm craftsperson and waterworks keeper, grounded power) and River Scout (warm, alert messenger and river guide, mobility).

| Option | Mountain Guardian | River Scout |
|---|---|---|
| **A ★** | Man, about 35–40, broad and sturdy, practical work clothes, rolled sleeves, leather work apron or bracers | Woman, about 20–24, lean and agile, short jacket, wrapped shins, light sandals, hair tied back |
| B | Woman, about 35–40, sturdy | Man, about 20–24, agile |
| C | Both men | — |
| D | You describe them | — |

A mixed pair (A or B) gives the two heroes the most distinct silhouettes at gameplay size. I keep the working titles until you choose names.

### D5. How character animation is produced

**Finding.** The spec's Anchored Hybrid Sprite Pipeline asks for **complete strips with exact frame counts** for every action. That is the single largest feasibility risk. Image generators (Codex's included) cannot reliably produce a multi-frame strip with consistent identity, proportions, and spacing. And each founder needs roughly **45–60 actions**: 15 normals, 3 Specials, 1 Ultimate, defence, grab and throw, weapon, hurt, knockdown, locomotion and so on. Two heroes therefore need **about 400–700 drawn frames**, before enemies and the boss.

| Option | What it means | Approximate frames for the slice |
|---|---|---|
| **A ★** | **Key-pose limited animation.** Each action is 3–6 hand-picked poses (anticipation, contact, follow-through, recovery), each generated as a **single image** from the approved model sheet, then cleaned up. Smears, effect layers, squash and hit-stop sell the motion, as many classic arcade brawlers did. Frame data stays authored in data at 60 Hz, independent of drawing count. | about 200–260 per hero, about 1,200 total |
| B | Full exact-frame strips as the spec says (8–20 frames per action). | about 600+ per hero, 3,000+ total |
| C | Cut-out skeletal rig (parts animated with bones). Few drawings, but it looks puppet-like in extreme poses, and the spec itself rejects rigs for throws, ground states and impacts. | lowest drawing count |

### D6. Default keyboard layout across keyboard layouts

**Finding.** The default cluster `T Z U / G H J` is a neat 3×2 block on a **German QWERTZ** keyboard. But the rule "bindings follow the *printed* character" means that on a **US/UK QWERTY** keyboard, Jump (`Z`) moves to the bottom-left corner beside `A`. On **French AZERTY**, `W`, `A` and `Z` collide with the movement keys. It is also a feasibility gap: Firefox and Safari do not expose the keyboard layout map before a key is pressed.

| Option | What it means |
|---|---|
| **A ★** | Define defaults by **physical key position** (the codes `KeyT KeyY KeyU KeyG KeyH KeyJ` plus WASD positions), so every layout gets the same comfortable 3×2 cluster. Show the **printed** label: German players see `Z`, US players see `Y`, French players see `ZQSD` for movement. Labels come from the layout map where the browser supports it, otherwise from the first observed key press, with a layout picker in first-launch setup. |
| B | Keep printed-character defaults as written. They are good on QWERTZ, awkward on QWERTY, and broken on AZERTY. |

### D7. Same-device co-op on one keyboard

**Finding.** The spec says "all keyboards on the device count as one keyboard source" and "one physical input source belongs to only one player". In practice, **Player 2 must own a gamepad**. That may or may not be intended. Two players sharing one keyboard is a classic arcade habit.

| Option | What it means |
|---|---|
| **A ★** | Add an optional **Split Keyboard** source: P1 uses the left cluster and P2 uses arrows plus the numpad (or `IJKL` and nearby keys on laptops). Gamepad stays recommended. The game warns about keyboard ghosting (some keyboards drop simultaneous keys) and offers a ghosting test in the live tester. |
| B | Keep it as written: same-device co-op needs at least one gamepad. |

### D8. Defeat, lives, continues and checkpoints (undefined)

**Finding.** The HUD spec shows "lives or continues", and the cheat `HOMECOMING` says "without exhausting continues… if no checkpoint exists, restart the stage". But **no rule defines lives, continues, hero defeat, co-op revival, or checkpoint placement**. This is the most important rules gap.

| Option | What it means |
|---|---|
| **A ★** | **Per-stage continues by difficulty** (candidate: Easy 5, Medium 3, Hard 2, Extreme 1, Ultimate 0). Solo defeat spends a continue and restores the latest checkpoint (authored at beats 3, 5 and before the boss). With no continues left, the stage restarts. **Co-op:** a defeated hero is *downed*, and the partner can revive them by holding `J` nearby for about 2 s, which is interruptible. Otherwise the downed hero returns at the next encounter boundary. A team continue is spent only when both are down. `HOMECOMING` then has a clear meaning. |
| B | Unlimited checkpoint retries (modern style, no lives). Simpler, but `HOMECOMING` becomes almost meaningless and should be removed. |
| C | Classic arcade lives plus credits per run, and game over returns to the stage start. |

### D9. Local-Wi-Fi netcode for the first version

**Finding.** The confirmed model (prediction, bounded rollback, state-hash resync, survival proxy, host migration, courtesy hold, two-path pairing) is console-grade netcode. It is feasible in a browser, but it is probably **the largest engineering item in the project**, comparable to the whole combat core. On a LAN, round-trip latency is usually 2–10 ms, so rollback brings little benefit there compared with simple input delay.

| Option | What it means |
|---|---|
| **A ★** | **Vertical slice:** deterministic **delay-based lockstep** (2–4 frames of input delay, adjusted to measured latency), state hashes plus snapshot resync, room-code/QR pairing, copy-paste fallback, and a clean "session ended, checkpoint kept" path. The architecture stays rollback-ready (snapshot-able state, stable event IDs). **After the slice:** prediction and rollback, survival proxy, and host migration. The decision models stay confirmed; only their delivery is phased. |
| B | Build the full confirmed model inside the vertical slice. |

### D10. Vertical-slice content boundary

**Finding.** The slice must prove all modes, three languages, the store, Credits, achievements foundation, cheats, Academy, and the environmental slice, with seven enemy types and the boss. Three items are not bounded:

1. **Store contents.** The spec says "every purchased move is beyond slice", but the store must exist. What is in it?
2. **Difficulty variants.** Hard, Extreme and Ultimate variants need distinct silhouettes, and "palette alone is insufficient". That could mean up to 15 extra enemy designs.
3. **Later-hero material.** Appendix A.6–A.8 (four future heroes, 48 moves) sits in the Stage 1 spec.

| Option | What it means |
|---|---|
| **A ★** | Store at slice: **one purchased Special, one directional Ultimate and one outfit per founder**, plus 2 profile badges. Difficulty: the Easy, Medium and Hard **behaviour profiles** for all core enemies, plus the **Black-Iron Enforcer**. Extreme and Ultimate are playable with the core roster's behaviour profiles, and new variant art comes after the slice. Future heroes are moved into a separate "Expansion Seeds" document. |
| B | Keep the scope exactly as written. |

### D11. Team Attack default binding (unresolved in the log)

**Finding.** Team finishers use an abstract **Team Attack** action, but all seven default keys are taken and no default exists.

| Option | What it means |
|---|---|
| **A ★** | A dedicated key at physical position **`KeyB`**, directly below `G/H` on every layout. Gamepad: a shoulder button. The inviter and the confirming partner use the same action. There is no chord ambiguity. |
| B | Chord `H + J`. No new key, but it collides with weapon throw and Ultimate input near meter thresholds. |

---

## Part 2. Assumptions I will make unless you object

These are small gaps. I will treat them as below unless you say otherwise.

1. **Favicon and title.** The favicon (yellow 国-style glyph on blue) is a **UI brand mark only**. It is never baked into generated art, because it is a written character and the artwork policy forbids text. The game title "Fight for Peace" is rendered by the UI as three localized typographic logos over a **text-free emblem illustration**.
2. **Palette tie-in.** The favicon colours (royal blue `#2450f5`, warm yellow `#f3d548`) become the **village / heroes' accent colours**. The occupying faction uses black iron, rust and muddy ochre, so the two sides read differently at a glance (with shape cues as well as colour, per the accessibility rules).
3. **Worker rescue mechanic.** Coerced workers are freed by a short `J` interaction on their bonds once nearby enemies are cleared or distracted. There are no escort missions in Stage 1.
4. **Gameplay SFX source.** No SFX tool is named. Assumed: royalty-free libraries (for example Sonniss GDC bundles, CC0 Freesound) plus a generator such as ElevenLabs Sound Effects for gaps, recorded in the asset manifest.
5. **Render resolution.** 1920×1080 logical playfield (16:9), with characters about 300–360 px tall at that size, and scaled with letterboxing for other aspects.
6. **Score basics.** Score comes from damage dealt, combo variety, Exact Blocks and Counters, rescues and time. Thresholds remain tuning values.

---

## Part 3. Feasibility notes (no decision needed; will be designed into the technical evaluation)

| # | Risk | Mitigation |
|---|---|---|
| F1 | **Cross-browser determinism.** JavaScript `Math.sin/cos/pow/exp` give slightly different results in Chrome (V8), Firefox and Safari, which breaks local-Wi-Fi sync and replays between browsers. | The simulation uses **fixed-point integer maths** and lookup-table trig only. A lint rule forbids `Math.*` floats in the core, and a CI cross-browser replay test checks hashes match. |
| F2 | **Safari can delete IndexedDB** for sites not visited for 7 days (tracking prevention), which would wipe saves. | Call `navigator.storage.persist()`, prompt for portable backup export, recommend "Add to Dock" (PWA install) on Safari. Already partly covered by Portable Backups. |
| F3 | **Gamepad timing.** The Gamepad API is polled, not event-driven, so the "real press timestamp" for Exact Block and Counter is quantized to the poll rate. | Poll on every animation frame plus a high-rate timer, and use `gamepad.timestamp` where reliable. Keyboard keeps true event timestamps. Document the tolerance in Combat Lab. |
| F4 | **WebRTC on Wi-Fi.** Client-isolated networks (hotels, schools, many guest Wi-Fis) block peer connections. Chrome hides local IPs behind mDNS names. | Already acknowledged in the log. Add a clear diagnostic, and consider an optional TURN relay later (which is no longer purely "local"). |
| F5 | **Image consistency.** Character identity drifts between generations. | Every character prompt **attaches the approved model sheet** as a reference image. Poses are generated one per image on a transparent or flat background, never as multi-frame strips (see D5). |
| F6 | **Text in generated media.** Image and video models often invent gibberish on signs, banners and cloth. | Every prompt carries a "no text, letters, symbols, signage" clause, and banners and signs are designed as abstract patterns. Video prompts avoid shop signs and documents in frame. |
| F7 | **Video length and continuity.** Veo clips are about 8 s each. | Every cinematic shot starts from an approved **Codex still as the start frame** ("Frames to Video"), so the two prompt lists are linked by shot ID. |
| F8 | **CJK font size.** Simplified Chinese fonts are 5–15 MB. | Subset fonts at build time to the glyphs used in localization files, and lazy-load per language. |
| F9 | **Overall scope.** Even with D5-A, D9-A and D10-A, the slice is a large multi-month project. | The technical evaluation will propose a milestone plan (Combat Lab M1–M6 first) and an effort estimate. |

---

## Part 4. Document consistency issues (I will fix these when updating the docs)

1. `Features_Decisions.md` §12 says "no unresolved feature-model gap", but several items are still labelled **Proposed**: line 30 (localization keys), 37 (asset manifest), 245 (distinct defence feedback), 760–761 (Lab milestone and tools), 778, and 804–813 (Module 1 validation goals). All of them are effectively adopted elsewhere, so they should be promoted to Confirmed.
2. Lives and continues are referenced (HUD, `HOMECOMING`) but never defined (see D8).
3. The spec file name says 2026-10-18 while its header says version 0.3 dated 2026-10-20. The spec's **§20 Review gate** sits *after* the appendices, and the appendices use top-level `#` headings. I will move §20 before the appendices and demote the appendix headings.
4. The Team Attack default binding is missing from the spec's §5.2 key table (see D11).
5. Spec §3.2 stage flow adds "optional cheats" to the briefing step, while `Features_Decisions.md` line 945 omits them. I will align line 945 to the spec.
6. The spec is a Stage 1 spec but contains four future heroes and full mount and firearm system specs (§11.3, §11.4, A.6–A.8). Depending on D10, I will move them to `docs/expansion-seeds.md` and leave short references behind.

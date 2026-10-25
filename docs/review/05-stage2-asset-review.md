# Fight For Peace — Stage 2 Generated Asset Review

**Date:** 2026-10-25
**Folder reviewed:** `C:\AI\Codex\FightForPeace\assets` (read only), 24 files
**Checked against:** Stage 2 spec and decision log, `stage2_google_flow_start_frame_prompts.md`, `stage2_google_flow_music_prompts.md`, the approved Stage 1 references (R-03 Mountain Guardian v2, R-04 River Scout, R-08 mockup), and Features_Decisions §13 (D2 cel-shaded style)

## Summary

| Verdict | Assets |
|---|---|
| **Regenerate** | P03 clip; Wind Sentinel model sheet; Fire Warden model sheet (recommended, so both twins share the corrected style) |
| **Keep, trim during editing** | P01, P04, P05 clips |
| **Keep as is** | P02 clip; all five start frames (P01–P05); both human references (as intermediates only) |
| **Keep as candidates, with conditions** | All ten music tracks. Optional regeneration of Cue 4 and of Boss states 06B/06D, depending on how you want transitions to work |

Evidence images: `spec-review/stage2-asset-evidence/`.

## 1. Hero references and model sheets

### Human references (`athletic-daughter-age-18-reference-v1`, `fire-warden-human-reference-v1`)

Fine as intermediate likeness references. The two read as related but distinct fraternal twins, as the spec asks. Two rules apply:

- Apply the same rule as the elder (D1): use only the stylized model sheets, never these photoreal images, as Flow ingredients or start frames.
- Record creator consent and the source photo in the asset manifest (Stage 2 Appendix C), because the sister is derived from a photo of a real teenager.

### Wind Sentinel default model sheet v1 — regenerate

1. **Too close to River Scout (main reason).** The sheet's own swatches show storm teal `rgb(56,88,102)` and ivory `rgb(230,218,198)`. River Scout's approved swatches are teal `rgb(57,107,114)` and ivory `rgb(229,214,197)`. Both heroes also wear a high, long ponytail. In a River Scout + Wind Sentinel co-op pair, the two would be hard to tell apart at gameplay scale. Stage 1 accessibility rules require heroes to be distinguishable, and the spec asks her palette to stay readable. See `river-scout-vs-wind-sentinel.jpg`.
   *Fix:* push the main colour toward a cooler slate or storm blue-grey, make cloud grey and silver-cyan carry more of the costume, and keep ivory small. Secure the hair as a shorter or lower tied ponytail or a braid. That still matches the photo and changes the silhouette.
2. **Style drift.** The faces, especially the three head studies, are semi-realistic with soft rendered shading. The approved Stage 1 sheets (R-03, R-04) use clean ink outlines, flat colour and simplified faces (D2). Side by side in co-op and story stills, the twins would look like they come from another game.
   *Fix:* attach R-04 as the style reference and ask for the same line weight, flat two-to-three-tone shading and face simplification.
3. **Costume details vs spec.** Wide cargo trousers with large pockets, where the spec asks for tapered trousers and a clean kicking silhouette. No distinct shin guards (spec: knee and shin guards). The open jacket flaps where the spec asks for a fitted jacket. Safety yellow is more than "minimal".
4. What is already right: the civil-protection emblem has no text, the jacket has a split rear hem, she has forearm guards, gloves and flexible patrol boots, there is no cape or scarf, and the face matches the reference.

### Fire Warden default model sheet v1 — regenerate (recommended)

His palette and silhouette are close to the spec: ember red, charcoal, ash grey and amber, a high collar, compact shoulder reinforcement, a broader stance and a believable 18-year-old face. Regenerate him together with Wind Sentinel because:

1. The same style drift applies (semi-realistic faces vs R-03/R-04).
2. The twins' lower bodies are identical: same cargo trousers, knee pads, boots and gloves. The spec wants shared seam language but role-specific protection, and "does not turn every hero into the same armored soldier".
3. Small spec gaps: forearm protection should be asymmetric, dark bronze is missing, and the spec asks for tapered trousers with reinforced shins.

## 2. Prosperity Interlude start frames and clips (P01–P05)

All five start frames are approved. They are text-free (P02's diagram board faces away from the camera, and the P05 test card shows colour blocks only), consistent with the R-01/R-08 environment style and continuous with Stage 1 locations (stone bridge, water mill). P05 is scientifically sound: separate fish and shrimp tanks, mechanical and biological filters, a pump, aeration, and plant beds above.

All clips are 8 s, 1280×720, 24 fps, and include a generated audio track. Strip the audio in editing, as planned. 720p is fine for the edit; consider upscaling to 1080p for the final export.

| Clip | Verdict | Notes |
|---|---|---|
| P01 Water returns | Keep | Matches the prompt. A dissolve from about 5.4 s to 6.0 s goes to a channel through rice fields, which is the "channel leading toward distant fields" ending the prompt asked for, in a compatible style. |
| P02 Building a reserve | Keep | Sluice opens and water enters the channel as prompted. |
| P03 Seasons of construction | **Regenerate** | Only the first ~2 s are usable. From about 2.2 s it dissolves into a **photorealistic, modern village** with plastic polytunnels and different architecture, then spring. It breaks both the illustrated style and village continuity (`P03-style-break.jpg`). Regenerate from the same start frame. Add: "keep the illustrated cel-shaded style, keep the same village buildings, wooden-framed glass greenhouses only, no photorealism, no polytunnels". |
| P04 Hydroponic cultivation | Keep, trim | First ~3.5 s match the prompt (aisle dolly, harvesting). The second half switches to pipes pouring into open tubs beside the plants and adds hanging lamps. It is plausible but looser. Use 0–3.5 s, or keep the end only as a transition. |
| P05 Aquaponic cycle | Keep, trim | First ~3 s are right. After that, the freshwater prawns turn into **large-clawed crayfish** in a crowded tank (`P05-shrimp-to-crayfish.jpg`), which contradicts the approved "freshwater prawn" system. Use 0–3 s, or regenerate if you need the full 8 s. |

**Continuity note (no regeneration):** a bearded man with a topknot in a brown vest appears prominently in P02, P04 and P05. He closely resembles Mountain Guardian's **v1** costume, but the approved v2 has a slate-blue vest and a leather apron. He works as a recurring villager-engineer. For P09 and P12, where the founders appear, attach R-03 v2 so Mountain Guardian is not shown in the wrong outfit.

## 3. Music (ten Flow Music candidates)

All ten are instrumental cue candidates of 1:53–3:01 with intros and fade-outs. Loop cutting, stingers and transitions were always planned as human editing work, so that is not a reason to regenerate. Metadata titles are Flow's own ("Rooted Hope", "Glass Canopy", …), and the artist tag is `superiorcone`. Record both in the provenance manifest.

Technical measurements (ffmpeg EBU R128; tempo and key are automatic estimates, please confirm by ear):

| Cue | Length | Loudness | Peak | Tempo ≈ | Key ≈ |
|---|---|---|---|---|---|
| 01 Water Became a Future | 2:50 | −14.8 LUFS | −0.3 dBFS | 89 | G major |
| 02 Roadside Vigil | 2:53 | −17.7 | −0.3 | 81 | D minor |
| 03 Glass and Green | 2:05 | −15.9 | −0.3 | 92 | B♭ major |
| 04 Alarm Through the Channels | 2:45 | −17.7 | −0.7 | 81 or 161 | unclear |
| 05 Protect the Living System | 2:56 | −16.5 | −0.5 | 117 (prompt: ~116) | E♭ minor (low confidence) |
| 06A Mounted pursuit | 2:56 | −16.9 | −0.3 | 123 | F minor (low confidence) |
| 06B Armed command | 3:01 | −16.4 | −1.0 | 117 | E♭ minor |
| 06C Predator Unbound | 3:01 | −16.0 | −0.3 | 129 | F minor |
| 06D Scorched Claim and surrender | 2:50 | −16.8 | −0.5 | 81 | E♭ minor |
| 07 What We Protected | 1:53 | −14.7 | −0.6 | 81 | E major |

Findings:

1. **Loudness spread of 3 dB and peaks close to 0 dBFS.** Normalize everything to one target and limit to about −1 dBTP when exporting for the browser. This is editing work, not a reason to regenerate.
2. **Cue 4 vs Cue 5.** The prompts ask for Cue 4 to share Cue 5's ~116 BPM grid so Cue 5 can be layered on top. Cue 5 hit ~117 BPM, but Cue 4 did not. If you want the layered "danger layer" behaviour, **regenerate Cue 4 at 116 BPM**. If switching between the two loops at phrase boundaries is enough, keep both.
3. **Boss family (06A–06D).** The prompts ask for one motif, one tempo grid and one harmonic centre. The four separate generations landed at roughly 117–129 BPM and in two keys (F minor and E♭ minor). Two ways forward, both allowed by the decision log §14 (state changes "at declared musical boundaries or through authored cues"):
   - **Keep and bridge:** transitions use authored stingers, and small tempo differences are time-stretched in editing.
   - **Regenerate 06B and 06D** using 06A or 06C as the anchor (same three-note motif, ~123–129 BPM, F minor). This gives seamless state changes.
   Please also confirm by ear that the three-note jackal motif really recurs in all four states. I can't verify that from measurements.
4. Please listen once for stray vocals or vocal-like textures. The prompts ask for instrumental cues, and measurements can't rule that out.

## Regeneration list

| Priority | Asset | Change |
|---|---|---|
| 1 | Wind Sentinel model sheet | Separate the palette from River Scout, change the ponytail silhouette, match R-04's cel-shaded style, tapered trousers and shin guards |
| 1 | Fire Warden model sheet | Match R-04/R-03's style, give him a different lower body from his sister, asymmetric forearm guard, dark bronze |
| 2 | P03 clip | Same start frame, with the style and continuity lock added to the prompt |
| 3 (optional) | P05 clip | Only if you need more than 3 s; add "freshwater prawns only, no crayfish, no large claws" |
| 3 (optional) | Cue 4 | Only for layered combat danger: same prompt, fixed at 116 BPM |
| 3 (optional) | Boss 06B, 06D | Only for seamless boss transitions: anchor to 06A/06C motif, tempo and key |

Since the twins' sheets feed every later start frame (P07–P12, all Roadside Deception and later chapters), regenerate them **before** generating any start frame that shows the twins.

## Update 2026-10-25: Wind Sentinel v2 — approved

`wind-sentinel-default-model-sheet-v2.png` fixes all required points. Swatches: slate blue-grey `rgb(68,79,95)`, cloud grey `rgb(143,147,154)`, charcoal, silver-cyan `rgb(140,172,187)` and a small yellow. At 25 % size next to River Scout the two are now instantly distinguishable (`stage2-asset-evidence/river-scout-vs-wind-sentinel-v2.jpg`). The style now matches R-03/R-04: clean ink outlines, flat shading and simplified faces. She has a braid instead of a ponytail, a fitted zipped jacket, tapered trousers without cargo pockets, shin guards, and an emblem made only of simple shapes.

Minor notes, none needing regeneration:
- The shin guards read heavier and more "armoured" than the spec's "lightweight guards". Keep them, but keep them slim when drawing poses.
- In the head close-ups the hair is gathered higher than in the full-body back view. Use the full-body back view (braid from the crown to the shoulder blades) as canonical.
- Her palette is mostly grey. Check her contrast against metal greenhouse frames in the first Stage 2 gameplay mockup.
- Please confirm the likeness to the original photo; the cel-shaded simplification changes the face more than v1 did.

## Update 2026-10-25 (2): Fire Warden v2 and music v2

### Fire Warden v2 — approved
`fire-warden-default-model-sheet-v2.png` matches the approved Wind Sentinel v2 and the Stage 1 cel-shaded style. Palette: ember red, charcoal, ash grey, dark bronze and amber, as specified. He has a high collar, compact shoulder reinforcement, charcoal side panels, asymmetric forearm guards (left longer) that agree across views, grappling gloves, tapered trousers with one small thigh pocket, articulated knee guards, bronze-rimmed full shin guards and sturdy boots. He shares the emblem and seam language with his sister. He is broader and more grounded than her but still reads as 18. His lower body now differs from hers through the bronze rims and heavier guard shapes, though both twins still wear tall shin guards. That is acceptable.

### 06B Armed command v2 — reject (it is a copy of 06C)
Its metadata title is "Predator Unbound Extended" (4:00). Waveform comparison with `06C_Predator Unbound.mp3` shows the first ~3:00 is the same recording (normalized cross-correlation up to 0.94; level about 7 % lower), followed by about one extra minute. It is an extension of 06C, not a new armed-command state. Either keep 06B v1 and join the states with stingers, or regenerate as a **new** generation, not "extend" (use "remix" or a reference track if Flow Music offers it, otherwise the plain text prompt).

### 06D Scorched Claim and surrender v2 — keep (with a key check)
A distinct composition at ≈129 BPM, the same tempo grid as 06C and 06B v2, so phase changes can cut on bar lines. The automatic key estimate centres on **E minor**, a semitone below the F minor anchor, with low confidence. If your ear agrees, shift it up one semitone in editing, which is inaudible on this material, or bridge with a stinger. Please confirm by ear that both endings (surrender release and forced capture) are present.

### 05 Protect the Living System v2 — keep v1 instead
This cue was not on the regeneration list; the optional prompt was for **Cue 4**. The new version measures ≈96 BPM in G minor, further from the 116 BPM target than v1 (≈117 BPM). Keep **v1** as Cue 5. The layering mismatch is still in Cue 4 (≈81/161 BPM): regenerate Cue 4 with prompt 5 if you want Cue 5 layered on top of it.

## Decision 2026-10-25: final music selection

Creator decision: keep **06B v1** and **05 v1** (and Cue 4 v1). The boss family is therefore 06A v1, 06B v1, 06C v1 and 06D v2. Phase changes between states with different tempos or keys use authored transition stingers, as the decision log §14 allows. Cue 5 plays as an alternate loop switched at phrase boundaries, not as a layer on top of Cue 4. Remaining visual work: P03 clip (required) and optionally P05, after the Google Flow daily reset.

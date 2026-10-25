# Fight For Peace — Stage 2: which file the game uses

**Status:** 2026-10-25, after the asset review (`spec-review/05-stage2-asset-review.md`) and the creator's music decision.
**Rule:** implementation imports only the file in the **Use** column. Files under "Not used" are kept for history. When a pending item is regenerated, this list is updated before it is integrated.

## Characters

| Asset | Use | Not used | Notes |
|---|---|---|---|
| Wind Sentinel (风神) default model sheet | `wind-sentinel-default-model-sheet-v2.png` | `…-v1.png` | v1 palette too close to River Scout; semi-realistic faces. Canonical hair: braid from crown to shoulder blades (full-body back view). Keep shin guards slim in poses. |
| Fire Warden (火神) default model sheet | `fire-warden-default-model-sheet-v2.png` | `…-v1.png` | Longer forearm guard on the **left** arm in every pose. |
| Human likeness references | `athletic-daughter-age-18-reference-v1.png`, `fire-warden-human-reference-v1.png` | — | **Reference only.** Never shipped, never used as Flow ingredients or start frames (same rule as the elder photo, D1). Record creator consent in the manifest. |

Model sheets are references for later pose generation, like Stage 1's R-03/R-04; the game itself ships pose sheets generated from them.

## Prosperity Interlude start frames (stills)

| Asset | Use | Notes |
|---|---|---|
| P01–P05 | `P01-water-returns-v1.png` … `P05-aquaponic-cycle-v1.png` | All approved. Also serve as the mandatory still fallbacks for their clips. |

## Prosperity Interlude clips

All clips: strip the generated audio track during editing (music, narration and ambience are separate layers).

| Clip | Use | In → out | Not used | Notes |
|---|---|---|---|---|
| P01 Water returns | `P01-water-returns-v1.mp4` | 0.0 → 8.0 s | — | The dissolve to the rice-field channel at 5.4–6.0 s is the intended ending. |
| P02 Building a reserve | `P02-building-a-reserve-v1.mp4` | 0.0 → 8.0 s | — | |
| P03 Seasons of construction | **pending v2** | — | `P03-seasons-of-construction-v1.mp4` | v1 turns photorealistic after ~2.2 s. Regenerate with prompt 3 of `art/prompts/stage2_regeneration_prompts.md` after the Flow daily reset. Until then the P03 still is the placeholder. |
| P04 Hydroponic cultivation | `P04-hydroponic-cultivation-v1.mp4` | 0.0 → 3.5 s | the rest | Second half switches to open tubs and hanging lamps. |
| P05 Aquaponic cycle | `P05-aquaponic-cycle-v1.mp4` | 0.0 → 3.0 s | the rest | Prawns turn into crayfish after 3 s. Optional v2 (prompt 4) would replace this trim. |

## Music (Prosperity Under Siege)

| Cue | Use | Not used | Notes |
|---|---|---|---|
| 1 Water Became a Future | `01_Water Became a Future.mp3` | — | |
| 2 Roadside Vigil | `02_Roadside Vigil.mp3` | — | |
| 3 Glass and Green | `03_Glass and Green.mp3` | — | |
| 4 Alarm Through the Channels | `04_Alarm Through the Channels.mp3` | — | Not on Cue 5's tempo grid: Cue 5 is an **alternate loop** switched at phrase boundaries, not a layer on top. |
| 5 Protect the Living System | `05_Protect the Living System.mp3` (v1) | `…_v2.mp3` | v1 ≈117 BPM is closer to the 116 BPM target than v2 (≈96 BPM). |
| 6A Mounted pursuit | `06A_Mounted pursuit.mp3` | — | ≈123 BPM |
| 6B Armed command | `06B_Armed command.mp3` (v1) | `…_v2.mp3` | v2 is an extension of 06C ("Predator Unbound Extended"), not a new state. |
| 6C Predator Unbound | `06C_Predator Unbound.mp3` | — | ≈129 BPM, F minor (anchor) |
| 6D Scorched Claim and surrender | `06D_Scorched Claim and surrender_v2.mp3` | `06D_Scorched Claim and surrender.mp3` (v1) | Same ≈129 BPM grid as 06C. Probably E minor: shift +1 semitone in editing if confirmed by ear. Confirm both endings by ear. |
| 7 What We Protected | `07_What We Protected.mp3` | — | |

Boss phase changes between states with different tempo or key use authored transition stingers (decision log §14). All cues: normalize to one loudness target and limit to about −1 dBTP for browser export; record the Flow Music titles and the `superiorcone` artist tag in the provenance manifest.

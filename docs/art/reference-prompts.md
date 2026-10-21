# Reference Prompts (Asset Track A1)

**Status:** For creator generation and review. These are **references only**: they fix the look of the game before the full numbered prompt lists are written. Nothing generated from them is final art.

**Order:** generate R-01 first. R-01 (approved 2026-10-21) is the **environment** style reference: attach it to background prompts (R-07, R-08). Do **not** attach it to character prompts, because its painterly look would pull characters away from the cel-shaded style; characters rely on the shared style block instead. Generate R-02 (elder) and R-03/R-04 (heroes) next, because later prompts attach those images.

## Shared style block (paste at the end of every Codex prompt)

> Style: cel-shaded 2D game illustration, bold clean ink outlines of even weight, flat colour fills with two to three hard-edged shade tones, no gradients on characters, no photorealism, no 3D render look. Setting: a fictional Chinese-inspired rural river village in a timeless pre-industrial era. Warm, hopeful, handcrafted mood. Absolutely no text, letters, numbers, calligraphy, logos, signatures, watermarks, symbols on clothing or banners, or writing of any kind.

## Shared negative clause (paste into every Google Flow prompt)

> No text, no subtitles, no letters, no signage, no writing on cloth or paper, no logos, no watermark. Do not change the characters' faces, clothing or colours between shots.

---

## Codex reference images

### R-01 · Style frame: the village at peace
- **Size:** 1536×1024 (landscape)
- **Attach:** nothing
- **Prompt:**
  > A wide establishing view of a peaceful river village at golden hour. A stone arch bridge crosses a calm river; a wooden water mill turns on the far bank; tiled grey roofs with upturned eaves; terraced green fields climbing gentle hills; willow trees along the water; small figures of villagers carrying baskets. Painterly background treatment with soft brush texture and atmospheric depth, while a few foreground props (a barrel, a wooden cart) are drawn in the cel-shaded character style to show how gameplay objects sit on top of painted backgrounds. [Shared style block]
- **What I check:** the cel-shaded/painterly contrast reads clearly; it feels Chinese-inspired without being a copy of a real place; there is no text anywhere.

### R-02 · The elder: model sheet (based on GuoPhoto.jpg)
- **Size:** 1536×1024
- **Attach:** `GuoPhoto.jpg` only
- **Prompt:**
  > Character model sheet of a wise village elder, about 68 years old, age-progressed from the attached photo: keep the same face shape, eye shape, nose and mouth, and the same thin metal-frame rectangular glasses. Grey hair combed back, a short neat grey beard and moustache, gentle thoughtful expression, slightly stooped but dignified posture. Clothing: a long dark-blue cotton scholar's robe with a lighter inner collar, a simple cloth sash, cloth shoes, holding a plain wooden walking staff. Show three full-body views side by side (front, three-quarter, side) on a plain light-grey background, plus three head close-ups (calm, concerned, encouraging smile). Consistent proportions across all views. [Shared style block]
- **What I check:** recognizably you, aged plausibly; glasses kept; robe has no patterns that look like characters.

### R-03 · Mountain Guardian (山神): model sheet
- **Size:** 1536×1024
- **Attach:** nothing
- **Prompt:**
  > Character model sheet of a calm, sturdy village craftsman and waterworks keeper, man about 38 years old, broad shoulders, strong forearms, short black hair tied in a small top knot, short stubble, steady kind eyes. Practical work clothes: a sleeveless earth-brown jacket over a rolled-sleeve off-white shirt, a thick leather work apron cut short at the thighs, leather bracers, dark trousers wrapped at the shins, straw-soled sandals. Grounded wide stance, open palms, protective rather than aggressive. Show front, three-quarter, side and back full-body views on a plain light-grey background, plus a small colour palette strip with five flat swatches and no labels. Identical proportions in every view. [Shared style block]
- **What I check:** silhouette reads "grounded power" at small size; distinct from R-04 at a glance.

### R-04 · River Scout (河神): model sheet
- **Size:** 1536×1024
- **Attach:** nothing
- **Prompt:**
  > Character model sheet of a warm, alert village messenger and river-path guide, woman about 22 years old, lean and agile build, long black hair tied in a high ponytail with a teal cloth band, bright confident expression. Clothing: a short fitted teal-and-white jacket with crossed collar, a cloth belt with a small pouch, knee-length split shorts over leggings, shins wrapped in white cloth, light sandals. Light, springy ready stance on the balls of her feet. Show front, three-quarter, side and back full-body views on a plain light-grey background, plus a small colour palette strip with five flat swatches and no labels. Identical proportions in every view. [Shared style block]
- **What I check:** silhouette reads "mobility"; readable next to R-03 at gameplay scale.

### R-05 · Heroes lineup with the elder
- **Size:** 1536×1024
- **Attach:** R-02, R-03, R-04
- **Prompt:**
  > The three attached characters standing side by side at the same scale on a plain light-grey background, full body, front three-quarter view: the elder in the middle, the craftsman on his left, the young messenger on his right. Keep every face, outfit, colour and proportion exactly as in the attached sheets. A thin horizontal ground line under their feet. [Shared style block]
- **What I check:** relative heights, palette harmony and the cast's identity.

### R-06 · Stage 1 enemy lineup
- **Size:** 1536×1024
- **Attach:** R-05 for scale and style
- **Prompt:**
  > Lineup of seven antagonists from a faction occupying a river gate, standing in a row at the same scale as the attached heroes, plain light-grey background, full body, three-quarter view. From left to right: (1) a thin, nervous young recruit in ill-fitting rust-brown padded vest holding a wooden club, frightened expression; (2) a stocky shield bearer with a large round wooden shield banded with iron; (3) an agile runner in a short sleeveless tunic with wrapped legs, crouched to sprint; (4) a broad overseer with a coiled rope and hook over one shoulder, sneering; (5) a lookout with a leather sling and a pouch of stones, wearing a wide straw hat; (6) a towering enforcer in blackened iron plate armour of a foreign, more industrial design, riveted, with a heavy iron gauntlet, face hidden by a plain visor; (7) the commander, tall and proud, in a dark ochre long coat over lamellar armour, a sash, with a confident arrogant posture. The faction uses rust, black iron and muddy ochre colours, clearly different from the heroes. Distinct silhouettes for each. No emblems or symbols. [Shared style block]
- **What I check:** each role is readable by silhouette alone; the enforcer looks "foreign tech"; no symbols.

### R-07 · Stage 1 background: the occupied bridge (layered)

> **Camera rule for all stage backgrounds (learned from R-07 v1):** the camera stands on the walkable surface at a slightly elevated side angle (about 20° down); the walkable floor fills the bottom 35–40% of the image and visibly recedes in depth; no front railing or foreground wall along the bottom edge. See the R-07 v2 prompt in the review thread.
- **Size:** 1536×1024
- **Attach:** R-01
- **Prompt:**
  > Side-view background for a 2D belt-scrolling brawler: a wide stone arch bridge over a nearly dry riverbed, viewed straight from the side, painted in layers. Far background: hazy hills and a distant water mill. Middle: the bridge deck runs horizontally across the image as a flat walkable band occupying the lower third, with low stone railings at the back edge only. Foreground edge: a few reeds and a broken barrel. Wooden barricades and empty water buckets suggest the occupation. Overcast late-morning light. Leave the walkable band uncluttered and evenly lit so characters remain readable. [Shared style block]
- **What I check:** a clear, flat walkable depth band; readable layers for parallax; no text on barricades.

### R-08 · Gameplay-scale mockup
- **Size:** 1536×1024
- **Attach:** R-03, R-04, R-06, R-07
- **Prompt:**
  > A gameplay screenshot mockup of a side-view 2D brawler using the attached background and characters: the craftsman blocking a shield bearer on the left, the messenger performing a jumping kick at a runner in the centre, a frightened recruit backing away on the right. Characters are about one third of the image height, drawn in the same cel-shaded style, with simple bright impact sparks (abstract star shapes, no text). Leave the top-left and top-right corners empty for a game interface. No interface elements, no numbers, no text. [Shared style block]
- **What I check:** readability at gameplay scale, character-to-background contrast, effect style.

---

## Google Flow reference clips

Use **Frames to Video** with the listed Codex image as the start frame, 8 seconds, 16:9. For these tests, keep audio as ambience only.

> **Flow rules learned from RV-01 v1 (approved 2026-10-21):** (1) start frames must already be 16:9 (for example 1536×864, or a 16:9 crop of a 3:2 image), otherwise Flow letterboxes and crops the frame; (2) state where people may walk ("villagers walk only on the bridge and riverbank paths; nobody steps into the water"), because Flow otherwise invents physically odd motion.

### RV-01 · Village ambience (style and motion test)
- **Start frame:** R-01
- **Prompt:**
  > Slow gentle camera push-in over the peaceful river village at golden hour. The water mill wheel turns steadily, willow branches sway, the river flows calmly, a few villagers walk across the stone bridge carrying baskets. Keep the cel-shaded characters and painterly background style exactly as in the start frame. Soft ambient sound of flowing water, birds and distant wooden mill creaks. [Shared negative clause]
- **What I check:** style stability across 8 seconds, natural motion, and no invented text.

### RV-02 · The elder speaks (character consistency test)
- **Start frame:** a crop of R-02's three-quarter view, placed in front of a simple village courtyard (or use R-02 as an ingredient)
- **Prompt:**
  > Medium shot of the wise elder standing in a quiet village courtyard at dusk, leaning on his wooden staff. He looks toward the camera with concern, then slowly raises one hand as if explaining something important, then nods with resolve. Subtle breeze moves his robe and beard. Keep his face, glasses, robe and art style identical to the reference. Quiet evening ambience, crickets. No lip-synced speech. [Shared negative clause]
- **What I check:** the likeness stays stable through motion; glasses don't morph; acting is readable without dialogue.

### RV-03 · The threat (antagonist test)
- **Start frame:** a new Codex still made from R-06 and R-07 (occupiers stacking barricades on the bridge), or R-07 alone
- **Prompt:**
  > Low side-view shot of the stone bridge. Armed occupiers in rust and black-iron gear drag a heavy wooden barricade across the bridge and drive iron stakes into the planks while the river below shrinks to a trickle. The commander in a dark ochre coat walks into frame and surveys the scene. Overcast, tense mood, the camera slowly tracks sideways. Heavy footsteps, wood scraping, metal clanks, low wind. [Shared negative clause]
- **What I check:** faction look carries into video, tone stays non-gory, and the shot can be cut into a sequence.

---

## What I need back

Send the images and clips you like (rough picks are fine) through the project's file upload. I review them against the spec, propose fixes to the style block if needed, and then write the numbered prompt lists (A2).

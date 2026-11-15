# Review 11 · Stage 3 builder review (spec §21)

Date: 2026-11-14 (M24). Specification:
`docs/superpowers/specs/2026-11-01-fight-for-peace-stage-3-specification.md`.
Companion: `docs/review/10-combat-constitution-audit.md` (mechanic verdicts).

**Result:** the six §21 checks pass, three of them with conditions that M25 (objective
framework) and the Stage 3 content milestones must meet. No check needs a change to the
approved route, roster, rescue rules or evidence plan. Implementation planning for Stage 3
can start once M25 has landed.

| # | §21 check | Verdict |
|---|---|---|
| 1 | One authoritative owner and a deterministic serialization path for every state | **Pass with conditions** (M25 owns the objective states) |
| 2 | Rescue-first route never shows Tomas as a failed chase | **Pass** |
| 3 | Research continuity and the invoice cannot be lost | **Pass with conditions** (M25 evidence lifecycle) |
| 4 | Every action uses the shared legal combat budgets | **Pass** |
| 5 | Essential information has localized visual or text access | **Pass with conditions** (content checks per wave) |
| 6 | Deferred values stay data-defined and pass promotion gates | **Pass** |

## 1 · One owner per state, deterministic serialization

Every state §17 lists, with its owner in the engine. "World" means it lives in the sim
`World` and is hashed by `encodeWorld`; checkpoints and replays restore it.

| §17 state | Owner | Serialized by |
|---|---|---|
| Versions, heroes, profiles, loadouts, resources, Cheat-Assisted | world + replay header | `encodeWorld`, replay `rulesVersion`, M11 cheat log |
| Enemy Health, Defense, Resolve, combo, role, formations, finite reserves | fighter, encounter | `encodeWorld` (M19) |
| Enemy mounts (Mounted Raider) | `fighter.ext.rider` | `encodeShared` (M24 E6) |
| Garran phase, Hookstaff durability and owner, Resolve, transition | boss state, item | `encodeWorld` (M7, M19) |
| Winch, cargo and cover positions and warnings | `world.shared.movers` | `encodeShared` (M24 E2) |
| Weapons: holder, position, condition, revolver rounds, empty, consumed | items | `encodeWorld` (M6, M18) |
| Food (carried or on touch), containers, consumed supplies | items, breakables | `encodeWorld`; carried provisions M24 E13 |
| Horse identity, rider, Stability, disengaged | corridor riders | `encodeWorld` (M17) + `OnFoot` state (M24 E10) |
| Horse allocation and replacement after An Bo | **M25** run-objective state | to be added with M25 |
| Environment: carts, scaffolds, barriers, fragments | `world.shared.movers`, breakables | `encodeShared`, `encodeWorld` |
| Rescue commitment, condition grade, route and shelter | **M25** protected units | to be added with M25 |
| Research sample and documentation state | **M25** evidence lifecycle | to be added with M25 |
| Tomas events, radio, cabin, escape, coda | stage story beats | M9/M20 stage beat state |
| Garran capture, case, invoice, batch reference, Sponsor Dossier | capture (M19), evidence (M20) | `encodeWorld`, profile save |

**Condition:** the three M25 rows must follow the M24 pattern: optional world state, encoded
only when present, so earlier replays keep their hashes. M24 proved this works (124 golden
replays unchanged with all M24 state added).

## 2 · Rescue-first route never reads as a failed Tomas chase

Tomas's cabin sighting and escape are authored story beats (§4), not a corridor goal, a
timer or a target. The engine has no chase objective that can fail: corridors end on the
finish line (or on foot after a dismount, M24 E10) and arenas end on their waves. The stage
data will give Tomas no pursuit corridor and no enemy profile; his beats sit between
encounters with the rescue as the stated goal on screen. **Pass.** Stage 3 content tests
must include one check that no Tomas objective text uses the words chase, catch or stop.

## 3 · Research continuity and the invoice cannot be lost

Continuity holds at engine level today: evidence is stage state (M9/M20 clues), not a
breakable or a pickup, so no hit, hazard, throw or M24 mover can reach it, and the M24
property record (E3) only counts incidents, it never removes anything. The invoice comes
from the case discovered after Garran's live capture (M19), so it cannot exist earlier and
cannot be spoiled. Checkpoint, replay and network correction restore the whole world, so
they cannot drop it.

**Condition:** M25's evidence lifecycle must implement Documented / Disturbed / Recovered as a
grade, never as a loss (the minimum canonical material is always secured by the main route),
and its tests must restore a checkpoint in each state.

## 4 · Shared legal combat budgets

Every Stage 3 actor maps to engine features that already run through the shared damage,
scaling, stun, juggle, Combo Breaker and anti-infinite rules:

| Stage 3 actor | Engine feature |
|---|---|
| Quarry Bruiser, Trail Ambusher, Rope Trapper | enemy kits, M5/M19 restraint grabs |
| Ridge Stalker feints | M24 E8 feints (the tell stays; validated to stop before the first active frame) |
| Pack Captain | M19 commands |
| Mounted Raider | M24 E6 (lane passes use the hazard rules: guard blocks, protected knock clear) |
| Garran (weapon, clinch, winch pressure) | M19 boss phases, grabs with partner interrupt, M24 E2 warned movers with redirect |
| Mountain horse | M24 E10 mount catalogue (`atZero: dismount`) |
| Revolver | M18 firearm: exact rounds, no reload, no interrupt loop |
| Carts, scaffolds, cargo | M24 E2 movers, breakable thresholds |

New M24 contact paths (movers, riders, blasts) all deal damage through `dealDamage`, so the
same scaling and protection apply, and the M24 tests check the safety rules: protected
fighters are knocked clear, nothing is lethal, no friendly fire from blasts. **Pass.**

## 5 · Localized access to essential information

The engine draws every M24 state as text and shapes, never colour or sound alone: warnings,
Stability, gear, heat, rider lanes, robot states and blast areas have labels in English,
Simplified Chinese and German (`strings.m24.ts`), and the catalogue completeness test fails
on any missing key. Condition bands (Secure / Strained / Critical) have their fixed names in
all three languages in §7.2.

**Condition:** each Stage 3 content wave must pass the same completeness test for its story
text, clue lines and captions, and every cinematic needs its still and transcript fallback
(§16, §20 D) before acceptance.

## 6 · Deferred values stay data-defined

All §20 E deferred values are data: frame data and damage in kit YAML, spawn tables in
encounter YAML, horse values in the `mounts` catalogue, prop and cart paths in arena
`scenery`. M24 added no constant that a stage needs to tune: movers, platforms, gear, feints,
rivals, heat, blasts, provisions and robot stations all read their numbers from YAML, and
the generator validates them (for example a feint that does not stop before the active
frame, or a gear phase on a boss without gear, fails the build). Values carry the Combat Lab
Candidate status until the §20 A tests pass. **Pass.**

## Material mapping (from the Stage 3 spec to M24)

| Stage 3 request | Where it lands |
|---|---|
| Food picked up with `J` and carried (§10.2) | E13 provisions; Stage 1/2 food stays on touch |
| Horses that disengage at zero Stability (§9) | E10 `atZero: dismount` |
| Ridge Stalker feints | E8 |
| Mounted Raider in the camp | E6 |
| Carts on rails (Encounter 9) | E2 movers |
| Winch and cargo redirect (boss) | E2 movers with `redirect`, E3 tool tags |
| Bandit revolver | existing firearm data |
| Rescue condition and completed hostile actions | M25 |

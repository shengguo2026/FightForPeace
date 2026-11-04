# M6 Weapons and Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The founders can pick up, fight with, throw and break the two Stage 1 weapons. The Canal Workstaff is a complete melee Weapon Core (standing, aerial, low, ground and dash routes, a hook that pulls, a disarming overhead) with one hero-affinity override per founder; the Iron Gate Handwheel is a recoverable throwable that can be blocked, exact-deflected and counter-returned. Weapons follow Authored Weapon-Lifecycle Profiles: explicit pickup, integrity with Ready/Worn/Critical, a mechanically safe break, tagged clashes, Tagged Impact Disarming, 45-frame reclaim priority and deterministic landing correction. The Lab gains the Representative Environmental Slice: one impact surface (the mill pillar), one multi-state breakable (stacked sluice boards) that yields one usable fragment (a timber board), and one active hazard (the mill cog). And, by creator request (2026-11-04), the Lab draws the delivered art: a sprite-sheet player with 3x2 key-pose cells, ground-line alignment and mirroring, fed by manifest entries for the Stage 1 founder sheets, the training-dummy sheets (Pressed Recruit), the Workstaff and Handwheel sheets and the props.

**Architecture:** Builds on M5 without changing its layering. `packages/data` gains `weapons/*.yaml` (weapon defs: class, hands, integrity, grip resistance, ammunition, guard modifier, throw profile, a Weapon Core in the hero action schema and per-hero affinity overrides) and new action fields (`clash`, `disarmPower`, `breakPower`, `pull`, `ammo`, `armed`). `packages/sim` grows `combat/armory.ts` (weapon registry and armed kits), `combat/items.ts` (item lifecycle: pickup and arbitration, integrity, break, throw flight, projectile responses, disarm, landing correction, reclaim), `combat/clash.ts`, and `world/environment.ts` (impact surface, breakable, fragment, hazard, static scenery collision). `packages/platform` gets sheet metadata in the asset manifest and a pure sprite chooser. `apps/game` draws sprites, items and props, and adds the Weapons & Environment panel (F10) and Lab switches. `tools/art/import_art.py` turns Pictures sheets into the game's art files and manifest.

**Spec:** spec §11.1, §11.2, §14.1; `Features_Decisions.md` §7.1 (weapon moveset architecture, lifecycle, disarm, reclaim, display, AI intent, break, clashes, projectile responses, landing correction) and §11.2 Representative Environmental Slice; roadmap row M6, Stage 2 guardrail M6 (owner, Integrity and finite ammunition in weapon state) and campaign guardrail M6 (two-handed medium weapons, hooks and pulls, finite revolvers, a guard-modifier item class).

## Global Constraints

- Everything from the M0–M5 plans still applies (60 Hz integer simulation, no float maths, `Math.random` or `Date` in `packages/sim`, no key letters in player-facing text, heroes and weapons are data, one defensive snapshot per frame).
- **Weapon Core with Hero-Affinity Overrides.** An armed kit is the hero's kit with the weapon's actions appended; a melee weapon disables the hero's ordinary Attack graph (and the grab, because Interact now throws), keeping every action index stable. Affinity entries replace one core action by id. A hero without affinity data uses the core.
- **Nothing silent.** Pickup needs an explicit Interact; walking over a weapon never equips it. Reduced integrity never reduces damage. The action that empties integrity resolves completely before the weapon breaks; depletion beats a same-event disarm.
- **Same rules for everyone.** Heroes and the training enemy use the same weapon kits, clash strengths, grip resistance and disarm power. Ordinary unarmed attacks never clash.
- **Environment is opt-in world data.** `createWorld` adds weapons and scenery only with `armory` / `environment` options, so old replays keep their behaviour; the Lab turns both on.
- **Windows-safe tests.** No test splits paths on `/` or compares text without normalizing `\r\n`; browser tests wait for simulation conditions and space key presses by simulation frames.
- All new numbers are **candidates** for the Combat Lab, kept as named constants or data.

## Candidate rules and tuning

| Item | Candidate value | Source |
|---|---|---|
| Pickup reach | 80 px along the belt, 40 px in depth, from the hero's centre | F&D §7.1 |
| Interact priority | free a restrained partner (neutral) > pick up an item in reach > grab | F&D §7.1, §6.7 |
| Pickup | Workstaff 8 f, Handwheel 6 f, timber board 10 f; the item is claimed on the first frame | F&D §7.1 |
| Pickup arbitration | eligible (reserved for you, or neutral) first, then nearest, then better depth alignment, then frame parity (never player number) | F&D §7.1 |
| Reclaim | a disarmed weapon is reserved for its former holder for 45 f after it rests; ends early if the holder is gone or defeated | spec §11.1, F&D §7.1 |
| Integrity | Workstaff 120 (Worn ≤ 70, Critical ≤ 30; hit 6, guarded 3, clash 10, throw 20); Handwheel 60 (Worn ≤ 40, Critical ≤ 20; throw 15, deflect 5); timber board 30 (hit 10, guarded 5, throw 30) | F&D §7.1 |
| Break | after the emptying action's recovery; event `weaponBreak`; cosmetic fragments only | F&D §7.1 |
| Clash | `clash: light / heavy / crushing` on active hitboxes that meet; equal: both recoil 16 f; stronger continues; each pair of action instances clashes once; both weapons pay clash cost | F&D §7.1 |
| Disarm | `disarmPower` ≥ the weapon's `gripResistance` on an unguarded hit; guard, exact block and counter prevent it; Guard Crush only with `crushDisarm`; Combo Breaker never | F&D §7.1 |
| Grip resistance | Workstaff 40, Handwheel 30, timber board 20 | F&D §7.1 |
| Throw flight | Workstaff 15 px/f, lift 1; Handwheel 11 px/f, lift 4; timber board 10 px/f, lift 3; item gravity 0.25 px/f² | F&D §7.1 |
| Projectile responses | Handwheel: blockable, exactDeflectable, counterReturnable, strikeDeflectable; Workstaff and board: blockable, exactDeflectable, strikeDeflectable | F&D §7.1 |
| Landing correction | rest must be inside the lane (20 px margin), clear of solid scenery and outside the hazard zone; else the first legal point of a fixed list (24 px steps along the belt towards the stage centre, then away, then 16 px steps in depth, up to 8 steps); else the item's recovery anchor; 10 settling frames | F&D §7.1 |
| Two-handed | with a two-handed weapon (Workstaff, board) Specials and Ultimates are unavailable unless a move declares `armed: unchanged`; one-handed (Handwheel) keeps them unless it declares `armed: unavailable` | F&D §7.1, campaign guardrail |
| Hook and pull | `pull` px/f draws the target towards the attacker instead of pushing it | campaign guardrail |
| Finite ammunition | an action with `ammo: n` spends n rounds of the held item; an empty weapon rejects it and stays throwable | Stage 2 and campaign guardrails |
| Guard modifier | a held item with `guard.costPercent` scales the Defense cost of normal guards | campaign guardrail |
| Impact surface | mill pillar; an eligible hit (tag `impact` or `wallBounce`, or push ≥ 6 px/f) plus ≥ 4 px/f remaining speed; first eligible contact per combo: 30 + up to 30 force damage, scaled; then a wall rebound if armed and unused, else a terminal slam; later contacts: safe separation only | spec §11.2 |
| Breakable | sluice boards: `breakPower` per action (default half its damage) once per action; Intact < 40 ≤ Loosened < 80 ≤ Critical < 120 ≤ Broken; solid until broken; exactly one timber-board fragment; no score or meter | spec §11.2 |
| Hazard | mill cog: rest 150 f, warn 45 f, active 30 f; 60 damage, knockdown away from the cog, blockable by a normal guard facing it (Defense cost 20), no exact block or counter; 120 f hazard immunity afterwards (anti-trap) | spec §11.2 |

## Review Focus

1. **Data:** weapon schema, armed kits keep hero indices, affinity replaces one core move, generated file up to date (CRLF-safe). → Task 1.
2. **Lifecycle:** explicit pickup, arbitration, integrity costs (whiffs free), Ready/Worn/Critical, safe break after the final action, throw and landing, reclaim window and neutral contest. → Tasks 2–3.
3. **Clashes and disarm:** strength tiers, once per pair, integrity on both, disarm rules and the break-beats-disarm order. → Task 4.
4. **Projectile responses:** block, exact deflect to a neutral landing, counter return as the counter's attack, strike deflect. → Task 3.
5. **Guardrails:** two-handed, pulls, ammunition, guard modifier. → Task 5.
6. **Environment:** impact allowance and quotas, breakable states and its single fragment, hazard cycle, guard and anti-trap. → Task 6.
7. **Art:** sheets cut into cells, ground line, mirroring, placeholders where art is missing. → Tasks 7–8.
8. **Determinism:** `RULES_VERSION` `m6.1`, `STATE_FORMAT` 9, re-recorded replays and a new `weapons-environment` replay. → Task 9.

## Tasks

- [ ] **Task 1 Data:** `packages/data/weapons/{workstaff,handwheel,timber-board}.yaml`, schema and generator, `WEAPON_DATA` in `heroes.gen.ts`, trainer Disarming Swipe. Commit `feat(data): Canal Workstaff, Iron Gate Handwheel and timber board`.
- [ ] **Task 2 Armory and items:** armed kits, route codes, pickup, arbitration, integrity, break. Commit `feat(sim): weapon pickup, armed kits, integrity and safe break`.
- [ ] **Task 3 Throws:** flight, hits, projectile responses, landing correction, reclaim. Commit `feat(sim): weapon throws, projectile responses and landing correction`.
- [ ] **Task 4 Clashes and disarm.** Commit `feat(sim): tagged clashes and impact disarming`.
- [ ] **Task 5 Guardrails:** two-handed, pulls, ammunition, guard modifier. Commit `feat(sim): two-handed weapons, pulls, ammunition and guard modifiers`.
- [ ] **Task 6 Environment:** scenery collision, impact surface, breakable and fragment, hazard. Commit `feat(sim): representative environmental slice`.
- [ ] **Task 7 Art import:** `tools/art/import_art.py`, `apps/game/public/art/`, manifest sheet entries, sprite chooser. Commit `feat(art): first real art in the Lab`.
- [ ] **Task 8 Lab:** sprites, items, props, weapon HUD, F10 panel, switches, hints, e2e. Commit `feat(game): Lab weapons, environment and sprites`.
- [ ] **Task 9 Replays and README:** `m6.1`, format 9, re-recorded replays, `weapons-environment` replay, README. Commit `test: M6 golden replays and README`.

## Carried forward

- Enemy weapon-seeking with `Never` / `Opportunistic` / `Preferred` policies and tactical scoring for every archetype (M7); M6 has only the Lab's armed dummy reclaiming its own weapon.
- Co-op weapon transfer with Invite and Confirm, the co-op redirect and the Resolve-gated boss interaction (M8, M7).
- Catch techniques, Detailed Combat HUD setting, Academy environmental exercise and Guide entries (M11).
- Full-stage environment art (parallax layers) and the remaining enemy sheets (M13).

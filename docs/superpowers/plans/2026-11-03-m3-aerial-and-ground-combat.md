# M3 Aerial and Ground Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launches, juggles and knockdowns follow the Combat Constitution's anti-infinite rules. The juggle budget and its lift bands are enforced, each combo gets one wall rebound and one ground bounce, plain jumps have landing recovery, knocked-down targets either open an authored ground window or enter protected recovery, and the Ground-Opportunity Focus turns `T` and directional `T` into the hero's ground actions near a marked target (one extension, one finisher). The six Academy recipes from spec §8.3 are data, and the Lab tracks them step by step while you perform them on a dummy.

**Architecture:** Builds on M2 without changing its layering. `packages/sim` grows the reaction layer (protected recovery, bounces, ground window, juggle bands) and a ground-focus selector used by the action starter. The combo context gains the juggle, bounce and ground-route state and a route log of the actions that connected. `packages/data` adds `wallBounce`, `groundBounce`, `groundExtension` and `groundFinisher` tags and a `recipes` list per hero; the generator compiles recipes into `heroes.gen.ts`. `apps/game` adds the recipe panel (F7), the ground-window and focus markers, a "dummy at the wall" Lab button and the extended target panel.

**Tech Stack:** unchanged from M2.

**Spec:** `Features_Decisions.md` §6.2 (ground combat), §6.4 (combo safety, protected recovery), §10.2 (juggle budget, bounce quotas, recipes); `2026-10-18-fight-for-peace-game-specification.md` §7.3–§7.5, §8.3, §14.1–§14.2; roadmap row M3 and its campaign guardrail (quotas stay per target, so heavy targets only need different data).

## Global Constraints

- Everything from the M0–M2 plans still applies (60 Hz integer simulation in 1/256 px, no float maths, `Math.random` or `Date` in `packages/sim`, no key letters in player-facing text, heroes are data, open tag sets).
- **The target owns every quota.** Juggle budget, wall and ground-bounce quotas and the ground route live in the defender's combo context. Changing attackers (co-op) never refreshes them; a different target has its own context.
- **Protected recovery closes the context at once.** A protected target cannot take damage, hit-stun, launches, knockback or grabs and gives no hit-confirmed cancels, meter or combo credit. The context's numbers stay readable in the Lab until the next hit opens a new one.
- **Only ground actions hit a downed target**, and only while its ground window is open. Ground actions never hit a standing target.
- **No defense, enemy attacks or hero recovery choices yet.** Dummies still never attack, so heroes are never knocked down in M3; the neutral/directional recovery choice for heroes arrives when heroes can be hit (M4/M7). Dummies use the same reaction code that heroes will use.
- All new numbers are **candidates** for the Combat Lab, kept as named constants or data.

## Candidate rules and tuning

| Item | Candidate value | Source |
|---|---|---|
| Juggle budget | 100 per target context; an action pays its `juggleCost` on its first hit when the target is airborne or the hit launches it | F&D §10.2 |
| Juggle lift bands | budget before the action 61–100 → full lift and air pop; 31–60 → 70 %; 1–30 → 40 % and 1.5 × gravity until landing | F&D §10.2 (provisional) |
| Juggle exhaustion | the hit lands and deals damage; the target drifts down in protected air recovery, lands on its feet into a 12 f protected landing; aerial cancels and jump chase on it are rejected ("juggle budget exhausted") | F&D §10.2, §6.4 |
| Hit-stun exhaustion | the hit lands; grounded target: protected soft reset (12 f knockback, protected); airborne target: protected air recovery | F&D §6.4 |
| Wall rebound | one per combo, from an action tagged `wallBounce` (Gatepost Hammer, Open Channel Kick, Current Chase) when the pushed target reaches a stage edge moving at ≥ 4 px/f; it bounces off at 4 px/f with 8 px/f lift (scaled by the juggle band) and costs 15 juggle | spec §7.4 |
| Ground bounce | one per combo, from an action tagged `groundBounce` (Stonefall Knee); the target's next touchdown bounces it up at 8 px/f (scaled) for 15 juggle; a second one in the same combo is a normal landing | spec §7.4 |
| Landing after a juggle | without an open ground window, touching down ends the combo in **protected get-up** (36 f down + 12 f get-up, protected) | F&D §6.4 |
| Ground window | an `opensGroundWindow` knockdown (trip, Low Bank Sweep, Faultline Reap / Undertow Slide counter-trip) opens a **40 f** window on touchdown, **once per context** (re-knockdown never refreshes it); missing it → protected get-up | F&D §6.2 |
| Ground-Opportunity Focus | hero on the ground and actionable, target downed with an open window, `|dx| ≤ 180 px`, `|dz| ≤ 32 px`, hero facing it; nearest wins, then lower id; `T`/directional `T` then select `groundFocus` actions (a direction without its own ground action uses the neutral one) | F&D §6.2 |
| Ground route | at most one `groundExtension` (Settling Palm, Skipping Current) then one `groundFinisher` (Lockgate Press, Foundation Rise, Rising Eddy); the finisher may come first; an extension re-opens a **40 f** window for the finisher; an unavailable ground press is rejected ("ground route already used") and starts nothing | F&D §6.2 |
| Terminal finisher | Lockgate Press: all three hits land, then protected get-up | F&D §6.2 |
| Relaunch finisher | Foundation Rise, Rising Eddy: count as the finisher, consume the ground-bounce quota and their juggle cost; when the quota is spent or the juggle budget is empty they resolve as a separating kick (8 px/f push, protected get-up) | F&D §6.2, §10.2 |
| Jump landing recovery | **4 f** after a plain jump (aerial attacks keep their own landing recovery); offensive presses during it are buffered | roadmap M3 |
| Downed hurtbox | 60 px high | §7.5 |
| Jump chase direction | the jump-chase link accepts Jump with any held direction (players still hold Up after an Up + Attack launcher); the jump goes in the held direction | M3 creator-test finding |

## Data changes

| Hero | Action | Change |
|---|---|---|
| Mountain | Gatepost Hammer | + `wallBounce` |
| Mountain | Stonefall Knee | + `groundBounce` (keeps `terminalKnockdown` for the final landing) |
| Mountain | Settling Palm | + `groundExtension` |
| Mountain | Lockgate Press, Foundation Rise | `closesGroundRoute` → `groundFinisher` |
| Mountain | Settling Palm, Lockgate Press, Foundation Rise | hitbox width 110 → 140 px, so the ground route reaches a target tripped at the tip of Faultline Reap |
| River | Open Channel Kick, Current Chase | + `wallBounce` |
| River | Skipping Current | + `groundExtension` |
| River | Rising Eddy | `closesGroundRoute` → `groundFinisher` |

**Recipes** (`recipes:` in each hero file; steps name actions, `|` separates alternatives, `jump` steps are hints only):

| Hero | Recipe | Steps | Setup |
|---|---|---|---|
| Mountain | Foundation | Mason's Touch → Brace Elbow → Gatepost Hammer | — |
| Mountain | Aerial conversion | High Bank Lift → (jump chase) → Rafter Palm → Stonefall Knee | — |
| Mountain | Low to ground | Faultline Reap (counter-trip) → Settling Palm → Lockgate Press or Foundation Rise | counter-hit dummies |
| River | Foundation | Reed Tap → Turning Current → Open Channel Kick | — |
| River | Aerial conversion | Northbank Arc → (jump chase) → Reedwing Tap → Current Chase | — |
| River | Low to ground | Undertow Slide (counter-trip) → Skipping Current → Rising Eddy | counter-hit dummies |

A recipe is **performed** when the actions of that hero that connected inside one target context start with its steps in order (other heroes' hits in the same context are ignored, so a partner may help). The match uses the context's route log, so it is deterministic and replayable.

## Review Focus

1. **Juggle budget:** costs are paid once per action and only for airborne or launching hits; bands reduce lift; exhaustion lands, protects and rejects further aerial cancels; co-op attackers share it. → Task 2.
2. **Bounce quotas:** exactly one wall rebound and one ground bounce per context; the second is an ordinary impact; a relaunch finisher spends the ground-bounce quota. → Task 3.
3. **Protected recovery:** all three contexts close the combo immediately, make the target unhittable and give no meter or cancels. → Task 2.
4. **Ground route:** focus only with range, facing and an open window; one extension then one finisher, shared by both heroes; re-knockdown never reopens; a missed window protects; ground actions never hit standing targets and other actions never hit downed ones. → Tasks 4–5.
5. **Recipes:** all six recipes from §8.3 are performed by scripted inputs in unit tests and in a golden replay. → Task 6.
6. **Determinism:** re-recorded and new golden replays reproduce on Chromium, Firefox and WebKit. → Task 8.

---

## File structure

```
packages/data/heroes/*.yaml       new tags, recipes
packages/data/src/generate.ts     recipe schema and compilation; recipe steps must name actions
packages/sim/src/
  combat/types.ts                 RecipeDef, new Reject codes
  combat/context.ts               bounce/ground/route fields, juggle bands, closeContext
  combat/reactions.ts             protected recovery, bounces, ground window, landing
  combat/hits.ts                  juggle payment and bands, ground hits, bounce flags, hittable(attacker, target)
  combat/ground.ts                Ground-Opportunity Focus and route allowance
  combat/recipes.ts               recipeProgress(recipe, route, hero)
  movement/controller.ts          ground-focus selection, jump landing recovery
  movement/profile.ts             jumpLandingFrames
  world/types.ts, world.ts        new fields, encode v6, rules m3.1
apps/game/src/
  scenes/StageScene.ts            ground-window marker, focus ring, protected tint
  ui/LabOverlay.tsx, views.ts     target panel (juggle, bounces, route, protection), recipes panel F7, wall button
tests/replays/                    re-recorded replays, new academy-recipes and juggle-limits
```

---

### Task 1: Data — tags and recipes

- Schema: `recipes: [{ id, name, family: foundation|aerial|ground, steps: string[], setup?: { counterHit?: boolean } }]`; a step is an action id, `a|b` alternatives, or `jump`. Generator checks every step names an action of that hero.
- [ ] Tests first: an unknown recipe step fails with a readable message; the generated file is up to date; both founders have three recipes.
- [ ] Commit `feat(data): bounce and ground-route tags, Academy recipes`.

### Task 2: Juggle budget and protected recovery

- `hittable(att, a, t)`; `enterProtection(world, t, kind)` closes the context (keeps its numbers, `open = false`), refills health if the Lab switch is on; new `MoveState.Recover` for the protected landing.
- [ ] Tests first: Review Focus 1 and 3; a co-op juggle on one dummy spends one budget; a hit on a protected target never happens; jump chase after an exhausting hit is rejected.
- [ ] Commit `feat(sim): enforced juggle budget and protected recovery`.

### Task 3: Wall rebound and ground bounce

- Pending bounce flags on the target set by tagged hits; wall check in the reaction step against the stage bounds; ground bounce on touchdown.
- [ ] Tests first: Review Focus 2; Gatepost Hammer near the wall rebounds once; a second wall hit in the same combo does not; Stonefall Knee bounces once.
- [ ] Commit `feat(sim): one wall rebound and one ground bounce per combo`.

### Task 4: Ground window and Ground-Opportunity Focus

- `groundFocus(world, hero)`; the action starter uses `groundFocus` context when it returns a target; ground route allowance and the "ground route already used" rejection.
- [ ] Tests first: focus needs range, facing and an open window; walking away releases it; without focus `T` is Mason's Touch; Low Bank Sweep opens a window, a launch landing does not; re-knockdown never reopens.
- [ ] Commit `feat(sim): ground window and Ground-Opportunity Focus`.

### Task 5: Tagged Two-Step Ground Route

- Extension keeps the target down and re-opens a 40 f window; finisher outcomes: terminal (all hits, then protected get-up), relaunch (ground-bounce quota, juggle cost) or separating kick.
- [ ] Tests first: Review Focus 4; both heroes share one extension and one finisher; Rising Eddy resolves as a separating kick when the ground-bounce quota is spent.
- [ ] Commit `feat(sim): tagged two-step ground route`.

### Task 6: Recipes in the simulation

- The context's route log (`hero × 64 + action`, capped at 32 entries); `recipeProgress()`.
- [ ] Tests first: Review Focus 5 — each of the six recipes performed by inputs on a dummy; a wrong first action never matches; a partner's hit in between is ignored.
- [ ] Commit `feat(sim): route log and Academy recipe progress`.

### Task 7: Jump landing recovery and Lab

- 4 f landing after plain jumps. Lab: target panel (juggle budget and band, wall / ground bounce, ground route with window frames, extension and finisher, protected), **F7** recipe panel with live step ticks, "performed" count and a **Practise** button that places P1 next to Dummy 1 (and switches counter-hit dummies on when the recipe needs it), F2 **Dummy to the wall** button; stage markers for the ground window and the focused target.
- [ ] e2e: the aerial recipe and the low-to-ground recipe performed through key presses; screenshot of the ground-window marker and the recipe panel.
- [ ] Commit `feat(game): recipe panel, ground markers and M3 target readouts`.

### Task 8: Golden replays, README

- `RULES_VERSION` `m3.1`, `STATE_FORMAT` 6. Re-record existing replays; add `academy-recipes` (all six recipes) and `juggle-limits` (co-op juggle to exhaustion, wall rebound, ground bounce).
- README: M3 controls and test checklist.
- [ ] Commit `test: M3 golden replays and README`.

## M3 creator test checklist (posted with the PR)

See the README section "M3 test checklist".

## Carried forward to M4

- Hero knockdowns and the hero recovery choice (neutral or directional, buffered guard on the last recovery frames), `wakeupEligible` reversals, Combo Breaker during juggles and open ground sequences.

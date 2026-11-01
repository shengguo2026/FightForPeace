# M2 Basic Offense and Hero Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mountain Guardian and River Scout fight training dummies with their own authored normal attacks. Neutral Attack strings, directional routes, aerial attacks (with their own pose), dash attacks and the dash-state low attack all hit, push, launch and knock down the dummies. Every attack is a data record (YAML validated by TypeBox), cancels follow each hero's sparse graph, and the Lab shows hitboxes, hurtboxes, frame phases, cancel results with rejection reasons, damage, damage scale, hit-stun budget, meter-gain budget, attack meter and the dash bridge.

**Architecture:** Builds on M1 without changing its layering. A new workspace package `packages/data` owns the hero YAML, the TypeBox schema and a generator that writes one typed TypeScript module into `packages/sim` (committed, checked for staleness in CI). `packages/sim` grows a combat layer: action runner (phases, movement samples, hitboxes), cancel resolver (structured branching, category windows, premium cancels, dash bridge), hit resolution, reactions (stagger, knockback, launch, knockdown, trip) and the target-owned combo context. `apps/game` adds a placeholder asset registry, pose drawing by category, the hitbox view, and Lab panels for the attacker, the target and the move list.

**Tech Stack:** unchanged from M1, plus `yaml` and `@sinclair/typebox` as dev-time dependencies of `packages/data` (never shipped in the browser bundle).

**Spec:** `Features_Decisions.md` §6.1, §6.4, §10.2 (Module 2), §10.3 (recipe list for later); `2026-10-18-fight-for-peace-game-specification.md` §5.3, §7.1–§7.5, §7.7, §8, §14.1, Appendix B.1, B.2, B.6; roadmap row M2 and its Stage 2 guardrail (aerial pose, roster as data, open tag sets).

## Global Constraints

- Everything from the M0 and M1 plans still applies (60 Hz integer simulation in 1/256 px, no float trigonometry, `Math.random` or `Date` in `packages/sim`, physical key codes, no fixed port, no key letters in player-facing text, movement never buffered, no invulnerability flag on dashes).
- **Heroes are data, not code branches.** The roster is a list of any length; no `if (hero === 'mountain')` anywhere. Stage 2 adds Wind Sentinel and Fire Warden as two more YAML files.
- **Every attack is one action record** with startup/active/recovery, hitbox, movement samples, damage, meter gain, `stunDecayCost`, `damageScaleCost`, `juggleCost` (stored now, used in M3), reaction, cancel links, a pose asset ID and an **open tag set** (`opensGroundWindow`, `terminalKnockdown`, `passThrough`, `guardPressure`, handoff tags later, …). Sprite pixels never decide timing or collision.
- **Frame convention:** `S/A/R = 5/3/9` means 5 startup frames, the first hitbox on frame 6, active frames 6–8, recovery frames 9–17, 17 frames in total. Aerial `R` is landing recovery: the hero stays committed in the air after the active frames and recovers for `R` frames after touching down.
- **Direction at acceptance (spec §5.3):** Forward/Backward are resolved against the facing the hero has when the Attack press is accepted; Up/Down keep stage-depth meaning; when a horizontal and a depth direction are both held, the most recently pressed one decides. *Behaviour change from M1:* holding Left while pressing Attack no longer turns a right-facing hero around first; it performs that hero's `Backward + Attack` move. Walking turns the hero, so turning and attacking still takes one tap.
- **No guarding in M2.** Every contact is a hit; links that also allow guard contact are stored for M4.
- **Specials and Ultimates stay stubs** (M5). Links to them exist in the data and are rejected with the reason "arrives in M5".
- **Ground actions are authored but not reachable** until Ground-Opportunity Focus arrives in M3; `opensGroundWindow` knockdowns are recorded and shown in the Lab.
- **Juggle budget is stored but not enforced** until M3; in M2 the hit-stun budget alone bounds air combos (its exhaustion forces air recovery).
- All new numbers are **candidates** for the Combat Lab, kept in data, not decisions.

## Candidate rules and tuning

| Item | Candidate value | Source |
|---|---|---|
| Cancel execution | a queued cancel starts on the first frame after the source's active frames, and at the latest at the end of its post-contact window | B.6 |
| Chain window (normal → normal) | early buffer 7 f before contact, window 14 f after contact | B.5 "three-part cadence" (7-frame buffer), B.6 |
| Aerial chain window | buffer 6 f, window 12 f | B.6 6–9 f by category |
| Jump chase (launcher → jump) | buffer 4 f, window 16 f, on hit | §8.3 routes |
| Premium dash bridge | buffer 6 f, window 12 f, on hit, **25 % attack meter**, once per target combo | §10.2, B.6 |
| Special / Ultimate cancel | buffer 7 f, window 10 f (rejected until M5) | B.6 |
| Once per string | an action can appear only once in one attacker's continuous string (rejection "already used"); this guarantees every route ends | §10.2 "no infinite loops" |
| Fresh buffer | an Attack with no valid link, pressed during the last 9 f of recovery, starts the neutral starter when the move ends (M1 buffer) | M1 |
| Hit-stun budget | 100 per target context; > 70 → 100 % hit-stun, 31–70 → 75 %, 1–30 → 50 %; exhaustion forces safe separation and closes cancels | §10.2 provisional |
| Damage scale | context starts at 100 %; after the opener, scale −= starter proration; after each later action, scale −= `damageScaleCost`; floor 30 %; multi-hit moves lock one scale and split the scaled total across hits | §10.2, §7.4 |
| Meter gain | per action on legal enemy contact, paid out of a per-context **meter-gain budget of 30 %** (one combo can earn at most 30 %); never on whiffs | §7.7 |
| Attack meter | 0–100 %, starts at 0; Lab "infinite meter" switch | §7.7 |
| Dummy health | 1000, Lab switch "refill when the combo ends" (on by default) | — |
| Downed | 36 f down + 12 f get-up, not hittable in M2 (ground follow-ups and protected recovery rules arrive in M3) | §7.5 |
| Hurtboxes | standing 80 × 300 px, depth ± 14 px; low attacks lower the attacker's own box to 180 px | §7.5 |
| Counter-hit (dummy setting) | dummies do not attack yet, so the Lab can treat every hit as a counter-hit to test trips | §10.2 |

## Normal action data (candidate 0.2 timing from Appendix B; other numbers new candidates)

Damage is in health points (dummy 1000), hit-stun in frames, meter in percent, costs in budget points.

**Mountain Guardian** (steady, heavier, wider body)

| Action | Input | S/A/R | Dmg | Reaction | Stun / scale / meter | Movement | Cancels (condition) |
|---|---|---|---|---|---|---|---|
| Mason's Touch | `T` (starter) | 5/3/9 | 30 | stagger 18 | 10 / 10 (starter 15) / 3 | — | Brace Elbow `T`, Stone Shoulder `F+T`, High Bank Lift `Up+T`, Low Bank Sweep `Down+T` (hit/guard) |
| Brace Elbow | `T` 2nd | 7/3/12 | 40 | stagger 20 | 12 / 10 / 4 | small step | Gatepost Hammer `T`, High Bank Lift `Up+T` (hit/guard); Stonewake Palm `U` (M5) |
| Gatepost Hammer | `T` 3rd | 11/4/19 | 70 | knockback 26 | 18 / 15 / 6 | step | Ultimate (M5); **premium dash bridge** (hit) |
| Stone Shoulder | `F+T` | 12/5/18 | 55 | knockback 24 | 15 / 12 / 5 | advances 5 px/f | Gatepost Hammer `T` (hit/guard); Gatebreaker Advance `F+U` (M5) |
| Anchor Hook | `B+T` | 8/3/14 | 35 | stagger 20 | 10 / 10 / 3 | retreats 3 px/f | Mason's Touch `T` (hit) |
| High Bank Lift | `Up+T` | 10/4/20 | 50 | launch (15 px/f up) | 15 / 12 / 5, juggle 30 | moves up-stage 2 px/f | jump chase (hit); Rising Rampart `B+U` (M5) |
| Low Bank Sweep | `Down+T` | 9/4/17 | 45 | knockdown, `opensGroundWindow` | 20 / 12 / 5 | moves down-stage 2 px/f | ground opportunity (M3) |
| Rafter Palm | air `T` | 5/4/8 L | 35 | stagger, air pop 7 | 10 / 10 / 3 | — | Stonefall Knee `F+T`, Cornerstone Sweep `Up/Down+T` (hit) |
| Stonefall Knee | air `F+T` | 9/6/14 L | 60 | knockback; air target knocked down | 18 / 15 / 5 | dives forward-down | Ultimate (M5) |
| Cornerstone Sweep | air `Up/Down+T` | 8/5/12 L | 45 | stagger, air pop 6, wide depth arc | 12 / 10 / 4 | shifts depth 4 px/f | Stonefall Knee `F+T` (hit) |
| Settling Palm | ground-focus `T` | 8/4/15 | 30 | — | M3 | — | Lockgate Press, Foundation Rise |
| Lockgate Press | ground-focus `F+T` | 10/18/20 | 60 (3 hits) | `terminalKnockdown` | M3 | — | closes ground route |
| Foundation Rise | ground-focus `B+T` | 12/5/23 | 50 | relaunch | M3 | — | relaunch when quotas permit |
| Rampart Charge | dash `T` | 9/5/18 | 55 | knockback 24, `guardPressure` | 15 / 12 / 5 | keeps dash momentum, slowing | Special (M5) |
| Faultline Reap | dash `T+G` | 8/5/22 | 45 | stagger 22; counter-hit: trip, `opensGroundWindow` | 15 / 12 / 5 | short broad sweep | ground opportunity (M3) |

**River Scout** (fast, lighter, slimmer body)

| Action | Input | S/A/R | Dmg | Reaction | Stun / scale / meter | Movement | Cancels (condition) |
|---|---|---|---|---|---|---|---|
| Reed Tap | `T` (starter) | 4/3/8 | 25 | stagger 16 | 9 / 10 (starter 20) / 3 | — | Turning Current `T`, Rapids Step `F+T`, Northbank Arc `Up+T`, Southbank Slide `Down+T` (hit/guard) |
| Turning Current | `T` 2nd | 6/3/10 | 35 | stagger 18 | 10 / 10 / 3 | small step | Open Channel Kick `T`, Northbank Arc `Up+T` (hit/guard); Current Crescent `U` (M5) |
| Open Channel Kick | `T` 3rd | 9/4/16 | 60 | knockback 24 | 16 / 15 / 6 | step | Ultimate (M5); **premium dash bridge** (hit) |
| Rapids Step | `F+T` | 7/4/13 | 45 | stagger 20, carries target | 12 / 12 / 4 | advances 6 px/f | Open Channel Kick `T` (hit/guard); Gale Wheel `F+U` (M5) |
| Ebb Heel | `B+T` | 8/3/15 | 40 | stagger 20 | 10 / 10 / 3 | retreats 4 px/f | Reed Tap `T` (hit) |
| Northbank Arc | `Up+T` | 8/4/16 | 45 | launch (14 px/f up) | 14 / 12 / 5, juggle 30 | moves up-stage 3 px/f | jump chase (hit) |
| Southbank Slide | `Down+T` | 9/6/18 | 40 | stagger 20, `passThrough` | 12 / 10 / 4 | slides down-stage through the target | Ebb Heel `B+T` (hit); Current Crescent `U` (M5) |
| Reedwing Tap | air `T` | 4/4/7 L | 30 | stagger, air pop 7 | 9 / 10 / 3 | — | Current Chase `F+T`, Bank-Switch Arc `Up/Down+T`, Ebbturn Heel `B+T` (hit) |
| Current Chase | air `F+T` | 7/5/10 L | 50 | knockback, carries | 15 / 12 / 5 | advances 5 px/f | Tempest Crossing (M5) |
| Bank-Switch Arc | air `Up/Down+T` | 8/6/12 L | 40 | stagger, air pop 6 | 12 / 10 / 4 | shifts depth 5 px/f | Current Chase `F+T` (hit) |
| Ebbturn Heel | air `B+T` | 6/4/9 L | 35 | knockback away | 10 / 10 / 3 | brakes, drifts back | Reedwing Tap `T` (hit) |
| Skipping Current | ground-focus `T` | 6/4/12 | 30 | — | M3 | — | Rising Eddy |
| Rising Eddy | ground-focus `F+T` | 9/5/20 | 50 | relaunch or separating kick | M3 | side switch | relaunch when quotas permit |
| Rapid Crossing | dash `T` | 6/5/15 | 45 | stagger 20, side switch, `passThrough` | 12 / 12 / 4 | carries through | Gale Wheel `F+U` (M5) |
| Undertow Slide | dash `T+G` | 6/7/24 | 35 | stagger 20; counter-hit: trip, `opensGroundWindow` | 14 / 12 / 4 | long narrow slide | ground opportunity (M3) |

An air direction a hero has no move for (Mountain air `B+T`) performs that hero's air `T`. One aerial starter per jump; its listed cancels may follow.

## Poses (creator request, 2026-10-31)

Every action names a logical pose asset ID, `hero.<hero>.pose.<category>.<action>` (for example `hero.mountain.pose.aerial.rafter-palm`). Until real art arrives the asset registry returns a placeholder, drawn by category so the three families are unmistakable at gameplay scale:

| Category | Placeholder |
|---|---|
| Standing / dash | upright body, horizontal yellow strike arm at chest height |
| Low | crouched body (60 % height), cyan sweep along the floor |
| **Aerial** | tucked body (70 % height, knees drawn up), magenta strike limb angled **diagonally downward**, drawn above the floor shadow |
| Ground (M3) | kneeling body, strike pointing at the floor |

The limb is short and dim during startup, full and bright during the active frames, and grey while recovering, so frame phases are readable without the Lab. Each hero has its own silhouette width (Mountain 84 px, River 60 px) and the floating label reads "P1 · Mountain" / "P2 · River".

## Review Focus

1. **Neutral fallback:** repeated `T` on a dummy gives exactly three hits for each hero (starter, second, finisher) with the knockback on the third; repeated `T` into air never chains (no hit, no link). → Task 6.
2. **Direction resolution:** `B+T` while facing right performs the Backward move and keeps facing right; a diagonal resolves to the most recently pressed direction. → Task 5.
3. **Reason-aware rejection:** an unlinked, too-early, too-late, already-used, no-meter, bridge-spent or M5 destination press is discarded with that reason and never replaces a queued valid cancel. → Task 6.
4. **Premium dash bridge:** costs exactly 25 % once, only on hit, only once per target combo; a bridged dash allows only the dash attack or the low attack. → Task 7.
5. **Budgets:** damage scale never drops below 30 %; multi-hit damage sums to the scaled total; hit-stun bands apply; exhaustion forces separation and closes cancels; meter gain stops at 30 % per combo; everything resets when the target becomes actionable. → Task 8.
6. **Aerial pose:** the renderer chooses the aerial placeholder for every aerial action and never for standing or low ones (unit test on the pose resolver, e2e screenshot). → Task 10.
7. **Roster as data:** adding a third YAML file to a test fixture yields a third selectable hero with no code change. → Task 2.
8. **Determinism:** new and re-recorded golden replays reproduce on Chromium, Firefox and WebKit at 30, 60 and 144 Hz. → Task 12.

---

## File structure

```
packages/data/
  heroes/mountain.yaml        15 normal actions (table above)
  heroes/river.yaml           15 normal actions
  src/schema.ts               TypeBox schema for heroes, actions, hitboxes, links, tags
  src/generate.ts             YAML → validate → resolve names → packages/sim/src/combat/heroes.gen.ts
  test/data.test.ts           schema, link targets, unique inputs, generated file up to date
packages/sim/src/
  combat/types.ts             HeroDef, ActionDef, Link, Hitbox, Reaction, CancelCategory, RejectReason
  combat/heroes.gen.ts        GENERATED roster (committed)
  combat/roster.ts            roster lookup, input → action resolution, pose IDs
  combat/actions.ts           action runner: phases, movement samples, aerial landing recovery
  combat/cancel.ts            cancel resolver: links, windows, buffer, once-per-string, premium, bridge
  combat/hits.ts              hitbox vs hurtbox overlap, one hit per active segment per target
  combat/reactions.ts         stagger, knockback, launch, knockdown, trip, get-up
  combat/context.ts           target combo context: scale, stun budget, meter budget, juggle (stored), bridge
  movement/controller.ts      hands Attack, Jump-chase and Dash requests to the combat layer
  world/types.ts, world.ts    new fighter fields, hero per slot, dummy settings, encode v4
apps/game/src/
  assets/registry.ts          logical asset IDs → approved asset or placeholder descriptor
  assets/manifest.json        empty; filled when art batches are ingested
  scenes/StageScene.ts        pose drawing by category, hitbox/hurtbox view, damage pop-ups
  ui/LabOverlay.tsx           attacker panel, target panel, move list (F5), settings additions
tests/replays/                re-recorded walk-square, dash-jump, crowd; new combo-routes
```

---

### Task 1: `packages/data` with schema and generator

**Files:** Create `packages/data/*`; Modify root `package.json` (`gen:heroes` script), `tsconfig.json`, `vitest.config.ts`.

- Schema (TypeBox): `Hero { id, name, bodyWidth, actions: Action[] }`; `Action { id, name, category: standing|aerial|ground|dash|low, input: { context: neutral|chain|air|groundFocus|dash|dashLow, dir: neutral|forward|backward|up|down|vertical }, startup, active: number | number[] (alternating active, gap, active…), recovery, landingRecovery?, hitbox { x, w, y, h, depth }, hurtbox: standing|low, damage, hitstun, reaction { kind: stagger|knockback|launch|knockdown|trip, push?, lift?, airPop?, counterTrip? }, stunDecayCost, damageScaleCost, starterProration?, juggleCost, meterGain, move?: { from, to, forward?, depth? }[], tags: string[], links: Link[] }`; `Link { to: actionId | 'jump' | 'dash' | 'special:<slot>' | 'ultimate', input?: dir, category: chain|air|jumpChase|dashBridge|special|ultimate, on: (hit|guard|whiff)[], premium?: number }`.
- Generator checks beyond the schema: link targets exist; no two actions share one (context, dir) slot; every hero has a neutral starter; tags are lower-camel identifiers (open set, no enum); writes `heroes.gen.ts` deterministically (stable key order).
- [ ] Tests first: a valid fixture passes; a missing link target, a duplicate input slot and a negative frame count each fail with a readable message; the committed `heroes.gen.ts` equals a fresh generation.
- [ ] Commit `feat(data): hero action schema, YAML loader and generator`.

### Task 2: Founders' YAML and the roster

**Files:** Create `packages/data/heroes/*.yaml`, `packages/sim/src/combat/types.ts`, `roster.ts`.
- [ ] Tests first: each founder has 15 actions with the Appendix B frame data exactly; category counts match §10.2 (Mountain 7/3/3/1/1, River 7/4/2/1/1); a three-hero fixture roster resolves a third hero with no code change; pose IDs follow `hero.<hero>.pose.<category>.<action>`.
- [ ] Commit `feat(sim): founders' normal actions as data and roster lookup`.

### Task 3: Fighter fields, hero selection, encode v4

- `Fighter` gains `hero` (roster index, −1 for dummies), `action` (index or −1), `contact`, `hitIds`, `chainUsed`, `airUsed`, `bridged`, `meter`, `lastCardinal`, `cancelLog` (last accepted or rejected link with reason), and for targets `health`, `stun`, `ctx` (combo context). `World` gains `playerHero[]`, `dummy { counterHit, refill }` and `infiniteMeter`.
- `WorldOptions.heroes?: string[]` (default `['mountain', 'river']`); `setHero(world, slot, id)` (applies when the hero is actionable).
- [ ] Tests first: default slots are Mountain and River; switching hero changes the action table; encoding includes every new field; `STATE_FORMAT` 4.
- [ ] Commit `feat(sim): hero per player slot and combat fields in the world state`.

### Task 4: Action runner (phases, movement, aerial landing recovery)

- Replaces the M1 attack stub for Attack and Low Attack (Special and Ultimate keep the 18 f stub). Phases from S/A/R; movement samples in px/f relative to facing; `passThrough` turns enemy collision soft for the action; aerial actions keep gravity, stay committed after their active frames, and apply landing recovery on touchdown; landing during startup or active cancels the remainder into landing recovery.
- [ ] Tests first: Mason's Touch occupies exactly 17 frames and is active on frames 6–8; Stone Shoulder advances 5 px/f for its listed frames; Rafter Palm from a jump ends in 8 frames of landing recovery; a second air `T` after an aerial (without a link) does nothing; Special still shows the 18 f stub.
- [ ] Commit `feat(sim): data-driven action runner with aerial landing recovery`.

### Task 5: Input → action resolution

- Context (neutral, air, dash, dash + chord) plus direction at acceptance (Forward/Backward from current facing, Up/Down from depth, ties by `lastCardinal`). Missing air directions fall back to air `T`. Assisted Facing turns towards the target only for a neutral starter and never during a string; explicit left/right never turns.
- [ ] Tests first: Review Focus 2; both heroes' five standing directions, dash `T`, dash `T+G` (both orders within 3 f, and the Low Attack binding), every aerial direction including Mountain's fallback; Assisted Facing keeps its target through a string.
- [ ] Commit `feat(sim): direction-at-acceptance action selection`.

### Task 6: Hits, reactions and the cancel resolver

- Hit pass after movement: attacker hitboxes (facing-relative x, depth band, height band from the attacker's `y`) against target hurtboxes, heroes never hit heroes, one hit per active segment per target, ids processed in ascending order.
- Reactions on the dummy: stagger (hit-stun, small push), knockback (decaying push), launch (airborne, falls, lands into down → get-up), knockdown, trip (counter-hit only), air pop when already airborne.
- Cancel resolver: one request slot; a press is resolved immediately to a destination and a verdict: **queued** (fires at the first frame after the source's active frames, inside the window), or **rejected** with one of `unlinked`, `tooEarly`, `tooLate`, `needsHit`, `alreadyUsed`, `noMeter`, `bridgeSpent`, `stunExhausted`, `notYet` (M5). A rejected press never replaces a queued one. Presses with no link during the last 9 f of recovery fall back to the M1 fresh buffer.
- [ ] Tests first: Review Focus 1 and 3; each link in both YAML files fires inside its window and is rejected one frame outside it; the jump chase after a launcher on hit; Southbank Slide → Ebb Heel → Reed Tap → (Southbank again) is rejected as already used.
- [ ] Commit `feat(sim): hit detection, dummy reactions and structured cancel resolver`.

### Task 7: Attack meter, premium cancels and the dash bridge

- Meter gain on contact through the context's meter-gain budget; the bridge (`Dash` action or double-tap Forward during the window) charges 25 % atomically when the dash begins and marks every hit target's context as bridged; the bridged dash accepts only dash `T` and dash `T+G`.
- [ ] Tests first: Review Focus 4; whiffs never gain meter; infinite-meter switch.
- [ ] Commit `feat(sim): attack meter, premium cancel cost and one dash bridge per combo`.

### Task 8: Target combo context

- Opens on the first hit; closes when the target is actionable again (idle and grounded, not in hit-stun, down or get-up); closing restores 100 % scale, full stun, meter and juggle budgets, clears the bridge, and refills health if the Lab switch is on. Two heroes on one dummy share its context.
- [ ] Tests first: Review Focus 5; a co-op string by both heroes on one dummy uses one context; different dummies keep independent contexts.
- [ ] Commit `feat(sim): target-owned combo context with damage scale and budgets`.

### Task 9: Asset registry with placeholders

**Files:** Create `apps/game/src/assets/registry.ts`, `assets/manifest.json`, test in `tests/assets/registry.test.ts`.
- `resolveAsset(id)` → `{ kind: 'approved', url } | { kind: 'placeholder', id, family, label }`; family comes from the ID (`pose.aerial` → aerial). Unknown IDs are placeholders, never errors.
- [ ] Tests first: Review Focus 6 for every action in the roster; a manifest entry replaces the placeholder.
- [ ] Commit `feat(game): asset registry with category placeholders`.

### Task 10: Stage rendering: poses, hitbox view, hit feedback

- Pose drawing per the table above; F3 now shows footprints, hurtboxes (blue, lowered for low attacks) and active hitboxes (red), with the depth band as a floor strip; small damage numbers and a combo counter over the dummy; a "ground window (M3)" marker after `opensGroundWindow` knockdowns.
- [ ] e2e: aerial, standing and low screenshots side by side; F3 screenshot during an active frame.
- [ ] Commit `feat(game): category poses, hitbox view and hit feedback`.

### Task 11: Lab panels and settings

- Attacker panel per player: hero, action and phase (`startup 3/5`, `active 1/3`, `recovery 7/9`), last cancel verdict with reason, attack meter, bridge state. Target panel (last dummy hit): health, hits, damage, scale %, stun budget and band, meter budget, juggle budget ("M3"), bridge, reaction, ground tag. **F5** move list for each joined hero: input drawn with `<InputPrompt>` tokens, S/A/R, damage, cancels and conditions, ground actions marked "M3". **F2** adds hero per player, infinite meter, counter-hit dummies, refill health. **F6** slow motion (¼ speed, render-side only, simulation unchanged).
- [ ] Tests first: text lint covers the move-list strings; e2e: hero switch changes the move list; a three-hit string shows 3 hits and the summed damage in the target panel.
- [ ] Commit `feat(game): attacker, target and move-list Lab panels`.

### Task 12: Golden replays, screenshots, README

- `RULES_VERSION` `m2.1`, `STATE_FORMAT` 4. Re-record `walk-square`, `dash-jump`, `crowd`; add `combo-routes` (both heroes: neutral strings, each directional route, a launcher into jump chase and aerial, dash attack, low attack with counter-hit trip, dash bridge with infinite meter, a co-op string on one dummy).
- README: M2 controls and test checklist; developer note on `pnpm gen:heroes`.
- [ ] Commit `test: M2 golden replays, screenshots and README`.

## M2 creator test checklist (posted with the PR)

1. P1 is the Mountain Guardian (blue, wide), P2 the River Scout (orange, slim). F2 switches either hero.
2. Walk up to a dummy and press Attack three times: three hits, the third knocks the dummy back. F1 shows 3 hits and the damage in the target panel.
3. Try each direction + Attack as the first hit, and Forward/Up/Down + Attack as the second hit (F5 lists every route).
4. Up + Attack launches the dummy; press Jump right after the hit, then Attack in the air (magenta diagonal pose), then Forward + Attack.
5. Jump without a dummy and attack in all directions: every aerial attack uses the tucked magenta pose, never the standing arm or the low sweep.
6. Dash, then Attack: the dash attack. Dash, then Attack + Guard together: the low attack (crouch + cyan sweep). F2 "counter-hit dummies" makes the low attack trip.
7. F2 "infinite meter", then finish the three-hit string and double-tap Forward (or press Dash): the premium dash bridge, then Attack. A second bridge in the same combo is rejected.
8. F3: red hitboxes appear only on active frames; blue hurtboxes shrink during the low attack.
9. Press buttons at the wrong time during a string: the Lab names the reason (too early, not linked, already used, …).
10. Two players on one dummy: one shared combo counter and damage scale.

## Carried forward to M3

- Ground-Opportunity Focus, ground actions, juggle budget enforcement, wall and ground bounce, landing recovery for jumps, protected recovery; the Academy recipes from spec §8.3.

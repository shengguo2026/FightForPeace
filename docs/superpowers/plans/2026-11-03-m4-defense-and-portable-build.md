# M4 Defense and Portable Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Combat Lab becomes the first playable build. Training dummies can attack, and the heroes defend with Committed Directional Guard, Exact Block (5 frames), Directional Predictive Counter (3 frames), Controlled Guard Crush and the Combo Breaker, paid from a regenerating Defense meter. Every defensive press gets a timing readout ("Exact Block ✓ 2 f before contact"). The Lab ships as a portable zip: unzip, double-click `start.bat`, and the Lab opens in the browser.

**Architecture:** Builds on M3 without changing its layering. `packages/data` gains an `enemies/` folder (the training enemy's kit uses the hero action schema plus defense-profile tags) and a per-hero `counter` action. `packages/sim` grows `combat/defense.ts` (guard arc, exact block, counter, guard crush, breaker, Defense meter) and `combat/trainer.ts` (the scripted attacker); heroes now use the same reaction code as dummies. `apps/game` adds the Defense panel (F8), training-enemy settings, guard/crush/counter/breaker markers and Defense bars. `tools/portable/` holds the start scripts, the dependency-free local server and the release script.

**Tech Stack:** unchanged. The release script and server use Node built-ins only (zip written with `node:zlib`), so the zip needs no `node_modules`.

**Spec:** `Features_Decisions.md` §6.3 (defense), §6.4 (combo breaker), §10 (Defense meter recovery: safety floor and skill-earned recovery); `2026-10-18-fight-for-peace-game-specification.md` §7.6; `docs/review/06-input-prompts-and-portable-build.md` §2 (portable build, M4 proof of concept); roadmap row M4.

## Global Constraints

- Everything from the M0–M3 plans still applies (60 Hz integer simulation in 1/256 px, no float maths, `Math.random` or `Date` in `packages/sim`, no key letters in player-facing text, heroes are data, open tag sets).
- **Precision uses press frames, never the buffer.** Exact Block and Counter compare the frame of the fresh Guard press (or the chord's completing press) with the contact frame. Holding Guard never opens a new attempt; the offensive buffer never touches Guard.
- **One defensive snapshot per frame.** All contacts of one simulation frame are checked against each hero's guard state as it was when the hit pass began, so two simultaneous hits are judged the same way, and exhausting the meter causes one Guard Crush only.
- **Defense profiles are data.** Enemy actions carry `guardPressure`, `guardPiercing`, `unblockable`, `counterable`, `uncounterable` and `deflectBreak` tags and optional `guard` cost and `blockstun` numbers; no code branches on an attack's name.
- **Heroes and enemies share one reaction system.** A hero hit by the training enemy uses the same hit-stun, launch, knockdown, juggle and protected-recovery code as a dummy, and owns its own combo context.
- **The Lab is the product in M4.** The Lab overlay is visible by default in every build, including the portable one. No knock-out yet: health stops at 0 and the Lab refill switch refills heroes and dummies when a combo ends.
- **Windows-safe tests and tooling.** No test splits paths on `/`, compares file text without normalizing `\r\n`, or depends on a POSIX shell. Zip entry names always use `/`. `start.bat` is written with CRLF and `start.sh` with LF by the release script, whatever the checkout's line endings.
- All new numbers are **candidates** for the Combat Lab, kept as named constants or data.

## Candidate rules and tuning

| Item | Candidate value | Source |
|---|---|---|
| Defense meter | 0–100, starts at 100; the Lab can make it infinite | F&D §10 |
| Guard arc | 150° around the defensive facing, in the belt plane (x and depth); integer test `dot² ≥ cos²75° × |v|²` with `dot > 0` | F&D §6.3 |
| Defensive facing | Guard with no direction: current facing; direction held before Guard: that 8-way direction; direction pressed while Guard is held (after the chord tolerance): pivot after **5 f**, the old arc protects until then | F&D §6.3 |
| Guarding | `Guard` state while Guard is held and Defense > 0; the hero stands still, may start an attack or jump out of it; Assisted Facing never turns it | F&D §6.3 |
| Normal guard | contact inside the arc: **20 %** chip damage, Defense − `guard` cost (data, default 10; `guardPressure` actions ~35), block-stun = `blockstun` (data, default hit-stun − 4, min 6), half push | F&D §6.3 |
| Exact Block | a fresh Guard press opens one attempt; a contact inside the arc on the press frame or up to **4 f** later (5-frame window ending on contact) is deflected: no damage, no Defense cost, **+15 %** once per incoming action | F&D §6.3 |
| Precision cooldown | an attempt that ends without a deflect blocks new attempts for **20 f** (held guard still guards) | F&D §6.3 |
| Deflect advantage | single-hit action or a `deflectBreak` contact: attacker interrupted into recoil **20 f** (deflect break **32 f**); other multi-hit contacts: the action continues and the hero stays in guard | F&D §6.3 |
| Counter | fresh direction and Guard within **3 f** of each other (either order); contact from inside the arc around that direction on the completing press frame or up to **2 f** later (3-frame window); only `counterable` actions; success: attacker interrupted (recoil 30 f), **+25 %** Defense, the hero's authored counter action starts facing the attacker and opens an ordinary combo context | F&D §6.3 |
| Failed counter | no contact in the window: **24 f** vulnerable recovery; a contact that is not counterable or comes from outside the counter direction connects normally (no fallback to guard) | F&D §6.3 |
| Guard Crush | a guarded contact whose cost reaches 0 Defense: normal chip only, Defense 0, **27 f** stagger, no extra damage or launch; one crush per frame; the next hit opens an ordinary combo | F&D §6.3 |
| Zero Defense | normal guard unavailable; a fresh Guard press still opens an exact-block attempt (the hero shows a guard pose for that attempt only); counters work | F&D §6.3 |
| Passive recovery | below the **25 %** floor, after **90 f** actionable without guarding, attacking or taking damage: +1 every 4 f up to 25 % | F&D §10 |
| Combo Breaker | Guard + Ultimate within 3 f during hit-stun, a juggle (launched, not air-recovering) or an open ground window; needs **75 %**, spends 75 %, once per incoming combo; closes the context (`Protect.Breaker`), **30 f** protected breaker state, every enemy within **260 px** is pushed to separation (8 px/f) and its action interrupted; no damage | F&D §6.4 |
| Invalid breaker | not eligible or not enough Defense: nothing is spent and nothing activates later; the Lab shows why | F&D §6.4 |
| Hero knockdown | heroes land, lie down and get up like dummies (protected get-up); a direction held on the first get-up frame rolls 6 px/f that way | M3 carry-over |

## Defense-response profiles of the training enemy

`packages/data/enemies/trainer.yaml` (the training enemy's kit; same action schema as heroes):

| Action | Profile tags | Startup / active / recovery | Purpose |
|---|---|---|---|
| Straight Jab | `counterable` | 14 / 3 / 18 | Standard: guard, exact block, counter |
| Overhead Club | `guardPressure`, `counterable` | 20 / 4 / 24 | Heavy guard cost: two in a row crush a full meter |
| Piercing Thrust | `guardPiercing`, `uncounterable` | 22 / 4 / 26 | Beats held guard; exact block still works |
| Two-Step | `counterable`, `deflectBreak` | 14 / 3 + 8 + 3 / 22 | Multi-hit; deflecting the concluding contact stops it |
| Pummel Barrage | — | 12 / five hits / 26 | Keeps the hero in hit-stun: Combo Breaker practice |
| Bell Hammer | `unblockable`, `uncounterable` | 45 / 5 / 30 | True unblockable with a long telegraph: move away |

## Training-enemy settings (Lab F2)

`world.trainer = { attackers, pattern, interval, approach }`: attacking dummies (none, Dummy 1, all), pattern (one action or "cycle"), frames between attacks (40, 70, 100), and whether they walk into range. Attack timing is deterministic (no RNG), so replays reproduce.

## Review Focus

1. **Guard arc and pivot:** contacts outside 150° bypass guard; held-before direction sets facing; pivot takes 5 f; same-frame contacts use one snapshot. → Task 3.
2. **Exact Block:** 5-frame window ending on contact; no after-contact correction; holding never re-attempts; cooldown after a miss; +15 % once per action; deflect break. → Task 4.
3. **Counter:** chord either order within 3 f; 3-frame window; only `counterable` and only toward the attacker; failure has no guard fallback; success damages via the hero's counter action and opens a normal combo. → Task 5.
4. **Guard Crush and Defense meter:** crush only from incoming guard damage, one per frame, 27 f, no damage; floor regeneration rules. → Task 4.
5. **Combo Breaker:** state gates, 75 % atomic check, once per combo, protection, push radius, no deferred activation. → Task 6.
6. **Portable build:** port 6006 or next free, `--port`, `127.0.0.1` only, path-traversal safe, Node 24 check and pinned download, zip layout, CRLF `start.bat`. → Task 8.
7. **Determinism:** re-recorded replays plus a `defense-drills` replay reproduce on Chromium, Firefox and WebKit. → Task 9.

---

## File structure

```
packages/data/enemies/trainer.yaml   training enemy kit with defense profiles
packages/data/heroes/*.yaml          + one counter action per hero
packages/data/src/generate.ts        enemies, counter category, guard / blockstun numbers
packages/sim/src/
  combat/defense.ts                  arc test, guard snapshot, exact block, counter, crush, breaker, meter
  combat/trainer.ts                  scripted training enemy
  combat/hits.ts                     defense outcome before a hit is applied; kitOf()
  combat/reactions.ts                hero reactions, recoil, get-up roll
  movement/controller.ts             guard, pivot, counter chord, breaker chord, defense states
  world/types.ts, world.ts           defense fields, trainer settings, encode v7, rules m4.1
apps/game/src/
  ui/LabOverlay.tsx, views.ts        Defense panel (F8) with timing readouts, trainer settings
  scenes/StageScene.ts               guard arc, crush, counter, breaker, recoil, telegraph, meters
tools/portable/                      server.mjs, start.bat, start.sh, get-node.ps1, README.txt, runtime.json
tools/release.mjs, tools/zip.mjs     pnpm release → release/FightForPeace-<version>.zip
tests/portable/                      server and zip tests (Windows-safe)
tests/replays/                       re-recorded replays, new defense-drills
```

---

### Task 1: Data — training enemy, counters, defense numbers

- Schema: `category: counter` with `input.context: counter`; optional `costs.guard` (Defense %), `frames.blockstun`; enemy files share the action schema. Generator writes `ENEMY_DATA` next to `HERO_DATA`.
- [ ] Tests first: each founder has 15 normals and one counter; the trainer has the six actions with their profile tags; a hero file with an `unblockable` tag is rejected (enemy-only tag); generated file up to date (CRLF-safe).
- [ ] Commit `feat(data): training enemy kit, hero counters, defense numbers`.

### Task 2: Heroes take hits; training enemy attacks

- `kitOf(f)`, route codes for enemy actions, `trainer.ts` (approach, face, interval, pattern), hero reaction stepping and get-up roll.
- [ ] Tests first: the jab hits an idle hero and opens the hero's own combo context; the hero recovers and acts; the trainer never attacks with `attackers: 0`; a knocked-down hero gets up protected.
- [ ] Commit `feat(sim): heroes take hits and a scripted training enemy`.

### Task 3: Directional guard

- [ ] Tests first: Review Focus 1 (front guarded, back hit, 75° edge inside, 80° outside; held direction; pivot after 5 f; two dummies on both sides).
- [ ] Commit `feat(sim): committed directional guard`.

### Task 4: Exact Block, Guard Crush, Defense meter

- [ ] Tests first: Review Focus 2 and 4, including press after contact = guarded or hit, reward once on a multi-hit action, crush once on simultaneous hits, regeneration only below 25 % and after 90 f.
- [ ] Commit `feat(sim): exact block, guard crush and defense meter`.

### Task 5: Directional Predictive Counter

- [ ] Tests first: Review Focus 3, both chord orders, wrong direction, uncounterable, miss recovery, counter at zero Defense.
- [ ] Commit `feat(sim): directional predictive counter`.

### Task 6: Combo Breaker

- [ ] Tests first: Review Focus 5 (hit-stun, juggle, ground window, not in neutral, guard crush, block-stun or protected recovery, < 75 %, second breaker in one combo).
- [ ] Commit `feat(sim): combo breaker`.

### Task 7: Lab

- F8 Defense panel per player: Defense meter, guard facing and pivot, last outcome with timing readout ("Exact Block ✓ pressed 2 f before contact · window 5 f"; "too early: 7 f before contact — guarded"; "too late: 3 f after contact"), counts of guards, exact blocks, counters, crushes and breakers. F2: training enemy (attackers, pattern, interval, approach), infinite Defense. Stage: guard arc, Defense bars, "EXACT", "COUNTER", "GUARD CRUSH", "BREAKER" call-outs, telegraph label with the defense profile in words (not colour alone).
- [ ] e2e: exact block and counter by key presses against the jab; guard crush by two clubs; screenshot of the Defense panel.
- [ ] Commit `feat(game): first playable Combat Lab: defense panel, training enemy settings`.

### Task 8: Portable build proof of concept

- `tools/portable/server.mjs` (Node built-ins only): port 6006 → 6105 on `127.0.0.1`, `--port` / `FFP_PORT`, MIME types, no directory escape, `logs/server.log`, `logs/last-port.txt`, reuses a running server from the same folder, opens the browser (`--no-open` for tests).
- `start.bat` + `get-node.ps1`, `start.sh` (+ `start.command`): use `runtime/node`, else a system Node ≥ 24, else download Node 24.22.2 for the OS/CPU from nodejs.org, check the SHA-256 pinned in `runtime.json`, unpack into `runtime/`.
- `pnpm release`: production build, assemble `FightForPeace-<version>/` (start scripts, `server/`, `game/`, `runtime.json`, `VERSION`, `README.txt`), zip to `release/`.
- [ ] Tests first: server picks the next port when 6006 is busy, serves `index.html` and JS with the right MIME type, refuses `..`; the zip lists the expected entries with `/` separators, `start.bat` has CRLF, `start.sh` is executable.
- [ ] Commit `feat(release): portable zip with start scripts and local server`.

### Task 9: Golden replays, README

- `RULES_VERSION` `m4.1`, `STATE_FORMAT` 7. Re-record replays; add `defense-drills` (guard, exact block, counter, guard crush, breaker against the trainer).
- README: M4 controls, portable build and test checklist.
- [ ] Commit `test: M4 golden replays and README`.

## Carried forward

- Directional wake-up options, `wakeupEligible` reversals and buffered guard on the last get-up frames (M7, with real enemy pressure).
- Enemy defense (guarding, exact blocks and Kael-style breakers) and boss armour responses (M7).
- Portable build v1: licence notices, version display in game, CI smoke test on Windows and Linux, GitHub Release on tag (M9).

# M8 Same-Device Co-op Implementation Plan

**Goal:** Two players share one machine against the Lab dummies, the arenas and the Sluice Commander. They pass a target to each other through tagged handoffs, their simultaneous strikes on one target resolve as one Combined Hit Bundle, and they spend meter together on the first team finisher, Confluence Strike (Invite and Confirm on Team Attack). Allies never hurt each other. A partner can assist on a held enemy, free a restrained hero and break a grab on their partner. The browser build pauses when the window loses focus or the tab is hidden, and Auto Quality lowers decorative presentation on slow machines without touching the 60 Hz simulation.

**Architecture:** `packages/data` gains `coop/coop.yaml`: handoff states with their sender and receiver tags and windows, the team finisher table (hero tags of the pair, target states, range, placement, cost, confirmation window, damage-scale floor) and the three tagged co-op actions (restraint release, partner interrupt, grab assist). Heroes carry `tags: [founder]`; actions carry `handoff*`, `receive*`, `grabAssistEligible` and `teamFinisher` tags, and each founder kit gets its `team` move (`confluence-strike`, category and context `team`). The generator validates all of it and emits `COOP_DATA`. `packages/sim` grows `coop/` (`data`, `handoff`, `team`); `combat/hits.ts` prescans each frame for targets reached by two or more hero strikes, bundles them, and splits a hit into pay / react / after steps; `combat/grabs.ts` reads its rescue numbers from the co-op actions. `packages/platform` adds the focus pause to the device hub and the `QualityGovernor`. `apps/game` adds the co-op HUD (handoff ring, TEAM? ring and countdown, callouts), the invited partner's prompt, the Lab Co-op panel and the focus-pause message.

**Spec:** spec Modules 12–13, `Features_Decisions.md` (Reciprocal Handoffs, Combined Hit Bundle, Invite and Confirm, Friendly Safety, Fixed Simulation with Independent Adaptive Presentation); roadmap row M8 and its two guardrails: handoff and team-finisher code is keyed by tags, never by the founders' names, and rescue, restraint release and partner interrupts are tagged co-op actions.

## Global constraints

- Everything from M0–M7 still applies (60 Hz integer simulation, no float maths, `Math.random` or `Date` in `packages/sim`, data-driven kits, Windows-safe tests).
- **Tags, not names.** The co-op code and the hit resolver never test a hero id or name (a lint test reads the source). Pairs are matched by hero tags in either order.
- **One request, one decision.** Team Attack is Invite and Confirm: nothing is spent until the partner confirms, the confirmation revalidates everything, and both costs are spent in the same frame. Both pressing on the same frame merges into one confirmed request.
- **Friendly safety.** Hero strikes, projectiles and thrown items never hit an ally; soft collision between allies stays.
- **Presentation adapts, simulation does not.** Auto Quality only changes what is drawn; the simulation hash is unaffected.
- All numbers are **candidates** for the Combat Lab.

## Candidate rules

| Item | Candidate value | Source |
|---|---|---|
| Handoff states | airborne 36 f, stagger 24 f, down 30 f from the sender's hit; only the partner's receiving move (matching `receive*` tag) claims it | F&D Reciprocal Handoffs |
| Handoff pre-buffer | the receiving move may start up to 7 f before the window opens | F&D |
| Handoff closes | window ends, target leaves the state, the combo context closes or the target becomes protected | F&D |
| Combined Hit Bundle | hero melee strikes on one target in one frame: damage and meter for each hit, one reaction chosen by priority (team finisher > handoff claim > bounce or relaunch > launch / knockdown / trip > knockback > flinch), ties broken by a neutral key, never by player slot | F&D Combined Hit Bundle |
| Team finisher | Confluence Strike: founder + founder, target in stagger or airborne within 380 px (x) and 110 px (z) of each hero, 50 % meter each, 30 f to confirm, heroes placed 110 px either side, damage-scale floor 50 % | F&D Invite and Confirm |
| Refusals | no partner, no finisher for the pair, no target, meter, busy, partner out of range: nothing spent, the reason is logged | F&D |
| Grab assist | a partner's `grabAssistEligible` strike on an enemy held by a hero deals damage only (no reaction, the hold continues) | spec Module 12 |
| Restraint release | partner within 140 px (x), 40 px (z) of a restrained hero frees them; 10 f recovery | spec Module 12 |
| Partner interrupt | a strike on the grabber that breaks the grab counts as a rescue | spec Module 12 |
| Focus pause | window blur or hidden tab: pause at once, release held keys; only Pause on an assigned device resumes, from neutral input | spec Module 13 |
| Auto Quality | smoothed frame time over 22 ms for 2 s steps down, under 18 ms for 8 s steps up; stalls over 250 ms ignored. Medium hides the decorative foreground, low also holds the far and middle backdrops still | F&D §4 |

## Tasks

- [x] Co-op data (`coop/coop.yaml`), hero and action tags, the `team` category and context, generator checks (declared tags only, the team move exists for every supported pair, exactly one co-op action per kind).
- [x] Handoffs: open on a sender's hit while a partner is present, claim by the partner's receiving move with pre-buffer, close rules, telemetry.
- [x] Combined Hit Bundles in the hit resolver (heroes before enemies kept), dominant reaction by priority and neutral key, boss Resolve wear for the other hits.
- [x] Team Attack: invitation, confirmation with full revalidation, same-frame merge, expiry, refusals, atomic meter spend, authored placement, the finisher closing the combo with protected recovery.
- [x] Friendly safety, grab assists, restraint release and partner interrupt as tagged co-op actions.
- [x] Platform: focus pause in the device hub; `QualityGovernor`.
- [x] Game: blur and visibility wiring, focus-pause message, co-op HUD (handoff ring in the partner's colour, TEAM? ring and countdown, CONFLUENCE STRIKE / ASSIST / RESCUE / HANDOFF callouts), the invited partner's prompt, the Lab Co-op panel with the Quality setting, Auto Quality in the arena backdrops, the Team hint.
- [x] Tests: `packages/sim/test/m8.test.ts`, the `coop-drills` golden replay, `tests/lint/coop-tags.test.ts`, platform focus-pause and quality tests, `apps/game/e2e/m8.spec.ts`; `RULES_VERSION` m8.1, `STATE_FORMAT` 11.

## Known limits

- Bundles cover hero melee strikes only; a projectile or thrown item landing on the same frame resolves after the bundle, as before.
- One team finisher exists (Confluence Strike for the founder pair); new pairs are new rows in `coop.yaml` and a `team` move in each kit.

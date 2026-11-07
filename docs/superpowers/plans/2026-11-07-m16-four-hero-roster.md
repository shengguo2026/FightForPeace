# M16 · Four-hero roster and the twins' kits

Roadmap: `2026-10-21-roadmap.md`, M16. Spec: Stage 2 §7 (Wind Sentinel, Fire Warden,
Reciprocal Handoffs, Twin Guardians' Accord). Version 0.16.0, rules version `m16`.

## Scope

- **Wind Sentinel** (`packages/data/heroes/wind.yaml`): eight standing normals, three
  aerials, three ground moves, a dash entry and a low sweep, a counter, three starting
  Specials (Windbreak Combination, Gale Passage, Skyward Sentinel), the signature
  Ultimate Four-Wind Vigil, a grab route and the team parts. Defensive identity: mobile
  guard with a whiff-punish follow-up (Slipstream Backfist → Clear-Sky Return).
- **Fire Warden** (`packages/data/heroes/fire.yaml`): planted bruiser with
  Contact-Confirmed Conversions: Flashpoint Clinch → Flashpoint Takedown, Warden's
  Crucible → Crucible Takedown (large enemies: Crucible Braced Strike), Ember Catch →
  Ember Catch Trip (unarmed targets only). Rising Cast stands a downed target back up
  into a bounded stagger.
- **Large-enemy limits**: kits tagged `large` (Enforcer, Commander) and the encounter
  boss take a conversion's `large` alternative (or none) unless vulnerable (boss Stagger
  Break or Guard Crush). Shared grabs keep the existing boss rules.
- **Reciprocal Handoffs**: coop rows with a `route {id, name, pair}`; Crosswind Temper
  (Wind → Fire, airborne and stagger) and Rising Ember Relay (Fire → Wind, stagger and
  airborne). The open row is stored on the target (`handoffRow`); its receivers decide
  the claim; `coop.reciprocal` counts route claims.
- **Twin Guardians' Accord**: finisher row for `[twin, twin]` with `bossStrike` (allowed
  against a resisting boss). Confluence Strike now pairs `[guardian, guardian]`, so any
  pair with a founder uses it.
- **Selection**: the shell roster, Wi-Fi lobby and Academy read the generated hero list
  (four heroes, six legal pairs, no duplicates through the existing owner check).
- **Presentation**: imported twin sheets, portraits, select art and the Stage 2 Ultimate
  effect sheet; per-action pose tables for poses drawn on shared sheets; weapon poses fall
  back to the neutral starter for heroes without Stage 1 weapon sheets.
- **Text**: Chinese and German names for every new hero, move, recipe, finisher and route.

## Sim mechanics

| Mechanic | Where |
| --- | --- |
| `convert {to, large?, unarmed?}` on actions, compiled to indices | `packages/data/src/generate.ts` |
| First confirmed hit records `punish` and `convert` | `combat/hits.ts` (`confirmContact`) |
| Conversion starts when the source's active frames end | `movement/controller.ts` |
| `on: [punish]` links, `Reject.NeedsPunish` | `combat/actions.ts` |
| `standRelease` ground finisher | `combat/hits.ts` (`groundReact`) |
| Route rows, `handoffRow`, `reciprocal` | `coop/data.ts`, `coop/handoff.ts` |
| `bossStrike` finishers | `coop/team.ts` |

New fighter fields (`convert`, `punish`, `handoffRow`) and `coop.reciprocal` are in the
canonical hash; with them removed every old golden replay keeps its hash, so the founders'
behaviour is unchanged.

## Tests

- `packages/sim/test/m16.test.ts`: roster and tags, six pairs, conversions on the dummy,
  whiffs, unarmed rule, large and vulnerable targets, Rising Cast, punish links,
  both twin routes, a founder partner getting the ordinary handoff, Accord vs Confluence.
- Golden replays (`tests/replays`): `hero-<id>` for each of the four heroes and
  `pair-<a>-<b>` for each of the six pairs, with content checks in `replay.test.ts`.
- `apps/game/e2e/m16.spec.ts`: hero selection cycles four heroes; the Lab plays both
  twins and their Team Attack is the Accord.

## Left for later milestones

- Twins' catalogue moves, outfits and Academy lessons: M21.
- Mounted kits: M17.
- Hard Enforcer courtyard difficulty: M23.

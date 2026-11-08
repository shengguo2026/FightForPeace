# M19 · Stage 2 enemies and Marek Vane, the Gilded Jackal

Roadmap: `2026-10-21-roadmap.md`, M19. Spec: Stage 2 §11 (enemy roster and difficulty), §12
(boss), with the role and boss decisions of `stage2_feature_story_line.md` §9. Version 0.19.0,
rules version `m19`, state format 16.

## Scope

- **Six core roles** (`packages/data/enemies/*.yaml`), each a kit plus an AI profile:
  - **Claim Hand** (`claimhand`): Readable Formation Fighter. Claim Jab → Seizing Cross →
    Bootline Kick is a hit-confirmed route (Contact-Confirmed Conversion, so a block or an
    evade ends it); Cut-In Hook (punishable depth-angle entry), Taxing Low Kick (no
    knockdown), Overreach Elbow (slow guard pressure, long recovery). Normal guard only,
    `Opportunistic` melee pickups, never firearms or the grenade. Morale breaks soonest of
    all roles, and earlier still when isolated.
  - **Glasshouse Runner** (`glassrunner`): Commitment-Based Flank Diver. Aisle Tap,
    Cross-Aisle Kick (depth angle fixed on commitment), Rail Vault (signalled leap) → Glassfall
    Heel (descending follow-up, long landing recovery; only on a confirmed hit, so an anti-air
    or an Exact Block ends it), Underbench Slide, Rebound Exit (a retreat with no
    invulnerability). Aerial-entry cooldown. Never guards, `Never` pickups.
  - **Cargo Reaver** (`reaver`): Telegraph-and-Reposition Controller. Load Check → elbow,
    Brace Shove (broad spacing), Load-Bearing Sweep (low reap), and three telegraphed Dock
    Clamp grabs with the universal Grab Escape window and partner rescue: Freight Knee,
    Aisle Turn (a pivot throw to the hero's other side) and Pallet Drop (terminal
    trip-and-drop into protected recovery). Stable normal guard, `Never` pickups.
  - **Revolver Marauder** (`marauder`): Finite-Ammunition Interrupter. Spawns holding a real
    Six-Round Sidearm loaded below capacity on the lower difficulties (Easy 3, Medium 4, Hard
    5, Extreme and Ultimate 6). Claim Shot and Retreating Shot spend that weapon's rounds and
    draw the warned aim line; no shot from point-blank range (a near hero gets Close Check),
    into a grab, against protected recovery or from outside the combat-safe zone; at most one
    active aim on Easy and Medium (a new director limit, `aims`). Empty, it throws the
    revolver once (Empty Cast) and fights on with a reduced Claim Hand kit. Disarmed or
    defeated, the revolver drops with its exact rounds; the Marauder reclaims only its own
    loaded revolver.
  - **Systems Saboteur** (`saboteur`): Interruptible Objective Specialist. Walks to a room
    control (a Ledger asset tagged `control`) and runs Control Breach as three separate
    actions, Access, Tamper and Commit, each with a caption; any hit interrupts it, followed by
    Exit Route. Only one sabotage at a time per room; each control can be breached once.
    Commit puts an essential control into Safe fallback (repairable) and an optional one into
    Critical; it never destroys it. In a room authored with `grenade: saboteur` the first
    Saboteur carries the room's one grenade and runs the M18 sequence (Remove, Arm, Aim,
    Release) itself, with every M18 rule (interruption drops it, return without a fuse reset).
    Losing the grenade or two interruptions shake its morale.
  - **Road Rider on foot** (`rider`): the dismounted survivor of M17. Arrives knocked down at
    the room edge with protected recovery, then fights with the reduced Claim Hand moveset
    (jab, Bootline Kick, Taxing Low Kick). Isolated, it flees or surrenders.
- **Challenge enemies**:
  - **Black-Iron Enforcer, Stage 2 upgrade** (`enforcer2`, Hard+): Iron Knuckle → Rivet Elbow →
    Anvil Heel route, Blackline Advance (vulnerable startup, armour only on its active
    frames), Anvil Sweep (low), Iron Measure (a visible counter stance with a cooldown) and
    **Lockstep Escort**: it walks between the nearest hero and a Marauder or Saboteur with its
    guard up, reserving escort threat so the specialist cannot also commit freely. Escort ends
    when it attacks, is hit, or the specialist is too far away.
  - **Jackal Signalman** (`signalman`, Extreme+): Baton Check, Command Kick, Low Marker,
    Rearward Order and three calls, each a long raised-arm startup that reserves its threat
    and is interrupted by any hit (then the vulnerable Signal Break). **Crossfang Call**: two
    free allies approach the target from opposite depth sides (their own attacks still go
    through the director with their normal telegraphs). **Guard the Claim**: an Enforcer or a
    Reaver escorts a Marauder or Saboteur. **Replace the Line** (Ultimate only): one wounded
    raider withdraws (it leaves as it is) and one enemy from the room's finite reserve
    enters through a warned edge. One Signalman and one active call at a time; no call during
    a boss transition, a group attack or a call already running. Isolated, it escapes.
- **Difficulty tables** (Easy reduced, Medium every role, Hard elite variants and the
  Enforcer, Extreme the Signalman, Ultimate master variants and Replace the Line): elite
  (Hard+) and master (Ultimate) variants are generated kits (`variants:` in the enemy YAML)
  that share their base kit's art; a wave picks the strongest variant its difficulty allows.
  Enemy kit table:

  | Role | Easy | Medium | Hard (elite) | Extreme | Ultimate (master) |
  | --- | --- | --- | --- | --- | --- |
  | Claim Hand | jab route, hook | + low kick, elbow | guard 1 in 2, more Health | as Hard | + Exact Block |
  | Glasshouse Runner | tap, kick, slide | + Rail Vault | evade 1 in 2 | as Hard | + shorter vault cooldown |
  | Cargo Reaver | check, shove, Dock Clamp | + sweep, Aisle Turn, Pallet Drop | guard 2 in 3 | as Hard | + Exact Block |
  | Revolver Marauder | 3 rounds | 4 rounds | 5 rounds, 2 aims co-op | 6 rounds, 2 aims | + Exact Block |
  | Systems Saboteur | breach, tool jab | + panel kick, shove | guard 1 in 3 | as Hard | faster breach |
  | Enforcer (Stage 2) | trial only | trial only | in mixed rooms | yes | yes |
  | Jackal Signalman | trial only | trial only | trial only | Crossfang, Guard the Claim | + Replace the Line |

- **Marek Vane, the Gilded Jackal** (`marek`):
  1. **Mounted intercept**: corridor `marek-intercept` (about 60 s at base pace) with Marek
     as a Road Rider that never breaks away and has boss Stability. Breaking it gives the
     clean forced dismount (Mounted Mastery, `marekBreak`); reaching the interception point
     forces a safe dismount anyway. No boss Health or Resolve is touched.
  2. **Armed Command** (phase 1, own Resolve): he starts holding the Burst-Command Support Gun
     (24 rounds). Jackal Burst and Sweeping Claim spend its real rounds (warned lines; the
     sweep leaves the far lane free), Stock Check up close, Cover Shift, and **Command
     Pressure**: one call that brings the phase's support pair once. A Resolve break drops
     the gun at his feet for the heroes for the whole Stagger window (seize it with Pickup:
     exactly its rounds); if nobody takes it he reclaims it afterwards.
  3. **Disarm or exhaustion**: the phase ends when he no longer holds a loaded gun (a hero
     has it, it broke, or he spent the last round and tossed it aside), or at the Health
     floor (he discards the gun with its rounds). The gun is never replaced.
  4. **Predator Unbound** (phase 2, the encounter's one Resolve refill): Jackal's Measure
     (counter stance), Claimant's Advance, Road-Cutter Sweep, Spoilsman's Grip (pivot grab),
     Carrion Descent → descending boot (hit-confirmed), elbow → boot strings, Exact Block and
     a Combo Breaker; he may pick up neutral melee weapons, never a firearm.
  5. **Scorched Claim** (not a phase, no refill): at 30 % Health he walks to the room's
     authored optional asset and runs a long, interruptible action; the Ledger shows the
     asset as **Threatened**. Interrupting it costs him extra Resolve; completing it moves the
     asset to its Critical route (never Lost, never an essential system), once.
  6. **Capture**: a Resolve break at or below 30 % Health, or the final blow during a Stagger
     window, is the clean **Resolve surrender** (he drops what he holds and kneels). Health 0
     while Resolve remains gives the **forced capture**: a short authored last attempt toward
     the nearest weapon or control that the heroes safely stop, then restraint. Both end in
     the same capture; the record keeps the route (`capture: resolve | forced`), the
     intercept result, how the gun was lost, rounds left, and Scorched Claim interrupted or
     completed. Remaining raiders lose their command and break.
  7. Marek's look follows the authored conditions: mounted, armed command, Predator Unbound,
     Scorched Claim, captured.
- **Tomas Rell as a story NPC**: a protected non-combatant in Marek's arena (exposed and
  under guard by the cargo bay). Nobody can hit him or path through him. He has subtitled
  lines on Marek's entrance ("expendable"), on the gun loss, and after the capture (his fear
  and the formula hand-over promise), in English, Simplified Chinese and German.
- **Rooms** (`greenhouse.yaml`, so every scenario has a Ledger): one trial room per role,
  the Enforcer and Signalman trials, two mixed Stage 2 beats (*Loading Yard*, *Filtration
  Control* with the Saboteur's grenade) and *Dispatch Yard: Marek Vane*. Lab arena list:
  each room, the intercept corridor, and "Marek: intercept then the yard".
- **Art**: the approved Stage 2 enemy sheets (Claim Hand, Glasshouse Runner, Cargo Reaver,
  Revolver Marauder, Systems Saboteur, Road Rider on foot, Enforcer upgrade, Signalman,
  Marek) and Tomas's sheets through `tools/art/import_art.py`, with pose tables.

## Deferred

- Stage flow, checkpoints, results and Museum/achievement wiring of the capture record (M20);
  Academy lessons for the new roles (M21).
- Exact values (every number here is a Combat Lab candidate).

## Tests

- `packages/sim/test/m19.test.ts`: data and variants, routes, aim limit, Marauder ammo,
  point-blank refusal, Empty Cast, exact transfer and reclaim, Saboteur breach and
  interruption, one breach per control, the Saboteur grenade, escort, every Signalman call,
  reserves, on-foot riders, every difficulty for every room, Marek's armed phase,
  disarm and exhaustion, the stagger seize, Predator Unbound, Scorched Claim, both capture
  routes, command collapse, the intercept, Tomas, determinism and snapshots.
- `packages/data/test/data.test.ts`: variants and the new profile fields.
- Golden replay `marek-river-fire`.
- `apps/game/e2e/m19.spec.ts`: a role room runs, Marek's room shows the boss and the
  ammunition, the intercept chains into the yard.

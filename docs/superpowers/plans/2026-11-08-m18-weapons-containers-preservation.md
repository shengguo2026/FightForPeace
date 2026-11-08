# M18 · Advanced weapons, containers and the Preservation Ledger

Roadmap: `2026-10-21-roadmap.md`, M18. Spec: Stage 2 §9 (weapons), §10 (recovery items and
containers), §6 (Preservation Ledger), §13 (environmental combat). Version 0.18.0, rules
version `m18`, state format 15.

## Scope

- **Weapons** (`packages/data/weapons/*.yaml`, M6 weapon schema, extended):
  - **Telescoping Service Lance** (`service-lance`): two-handed temporary melee weapon with a
    complete standing, aerial, ground, dash, low and throw core. Its coupling hook pulls and
    disarms; its locking collars give a long extension finisher. Integrity reads as
    *loosened* (Worn) and *bent* (Critical) before it breaks. Contextual fitting: Interact
    with the lance next to a seedling rack or the loading shutter fits the coupling hook and
    rights or braces it in one short action instead of a long repair.
  - **Deliberate Six-Round Sidearm** (`six-round-sidearm`): one-handed firearm, exactly six
    rounds, no reload. A shot has a long warned line (the aim line is drawn during the
    whole startup), commits the holder (no cancels, long recovery) and costs Defense
    (`fire.defenseCost`; refused without enough Defense). Rounds stay with the physical
    weapon (exact transfer on disarm, drop or pickup). Empty, the same input becomes a
    pistol-whip strike (`whenEmpty` tag), so the empty weapon stays useful; it can still be
    thrown.
  - **Finite Burst-Command Support Gun** (`support-gun`): two-handed firearm with an exact
    magazine of 24 rounds; a burst spends 3 rounds in three hits, pushes the shooter back
    (recoil), roots it and allows no cancels. Empty, the input becomes a stock strike; it
    can be thrown. Ammunition spent by its holder is gone; a disarm hands over exactly what
    is left. The Lab's armed dummy (F2, "Dummy 1 weapon") fires it for the disarm drill.
  - **Low-Fragmentation Breaching Grenade** (`breaching-grenade`): a recoverable thrown item
    with a fuse. In the greenhouse room a grenade drill thrower visibly *removes*, *arms*,
    *aims* and *releases* it, each step with a caption, sound and a drawn telegraph.
    Interrupting it before arming drops an unarmed grenade that a hero secures by picking
    it up; after arming it drops live at its feet. A live grenade on the floor can be picked
    up and thrown back (Interact); the fuse never resets. The blast knocks back everyone in
    its radius, costs held weapons Integrity and does bounded Ledger damage; essential
    systems drop to a safe fallback at worst.
- **Layered Pantry** (`packages/data/greenhouse/greenhouse.yaml`): Fresh Greenhouse Wrap and
  Herb-Fish Rice Bowl (Health), Mineral Garden Broth (Defense), Honey-Fruit Rice Cake
  (Attack Bar), rare Community Harvest Stew (bounded mixed). Walked over by a hero who can
  use it (a full hero leaves it for the partner); values clamp to the maximum; Health
  follows the difficulty's recovery percent; each item is taken once (anti-duplication).
  FULLPANTRY adds one copy of the room's first loose item.
- **Ownership-aware containers**: protected (Harvest Tote, Meal Carrier, Clinic Cabinet,
  Maintenance Locker, Emergency Cabinet) open only with Interact and never take damage;
  hostile or damaged breakables (Raider Case, Stolen Cargo Crate, Damaged Irrigation
  Housing) open only when strikes empty their Integrity. Contents are authored lists of
  pantry items and weapons, spawned once.
- **Preservation Ledger**: authored assets (crop beds, a medicinal bed, seedlings on the
  rack, fish and shrimp tanks, an aeration line, a pump, a filtration control, glazing, the
  loading shutter) with condition, states (Sound, Damaged, Critical, Safe fallback, Lost),
  bounded damage (per-hit cap and a short guard after each hit), hold-Interact repair,
  aquatic drain while circulation is down (bounded by a floor), stabilisation by the
  cooperative redirect, and grades Flourishing / Sustained / Strained / Damaged (candidate
  thresholds 90 / 70 / 45 / 0). Damage sources: enemy strikes that reach an asset, bodies
  knocked into an asset, the toppling rack, the grenade blast. Heroes' own strikes never
  damage protected property. Essential systems never go below Safe fallback.
- **Environmental pieces** (spec §13): loading shutter impact surface (impacts dent the
  shutter asset), seedling rack / support rail (Secure, Loose, Toppled; a toppling rack
  knocks down enemies under it, damages the seedlings and releases the tagged support rail
  fragment once), irrigation purge jet (valve: warned, then a jet along its lane that
  pushes everyone in it; cooldown; a purge also clears the pump a little), cooperative
  redirect (a two-handle wheel: one hero holds it for 3 s, two heroes for 1 s; it swings
  the jet to the other lane and stabilises the tanks), cargo restraint (an anchor that
  lashes an enemy standing in the cargo bay; shorter on large enemies; re-lashing
  cooldown), controlled grenade effects.
- **Greenhouse test room** (`?greenhouse=greenhouse-test-room`, Lab arena list): one screen
  with every asset, container, pantry item and fixture above, a grenade drill and two waves
  of Claim-Hand stand-ins (recruits; Stage 2 enemies arrive in M19). A Ledger panel shows
  every asset's state and the grade; the Lab arena panel lists the full record.

## Deferred

- Saboteur and Marek using the grenade and the support gun, boss Resolve conversion (M19).
- Ledger in the stage flow, results and epilogue inserts (M20); Academy lessons (M21).
- Final art: every M18 object is greybox with text labels.

## Tests

- `packages/sim/test/m18.test.ts`: weapon data, lance core and fitting, sidearm ammo, warned
  line, Defense cost, empty strike, exact transfer, support-gun burst and recoil, disarm
  transfer, grenade sequence, interruption, return without fuse reset, blast bounds;
  pantry rules; container ownership; Ledger damage bounds, repair, fallback, drain,
  stabilisation and grades; shutter, rack, jet, redirect solo and co-op, restraint;
  determinism and snapshots.
- `packages/data/test/data.test.ts`: `loadGreenhouse` validation.
- Golden replay `greenhouse-river-wind`.
- `apps/game/e2e/m18.spec.ts`: the room opens, a container opens, a repair raises an asset.

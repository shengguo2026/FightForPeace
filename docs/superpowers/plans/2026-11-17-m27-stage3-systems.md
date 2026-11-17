# M27 · Stage 3 systems: horse, weapons, bandits and Garran Voss (0.27.0)

Roadmap row M27. Spec: Stage 3 §8 (co-op), §9 (mountain horse), §10 (weapons and food),
§11 (enemies), §12 (Garran Voss), §13 (environment), §16.3 (sound), §22 (names). Engine
proof: `docs/review/10-combat-constitution-audit.md` and the Stage 3 builder review
`docs/review/11-stage3-builder-review.md` (M24): every Stage 3 mechanic is data on the
engine, apart from the two small generic additions listed under *Engine*. Rules version
`m27`, state format unchanged.

## Scope

**Weapons** (`packages/data/weapons/`, appended to the registry, lesson G1):

| Weapon | Id | Class | Notes |
|---|---|---|---|
| Hiking Staff | `hiking-staff` | two-handed medium melee | quick thrusts and sweeps, light clash, durability and throw like the Workstaff |
| Wood Axe | `wood-axe` | two-handed medium melee | committed chops (longer startup and recovery), heavy clash, high disarm and break power |
| Quarry Hammer | `quarry-hammer` | two-handed medium melee | slow impact, wall bounce and impact surfaces, highest break power; walking speed reduced while carried |
| Bandit revolver | `bandit-revolver` | firearm | exactly 5 rounds, no reload, warned aim line, Defense cost, pistol whip and throw when empty |
| Quarry Hookstaff | `quarry-hookstaff` | two-handed long melee | Garran's; long sweeps, hooked pull, low line; only loose after his disarm |

**Food** (M24 E13 carried provisions, `J` to pick up, `J`+Up to eat, throw or hand over):
Trail rice parcel (Health), Warm vegetable broth (Defense), Spiced seed cake (Attack Bar),
Mountain camp meal (a moderate share of all three).

**Mountain horse:** the M24 `mountain-horse` gets its Stage 3 values (Stability, gentler
acceleration than the bike, `atZero: dismount`: safe disengage, never dies, lost for the
corridor). Each hero's horse actions are the hero's motorbike kit names and inputs with
horse timing (spec §22.6). New corridor `horse-test-track` (*Horse Test Track*): switchback
bends, mud and timber barriers, a gate, two checkpoints and bandit riders, ridden solo or in
co-op. Its riders are the Mounted Raider on a bandit horse.

**Enemies** (`packages/data/enemies/`, each a kit, an AI profile and difficulty variants):

| Role | Id | Built from | Difficulty |
|---|---|---|---|
| Trail Ambusher | `ambusher` | flanker role, visible sprint entry with a bounded chase, quick kicks | Easy+ (elite Hard, master Ultimate) |
| Quarry Bruiser | `bruiser` | pressure role, slow committed swings with wall bounce, long recovery; may pick up a hammer | Easy+ |
| Rope Trapper | `trapper` | grappler role: lasso twirl (tell), rope throw (restraint grab: Grab Escape window, partner release, time-out) | Medium+ in mixed rooms |
| Mounted Raider | `raider` | M24 E6 mount (horse): warned lane passes, Stability, safe disengage, then on foot | Medium+ |
| Ridge Stalker | `stalker` | M24 E8 feints: the tell always shows, the real strike follows | Extreme+ |
| Pack Captain | `captain` | commander role: Flank Order (two allies take opposite sides, M19 Crossfang) and Hold the Line; interrupted by any hit, ends with separation or defeat | Ultimate |

**Garran Voss, the Ridge Wolf** (`garran`, boss, capture like Marek):

1. **Hookstaff Control** (`钩杖制敌`, *Hakenstab-Kontrolle*): he holds the Quarry Hookstaff
   (a real item: durability, clash, disarm). Long Sweep, Guarded Thrust, Hooked Pull (pulls
   the hero in), Low Line, Short Descent. The phase ends when he is disarmed (a hero's
   disarm, a Stagger Break drop, or the staff breaks) or at 65 % Health, when he casts it
   aside. The staff is never replaced; once loose any hero may pick it up.
2. **Clinch and Cast** (`缠抱摔投`, *Klammern und Werfen*): Collar Tie, Shoulder Cast, Ridge
   Trip (grabs with the universal Grab Escape window and the partner interrupt), Body Blows,
   Ground Follow-up (bounded, on a downed hero only within protected-recovery rules),
   Exact Block, Counter and a Combo Breaker.
3. **Winch Pressure** (`绞盘压迫`, *Seilwinden-Druck*), at 30 % Health: he works the terrace
   winch (a visible, interruptible action); every completed crank releases the next swinging
   cargo or sliding cover along a marked path (warning first). A hero's strike during the
   warning redirects it: it then hits only bandits, and a redirected load that hits Garran
   costs him Resolve (spec §13 "boss Resolve interaction"). He keeps his Clinch moves.
4. **Capture:** a Resolve break at or below 30 % Health or a final blow in a Stagger window
   is the clean surrender; Health 0 with Resolve left is the forced capture. Both restrain
   him live; bandits still in the room lose their nerve.

**Environment** (arena `scenery`, M24 E1–E3): quarry scaffolds with intact, damaged,
critical and broken states (breakable thresholds), mine carts on rails (warned movers, any
strike in the warning redirects), timber barriers, loose stone and a retaining wall (impact
surface).

**Arena scenarios** (`packages/data/encounters/lab-m27.yaml`, appended after M25): one
trial room per role, *Loose Scaffold* (Ambushers, Bruisers and the scaffold), *Hammer Line*
(Bruisers, Trapper, hammers), *Cart Rails* (carts and a Mounted Raider), *Outer Fence*
(every role the difficulty allows), *Garran: Hookstaff Control*, *Garran: Clinch and Cast*
(he starts unarmed at 65 %), *Garran: Winch Pressure* (he starts at 30 %) and *Chief of the
Broken Ridge* (the whole fight on the High Winch Terrace). Every room is listed in the Lab
arena menu, and the horse test track in the Lab pursuit menu.

**Sound** (J1): the 89 Stage 3 recipes of `stage3sfx.ts` are triggered in play: weapon
swings and hits per weapon, revolver aim, shot and empty click, pickups and food per family,
enemy tells (Ambusher sprint, Bruiser wind-up, rope twirl, throw, bind and escape, Raider
charge and disengage, Stalker feint, Captain orders and broken command), Garran's moves,
phase changes, disarm, Resolve break and restraint, winch warning, release and redirect,
scaffold creak, crack and collapse, carts, horse mount, gallop, Stability warning and safe
disengage.

**Art** (`tools/art/import_stage3.py`): the approved Stage 3 enemy sheets (Garran, the six
roles, the Mounted Raider on horse and on foot), the hero horse sheets, the Stage 3 weapon
sheets and armed walks, the horse and props sheets (weapons, food, scaffold, quarry). Story,
environment, outfit and shell art stays for M28.

## Engine (generic, no Stage 1/2 change)

1. **Armed melee boss phases:** `armed` / `untilDisarmed` accept any weapon, not only a
   firearm ("still armed" is ammo for a firearm, integrity for a melee weapon). Marek's
   firearm path is unchanged.
2. **Triggered movers:** a mover with `trigger: <device kind>` waits until a boss completes
   that device, then runs one warned cycle. A redirected mover that strikes the boss also
   costs Resolve. Encoded only when a mover has a trigger, so every earlier replay keeps its
   hash.

## Verification

- `packages/sim/test/m27.test.ts`: each weapon (five revolver rounds, never reloaded, throw
  when empty, hammer breaks scaffolds, axe disarms), food families, horse safe disengage at
  zero Stability (never Health), each enemy's signature behaviour, Garran's three phases
  (disarm ends phase 1, the staff drops loose; grabs are escapable and partner-interruptible;
  the winch releases warned cargo; a redirect costs Resolve; capture), snapshot round trip
  and same-inputs-same-hash.
- `packages/sim/test/m27-scenes.test.ts`: every M27 room and the horse track run headless
  solo and in co-op at Medium and Ultimate with no exception.
- Data validation and registry order (new files appended); every golden replay keeps its
  hash.
- `apps/game/e2e/m27.spec.ts`: each M27 room opens and draws; the horse track starts.
- Sound mapping unit test: every Stage 3 sound id the game triggers exists as a recipe.
- Localization: enemy, weapon, food, room and phase names in EN/ZH-CN/DE.

## Out of scope (M28)

The Stage 3 journey (areas, branches, checkpoints, rescues, Tomas, case and invoice), story
frames and Flow clips, the *Mist and Resolve* score and Garran's music layers, Museum,
Dossier, achievements, Store outfits and the default-evolution hero sheets, Stage 3
environments.

## Tasks

- [x] Plan (this file).
- [x] Weapons and food data; registry order kept (M24 files frozen in the generator).
- [x] Six bandit roles, Garran Voss (three phases, capture); captain without Hold the Line
      (the Guard call needs the Stage 2 specialists; M28 adds a Stage 3 Guard call).
- [x] Engine: armed melee boss phases; winch-triggered movers; redirected loads cost Resolve;
      Lab wave enemies may start in a later boss phase.
- [x] Mountain horse values and the Horse Test Track.
- [x] Lab rooms (`lab-m27.yaml`), all five difficulties in the Lab arena list.
- [x] Art import (`tools/art/import_stage3.py`), sprite and mounted mappings, quarry props.
- [x] Stage 3 sounds in play (`stage3Sounds.ts`, horse sounds in the pursuit view).
- [x] Strings EN/ZH-CN/DE.
- [x] Tests (sim m27, m27-scenes, platform m27, e2e m27), rules `m27`, version 0.27.0,
      README, Guo_tests M27 section.

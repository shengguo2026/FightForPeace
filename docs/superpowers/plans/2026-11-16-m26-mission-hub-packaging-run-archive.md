# M26 · Mission Hub, packaging, Run Archive (0.26.0)

Roadmap row M26. Expanded game modes specification §5 (Mission Mode), §7 (Run Archive) and
§9.2 (Personal Paths); campaign review G6 (story choice record).

**Goal:** every later Mission Mode content wave (the Curated Missions from M30, the
Chronicles from M32 and M38, Random Operations in M41) arrives as a data package on one Hub
with stable IDs, versioned records and content-access rules, so no mode invents its own
menu, gate or record.

| Part | What it carries | Later users |
|---|---|---|
| **Content packages** | `packages/data/missions/missions.yaml`: every Mission Mode entry with a stable ID (`chronicle.`, `remix.`, `curated.`, `operation.` + kebab-case name), package version, family, canon label, timeline place, gate, objective family, players, hero rule, difficulties, status (available or planned with its milestone), the arena an available package launches | M30 *Storm over Qinglan*, M32/M38 Chronicles and Remixes, M33/M34/M37 Curated Missions, M41 operations |
| **Eligibility rules** | `packages/platform/src/progress/missions.ts`: locked until the gate (a story stage completed, Cheat-Assisted included, or a Chronicle authenticated), then open or Not installed; hero rules (fixed participants, a pool, any unique hero); player counts; never a score, rank, difficulty, Credits or another optional package (spec §5.4.3) | every package |
| **Mission Hub** | Village → **Mission Hub**: four destinations with their own frames (Archive records, reconstructions, case files, operations board) on one keyboard/gamepad/pointer navigation; cards show every spoiler-safe fact of spec §5.1; locked entries show a sealed title and a localized clue | every Mission Mode release |
| **Chronicle authentication** | A Chronicle's first completion shows **Record Authenticated**, stores it and opens its Remix at once; Remix records stay under their own content ID | M32, M38 |
| **Run Archive** | Every finished run (Story and Mission Mode) with mode, canon label, package version, outcome, grade, points, heroes, players, time and result labels (Cheat-Assisted, Continued, Practice, Open Loadout); newest 100 kept, pinned ones always; Legacy marking for older package versions; **Replay** starts the same content, difficulty, players and heroes again under the current version | Chapter Challenge (M42), Curated results (M30) |
| **Story choice record** | `storyChoices` in missions.yaml (first entry `story.stage8.kael-reunion`: `meet_now`, `meet_later`, `not_yet`); `recordStoryChoice` accepts only known ids and options; Records → **Personal Paths** | M40 (the reunion choice) |
| **Random Operations shell** | The operations board with Defeat and Safeguard, the spoiler-safe content pool (only cleared story content, no Story bosses), the selection flow; **Generate** waits for M41 | M41 |

## Decisions

1. **Stable ID form:** the code's kebab-case (`story.stage2.prosperity-under-siege`,
   `curated.storm-over-qinglan`). Some specs wrote underscores (`story.stage3.herb_mountain`,
   `curated.vanishing_survey`); the first release of each ID uses kebab-case and the specs
   are read that way. IDs never change after release; a new package version keeps its ID.
2. **The Hub has its own village entry** (below Play). Spec §4 puts Mission Mode inside Play
   beside Story Mode and Chapter Challenge; Play keeps opening Story Mode until Chapter
   Challenge (M42) gives Play its three destinations, so the existing play flow and its
   tests stay unchanged.
3. **Not installed** is the state of a planned package once its gate is met. A browser build
   has no separate downloads yet: "installed" means the package's content is in the build.
   Uninstalling, local-Wi-Fi package validation and filters (timeline, location, objective,
   completion, rank, heroes) come with the first real Curated Mission (M30) and the
   Wi-Fi Mission Mode release.
4. **Lab test packages** (`lab: true`) launch the M25 test room so the launch, results,
   authentication, Remix opening and Archive replay are testable now. They show only in the
   M26 Lab profiles and pay no Credits.
5. **Save version 4:** Run Archive entries get their full fields and Chronicle
   authentication is added. Old entries migrate as clean story clears. `recordClear` no
   longer writes the archive; `archiveRun` writes one entry per finished run.
6. **Mission results** for now: outcome, the arena's 100-point grade (no grade when
   Cheat-Assisted and the arena says so), time, Record Authenticated and what opened. Payout,
   rewards and Highlights come with each package's own milestone.

## M26 Lab (placeholders)

`?hublab=<preset>` (or the links in the Lab's F1 panel *M26 Mission Hub Lab*) opens the game
on a temporary in-memory profile and goes straight to the Hub: `fresh`, `stage2` (default),
`stage3`, `stage6`, `all`. Later timeline stages are recorded as completed without their
content; the sample Run Archive has a clean Stage 1 run, a Cheat-Assisted one, a pinned
Continued co-op Stage 2 run and a Legacy run of the Lab case. The player's own profiles are
never touched.

## Verification

- `packages/data/test`: the catalogue validates; timeline order, unknown arenas or heroes,
  family prefixes, unknown gates and wrong canon labels are refused.
- `packages/platform/test/m26.test.ts`: stable IDs; Hub order; locked / Not installed /
  open; gates never ask for score, rank or another package; hero rules; Chronicle
  authentication (failed runs and Cheat-Assisted runs), Remix records apart; Archive
  retention with pins; replay targets (story, mission, Legacy, Lab-only); the operations
  pool; story choices; save version 4 migration and round trip.
- `apps/game/e2e/m26.spec.ts`: the Hub with locked entries and clues, Not installed and
  open entries; a locked card shows only its clue; a Lab Chronicle played to its results
  authenticates and opens its Remix; the Run Archive replays a Stage 1 run with its
  difficulty and hero.
- Golden replays and the simulation are unchanged (the Hub is shell and save data only).

## Tasks

- [x] Plan (this file).
- [x] missions.yaml, generator validation, `MISSIONS` in the simulation's data.
- [x] Platform: eligibility, Chronicle authentication, Run Archive, story choices, save v4.
- [x] Shell: Hub, mission card, mission set-up, operations board, Run Archive, results,
      Personal Paths, play flow for missions, Archive replay.
- [x] Lab profiles (`?hublab=`), F1 links, strings EN/ZH/DE.
- [x] Tests, version 0.26.0, README, lessons, Guo_tests M26 section.

## Out of scope

- Real Curated content (M30 onward), the Chronicles (M32, M38), the operation generator
  (M41), Chapter Challenge (M42).
- Replay capsules and View Replay Moment (deterministic playback): the Archive keeps the
  facts now; capsules arrive with Chapter Challenge and the Curated Highlights.
- Hub filters, uninstall, local-Wi-Fi package validation, Mission Mode over Wi-Fi.

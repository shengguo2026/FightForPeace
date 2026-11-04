# M10 Game Shell, Saves and Localization Implementation Plan

**Goal:** the game starts like a game instead of the Combat Lab. A first launch asks for language, subtitles, essential accessibility, keyboard layout and the first input device, creates a profile and opens the Village Command Menu. Play leads through mode, the readiness lobby, stage and difficulty, split hero selection, the intro (captioned story stills), the elder's briefing with loadout, readiness and Stage 1. The combat HUD uses corner clusters, pause is a focused menu with a detail pane, Settings is a category rail with a detail pane, and controls are remapped through a guided action list with a live tester. Profiles are saved with versions, checksums, a known-good snapshot and backups, one tab writes at a time, and profiles can be exported and imported. Every player-facing shell, HUD, pause and stage text exists in English, Simplified Chinese (山神, 河神) and German.

**Architecture:** `packages/platform` gains `i18n/` (locale catalogues, `translate` with English fallback and diagnostics, `checkCatalogues` for release validation) and `save/` (the versioned profile schema with migrations, canonical JSON and a CRC-32 checksum, the `.ffpsave` backup format, and `ProfileStore` on top of a small key-value `SaveBackend`: IndexedDB in the browser, the portable server's `saves/` folder over HTTP, memory in tests; Web Locks for the single writer). `apps/game` gains `text/locales/{en,zh-CN,de}.ts` and `shell/`: a Preact shell state machine (`setup`, `village`, `play` steps, `game`, `lab`, `settings`, `records`), menu navigation from keyboard, gamepad and pointer, the corner-cluster HUD, the pause menu, the settings rail and the remapping screen. The simulation stops stepping while a shell screen is open; gameplay keys are routed to the shell instead. `tools/portable/server.mjs` gains `GET/PUT/DELETE /__ffp/saves/<name>` with atomic writes into `saves/`.

**Spec:** spec §4, §15.1, §16; `Features_Decisions.md` Module 16 (Village Command Menu, first-launch setup, play flow, HUD corner clusters, pause, hero selection, remapping, readiness lobby, settings rail), D4 (山神 and 河神; German keeps the English names), D6 (printed key labels and the first-launch layout picker); review 06 §2.4 (saves in the portable build); roadmap row M10 and its guardrails.

## Global constraints

- Everything from M0–M9 still applies (deterministic integer simulation, data-driven kits and stages, Windows-safe tests, no key letters in player-facing text).
- **The shell never changes the simulation.** It only decides when the session steps and which world it starts.
- **Text comes from keys.** Shell, HUD, pause, stage and results text is looked up by stable keys; a missing translation falls back to English and records a diagnostic, and the unit tests treat a missing required key as an error. The Combat Lab stays an English developer surface.
- **Saves are versioned data.** `SAVE_VERSION` 1 with a migration table from day one; the schema already has the story choice record, mission records per content ID, the Run Archive slot and reserved Museum, Sponsor Dossier and research records (guardrails).
- **Mouse never required:** every shell screen works with keyboard, gamepad and pointer.
- No rig. Real art where it exists: menu background, title key art, menu icons, HUD icons, hero portraits and select renders, elder portrait and briefing poses, Stage 1 intro stills and briefing backdrop.

## Candidate rules

| Item | Candidate value | Source |
|---|---|---|
| Destinations | Continue (only with a saved checkpoint, then default focus), Play, Academy, Village Store, Collection and Records, Guide, Settings | Module 16 |
| Academy | opens the Combat Lab (the Academy proper is M11) | roadmap |
| Village Store, Guide | shown, with "opens in a later update" (M11) | roadmap |
| Play flow | mode → lobby → stage and difficulty → heroes → intro → briefing and loadout → readiness → gameplay | Module 16 |
| Modes | Solo, Same-device co-op; Local Wi-Fi shown as not available yet (M12) | roadmap |
| Lobby | P2 joins by pressing Attack on an unused source (split keyboard half or a gamepad); chooses a local profile or Guest; each player owns a ready state; changing profile, device or hero clears only that player's ready, changing stage or difficulty clears both | Module 16 |
| Heroes | split panels, one hero per person: confirming reserves the hero, the other panel shows it as taken | Module 16 |
| Continue | the profile keeps the last checkpoint (stage, difficulty, beat, heroes); Continue starts the stage at that beat | §15.1 |
| Saves | IndexedDB (`pnpm dev`, browser) or the portable server's `saves/` folder; each write keeps the previous good copy; a backup per day, the last 5 kept; checksum checked on load, falling back to the snapshot | §15.1, review 06 §2.4 |
| Single writer | a Web Lock per profile; a second tab gets read-only mode with a notice | §15.1 |
| Export / import | `.ffpsave` file (format, version, checksum, profiles); import shows a preview, then merge (adds profiles, never overwrites) or replace the selected profile; a recovery snapshot is taken first | §15.1 |
| Settings scopes | every setting shows Profile, Device, Session or Assisted | Module 16 |
| Display change | UI scale keeps a 10 s revert countdown until confirmed | Module 16 |
| Remapping | groups Movement, Combat, System; player tabs and device tabs; listen for the next real input; conflicts in the same group offer Replace, Swap or Cancel; reset a group or the device; presets for the split keyboard; a live tester | Module 16 |
| Languages | English, 简体中文, Deutsch; 山神 and 河神 in Chinese, English hero names in German | spec §4, D4 |
| Title logo | "Fight For Peace" (EN, DE), "和平之战" (ZH-CN) | guardrail |

## Tasks

- [x] i18n module, catalogues EN / ZH-CN / DE, catalogue checks (tests).
- [x] Save module: schema v1 and migrations, checksum, snapshots and backups, `.ffpsave` export and import with preview, merge and replace, single-writer lock; memory, IndexedDB and server backends (tests).
- [x] Portable server: `saves/` endpoints with atomic writes (tests).
- [x] Game session: shell hold (no stepping), shell key routing, explicit slot assignment for the lobby, stage start with heroes and Continue.
- [x] Shell: first-launch setup, Village Command Menu, play flow (mode, lobby, stage and difficulty, heroes, intro, briefing, readiness), records, Store and Guide placeholders, Lab entry and return.
- [x] HUD corner clusters, boss bar unchanged, pause menu with detail pane and confirmations, results back to the village.
- [x] Settings rail with scopes, accessibility presentation settings (HUD scale, high contrast, subtitle size and background, reduced flashing and shake), UI scale with revert countdown, language switch.
- [x] Remapping screen with live tester, conflicts, resets and presets; bindings saved per profile and device type.
- [x] Art import: menu background, title art, menu and HUD icons, portraits, select renders, elder art, Stage 1 intro and briefing stills.
- [x] Browser tests (`e2e/m10.spec.ts`), Guo_tests.md M10 section, version 0.10.0.

# Fight For Peace — Stage 2 Impact Review (before M0)

**Date:** 2026-10-25
**Reviewed:** `2026-10-24-fight-for-peace-stage-2-specification.md`, `stage2_feature_story_line.md`, `docs/art/stage2/stage2_google_flow_start_frame_prompts.md`, `docs/art/stage2/stage2_google_flow_music_prompts.md`
**Against:** `2026-10-18-fight-for-peace-game-specification.md`, `Features_Decisions.md` §13 (D1–D11), `docs/superpowers/plans/2026-10-21-roadmap.md`, `docs/superpowers/plans/2026-10-21-m0-foundations.md`

## Verdict

**M0 can start as planned.** Stage 2 does not conflict with any M0 task, and it does not reopen any Stage 1 decision. Its own stage-evolution policy (§17.1 of the decision log) explicitly keeps Stage 1 unchanged. The shared specification already defines the mechanics Stage 2 relies on: mounted Chase/Arena/Escort profiles with Stability (§11.4), finite-ammunition firearms whose ammunition belongs to the weapon (§11), the five difficulty levels and the deterministic architecture.

Two small M0 changes are worth making now because they are cheap today and expensive once golden hashes exist. Both are applied in this PR.

## Changes applied in this PR

| # | Where | Change | Why |
|---|---|---|---|
| 1 | `Features_Decisions.md` §13 | New confirmed decision: title **Fight For Peace** (EN and DE, not translated), **和平之战** (ZH-CN); two title logos; tab title follows the language. | Creator decision of 2026-10-25. |
| 2 | M0 plan, Global Constraints, Tasks 5, 7, 8 | `<title>Fight For Peace</title>` plus an e2e assertion; `encodeWorld` starts with a format-version byte; `ReplayLog` gains `rulesVersion` and `runReplay` rejects a mismatched version. | Stage 2 §17 requires content, rules and cheat-registry versions in every checkpoint, replay and snapshot. Adding the version fields after golden replays exist would invalidate every recorded hash. |
| 3 | Roadmap | New "Stage 2 guardrails" table (M2, M6, M7, M8, M10, M13) and "After the slice: Stage 2 prerequisites". | Keeps slice code data-driven so Stage 2 stays a content package, without adding slice scope. |
| 4 | `docs/commercial-release-checklist.md` 2.7 | Trademark check now names both titles. | Title decision. |
| 5 | `Features_Decisions.md` §13 | Note that D3's "timeless pre-industrial" setting describes Stage 1; the village modernizes by Stage 2. | D3 said modern technology arrives through the outside sponsor; Stage 2 has the village itself adopt greenhouses, a clinic and motorbikes. Not a conflict, but worth stating so art prompts do not fight it. |
| 6 | Repository | Stage 2 spec and decision log added at the repository root (next to the Stage 1 files); Flow prompt catalogues under `docs/art/stage2/`. | Plans and reviews reference them; they were only on the local machine. |

## Points that do not block M0 (for later plans or a spec touch-up)

1. **Network model wording.** Stage 2 spec §3 lists "bounded rollback", and §17 lists host migration, as inherited architecture. D9 delivers these after the slice. This is consistent only if they are built between the slice and Stage 2; the roadmap now says so explicitly.
2. **Spec path.** Stage 2 spec header cites `docs/superpowers/specs/2026-10-18-...`; in the repository the Stage 1 spec is at the root. Suggest correcting the path in the spec.
3. **Review decisions not cited.** The Stage 2 spec names the shared spec as normative but not `Features_Decisions.md` §13. D5 (key-pose animation) and D9 (network phasing) in particular apply to Stage 2's "model sheets and animation" (Appendix C) and its networking. Suggest adding §13 to the "Shared-system source" line.
4. **Key labels.** The twins' mounted kits write the hop as `Z`. Under D6 that is the printed label of physical `KeyY` (Jump) on QWERTZ; US players see `Y`. Suggest writing "Jump (`Z` on QWERTZ)" or the abstract action name in the spec.
5. **German hero names.** By analogy with D4, I assume English and German both use **Wind Sentinel** and **Fire Warden**, with **风神** and **火神** in Chinese. The Stage 2 log leaves final localized names deferred, so this is an assumption to confirm.
6. **Twin likeness and consent.** The twins are derived from a supplied photograph of a teenager. Appendix C already requires creator consent and provenance per asset; the manifest should record that consent for every model sheet derived from the photo.
7. **Roster-wide testing.** Stage 2 acceptance covers four heroes and six pairs in hot-seat and local Wi-Fi. That multiplies test time; the CI replay suite from M0 should grow with one golden replay per hero and pair once heroes exist (M2, M8).

## Generated Stage 2 assets

The generated model sheets, clips and music in `C:\AI\Codex\FightForPeace\assets` were not needed to judge M0 and were not reviewed here. They can be reviewed against the Stage 2 spec and prompt catalogues in a separate pass.

# Lessons learned

Findings from Guo's manual tests that changed how we work. Newest first.

## 2026-11-14 · Stage 2 enemies glided instead of walking (M22)

- **What Guo saw:** after the M22 art import the Stage 2 enemies still did not walk with both legs when they came toward the hero. Their flee runs and every Stage 1 walk looked right.
- **Cause:** the art, not the code. On every Stage 2 `IDLE-WALK` sheet the four walk poses (cells 3 to 6) show the same leg in front with almost the same stride, so the loop reads as a glide or a limp. The Stage 1 sheets alternate the legs. The importer and the tests only checked that the walk cells exist and differ, not that the legs swap.
- **Fix:** dedicated approach walk sheets EW01–EW08 (prompts at the end of `codex_prompts_stage2_armed_walks.md` in the Pictures repo). The picker uses `enemy.<kit>.sheet.walk` when it is delivered and the idle-walk poses until then.
- **Rule from now on:** every walk or run prompt spells out a two-step cycle whose second half mirrors the legs of the first ("cells 4 to 6 must NOT repeat cells 1 to 3"), and the review of a delivered walk sheet checks that cells 1 and 4 have a different leg in front before it is approved. Do not combine idle and walk poses on one sheet for new characters; ask for a separate six-pose walk.

## 2026-11-14 · Title screen rule (M22)

- **What Guo saw:** the title screen kept the Stage 1 loop although Stage 2 was open.
- **Decision:** the title screen follows the latest stage the profile has completed once, at any difficulty, cheats included (Features_Decisions.md §11). The rule is data in `progression.yaml`, so a new stage only adds its `titleScreen` entry.

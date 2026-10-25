# Codex prompt: upload all Stage 2 assets to the Pictures repository

Paste everything below the line into Codex (running on your Windows machine, with git access to GitHub).

---

Upload all Fight For Peace Stage 2 assets (character images, story start frames, video clips and music) from my local folder to my private GitHub repository `shengguo2026/Pictures`, following the repository's existing layout. Do not change, move or delete any file that is already in the repository.

**Source (local, read only):** `C:\AI\Codex\FightForPeace\assets\`

**Target repository:** `https://github.com/shengguo2026/Pictures`, branch `main`, folder `FightForPeace/`

## Steps

1. If the repository is not cloned yet, clone it to `C:\AI\Codex\Pictures-repo` (if that folder already holds a clone of this repository, use it). Run `git checkout main` and `git pull` so you start from the latest `main`.

2. Copy the files below **byte for byte, keeping their exact file names** (including spaces). Create target folders that do not exist yet. Source paths are relative to `C:\AI\Codex\FightForPeace\assets\`; target paths are relative to `FightForPeace/` in the repository.

   **Characters (6 files)**

   | Source | Target folder |
   |---|---|
   | `characters\stage2\wind-sentinel\wind-sentinel-default-model-sheet-v1.png` | `heroes/wind/` |
   | `characters\stage2\wind-sentinel\wind-sentinel-default-model-sheet-v2.png` | `heroes/wind/` |
   | `characters\stage2\fire-warden\fire-warden-default-model-sheet-v1.png` | `heroes/fire/` |
   | `characters\stage2\fire-warden\fire-warden-default-model-sheet-v2.png` | `heroes/fire/` |
   | `characters\stage2\references\athletic-daughter-age-18-reference-v1.png` | `reference/stage2/` |
   | `characters\stage2\references\fire-warden-human-reference-v1.png` | `reference/stage2/` |

   **Story start frames and clips (10 files)**: every `P0*.png` and `P0*.mp4` file in `story\stage2\start-frames\` goes to `story/stage2/`:
   `P01-water-returns-v1.png`, `P01-water-returns-v1.mp4`, `P02-building-a-reserve-v1.png`, `P02-building-a-reserve-v1.mp4`, `P03-seasons-of-construction-v1.png`, `P03-seasons-of-construction-v1.mp4`, `P04-hydroponic-cultivation-v1.png`, `P04-hydroponic-cultivation-v1.mp4`, `P05-aquaponic-cycle-v1.png`, `P05-aquaponic-cycle-v1.mp4`.

   **Music (13 files)**: every `.mp3` file in `story\stage2\start-frames\` goes to `music/stage2/`:
   `01_Water Became a Future.mp3`, `02_Roadside Vigil.mp3`, `03_Glass and Green.mp3`, `04_Alarm Through the Channels.mp3`, `05_Protect the Living System.mp3`, `05_Protect the Living System_v2.mp3`, `06A_Mounted pursuit.mp3`, `06B_Armed command.mp3`, `06B_Armed command_v2.mp3`, `06C_Predator Unbound.mp3`, `06D_Scorched Claim and surrender.mp3`, `06D_Scorched Claim and surrender_v2.mp3`, `07_What We Protected.mp3`.

   If the source folders contain any other file types not covered above, do not upload them; list them in your final report instead. If a file with the same name already exists at the target, do not overwrite it; report it instead.

3. Open `FightForPeace/APPROVED_VARIANTS.md` and append the following section at the very end of the file, exactly as written (keep everything that is already in the file unchanged):

   ```markdown

   ## Stage 2

   Stage 2 files live in `heroes/wind/`, `heroes/fire/`, `reference/stage2/`, `story/stage2/` and `music/stage2/`. Full notes: `docs/art/stage2/approved-variants.md` in the FightForPeace repository.

   ### Characters

   | Asset | Use | Not used | Why |
   |---|---|---|---|
   | Wind Sentinel (风神) model sheet | `heroes/wind/wind-sentinel-default-model-sheet-v2.png` | `…-v1.png` | v1 colours too close to River Scout and semi-realistic faces; v2 matches the Stage 1 cel-shaded style. Canonical hair: braid from crown to shoulder blades. |
   | Fire Warden (火神) model sheet | `heroes/fire/fire-warden-default-model-sheet-v2.png` | `…-v1.png` | v1 semi-realistic faces and lower body identical to his sister; v2 approved. Longer forearm guard on the left arm. |

   The files in `reference/stage2/` are photo-style likeness references for the twins. Like everything else in `reference/`, nothing there ships in the game, and they are never used as Google Flow ingredients or start frames.

   ### Story stills and clips

   All five `P0x-…-v1.png` start frames are approved and are the still fallbacks for their clips. Strip the audio track from every clip.

   | Clip | Use | Not used | Why |
   |---|---|---|---|
   | `P01` | `P01-water-returns-v1.mp4` (full 8 s) | — | |
   | `P02` | `P02-building-a-reserve-v1.mp4` (full 8 s) | — | |
   | `P03` | pending v2; the still `P03-seasons-of-construction-v1.png` is the placeholder | `P03-seasons-of-construction-v1.mp4` | Turns photorealistic after about 2.2 s |
   | `P04` | `P04-hydroponic-cultivation-v1.mp4`, 0.0–3.5 s only | the rest of the clip | Second half switches to open tubs and lamps |
   | `P05` | `P05-aquaponic-cycle-v1.mp4`, 0.0–3.0 s only | the rest of the clip | Prawns turn into crayfish after 3 s |

   ### Music

   | Cue | Use | Not used | Why |
   |---|---|---|---|
   | 05 Protect the Living System | `05_Protect the Living System.mp3` | `…_v2.mp3` | v1 is closer to the 116 BPM target |
   | 06B Armed command | `06B_Armed command.mp3` | `…_v2.mp3` | v2 is an extension of 06C, not a new state |
   | 06D Scorched Claim and surrender | `06D_Scorched Claim and surrender_v2.mp3` | `06D_Scorched Claim and surrender.mp3` | v2 shares 06C's tempo grid |

   All other cues (01, 02, 03, 04, 06A, 06C, 07) have one file, which is the one used.
   ```

4. Verify before committing:
   - `git status` shows only new files under `FightForPeace/heroes/wind/`, `FightForPeace/heroes/fire/`, `FightForPeace/reference/stage2/`, `FightForPeace/story/stage2/` and `FightForPeace/music/stage2/`, plus the one modified `FightForPeace/APPROVED_VARIANTS.md`. Nothing else may change.
   - The number of new files equals the number of source files you copied (expected: 6 characters + 10 story + 13 music = 29; report the real count if it differs).
   - Every uploaded file has exactly the same size in bytes as its source file.
   - No single file is larger than 95 MB (GitHub rejects files over 100 MB); if one is, stop and report it instead of pushing.
   - `APPROVED_VARIANTS.md` still contains all its earlier sections, and the new section is at the end.

5. Commit with the message `Add Stage 2 assets: twin model sheets, interlude clips and music` and push to `main`. If the push is rejected because `main` moved, run `git pull --rebase` and push again. Never force-push.

6. Report back: the commit hash, the list of uploaded files with their target paths and sizes, and any files you skipped or found already present.

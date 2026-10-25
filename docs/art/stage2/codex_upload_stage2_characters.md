# Codex prompt: upload Stage 2 character assets to the Pictures repository

Paste everything below the line into Codex (running on your Windows machine, with git access to GitHub).

---

Upload the Fight For Peace Stage 2 character images from my local folder to my private GitHub repository `shengguo2026/Pictures`, following the repository's existing layout. Do not change, move or delete any file that is already in the repository.

**Source (local, read only):** `C:\AI\Codex\FightForPeace\assets\characters\stage2\`

**Target repository:** `https://github.com/shengguo2026/Pictures`, branch `main`, folder `FightForPeace/`

**Steps**

1. If the repository is not cloned yet, clone it to `C:\AI\Codex\Pictures-repo` (if that folder already holds a clone of this repository, use it). Run `git checkout main` and `git pull` so you start from the latest `main`.
2. Copy these files **byte for byte, keeping their exact file names**:

   | Source (under `…\characters\stage2\`) | Target (under `FightForPeace/`) |
   |---|---|
   | `wind-sentinel\wind-sentinel-default-model-sheet-v1.png` | `heroes/wind/wind-sentinel-default-model-sheet-v1.png` |
   | `wind-sentinel\wind-sentinel-default-model-sheet-v2.png` | `heroes/wind/wind-sentinel-default-model-sheet-v2.png` |
   | `fire-warden\fire-warden-default-model-sheet-v1.png` | `heroes/fire/fire-warden-default-model-sheet-v1.png` |
   | `fire-warden\fire-warden-default-model-sheet-v2.png` | `heroes/fire/fire-warden-default-model-sheet-v2.png` |
   | `references\athletic-daughter-age-18-reference-v1.png` | `reference/stage2/athletic-daughter-age-18-reference-v1.png` |
   | `references\fire-warden-human-reference-v1.png` | `reference/stage2/fire-warden-human-reference-v1.png` |

   Create the folders `heroes/wind`, `heroes/fire` and `reference/stage2` if they do not exist. If any other file exists in the source folder that is not in this table, do not upload it; list it in your final report instead.
3. Open `FightForPeace/APPROVED_VARIANTS.md` and append the following section at the very end of the file, exactly as written (keep everything that is already in the file unchanged):

   ```markdown

   ## Stage 2 characters

   | Asset | Use | Not used | Why |
   |---|---|---|---|
   | Wind Sentinel (风神) model sheet | `heroes/wind/wind-sentinel-default-model-sheet-v2.png` | `…-v1.png` | v1 colours too close to River Scout and semi-realistic faces; v2 matches the Stage 1 cel-shaded style. Canonical hair: braid from crown to shoulder blades. |
   | Fire Warden (火神) model sheet | `heroes/fire/fire-warden-default-model-sheet-v2.png` | `…-v1.png` | v1 semi-realistic faces and lower body identical to his sister; v2 approved. Longer forearm guard on the left arm. |

   The files in `reference/stage2/` are photo-style likeness references for the twins. Like everything else in `reference/`, nothing there ships in the game, and they are never used as Google Flow ingredients or start frames.
   ```

4. Verify before committing:
   - `git status` shows exactly 6 new PNG files and 1 modified file (`FightForPeace/APPROVED_VARIANTS.md`), nothing else.
   - Each uploaded PNG has the same size in bytes as its source file.
   - `APPROVED_VARIANTS.md` still contains all its earlier sections, and the new section is at the end.
5. Commit with the message `Add Stage 2 twin model sheets and likeness references` and push to `main`. If the push is rejected because `main` moved, run `git pull --rebase` and push again. Never force-push.
6. Report back: the commit hash, the list of uploaded files with their sizes, and any source files you skipped.

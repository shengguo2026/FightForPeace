# Fight for Peace — Technical Implementation Evaluation

**Date:** 2026-10-20
**Status:** Draft for your review. It assumes the ★ recommendations in `01-findings-and-decisions.md` (notably D5-A key-pose animation, D6-A physical-key defaults, D9-A lockstep first, D10-A bounded slice). It will be adjusted to your decisions.

## 1. Verdict

The confirmed architecture (Layered Phaser Architecture: a framework-free deterministic TypeScript core, Phaser as a thin renderer, DOM for text-heavy UI, platform adapters) is **sound and buildable in a browser**. I recommend keeping it. The design's main strength, that every rule is authored data with a deterministic simulation underneath, is exactly what makes replays, Combat Lab, automated anti-infinite testing and LAN co-op possible.

The three things that decide success are:

1. **Determinism discipline from day one.** Integer maths, a seeded RNG, stable iteration order, and no browser APIs in the core. Retrofitting this later is close to impossible.
2. **A data-first combat pipeline.** Moves, cancels and enemies are authored as validated data files, so tuning never needs code changes and the Academy, move lists, Guide and frame-data appendix are generated from the same source.
3. **An art pipeline that matches what AI generation can actually do.** Key poses from a locked model sheet, not multi-frame strips. This is the production bottleneck, not the code.

## 2. Recommended stack

| Concern | Choice | Notes |
|---|---|---|
| Language and build | **TypeScript (strict) + Vite** | As confirmed. |
| Repository layout | **pnpm workspaces monorepo** | Keeps the simulation physically separated from Phaser and the DOM. |
| Renderer | **Phaser** (latest stable at project start: 3.90 or 4.x, verified in M0) | WebGL with Canvas fallback. Used for sprites, cameras, parallax, particles and world audio only. |
| DOM UI | **Preact + signals** (about 4 KB) | Menus, HUD, briefings, subtitles, Guide, settings, store. The decision log does not require React; Preact gives components without a framework lock-in. Vanilla `lit-html` is an alternative. |
| Data schemas | **TypeBox** (JSON Schema + TS types) | One schema for build-time validation and editor auto-complete. Authored content lives in **YAML**. |
| Localization | **ICU MessageFormat** (FormatJS `intl-messageformat`) | Plurals and gender for EN, ZH-CN and DE. Keys like `stage1.briefing.elder.003`. |
| Storage | **IndexedDB via `idb`**, **Web Locks API** for single-writer tabs | Transactional snapshots plus checksum. |
| Networking | **WebRTC `RTCDataChannel`**, signaling on **Cloudflare Workers + Durable Objects** | Room codes expire in minutes; the server stores no gameplay. |
| QR | `qrcode` for generating; `BarcodeDetector` with a `jsQR` fallback for scanning | The scanning fallback covers Firefox and Safari. |
| Audio | Phaser Sound (Web Audio) and a small custom music-state machine | Stems or pre-mixed fallback per the Authored Adaptive Score. |
| Video | DOM `<video>`: H.264 MP4 plus VP9/AV1 WebM, our own subtitle overlay | Starts only after a user gesture, per the decision log. |
| Tests | **Vitest** (unit/property), **fast-check**, **Playwright** (Chromium, Firefox, WebKit) | Includes the cross-browser determinism test. |
| CI/CD | **GitHub Actions** → static deploy to **Cloudflare Pages** (or GitHub Pages) | The signaling Worker is deployed separately, as the log requires. |

### Package layout

```
packages/
  sim/          deterministic core: fixed-point math, RNG, entities, combat, AI, encounters (NO DOM/Phaser)
  content/      YAML moves, heroes, enemies, stages, weapons, cheats + TypeBox schemas + validators
  net/          lockstep protocol, hashing, snapshots, pairing payloads (uses sim, no DOM)
  platform/     adapters: input, storage, audio, visibility, capability preflight, WebRTC
apps/
  game/         Phaser scenes + Preact DOM UI, wiring sim ⇄ presentation
  lab/          Combat Lab build (same sim, extra diagnostics overlay)
services/
  signaling/    Cloudflare Worker (room codes, offer/answer relay, 5-minute TTL)
tools/
  asset-pipeline/  sprite normalise/anchor/trim, atlas packing, hashing, manifest + provenance checks
  frame-data/      generates Appendix B tables and move lists from content data
```

## 3. Deterministic simulation core

- **Fixed step at 60 Hz** with an accumulator. Rendering runs at any refresh rate and interpolates between the last two simulation states. Catch-up is capped (for example 5 steps per frame); beyond that, presentation degrades first, as confirmed.
- **Fixed-point numbers.** Positions in 1/256 px units, stored as integers. Trigonometry comes from a 4,096-entry lookup table. A lint rule bans `Math.sin/cos/pow/exp/random` and float division inside `packages/sim` (see F1 in the findings).
- **Seeded RNG** (xoshiro128\*\*) owned by the simulation state. The host chooses the seed; it is used only for authored variation, never for hit outcomes.
- **World model (2.5D belt-scroller).** Every body has ground position `(x, z)` (z = stage depth), height `y`, and a facing value. Hitboxes and hurtboxes are **3D boxes**: x/y size plus a depth thickness, which makes depth-lane attacks (`Up/Down + T`) and the guard arc work naturally. Draw order comes from `z`.
- **Entities** are plain data records in stable ID order (struct-of-arrays where profiling demands it). Systems run in a fixed order: input → intent resolution → AI → action state machines → movement → collision and hit resolution (Combined Hit Bundles) → reactions → resources → encounter director → presentation-event emission.
- **Snapshots** use a canonical binary encoding of the full state, which serves checkpoints, replays, resync and future rollback. Hashes are xxHash32 over that encoding.
- **Presentation events** carry stable IDs `(frame, sourceEntity, actionInstance, eventIndex)`, so resimulation can never replay a hit spark or voice twice.

### Combat data model (abridged)

```yaml
id: mountain.gatepost_hammer
hero: mountain
input: { button: attack, route: neutral, step: 3 }
frames: { startup: 11, active: 4, recovery: 19 }
hitboxes:
  - frames: [12, 15]
    box: { x: 40, y: 60, w: 70, h: 40, depth: 24 }
    damage: 90
    guardDamage: 14
    reaction: knockback_heavy
    defenseProfile: standard
costs: { damageScale: 12, stunDecay: 22, juggle: 0, meterGainDecay: 15 }
meter: { attackGain: 8 }
cancels:
  - to: ultimate.signature
    on: [hit]
    window: [12, 30]
  - to: dash.bridge
    on: [hit]
    window: [12, 26]
    premium: true
tags: [counterHitTrip=false]
```

The build validates every reference and also checks anti-infinite properties statically. For example, it flags any cancel cycle that has no budget cost. A generated report becomes the frame-data appendix and feeds the in-game move list, Academy and Guide facts.

## 4. Input

- **Adapters** turn keyboard and gamepad input into **abstract actions** (`Move`, `Attack`, `Jump`, `Special`, `Guard`, `Ultimate`, `GrabInteract`, `Dash`, `LowAttack`, `TeamAttack`, menu actions).
- **Keyboard** uses `KeyboardEvent.code` for bindings (D6-A). Labels come from `navigator.keyboard.getLayoutMap()` in Chromium; elsewhere they come from observed `event.key`, or from a layout picker shown in first-launch setup.
- **Timestamps.** Each input keeps `event.timeStamp`, which is mapped to the simulation frame it falls in. Exact Block and Counter check that timestamp-derived frame against the 5-frame and 3-frame windows. Offensive buffering (6–9 frames) is a separate queue that can never widen the defensive windows.
- **Gamepad** is polled every animation frame plus a 4 ms timer, and the `gamepad.timestamp` change is used when it is monotonic (F3). Standard mapping is used, with a remap UI for non-standard pads.
- **Chords** (`T+G` low attack, `G+H` breaker, direction+`G` counter) are resolved by one deterministic chord resolver with configurable tolerance. It is unit-tested against the confirmed freshness and ordering rules.

## 5. Enemy AI and encounters

- **Director** (one per encounter) owns the Shared Threat Budget, per-hero pressure caps, concurrency limits (Appendix D.5) and the overlap validator (no unanswerable combinations).
- **Enemies** use utility scoring at fixed intervals (for example every 6 frames) with stable tie-breaks. They choose movement intents freely and request attack *permission* from the director. Perception delay comes from the difficulty profile.
- **Bosses** use authored phase graphs with Resolve, queued transitions and capped carryover, as data.
- **Encounters** are YAML scripts: spawn sets per difficulty and player count, triggers, camera locks, environmental objects and checkpoints.

## 6. Presentation (Phaser)

- Thin scenes: `Boot`, `Preload` (staged bundles), `Stage` (playfield), `Lab` (diagnostics overlay).
- **Sprite mapping (D5-A):** each action's data maps simulation frame ranges to **pose images** (for example frames 1–4 anticipation, 5–8 contact, 9–18 recovery A, 19–34 recovery B), with optional smear and effect layers. The art can therefore change without touching frame data.
- Atlases are packed per character and per stage (2048² WebP or PNG plus JSON), and an effects pool handles sparks.
- **Character scale:** about 320 px tall on a 1920×1080 logical playfield. Source poses are generated at 1024 px and downscaled, which leaves headroom for cleanup.
- **Auto Quality** reduces effects in the confirmed order, and functional cues are flagged `critical` so they cannot be culled.

## 7. DOM UI, localization, accessibility

- The Preact UI sits in a layer above the canvas: shell, HUD corner clusters, briefings, subtitles, Guide, store, settings, remapping and the live tester.
- Subtitles and captions are positioned in a safe area, with user-configurable size, background, font and line width.
- **Fonts:** Noto Sans plus Noto Sans SC, **subset at build time** to the glyphs used in the localization files (F8), with a readable-font option (for example Atkinson Hyperlegible for Latin).
- Release validation checks every key in all three languages, overflow and line-wrap at the minimum UI scale, and English fallback diagnostics at runtime.

## 8. Saves and profiles

- IndexedDB stores: `profiles`, `snapshots` (current plus at least 1 known-good, checksummed), `settings`, `recipes`, `assetsCache` (kept separate).
- Writes happen only at confirmed boundaries (checkpoint, results, settings, explicit Academy save), each in one IndexedDB transaction.
- **Single-writer tabs** use `navigator.locks.request('profile:<id>')`, and other tabs become read-only with an explicit "take over" control.
- **Portable backup** is a `.ffpsave` file: gzipped JSON plus schema version plus SHA-256, with import preview and merge or replace.
- **Safari's 7-day eviction** is handled with `navigator.storage.persist()` plus backup reminders and a PWA install hint (F2).

## 9. Local-Wi-Fi networking (D9-A phasing)

**Slice version: deterministic delay-based lockstep.**

1. **Pairing.** The Worker issues a 6-character room code and QR, relays offer, answer and ICE once, then deletes them. The offline path packs the full SDP and candidates into a compressed payload, split across numbered QR codes if needed, with copy-paste.
2. **Lobby validation** checks game version, protocol version, rules hash, content manifest hash and cheat registry hash, then explicit readiness.
3. **Play.** Each peer sends its inputs for frame `f + d` (d = 2–4 frames, adapted from measured RTT) over an **unordered, unreliable** channel, repeating the last 8 frames of inputs in every packet so loss is absorbed without retransmit delay. A frame is simulated only when both peers' inputs for it exist. Brief stalls show a "waiting for partner" indicator.
4. **Hashes** are exchanged every 30 frames. On mismatch the host sends a snapshot, and the guest restores it at the next safe boundary.
5. **Focus loss, pause, disconnect.** The courtesy hold, synchronized pause, and "session ended, last checkpoint kept" path are in the slice.

**After the slice:** prediction plus bounded rollback (the snapshot machinery already exists), survival proxy, host migration and authority migration. The confirmed models are unchanged; only the delivery is phased.

## 10. Media and asset pipeline

1. **Generate** with Codex (images) or Google Flow (video), using the numbered prompt IDs from the prompt lists.
2. **Ingest:** `tools/asset-pipeline` trims transparency, normalizes scale to the character's height grid, aligns the bottom-centre anchor, and writes a manifest entry (tool, model, prompt ID and text, date, references, provenance and SynthID flag, rights).
3. **Clean up** by hand (hands, faces, outfit drift, stray text) in Krita, Photoshop or Aseprite, and log the edit in the manifest.
4. **Validate in the engine** at gameplay scale in the Lab's "pose viewer". Then the asset is promoted `candidate → approved`.
5. **Build:** atlas packing, content hashes, delivery bundles (shell, hero-*, stage1-beat*, cinematic-*), and an immutable release index.

The video pipeline is: Flow clips (720p or 1080p, about 8 s) → edit in DaVinci Resolve or CapCut → H.264 MP4 at 1080p/720p plus WebM → subtitles as JSON cue files keyed to localization IDs → the still-art fallback uses the Codex start frames.

## 11. Testing strategy

| Layer | What it proves |
|---|---|
| Unit (Vitest) | Chord resolver, buffers, combo-context budgets, guard arc, meter rules, save migrations |
| Property-based (fast-check) | **Anti-infinite search:** random legal action sequences against every enemy archetype must always reach forced separation within the budget bounds. Also: no NaN or overflow in fixed-point maths. |
| Golden replays | Recorded input logs reproduce exact state hashes; they run on every commit |
| Cross-browser determinism | Playwright runs the same replays headless in Chromium, Firefox and WebKit, and hashes must be identical |
| Network simulation | In-process lockstep pair with artificial latency, jitter, loss and duplication; hash divergence and resync tests |
| Content validation | Schema, references, localization completeness, asset manifest, provenance and rights fields |
| Performance | Scripted crowded encounter at 60 Hz simulation, frame-time budgets on a reference low-end laptop |
| Manual Tier-1 matrix | Controllers, audio latency, fullscreen, storage, LAN pairing (as confirmed in the log) |

## 12. Milestones and rough effort

The estimates assume one developer working with Claude for code, plus you producing and approving art and video. **Art throughput is the critical path**, so art starts in parallel from M1.

| Milestone | Content | Code effort (approx.) |
|---|---|---|
| **M0 Foundations** | Monorepo, CI, fixed-point maths, RNG, loop, snapshot/hash, content schema skeleton, Lab shell | 2–3 weeks |
| **M1 Combat Lab core (Modules 1–6)** | Input/movement, basic offense, hero identity, aerial, ground, defense, with greybox shapes | 6–8 weeks |
| **M2 Combat Lab extended (Modules 7–13)** | Resources, grabs/throws, weapons, enemy AI and director, boss rules, same-device co-op, browser reliability | 8–10 weeks |
| **M3 Stage 1 greybox** | 8 beats, encounters, environmental slice, checkpoints, continues (D8) | 4–6 weeks |
| **M4 Shell and progression** | Menus, HUD, profiles, saves, score/Credits/store (bounded), cheats, Guide, settings, remapping, i18n | 6–8 weeks |
| **M5 Local-Wi-Fi** | Pairing, lockstep, hashes, resync, pause/focus holds | 4–6 weeks |
| **M6 Media integration** | Atlases, poses, effects, cinematics, music states, SFX mix, still fallbacks | 4–6 weeks (plus art production in parallel) |
| **M7 Slice hardening** | Tier-1 browser matrix, performance, accessibility, localization QA, balance pass | 4–6 weeks |
| **Total** | | **about 9–13 months** of focused work to the Representative Vertical Slice |

Art volume for the slice under D5-A and D10-A is roughly **1,200–1,500 cleaned images** (two heroes about 250 each, elder, 6 enemy types plus the boss, 7 environments in layers, props, UI and effects), plus about **15–25 video clips**. That is the main schedule risk; prompts will be grouped so you can generate in batches.

## 13. Top risks

| Risk | Impact | Mitigation |
|---|---|---|
| Character art inconsistency | Unusable sprites, rework | Model-sheet references on every prompt, cel-shaded style (D2-A), early "lineup + gameplay-scale mockup" approval gate as Appendix C requires |
| Determinism bug found late | LAN co-op and replays break | Fixed-point maths from M0, golden replays and cross-browser hash tests in CI from M0 |
| Scope (three languages × three modes × cheats × store) | Slice slips | D10-A bounded store and variants, Academy limited to one representative route, mounts and firearms schemas only |
| Combat feel | Game not fun despite correct rules | M1 Lab with live tuning (hot-reload YAML), early playtests before any art |
| Browser storage loss (Safari) | Lost progress | persist(), backups, PWA hint |
| Client-isolated Wi-Fi | LAN mode fails for some players | Clear diagnostics; same-device co-op always available |

## 14. Points for your review

1. Keep the confirmed **Phaser + TypeScript + Vite + DOM UI** architecture? (Recommended: yes.)
2. **Preact** for the DOM UI layer (recommended), or plain `lit-html`/vanilla?
3. Hosting: **Cloudflare Pages + Workers** for the game and signaling (recommended; free tier is enough), or GitHub Pages plus another host for signaling?
4. Is the **9–13 month** slice estimate acceptable, or should the slice be cut further (for example one language at first, or LAN co-op moved after the slice)?
5. Repository: implement in this repo (`shengguo2026/FightForPeace`) as the monorepo above?

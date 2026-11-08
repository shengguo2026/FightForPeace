import {
  type Fighter,
  METER,
  equip,
  escapeOpen,
  hashWorld,
  heroOf,
  kitOf,
  routeAction,
  runReplay,
  WEAPONS,
  weaponIndex,
  ARENAS,
  DIFFICULTIES,
  budgetOf,
  usage,
  MoveState,
  RunPhase,
  beatOf,
  codesOf,
  CORRIDORS,
  Cheat,
  HEROES,
  responseRecord,
} from '@ffp/sim';
import type { QualityGovernor } from '@ffp/platform';
import type { GameSession } from './game';
import type { LabState } from './ui/labState';
import type { Shell } from './shell/shell';
import { setFakePads, useFakePads } from './input/browserInput';
import { activeCinematic } from './media/Cinematic';
import { audio } from './media/audio';
import { EFFECT_STATS } from './scenes/effects';
import { capabilities, perf } from './system/probe';
import { textDiagnostics } from './text/i18n';

/** Installs window.__ffp for automated tests. Called in dev and e2e builds only. */
export function installDebugHook(
  session: GameSession,
  lab: LabState,
  quality: QualityGovernor,
  shell: Shell,
): void {
  window.__ffp = {
    system: {
      capabilities: () => ({
        blocking: [...capabilities.blocking],
        disabled: [...capabilities.disabled],
        renderer: capabilities.renderer,
        video: capabilities.video,
        results: capabilities.results.map((r) => ({ id: r.id, ok: r.ok, via: r.via })),
      }),
      perf: () => perf.snapshot(),
      resetPerf: () => perf.reset(),
    },
    media: {
      state: () => {
        const c = activeCinematic.value;
        const f = c?.player.frame();
        const now = audio.director.playing;
        return {
          cine:
            c && f
              ? {
                  id: c.id,
                  shot: f.shot.id,
                  index: f.index,
                  count: f.count,
                  time: f.time,
                  paused: f.paused,
                  video: c.video,
                }
              : null,
          music: now ? { cue: now.cue, state: now.state } : null,
          musicLog: [...audio.director.log],
          played: [...audio.played],
          audioRunning: audio.running,
          effects: { ...EFFECT_STATS },
        };
      },
      advanceCine: (ms) => activeCinematic.value?.player.advance(ms),
    },
    net: {
      state: () => {
        const n = shell.net;
        const lock = n.lock;
        return {
          status: n.status.value,
          role: n.role.value,
          error: n.error.value,
          room: n.room.value,
          lobby: n.lobby.value ? structuredClone(n.lobby.value) : null,
          phase: lock?.phase ?? null,
          hold: lock?.hold ? { kind: lock.hold.kind, by: lock.hold.by } : null,
          ready: lock ? [...lock.ready] : [],
          frame: session.world.frame,
          delay: lock?.delay ?? 0,
          matched: lock?.stats.matched ?? 0,
          resyncs: lock?.stats.resyncs ?? 0,
          ended: lock?.ended?.reason ?? null,
          hashes: lock?.hashes() ?? [],
          slot: n.localSlot,
          startDelay: n.startDelay,
          authority: lock?.authority ?? false,
          partnerAbsent: lock?.partnerAbsent ?? false,
          linkUp: lock?.linkUp ?? false,
          rollbacks: lock?.stats.rollbacks ?? 0,
          maxRollback: lock?.stats.maxRollback ?? 0,
          confirmed: lock?.confirmed ?? -1,
          standby: n.view.value?.standby ?? null,
          log: [...n.log],
          credited: shell.creditedThisSession,
        };
      },
      fakeVersion: (v) => (shell.net.versionOverride = v),
      quickSetup: (name) => shell.finishSetup({ name, locale: 'en', settings: {} }),
      loseFocus: () => shell.net.requestHold('focus'),
      corrupt: () => shell.net.corrupt(),
      cutFor: (ms) => shell.net.cutFor(ms),
      setCourtesy: (ms) => (shell.net.courtesyMs = ms),
    },
    shell: {
      screen: () => shell.screen.value,
      profile: () => (shell.active.value ? structuredClone(shell.active.value) : null),
      storage: () => shell.storage.value,
      flush: () => shell.flushSave(),
      exportText: async () => {
        await shell.flushSave();
        return shell.store!.exportBackup();
      },
      // M11 test hooks.
      grantCredits: (n) =>
        shell.update((p) => {
          p.progress.credits += n;
        }),
      finishStage: () => {
        const r = session.world.run;
        if (!r) return;
        r.phase = RunPhase.Complete;
        r.phaseFrame = session.world.frame;
      },
      lesson: () => (shell.academy.lesson.value ? { ...shell.academy.lesson.value } : null),
      lastCombo: () =>
        shell.academy.lastCombo.value ? { ...shell.academy.lastCombo.value } : null,
      cheats: () => {
        const c = session.world.cheats;
        return {
          hero: c.hero.map((m) => codesOf(m)),
          session: codesOf(c.session),
          marked: c.marked,
        };
      },
      pilotActive: () => session.pilot !== null,
      // M14: text that fell back to English or is missing (localization QA).
      diagnostics: () => [...textDiagnostics()],
    },
    frame: () => session.world.frame,
    body: (id) => {
      const b = session.world.bodies.find((x) => x.id === id);
      return b ? view(b) : undefined;
    },
    hero: (slot) => {
      const b = heroOf(session.world, slot);
      return b ? view(b) : undefined;
    },
    place: (slot, dx, dz) => {
      const h = heroOf(session.world, slot);
      const d = session.world.bodies.find((b) => b.team === 'enemy');
      if (!h || !d) return;
      h.x = d.x + dx * 256;
      h.z = d.z + dz * 256;
      h.facing = dx < 0 ? 1 : -1;
    },
    hash: () => hashWorld(session.world),
    onStep: (hook) => {
      session.stepHooks.push(hook);
    },
    pauseNow: () => {
      session.devices.userPaused = true;
    },
    runReplay: (log) => runReplay(log),
    fakePads: (pads) => {
      useFakePads(true);
      setFakePads(pads);
    },
    paused: () => lab.paused.value,
    slots: () => session.devices.slots.map((s) => ({ ...s })),
    setTrainer: (settings) => {
      lab.trainer.value = { ...lab.trainer.value, ...settings };
      session.setTrainer(lab.trainer.value);
    },
    setDefense: (slot, value) => {
      const h = heroOf(session.world, slot);
      if (h) h.defense = value;
    },
    setMeter: (slot, percent) => {
      const h = heroOf(session.world, slot);
      if (h) h.meter = percent * METER.unit;
    },
    equip: (slot, kind, dir, action) => equip(session.world, slot, kind, dir, action),
    escapeOpen: (slot) => {
      const h = heroOf(session.world, slot);
      return h ? escapeOpen(session.world, h) : false;
    },
    projectiles: () => session.world.projectiles.length,
    items: () =>
      session.world.items.map((i) => ({
        id: i.id,
        weapon: WEAPONS[i.def]?.id ?? '?',
        state: i.state,
        holder: i.holder,
        integrity: i.integrity,
        x: i.x / 256,
        z: i.z / 256,
        reserveFor: i.reserveFor,
      })),
    scenery: () => {
      const env = session.world.environment;
      const p = env.surfaces[0];
      const b = env.breakables[0];
      const c = env.hazards[0];
      return {
        pillar: { cracked: p?.cracked ?? false, impacts: p?.impacts ?? 0 },
        boards: { state: b?.state ?? 0, power: b?.power ?? 0 },
        cog: { phase: c?.phase ?? 0, phaseFrame: c?.phaseFrame ?? 0 },
        log: {
          kind: env.log.kind,
          frame: env.log.frame,
          damage: env.log.damage,
          detail: env.log.detail,
        },
      };
    },
    placeAt: (slot, x, z) => {
      const h = heroOf(session.world, slot);
      if (!h) return;
      h.x = x * 256;
      h.z = z * 256;
      h.facing = 1;
    },
    armDummy: (weapon) => {
      const index = weapon === null ? -1 : weaponIndex(weapon);
      lab.trainer.value = { ...lab.trainer.value, arm: index };
      session.armDummy(index);
    },
    dummyToPillar: () => session.dummyToPillar(),
    startArena: (arena, difficulty = 'medium', beat = 0) => {
      if (arena) lab.arenaPick.value = { arena, difficulty, beat };
      session.startArena(arena, difficulty, beat);
    },
    startPursuit: (corridor, options = {}) => {
      const difficulty = options.difficulty ?? 'medium';
      lab.arenaPick.value = { arena: corridor, difficulty, beat: 0 };
      const steady = options.steady ? Cheat.STEADYRIDE : 0;
      session.startArena(corridor, difficulty, 0, {
        steeringAssist: options.assist ?? false,
        ...(steady ? { cheats: { hero: [steady, steady], session: 0 } } : {}),
      });
    },
    pursuit: () => {
      const p = session.world.pursuit;
      if (!p) return null;
      const rec = responseRecord(p);
      return {
        corridor: CORRIDORS[p.corridor]!.id,
        phase: p.phase,
        checkpoint: p.checkpoint,
        camX: p.camX / 256,
        riders: p.riders.map((r) => {
          const f = heroOf(session.world, r.slot);
          return {
            slot: r.slot,
            hero: f ? (HEROES[f.hero]?.id ?? '') : '',
            state: r.state,
            x: r.x / 256,
            z: r.z / 256,
            speed: r.speed / 256,
            stability: r.stability,
            critical: r.critical,
            health: f?.health ?? 0,
          };
        }),
        enemies: p.enemies.map((e) => ({
          id: e.id,
          state: e.state,
          x: e.x / 256,
          z: e.z / 256,
          stability: e.stability,
          target: e.target,
        })),
        equipment: [...p.equipment],
        record: { ...p.record },
        grades: rec.lines.map((l) => ({ ...l })),
        mastery: rec.mastery,
        cheatAssisted: session.world.cheats.marked,
      };
    },
    rideTo: (x) => {
      const p = session.world.pursuit;
      if (!p) return;
      const lead = Math.max(...p.riders.map((r) => r.x));
      for (const r of p.riders) r.x = x * 256 - (lead - r.x);
      p.camX = Math.max(0, x * 256 - 760 * 256);
    },
    setStability: (slot, value) => {
      const r = session.world.pursuit?.riders.find((x) => x.slot === slot);
      if (r) {
        r.stability = value;
        r.critical = value === 0;
      }
    },
    run: () => {
      const w = session.world;
      const r = w.run;
      const beat = beatOf(w);
      if (!r || !beat) return null;
      return {
        beat: r.beat,
        beatId: beat.id,
        phase: r.phase,
        locksDone: r.locksDone,
        locks: beat.locks.length,
        continues: r.continues,
        continuesUsed: r.continuesUsed,
        checkpointBeat: r.checkpoint?.beat ?? -1,
        workers: r.workers.map((k) => ({ x: k.x / 256, z: k.z / 256, state: k.state })),
        clue: r.clue,
        evidence: r.evidence,
        evidenceAt: beat.evidence ? { x: beat.evidence.x, z: beat.evidence.z } : null,
        clueAt: beat.clue ? { x: beat.clue.x, z: beat.clue.z } : null,
        stats: { ...r.stats },
        width: beat.width,
        bounds: { minX: w.bounds.minX / 256, maxX: w.bounds.maxX / 256 },
      };
    },
    moveHeroes: (x, z = 860) => {
      for (const h of session.world.bodies)
        if (h.team === 'hero') {
          h.x = (x + h.slot * 60) * 256;
          h.z = z * 256;
        }
    },
    clearEnemies: () => {
      for (const e of session.world.bodies)
        if (e.team === 'enemy' && !e.ko) {
          e.health = 0;
          e.ko = true;
          e.state = MoveState.Down;
          e.stateFrame = 0;
          e.stun = 1;
        }
    },
    setHealth: (slot, health) => {
      const h = heroOf(session.world, slot);
      if (!h) return;
      h.health = health;
      if (health <= 0) {
        h.ko = true;
        h.state = MoveState.Down;
        h.stateFrame = 0;
        h.stun = 1;
      }
    },
    encounter: () => {
      const w = session.world;
      const enc = w.encounter;
      if (!enc) return null;
      return {
        arena: ARENAS[enc.arena]?.id ?? '?',
        difficulty: DIFFICULTIES[enc.difficulty]?.id ?? '?',
        wave: enc.wave,
        result: enc.result,
        viewMin: enc.viewMin / 256,
        enemies: w.bodies
          .filter((b) => b.team === 'enemy')
          .map((b) => ({
            id: b.id,
            kit: kitOf(b)?.id ?? '?',
            state: b.state,
            health: b.health,
            threat: b.threat,
          })),
        boss: enc.boss
          ? {
              phase: enc.boss.phase,
              resolve: enc.boss.resolve,
              stagger: enc.boss.stagger,
              pending: enc.boss.pending,
            }
          : null,
        threat: usage(w).total,
        budget: budgetOf(w),
      };
    },
    coop: () => {
      const c = session.world.coop;
      return {
        invite: c.invite
          ? { from: c.invite.from, target: c.invite.target, until: c.invite.until }
          : null,
        log: { ...c.log },
        handoffs: c.handoffs,
        finishers: c.finishers,
        assists: c.assists,
        rescues: c.rescues,
        bundles: c.bundles,
        reciprocal: c.reciprocal,
      };
    },
    staggerDummy: (frames) => {
      const d = session.world.bodies.find((b) => b.team === 'enemy');
      if (!d) return;
      d.state = MoveState.Hitstun;
      d.stateFrame = 0;
      d.stun = frames;
      d.y = 0;
      d.ctx.open = true;
    },
    quality: () => ({ setting: quality.setting, level: quality.level }),
    focusPaused: () => session.devices.focusPaused,
    pauseOnFocusLoss: (on) => (session.devices.pauseOnFocusLoss = on),
  };
}

function view(b: Fighter) {
  return {
    x: b.x,
    z: b.z,
    y: b.y,
    state: b.state,
    facing: b.facing,
    attackKind: b.attackKind,
    action: b.action >= 0 ? (kitOf(b)?.actions[b.action]?.id ?? null) : null,
    category: b.action >= 0 ? (kitOf(b)?.actions[b.action]?.category ?? null) : null,
    stateFrame: b.stateFrame,
    hero: kitOf(b)?.id ?? null,
    meter: Math.trunc(b.meter / METER.unit),
    health: b.health,
    combo: { open: b.ctx.open, hits: b.ctx.hits, damage: b.ctx.damage, scale: b.ctx.scale },
    juggle: b.ctx.juggleBudget,
    groundWindow: b.groundWindow,
    protectedRecovery: b.protectedRecovery,
    route: b.ctx.route.map((c) => routeAction(c)?.id ?? '?'),
    wallBounceUsed: b.ctx.wallBounceUsed,
    groundBounceUsed: b.ctx.groundBounceUsed,
    contactAt: b.contactAt,
    defense: b.defense,
    defEvent: b.defEvent,
    defOffset: b.defOffset,
    defFrame: b.defFrame,
    aiStep: b.aiStep,
    grabbedBy: b.grabbedBy,
    grabId: b.grabId,
    grabEvent: b.grabEvent,
    grabOffset: b.grabOffset,
    loadout: [...b.loadout],
    loadoutIds: b.loadout.map((i) => (i >= 0 ? (kitOf(b)?.actions[i]?.id ?? null) : null)),
    weapon: b.item !== 0 ? (WEAPONS[b.wkit]?.id ?? null) : null,
    weaponEvent: b.weaponEvent,
  };
}

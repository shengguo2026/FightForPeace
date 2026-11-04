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
  beatOf,
} from '@ffp/sim';
import type { QualityGovernor } from '@ffp/platform';
import type { GameSession } from './game';
import type { LabState } from './ui/labState';
import { setFakePads, useFakePads } from './input/browserInput';

/** Installs window.__ffp for automated tests. Called in dev and e2e builds only. */
export function installDebugHook(
  session: GameSession,
  lab: LabState,
  quality: QualityGovernor,
): void {
  window.__ffp = {
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
    weapon: b.item !== 0 ? (WEAPONS[b.wkit]?.id ?? null) : null,
    weaponEvent: b.weaponEvent,
  };
}

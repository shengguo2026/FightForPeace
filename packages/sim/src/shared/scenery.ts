/**
 * M24 scenery engine: moving hazards (E2), tagged scenery and tool permissions with
 * property incidents (E3) and moving platforms (E4). Authored, deterministic, never lethal.
 */
import { fx } from '../math/fixed';
import { BODY_HALF_D, BODY_HALF_W } from '../movement/profile';
import { WEAPONS } from '../combat/armory';
import { type Breakable, type Fighter, type World } from '../world/types';
import { PropertyClass, type StageLayout } from '../world/stage';
import { hazardStrike } from '../combat/environment';
import { nonCombatant } from '../combat/damage';
import { type Mover, MoverPhase, SharedEvent, ensureShared, sharedLog } from './state';
import { mounted, riderImpact } from './riders';

/** Scenery ids of M24 movers, platforms and stations start here (props use 301+). */
export const MOVER_ID_BASE = 371;
export const PLATFORM_ID_BASE = 381;
export const STATION_ID_BASE = 386;
/** Ids of cover barriers the robot deploys (surfaces). */
export const COVER_ID_BASE = 391;

/** Creates the M24 scenery of a layout (movers, platforms, stations), if it has any. */
export function setupSharedScenery(world: World, layout: StageLayout | null): void {
  if (!layout) return;
  const movers = layout.movers ?? [];
  const platforms = layout.platforms ?? [];
  const stations = layout.stations ?? [];
  const tagged = layout.breakables.some((b) => (b.tags?.length ?? 0) > 0 || (b.property ?? 0) > 0);
  if (movers.length + platforms.length + stations.length === 0 && !tagged) return;
  const s = ensureShared(world);
  s.movers = movers.map((m, i) => ({
    id: MOVER_ID_BASE + i,
    x: fx(m.x0),
    z: fx(m.z0),
    x0: fx(m.x0),
    z0: fx(m.z0),
    x1: fx(m.x1),
    z1: fx(m.z1),
    hw: fx(m.hw),
    hd: fx(m.hd),
    h: fx(m.h),
    phase: MoverPhase.Rest,
    phaseFrame: 0,
    start: m.start,
    rest: m.rest,
    warn: m.warn,
    active: m.active,
    damage: m.damage,
    redirect: m.redirect,
    redirectedBy: 0,
    cycles: m.cycles,
    done: 0,
    tags: [...m.tags],
    hitIds: [],
  }));
  s.platforms = platforms.map((p, i) => ({
    id: PLATFORM_ID_BASE + i,
    x: fx(p.x0 + p.hw),
    z: fx(p.z),
    hw: fx(p.hw),
    hd: fx(p.hd),
    x0: fx(p.x0 + p.hw),
    x1: fx(p.x1 - p.hw),
    speed: fx(p.speed),
    dir: 1,
    wait: p.wait,
    waitLeft: p.wait,
    moved: 0,
  }));
  s.stations = stations.map((st, i) => ({
    id: STATION_ID_BASE + i,
    x: fx(st.x),
    z: fx(st.z),
    kind: st.kind,
    state: 0,
    frame: 0,
    retry: true,
    approach: st.approach,
    frames: st.frames,
    cooldown: st.cooldown,
    cover: st.cover
      ? {
          x: fx(st.cover.x),
          z: fx(st.cover.z),
          hw: fx(st.cover.hw),
          hd: fx(st.cover.hd),
          h: fx(st.cover.h),
        }
      : null,
    coverId: 0,
  }));
}

// --- E2 moving hazards ----------------------------------------------------------------------

/** Where a mover is during its active sweep (linear along its path). */
function placeMover(m: Mover): void {
  if (m.phase !== MoverPhase.Active) {
    m.x = m.x0;
    m.z = m.z0;
    return;
  }
  const t = Math.min(m.phaseFrame, m.active);
  m.x = m.x0 + Math.trunc(((m.x1 - m.x0) * t) / m.active);
  m.z = m.z0 + Math.trunc(((m.z1 - m.z0) * t) / m.active);
}

/** Mover cycle: (start) rest, a warned marker along its path, the sweep, rest again. */
export function stepMovers(world: World): void {
  const s = world.shared;
  if (!s) return;
  for (const m of s.movers) {
    if (m.phase === MoverPhase.Done) continue;
    m.phaseFrame += 1;
    const len =
      m.phase === MoverPhase.Rest
        ? m.done === 0
          ? m.start + m.rest
          : m.rest
        : m.phase === MoverPhase.Warn
          ? m.warn
          : m.active;
    if (m.phaseFrame >= len) {
      m.phaseFrame = 0;
      if (m.phase === MoverPhase.Rest) {
        m.phase = MoverPhase.Warn;
        m.redirectedBy = 0;
        m.hitIds = [];
        sharedLog(world, SharedEvent.MoverWarn, m.id);
      } else if (m.phase === MoverPhase.Warn) {
        m.phase = MoverPhase.Active;
      } else {
        m.done += 1;
        m.phase = m.cycles > 0 && m.done >= m.cycles ? MoverPhase.Done : MoverPhase.Rest;
      }
    }
    placeMover(m);
  }
}

/**
 * A hero's strike during a mover's warning redirects it when the mover allows that tool
 * ('any', or a tag the held weapon's `redirects` lists). Redirected, it strikes enemies only.
 */
export function strikeMovers(
  world: World,
  att: Fighter,
  box: { x0: number; x1: number; y0: number; z: number; depth: number },
): void {
  const s = world.shared;
  if (!s || att.team !== 'hero') return;
  const held = att.item !== 0 ? world.items.find((i) => i.id === att.item) : undefined;
  const tools = held ? (WEAPONS[held.def]?.redirects ?? []) : [];
  for (const m of s.movers) {
    if (m.phase !== MoverPhase.Warn || m.redirectedBy !== 0 || !m.redirect) continue;
    if (m.redirect !== 'any' && !tools.includes(m.redirect)) continue;
    if (box.x0 >= m.x + m.hw || box.x1 <= m.x - m.hw || box.y0 >= m.h) continue;
    if (Math.abs(box.z - m.z) > box.depth + m.hd) continue;
    m.redirectedBy = att.id;
    sharedLog(world, SharedEvent.Redirect, m.id, att.id);
  }
}

/** Active movers strike the bodies in their footprint once per cycle (hazard rules). */
export function moverHits(world: World): void {
  const s = world.shared;
  if (!s) return;
  for (const m of s.movers) {
    if (m.phase !== MoverPhase.Active) continue;
    for (const t of [...world.bodies].sort((a, b) => a.id - b.id)) {
      if (m.hitIds.includes(t.id) || nonCombatant(t)) continue;
      // Redirected cargo is turned against the hostiles: it never strikes a hero.
      if (m.redirectedBy !== 0 && t.team === 'hero') continue;
      if (Math.abs(t.x - m.x) >= BODY_HALF_W + m.hw || Math.abs(t.z - m.z) >= BODY_HALF_D + m.hd)
        continue;
      if (t.y >= m.h) continue;
      // A mounted rider pays the impact from its Stability (tagged impacts unseat riders).
      if (t.ext?.rider && mounted(t)) {
        m.hitIds.push(t.id);
        riderImpact(world, t, m.damage, m.x);
        sharedLog(world, SharedEvent.MoverHit, m.id, t.id);
        continue;
      }
      if (hazardStrike(world, t, m.x, m.z, m.damage, m.id)) {
        m.hitIds.push(t.id);
        sharedLog(world, SharedEvent.MoverHit, m.id, t.id);
      }
    }
  }
}

// --- E4 moving platforms --------------------------------------------------------------------

/** Platforms travel and carry every grounded body standing on them. */
export function stepPlatforms(world: World): void {
  const s = world.shared;
  if (!s) return;
  for (const p of s.platforms) {
    p.moved = 0;
    if (p.waitLeft > 0) {
      p.waitLeft -= 1;
      continue;
    }
    const target = p.dir > 0 ? p.x1 : p.x0;
    const step = Math.min(p.speed, Math.abs(target - p.x)) * p.dir;
    p.x += step;
    p.moved = step;
    if (p.x === target) {
      p.dir = -p.dir;
      p.waitLeft = p.wait;
    }
    if (step === 0) continue;
    for (const b of world.bodies) {
      if (b.y > 0 || nonCombatant(b)) continue;
      if (Math.abs(b.x - (p.x - step)) > p.hw || Math.abs(b.z - p.z) > p.hd) continue;
      b.x = Math.max(world.bounds.minX, Math.min(world.bounds.maxX, b.x + step));
    }
  }
}

// --- E3 tags, tool permissions and property incidents --------------------------------------

/** The held weapon of `att` opens this breakable at once (a tag its `opens` lists). */
export function opensAtOnce(world: World, att: Fighter, b: Breakable): boolean {
  if (!b.tags || b.tags.length === 0 || att.item === 0) return false;
  const held = world.items.find((i) => i.id === att.item);
  const opens = held ? (WEAPONS[held.def]?.opens ?? []) : [];
  return b.tags.some((t) => opens.includes(t));
}

/** Logs that a tool opened a tagged breakable. */
export function logOpened(world: World, b: Breakable, by: number): void {
  sharedLog(world, SharedEvent.Opened, b.id, by);
}

/** The fighter a break is attributed to: the striker, or the thrower of an item. */
function attributed(world: World, by: number): Fighter | undefined {
  const f = world.bodies.find((x) => x.id === by);
  if (f) return f;
  const item = world.items.find((i) => i.id === by);
  return item ? world.bodies.find((x) => x.id === (item.owner || item.lastHolder)) : undefined;
}

/**
 * A protected breakable damaged by a hero records one avoidable-property incident per
 * damage cluster (Reedwater §12, Stage 7 §9). Enemy damage never counts.
 */
export function propertyIncident(world: World, b: Breakable, by: number): void {
  if (b.property !== PropertyClass.Protected) return;
  const who = attributed(world, by);
  if (!who || who.team !== 'hero') return;
  const s = ensureShared(world);
  const cluster = b.cluster ?? 0;
  if (s.incidents.some((i) => i.cluster === cluster)) return;
  s.incidents.push({ cluster, frame: world.frame, by: who.id, prop: b.id });
  sharedLog(world, SharedEvent.Incident, b.id, who.id);
}

/** Player-attributed property incidents so far (distinct clusters). */
export function propertyIncidents(world: World): number {
  return world.shared?.incidents.length ?? 0;
}

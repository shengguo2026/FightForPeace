/**
 * M24 support robot (E12): marked stations request authored interventions through one
 * shared state machine. A hero stepping onto an unused station requests it (approaching);
 * a hostile at the station during the approach disrupts it (cooldown, then one retry);
 * otherwise it becomes active for its frames and is then consumed. Only one intervention
 * runs at a time. Effects: mobile cover (a temporary solid surface), reserve delay (the
 * next wave waits) and objective interference (a hook M25's hostile channels fill).
 */
import { fx } from '../math/fixed';
import type { World } from '../world/types';
import { Intervention } from '../world/stage';
import { RobotState, SharedEvent, type Station, sharedLog } from './state';
import { COVER_ID_BASE } from './scenery';

/** A body this close to a station (each axis) stands on it. */
export const STATION_RADIUS = fx(40);

function near(world: World, st: Station, team: 'hero' | 'enemy'): boolean {
  return world.bodies.some(
    (b) =>
      b.team === team &&
      !b.ko &&
      Math.abs(b.x - st.x) <= STATION_RADIUS &&
      Math.abs(b.z - st.z) <= STATION_RADIUS,
  );
}

function begin(world: World, st: Station, state: number, event: number): void {
  st.state = state;
  st.frame = 0;
  sharedLog(world, event, st.id);
}

function activate(world: World, st: Station): void {
  const s = world.shared!;
  begin(world, st, RobotState.Active, SharedEvent.RobotActive);
  if (st.kind === Intervention.Cover && st.cover) {
    st.coverId = COVER_ID_BASE + s.stations.indexOf(st);
    world.environment.surfaces.push({
      id: st.coverId,
      x: st.cover.x,
      z: st.cover.z,
      hw: st.cover.hw,
      hd: st.cover.hd,
      h: st.cover.h,
      cracked: false,
      impacts: 0,
    });
  } else if (st.kind === Intervention.Delay) {
    s.delayUntil = Math.max(s.delayUntil, world.frame + st.frames);
  }
  // Intervention.Interfere: M25's hostile objective channels read the active station.
}

function consume(world: World, st: Station): void {
  const s = world.shared!;
  if (st.coverId !== 0) {
    const i = world.environment.surfaces.findIndex((x) => x.id === st.coverId);
    if (i >= 0) world.environment.surfaces.splice(i, 1);
    st.coverId = 0;
  }
  if (s.robotBusy === st.id) s.robotBusy = 0;
  begin(world, st, RobotState.Consumed, SharedEvent.RobotConsumed);
}

export function stepStations(world: World): void {
  const s = world.shared;
  if (!s) return;
  for (const st of s.stations) {
    st.frame += 1;
    switch (st.state) {
      case RobotState.Unused:
        if (s.robotBusy === 0 && near(world, st, 'hero')) {
          s.robotBusy = st.id;
          begin(world, st, RobotState.Approaching, SharedEvent.RobotRequest);
        }
        break;
      case RobotState.Approaching:
        if (near(world, st, 'enemy')) {
          if (s.robotBusy === st.id) s.robotBusy = 0;
          begin(world, st, RobotState.Disrupted, SharedEvent.RobotDisrupted);
        } else if (st.frame >= st.approach) activate(world, st);
        break;
      case RobotState.Disrupted:
        // The disruption shows for a moment, then the cooldown runs.
        if (st.frame >= 20) {
          st.state = RobotState.Cooldown;
          st.frame = 0;
        }
        break;
      case RobotState.Cooldown:
        if (st.frame >= st.cooldown) {
          if (st.retry) {
            st.retry = false;
            st.state = RobotState.Unused;
            st.frame = 0;
          } else consume(world, st);
        }
        break;
      case RobotState.Active:
        if (st.frame >= st.frames) consume(world, st);
        break;
      default:
        break;
    }
  }
}

/** The next wave is held by an active reserve delay. */
export function waveHeld(world: World): boolean {
  return !!world.shared && world.frame < world.shared.delayUntil;
}

/** A station's interference is running (M25 reads this to pause a hostile channel). */
export function interfering(world: World): boolean {
  return (
    world.shared?.stations.some(
      (st) => st.kind === Intervention.Interfere && st.state === RobotState.Active,
    ) ?? false
  );
}

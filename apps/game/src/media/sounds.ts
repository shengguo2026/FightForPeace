import { type PresentationEvent, type SfxCategory } from '@ffp/platform';
import { RunEvent } from '@ffp/sim';
import { audio } from './audio';

const RUN_SOUNDS: Partial<Record<number, string>> = {
  [RunEvent.Checkpoint]: 'sfx.run.checkpoint',
  [RunEvent.WorkerFreed]: 'sfx.run.worker-freed',
  [RunEvent.CacheOpen]: 'sfx.run.cache',
  [RunEvent.Food]: 'sfx.run.food',
  [RunEvent.Clue]: 'sfx.run.clue',
  [RunEvent.Evidence]: 'sfx.run.evidence',
  [RunEvent.RiverRestored]: 'sfx.run.river-restored',
  [RunEvent.Downed]: 'sfx.run.downed',
  [RunEvent.Revived]: 'sfx.run.revived',
};

/** The logical sound id and mix category for a presentation event (null: silent). */
export function soundOf(
  e: PresentationEvent,
): { id: string; category: SfxCategory; own?: boolean } | null {
  switch (e.kind) {
    case 'hit':
      return {
        id: e.tier >= 2 ? 'sfx.hit.heavy' : e.tier === 1 ? 'sfx.hit.medium' : 'sfx.hit.light',
        category: 'contact',
        own: e.own,
      };
    case 'defense':
      if (e.what === 'guard') return { id: 'sfx.guard.block', category: 'contact' };
      if (e.what === 'armor') return { id: 'sfx.armor.clank', category: 'contact' };
      if (e.what === 'crush') return { id: 'sfx.crush.break', category: 'critical' };
      return { id: `sfx.${e.what}.confirm`, category: 'confirm' };
    case 'grab':
      if (e.what === 'grabbed') return { id: 'sfx.grab.hold', category: 'critical' };
      if (e.what === 'throw') return { id: 'sfx.throw.release', category: 'contact' };
      return { id: 'sfx.rescue.free', category: 'confirm' };
    case 'dash':
      return { id: 'sfx.dash.step', category: e.own ? 'contact' : 'crowd', own: e.own };
    case 'land':
      return { id: 'sfx.land.step', category: 'debris' };
    case 'knockdown':
      return { id: 'sfx.knockdown.fall', category: 'debris' };
    case 'ultimate':
      return { id: 'sfx.ultimate.start', category: 'confirm' };
    case 'team':
      return { id: 'sfx.team.finisher', category: 'confirm' };
    case 'bossPhase':
      return { id: 'sfx.phase.boss', category: 'critical' };
    case 'run': {
      const id = RUN_SOUNDS[e.event];
      return id ? { id, category: 'ui' } : null;
    }
  }
}

/** Plays the events' sounds through the priority mix. */
export function playEventSounds(events: readonly PresentationEvent[]): void {
  for (const e of events) {
    const s = soundOf(e);
    if (s) audio.sfx(s.id, s.category, s.own === undefined ? {} : { own: s.own });
  }
}

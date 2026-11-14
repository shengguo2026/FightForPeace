import { hashWorld } from '@ffp/sim';
import { describe, expect, it } from 'vitest';
import {
  ABSENT_MS,
  COUNTDOWN_MS,
  COURTESY_MS,
  MIGRATE_MS,
  ROLLBACK_WINDOW,
  type StartInfo,
} from '../src/index';
import { stageBotInput } from '../../sim/test/stageBot';
import { type Game, START, pair, replay, run, settle } from './netHarness';

/**
 * M23 Wi-Fi coverage for Stage 2 (spec §18: "All six unique hero pairs complete Medium in
 * … local-Wi-Fi"; roadmap cut option 1: automated for all six pairs, three by hand). Two
 * games run the real rollback session over a simulated link with latency, jitter and an
 * uneven guest clock; the players are the stage bot, so they ride the pursuit and fight
 * into the Loading Yard. Both games must end on the same world as an offline replay of
 * the final inputs, with rollbacks inside the window and no resync. Recovery (absence,
 * proxy, rejoin, pulled cable, host migration) runs on Stage 2 too.
 */
const PAIRS = [
  ['mountain', 'river'],
  ['mountain', 'wind'],
  ['mountain', 'fire'],
  ['river', 'wind'],
  ['river', 'fire'],
  ['wind', 'fire'],
];

function stage2(heroes: string[], seed = 23): StartInfo {
  return { ...START, seed, stage: 'stage2', heroes, session: `m23-${heroes.join('-')}` };
}

/** A pair of games whose players are the stage bot, each looking at its own world. */
function botPair(heroes: string[], seed?: number) {
  const games: Game[] = [];
  const p = pair(0, stage2(heroes, seed), (slot) => stageBotInput(games[slot]!.world, slot));
  games.push(p.host, p.guest);
  return p;
}

describe('Stage 2 over Wi-Fi: every pair', () => {
  for (const heroes of PAIRS)
    it(`${heroes.join(' + ')}: both games end on the offline world`, () => {
      const { net, host, guest } = botPair(heroes);
      run(net, [host, guest], 50_000, { uneven: true });
      settle(net, host, guest);
      expect(host.world.frame).toBeGreaterThan(2500);
      expect(host.world.run!.beat).toBeGreaterThan(0); // past the pursuit, into the rooms
      expect(hashWorld(guest.world)).toBe(hashWorld(host.world));
      expect(replay(host, host.world.frame)).toBe(hashWorld(host.world));
      expect(host.s.stats.maxRollback).toBeLessThanOrEqual(ROLLBACK_WINDOW + 2);
      expect(host.s.stats.resyncs).toBe(0);
      expect(guest.s.stats.resyncs).toBe(0);
    }, 120_000);
});

describe('Stage 2 over Wi-Fi: soak and recovery', () => {
  it('a long session on a jittery link stays in step', () => {
    const { net, host, guest } = botPair(['wind', 'fire'], 7);
    net.latency = 60;
    net.jitter = 70;
    run(net, [host, guest], 150_000, { uneven: true });
    settle(net, host, guest);
    expect(host.world.frame).toBeGreaterThan(7000);
    expect(hashWorld(guest.world)).toBe(hashWorld(host.world));
    expect(replay(host, host.world.frame)).toBe(hashWorld(host.world));
    expect(host.s.stats.resyncs + guest.s.stats.resyncs).toBe(0);
  }, 300_000);

  it('the guest drops out in a room and rejoins: the proxy holds the hero, nothing is duplicated', () => {
    const { net, host, guest } = botPair(['mountain', 'fire']);
    run(net, [host, guest], 60_000);
    expect(host.world.run!.beat).toBeGreaterThan(0);
    const weapons = host.world.items.length;
    guest.s.requestHold('focus', net.now);
    run(net, [host, guest], COURTESY_MS + COUNTDOWN_MS + 4000, { skip: new Set([guest]) });
    expect(host.s.partnerAbsent).toBe(true);
    expect(host.world.bodies.filter((b) => b.team === 'hero')).toHaveLength(2);
    guest.s.confirmReady(net.now);
    run(net, [host, guest], 5000);
    expect(guest.s.phase).toBe('run');
    expect(host.s.partnerAbsent).toBe(false);
    run(net, [host, guest], 3000);
    settle(net, host, guest);
    expect(hashWorld(guest.world)).toBe(hashWorld(host.world));
    expect(host.world.bodies.filter((b) => b.team === 'hero')).toHaveLength(2);
    // No weapon or item appeared twice through the hand-back.
    expect(host.world.items.length).toBeLessThanOrEqual(weapons + 4);
    const ids = host.world.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  }, 120_000);

  it('a pulled cable mid-stage: the guest takes over, the room owner gets authority back', () => {
    const { net, host, guest } = botPair(['river', 'wind']);
    run(net, [host, guest], 30_000);
    net.silent = true;
    net.drop();
    run(net, [host, guest], ABSENT_MS + MIGRATE_MS + 2000);
    expect(guest.s.authority).toBe(true);
    net.silent = false;
    host.s.linkRestored(net.now);
    guest.s.linkRestored(net.now);
    host.s.partnerReturning(net.now);
    run(net, [host, guest], 6000);
    expect(host.s.authority).toBe(true);
    expect(guest.s.authority).toBe(false);
    run(net, [host, guest], 3000);
    settle(net, host, guest);
    expect(hashWorld(guest.world)).toBe(hashWorld(host.world));
    const ids = host.world.bodies.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  }, 120_000);
});

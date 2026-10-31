/** Fixed simulation rate in steps per second. Rendering runs independently. */
export const SIM_HZ = 60;

export * from './math/fixed';
export * from './math/rng';
export * from './state/encode';
export * from './state/hash';
export type * from './world/types';
export * from './world/world';
export * from './loop/fixedStep';

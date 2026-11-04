/** Call-out words the stage scene draws over fighters (localized as `callout.<slug>`). */
export const CALLOUT_WORDS = [
  'ARMOR',
  'ASSIST',
  'BREAKER',
  'CLASH',
  'COUNTER',
  'DEFLECT',
  'DISARM',
  'DISARMED',
  'ESCAPED',
  'EXACT',
  'EXACT · BREAK',
  'FREED',
  'GRAB BROKEN',
  'GUARD CRUSH',
  'HANDOFF',
  'RECLAIMED',
  'RESCUE',
  'RETURNED',
  'STRUCK ASIDE',
  'TEAM?',
  'THROW',
  'WEAPON BREAK',
  'contested',
  'counter missed',
  'too early',
  'too late',
] as const;

export const calloutKey = (word: string) =>
  `callout.${word
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-|-$/g, '')}`;

import { signal } from '@preact/signals';

/**
 * Online play loads every sheet on the Wi-Fi screen, and Host and Connect wait until they
 * are in, before any link to the other computer exists. A sheet decoded during a match (or
 * a rejoin) holds that computer's main thread for a moment while the other one runs on,
 * and the match has to resync (lessons_learned.md M1).
 */
export const onlineArt = { wanted: signal(false), ready: signal(false) };

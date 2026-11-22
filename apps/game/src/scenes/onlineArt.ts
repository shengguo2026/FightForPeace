import { signal } from '@preact/signals';

/**
 * Online play loads every sheet in the lobby, and Ready waits until they are in: a sheet
 * decoded during a match holds that computer's main thread for a moment, the other one
 * runs on, and the match has to resync (lessons_learned.md M1).
 */
export const onlineArt = { wanted: signal(false), ready: signal(false) };

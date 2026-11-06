import { capabilities } from './system/probe';
import { showBlocked } from './system/blocked';
import { startGame } from './app';

/**
 * M14 capability gates (spec §2): a browser without a required capability gets an
 * explanation instead of a broken game; everything else starts the game.
 */
if (capabilities.blocking.length > 0) showBlocked(capabilities);
else startGame();

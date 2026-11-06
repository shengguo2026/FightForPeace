import { capabilities } from './system/probe';

/**
 * M14 capability gates (spec §2): a browser without a required capability gets an
 * explanation instead of a broken game; everything else starts the game.
 */
if (capabilities.blocking.length > 0) {
  void import('./system/blocked').then((m) => m.showBlocked(capabilities));
} else {
  void import('./app');
}

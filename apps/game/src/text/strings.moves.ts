import type { Catalog } from '@ffp/platform';

/**
 * Pause-menu Move List inputs (2026-11-18): how each move is entered, by its input context.
 * `{d}` is replaced by the direction (`{dir:Forward}+` and so on, see moveInput in i18n.ts);
 * every key or button is a `{action:…}` / `{dir:…}` token, so the list follows the
 * player's own bindings and device (keyboard or gamepad).
 */
export const MOVES_EN = {
  'moves.in.neutral': '{d}{action:Attack}',
  'moves.in.chain': '{d}{action:Attack} again',
  'moves.in.air': 'in the air: {d}{action:Attack}',
  'moves.in.dash': 'dashing: {action:Attack}',
  'moves.in.dashLow': 'dashing: {action:Attack}+{action:Guard}',
  'moves.in.groundFocus': 'downed enemy: {d}{action:Attack}',
  'moves.in.counter': '{dir:Forward}+{action:Guard} just before contact',
  'moves.in.script': 'follows on its own',
  'moves.in.special': '{d}{action:Special}',
  'moves.in.ultimate': '{d}{action:Ultimate} (full bar)',
  'moves.in.grab': '{action:Interact}',
  'moves.in.grabExtension': 'holding: {action:Attack}',
  'moves.in.grabRelease': 'holding, then again: {action:Attack}',
  'moves.in.grabThrow': 'holding: {d}{action:Interact}',
  'moves.in.grabSpecial': 'holding: {action:Special}',
  'moves.in.weaponThrow': 'armed: {d}{action:Interact}',
  'moves.in.team': '{action:TeamAttack} with your partner',
} as const;

export const MOVES_ZH: Catalog = {
  'moves.in.neutral': '{d}{action:Attack}',
  'moves.in.chain': '再按 {d}{action:Attack}',
  'moves.in.air': '空中：{d}{action:Attack}',
  'moves.in.dash': '冲刺中：{action:Attack}',
  'moves.in.dashLow': '冲刺中：{action:Attack}+{action:Guard}',
  'moves.in.groundFocus': '倒地的敌人：{d}{action:Attack}',
  'moves.in.counter': '接触前一刻 {dir:Forward}+{action:Guard}',
  'moves.in.script': '自动接续',
  'moves.in.special': '{d}{action:Special}',
  'moves.in.ultimate': '{d}{action:Ultimate}（满槽）',
  'moves.in.grab': '{action:Interact}',
  'moves.in.grabExtension': '抓住时：{action:Attack}',
  'moves.in.grabRelease': '抓住时再按：{action:Attack}',
  'moves.in.grabThrow': '抓住时：{d}{action:Interact}',
  'moves.in.grabSpecial': '抓住时：{action:Special}',
  'moves.in.weaponThrow': '持械时：{d}{action:Interact}',
  'moves.in.team': '与同伴一起 {action:TeamAttack}',
};

export const MOVES_DE: Catalog = {
  'moves.in.neutral': '{d}{action:Attack}',
  'moves.in.chain': '{d}{action:Attack} erneut',
  'moves.in.air': 'in der Luft: {d}{action:Attack}',
  'moves.in.dash': 'im Sprint: {action:Attack}',
  'moves.in.dashLow': 'im Sprint: {action:Attack}+{action:Guard}',
  'moves.in.groundFocus': 'Gegner am Boden: {d}{action:Attack}',
  'moves.in.counter': '{dir:Forward}+{action:Guard} kurz vor dem Treffer',
  'moves.in.script': 'folgt von selbst',
  'moves.in.special': '{d}{action:Special}',
  'moves.in.ultimate': '{d}{action:Ultimate} (volle Leiste)',
  'moves.in.grab': '{action:Interact}',
  'moves.in.grabExtension': 'beim Festhalten: {action:Attack}',
  'moves.in.grabRelease': 'beim Festhalten, danach erneut: {action:Attack}',
  'moves.in.grabThrow': 'beim Festhalten: {d}{action:Interact}',
  'moves.in.grabSpecial': 'beim Festhalten: {action:Special}',
  'moves.in.weaponThrow': 'bewaffnet: {d}{action:Interact}',
  'moves.in.team': '{action:TeamAttack} mit deinem Partner',
};

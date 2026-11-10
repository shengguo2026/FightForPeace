import type { Catalog } from '@ffp/platform';

/**
 * Words drawn over the fighters on the stage (grab states, attack profiles, weapon
 * condition) and the weapon names, in all three languages (after the M11 tests).
 */
export const LABELS_EN = {
  'over.escape': 'ESCAPE!',
  'over.grabbed': 'GRABBED',
  'over.restrained': 'RESTRAINED {n}',
  'over.unblockable': 'UNBLOCKABLE',
  'over.piercesGuard': 'PIERCES GUARD',
  'over.guardPressure': 'GUARD PRESSURE',
  'over.counterable': 'counterable',
  'over.condition.0': 'Ready',
  'over.condition.1': 'Worn',
  'over.condition.2': 'Critical',
} as const;

export const LABELS_ZH: Catalog = {
  'over.escape': '挣脱！',
  'over.grabbed': '被抓住',
  'over.restrained': '被制住 {n}',
  'over.unblockable': '无法防御',
  'over.piercesGuard': '破防',
  'over.guardPressure': '防御压制',
  'over.counterable': '可反击',
  'over.condition.0': '完好',
  'over.condition.1': '磨损',
  'over.condition.2': '将坏',
  'weapon.breaching-grenade.name': '破门手雷',
  'weapon.handwheel.name': '铁闸手轮',
  'weapon.service-lance.name': '伸缩维修长枪',
  'weapon.six-round-sidearm.name': '六发手枪',
  'weapon.support-gun.name': '连发指挥支援枪',
  'weapon.support-rail.name': '支撑铁轨',
  'weapon.timber-board.name': '木板',
  'weapon.workstaff.name': '运河工棍',
};

export const LABELS_DE: Catalog = {
  'over.escape': 'BEFREIEN!',
  'over.grabbed': 'GEPACKT',
  'over.restrained': 'FESTGEHALTEN {n}',
  'over.unblockable': 'UNBLOCKBAR',
  'over.piercesGuard': 'DURCHBRICHT DECKUNG',
  'over.guardPressure': 'DECKUNGSDRUCK',
  'over.counterable': 'konterbar',
  'over.condition.0': 'Bereit',
  'over.condition.1': 'Abgenutzt',
  'over.condition.2': 'Kritisch',
  'weapon.breaching-grenade.name': 'Aufbruchgranate',
  'weapon.handwheel.name': 'Eisernes Schleusenhandrad',
  'weapon.service-lance.name': 'Teleskop-Wartungslanze',
  'weapon.six-round-sidearm.name': 'Sechsschuss-Pistole',
  'weapon.support-gun.name': 'Feuerstoß-Unterstützungswaffe',
  'weapon.support-rail.name': 'Stützschiene',
  'weapon.timber-board.name': 'Holzbrett',
  'weapon.workstaff.name': 'Kanal-Arbeitsstab',
};

import type { Catalog } from '@ffp/platform';
import { ENEMIES } from '@ffp/sim';

/**
 * M24 Combat Constitution audit: the Lab test scenes, their placeholder kits, weapons and
 * the mount catalogue corridor, the shared-system labels drawn over the placeholders and
 * the Lab's hand-over buttons. Placeholder names carry "(test)" in every language.
 */
export const M24_EN = {
  'm24.lab.title': 'M24 shared systems',
  'm24.lab.handover': 'Hand over to the other hero',
  'm24.lab.support': 'Player 2 becomes supporter',
  'm24.lab.claim': 'Claim the cache',
  'm24.mover': 'Moving hazard',
  'm24.mover.warn': 'Warning',
  'm24.mover.redirected': 'Redirected',
  'm24.platform': 'Moving platform',
  'm24.station.0': 'Robot: cover',
  'm24.station.1': 'Robot: reserve delay',
  'm24.station.2': 'Robot: interference',
  'm24.robot.0': 'unused',
  'm24.robot.1': 'approaching',
  'm24.robot.2': 'disrupted',
  'm24.robot.3': 'cooldown',
  'm24.robot.4': 'active',
  'm24.robot.5': 'consumed',
  'm24.stability': 'Stability',
  'm24.lane': 'Lane pass',
  'm24.gear': 'Gear',
  'm24.heat': 'Heat',
  'm24.overheated': 'Overheated',
  'm24.disguised': 'Disguised',
  'm24.noncombatant': 'Noncombatant',
  'm24.withdraw': 'Withdraws',
  'm24.blast': 'Blast area',
  'm24.incidents': 'Property incidents: {n}',
  'm24.supporter': 'Supporter: {n} actions left',
  'm24.waveHeld': 'Next wave held',
} as const;

const ZH: Catalog = {
  'm24.lab.title': 'M24 共享系统',
  'm24.lab.handover': '交接给另一位英雄',
  'm24.lab.support': '玩家 2 成为支援者',
  'm24.lab.claim': '领取暂存物品',
  'm24.mover': '移动危险物',
  'm24.mover.warn': '警告',
  'm24.mover.redirected': '已改向',
  'm24.platform': '移动平台',
  'm24.station.0': '机器人：掩体',
  'm24.station.1': '机器人：延缓增援',
  'm24.station.2': '机器人：干扰',
  'm24.robot.0': '未使用',
  'm24.robot.1': '接近中',
  'm24.robot.2': '被干扰',
  'm24.robot.3': '冷却中',
  'm24.robot.4': '生效中',
  'm24.robot.5': '已用完',
  'm24.stability': '稳定度',
  'm24.lane': '冲锋路线',
  'm24.gear': '装备',
  'm24.heat': '热量',
  'm24.overheated': '过热',
  'm24.disguised': '伪装',
  'm24.noncombatant': '非战斗人员',
  'm24.withdraw': '撤退',
  'm24.blast': '冲击范围',
  'm24.incidents': '财产损害事件：{n}',
  'm24.supporter': '支援者：剩余 {n} 次行动',
  'm24.waveHeld': '下一波被延缓',
  'enemy.m24-bystander.name': '非战斗人员（测试）',
  'enemy.m24-false-merchant.name': '假商人（测试）',
  'enemy.m24-feinter.name': '佯攻者（测试）',
  'enemy.m24-marshal.name': '执法官（测试）',
  'enemy.m24-marshal.phase.0': '骑乘',
  'enemy.m24-marshal.phase.1': '盾墙',
  'enemy.m24-marshal.phase.2': '开阔地',
  'enemy.m24-mounted-raider.name': '骑马掠夺者（测试）',
  'enemy.m24-rival.name': '意志对手（测试）',
  'enemy.m24-shield-escort.name': '持盾护卫（测试）',
  'weapon.m24-concussion.name': '震荡装置（测试）',
  'weapon.m24-heavy-gun.name': '受限重机枪（测试）',
  'weapon.m24-hook-pole.name': '钩杆（测试）',
  'weapon.m24-pry-bar.name': '撬棍（测试）',
  'weapon.m24-ration.name': '野战口粮（测试）',
  'arena.lab-m24-hazards.name': 'M24 实验室：移动危险物与工具',
  'arena.lab-m24-platform.name': 'M24 实验室：移动平台',
  'arena.lab-m24-gear.name': 'M24 实验室：有限装备',
  'arena.lab-m24-marshal.name': 'M24 实验室：骑乘持盾首领',
  'arena.lab-m24-riders.name': 'M24 实验室：骑马掠夺者',
  'arena.lab-m24-rivals.name': 'M24 实验室：对手、佯攻与伪装',
  'arena.lab-m24-weapons.name': 'M24 实验室：重武器与补给',
  'arena.lab-m24-handover.name': 'M24 实验室：交接与支援',
  'arena.lab-m24-robot.name': 'M24 实验室：支援机器人',
  'corridor.pursuit-m24-mounts.name': 'M24 实验室：坐骑目录',
  'corridor.pursuit-m24-mounts.goal': '骑行通过山路；稳定度耗尽时安全下马',
};

const DE: Catalog = {
  'm24.lab.title': 'M24 gemeinsame Systeme',
  'm24.lab.handover': 'An den anderen Helden übergeben',
  'm24.lab.support': 'Spieler 2 wird Unterstützer',
  'm24.lab.claim': 'Ablage abholen',
  'm24.mover': 'Bewegliche Gefahr',
  'm24.mover.warn': 'Warnung',
  'm24.mover.redirected': 'Umgelenkt',
  'm24.platform': 'Bewegliche Plattform',
  'm24.station.0': 'Roboter: Deckung',
  'm24.station.1': 'Roboter: Reserve verzögern',
  'm24.station.2': 'Roboter: Störung',
  'm24.robot.0': 'unbenutzt',
  'm24.robot.1': 'unterwegs',
  'm24.robot.2': 'gestört',
  'm24.robot.3': 'Abklingzeit',
  'm24.robot.4': 'aktiv',
  'm24.robot.5': 'verbraucht',
  'm24.stability': 'Stabilität',
  'm24.lane': 'Durchritt',
  'm24.gear': 'Ausrüstung',
  'm24.heat': 'Hitze',
  'm24.overheated': 'Überhitzt',
  'm24.disguised': 'Getarnt',
  'm24.noncombatant': 'Nichtkämpfer',
  'm24.withdraw': 'Zieht sich zurück',
  'm24.blast': 'Wirkungsbereich',
  'm24.incidents': 'Sachschäden: {n}',
  'm24.supporter': 'Unterstützer: noch {n} Aktionen',
  'm24.waveHeld': 'Nächste Welle verzögert',
  'enemy.m24-bystander.name': 'Nichtkämpfer (Test)',
  'enemy.m24-false-merchant.name': 'Falscher Händler (Test)',
  'enemy.m24-feinter.name': 'Finteur (Test)',
  'enemy.m24-marshal.name': 'Marschall (Test)',
  'enemy.m24-marshal.phase.0': 'Beritten',
  'enemy.m24-marshal.phase.1': 'Schildwall',
  'enemy.m24-marshal.phase.2': 'Offenes Gelände',
  'enemy.m24-mounted-raider.name': 'Berittener Plünderer (Test)',
  'enemy.m24-rival.name': 'Willensrivale (Test)',
  'enemy.m24-shield-escort.name': 'Schildbegleiter (Test)',
  'weapon.m24-concussion.name': 'Erschütterungsgerät (Test)',
  'weapon.m24-heavy-gun.name': 'Eingeschränktes schweres MG (Test)',
  'weapon.m24-hook-pole.name': 'Hakenstange (Test)',
  'weapon.m24-pry-bar.name': 'Brecheisen (Test)',
  'weapon.m24-ration.name': 'Feldration (Test)',
  'arena.lab-m24-hazards.name': 'M24-Labor: Bewegliche Gefahren und Werkzeuge',
  'arena.lab-m24-platform.name': 'M24-Labor: Bewegliche Plattform',
  'arena.lab-m24-gear.name': 'M24-Labor: Begrenzte Ausrüstung',
  'arena.lab-m24-marshal.name': 'M24-Labor: Berittener Schildboss',
  'arena.lab-m24-riders.name': 'M24-Labor: Berittene Plünderer',
  'arena.lab-m24-rivals.name': 'M24-Labor: Rivalen, Finten und Tarnung',
  'arena.lab-m24-weapons.name': 'M24-Labor: Schwere Waffen und Proviant',
  'arena.lab-m24-handover.name': 'M24-Labor: Übergabe und Unterstützung',
  'arena.lab-m24-robot.name': 'M24-Labor: Unterstützungsroboter',
  'corridor.pursuit-m24-mounts.name': 'M24-Labor: Reittierkatalog',
  'corridor.pursuit-m24-mounts.goal': 'Den Pfad reiten; bei leerer Stabilität sicher absteigen',
};

/**
 * Move names of kits that reuse another kit's art and moves (`art`): each takes the art
 * kit's translation from the finished catalogue.
 */
function artMoves(cat: Catalog): Catalog {
  const out: Record<string, string> = {};
  for (const k of ENEMIES) {
    if (!k.id.startsWith('m24-') || !k.art || k.art === k.id) continue;
    for (const a of k.actions) {
      const text = cat[`enemy.${k.art}.action.${a.id}`];
      if (text) out[`enemy.${k.id}.action.${a.id}`] = text;
    }
  }
  return out;
}

export const M24_ZH = (base: Catalog): Catalog => ({ ...ZH, ...artMoves(base) });
export const M24_DE = (base: Catalog): Catalog => ({ ...DE, ...artMoves(base) });

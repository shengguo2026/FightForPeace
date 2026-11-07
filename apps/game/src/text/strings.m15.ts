import type { Catalog } from '@ffp/platform';

/**
 * M15 Wi-Fi recovery text (rollback badge, recovery grace, survival proxy, taking over,
 * rejoining) in all three languages. These keys replace the M12 badge and grace lines.
 */
export const M15_EN = {
  'net.badge': 'Wi-Fi · input delay {n} · rollbacks {r} · {ms} ms',
  'net.badgeHost': 'Wi-Fi · this computer leads · input delay {n} · {ms} ms',
  'net.grace':
    'If Player {n} is not back in {s} s, play continues and their hero is kept safe until they return.',
  'net.partnerGrace': 'Player {n} is disconnected. Their hero holds its guard.',
  'net.partnerProxy':
    'Player {n} is disconnected. Their hero follows you, guards and uses basic attacks until they return.',
  'net.rejoinHere':
    'They can rejoin with Wi-Fi co-op → Join: address {address} · port {port} · code {code}',
  'net.reconnecting': 'The connection to Player {n} was lost. Reconnecting…',
  'net.takeover': 'If it does not come back in {s} s, this computer continues the game.',
  'net.awayTitle': 'You are out of the game',
  'net.awayText':
    'Play went on without you while you were away. Your hero was kept safe. Rejoin to take it over again.',
  'net.rejoin': 'Rejoin',
  'net.rejoining': 'Rejoining… you take over your hero at the next safe moment.',
  'net.ended.desync':
    'The two games could not be brought back in step (different versions or a damaged snapshot).',
} as const;

export const M15_ZH: Catalog = {
  'net.badge': '局域网 · 输入延迟 {n} · 回滚 {r} · {ms} 毫秒',
  'net.badgeHost': '局域网 · 由这台电脑主导 · 输入延迟 {n} · {ms} 毫秒',
  'net.grace': '如果玩家 {n} 在 {s} 秒内没有回来，游戏将继续，并在其回来前保护其英雄。',
  'net.partnerGrace': '玩家 {n} 已断开连接。其英雄保持防御。',
  'net.partnerProxy': '玩家 {n} 已断开连接。在其回来之前，其英雄会跟随你、防御并使用基础攻击。',
  'net.rejoinHere':
    '对方可通过 局域网合作 → 加入房间 重新加入：地址 {address} · 端口 {port} · 房间码 {code}',
  'net.reconnecting': '与玩家 {n} 的连接已断开。正在重新连接…',
  'net.takeover': '如果 {s} 秒内仍未恢复，将由这台电脑继续游戏。',
  'net.awayTitle': '你已离开游戏',
  'net.awayText': '你离开期间游戏仍在继续，你的英雄受到了保护。重新加入即可再次操控它。',
  'net.rejoin': '重新加入',
  'net.rejoining': '正在重新加入… 你将在下一个安全时刻接管你的英雄。',
  'net.ended.desync': '两份游戏无法重新同步（版本不同或快照已损坏）。',
};

export const M15_DE: Catalog = {
  'net.badge': 'WLAN · Eingabeverzögerung {n} · Rollbacks {r} · {ms} ms',
  'net.badgeHost': 'WLAN · dieser Computer führt · Eingabeverzögerung {n} · {ms} ms',
  'net.grace':
    'Ist Spieler {n} in {s} s nicht zurück, geht das Spiel weiter und sein Held wird bis zur Rückkehr geschützt.',
  'net.partnerGrace': 'Spieler {n} ist getrennt. Sein Held hält die Deckung.',
  'net.partnerProxy':
    'Spieler {n} ist getrennt. Sein Held folgt dir, blockt und nutzt einfache Angriffe, bis er zurück ist.',
  'net.rejoinHere':
    'Wieder beitreten mit Koop im WLAN → Beitreten: Adresse {address} · Port {port} · Code {code}',
  'net.reconnecting': 'Die Verbindung zu Spieler {n} ist unterbrochen. Verbinde neu…',
  'net.takeover': 'Kommt sie in {s} s nicht zurück, setzt dieser Computer das Spiel fort.',
  'net.awayTitle': 'Du bist nicht mehr im Spiel',
  'net.awayText':
    'Das Spiel lief ohne dich weiter, dein Held wurde geschützt. Tritt wieder bei, um ihn zu übernehmen.',
  'net.rejoin': 'Wieder beitreten',
  'net.rejoining': 'Trete wieder bei… du übernimmst deinen Helden im nächsten sicheren Moment.',
  'net.ended.desync':
    'Die beiden Spiele ließen sich nicht wieder abgleichen (andere Versionen oder ein beschädigter Schnappschuss).',
};

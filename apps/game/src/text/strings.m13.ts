import type { Catalog } from '@ffp/platform';

/**
 * M13 interface text (cinematics, the ending, the Stage 1 score, audio and effect
 * settings) in all three languages. Prompt text never names a key or button.
 */
export const M13_EN = {
  'ending.1': 'With the gate open again, the river ran back down to the village.',
  'ending.2.all': 'Every worker came home, and the whole village gathered by the water.',
  'ending.2.some': 'The village gathered by the water, still waiting for those not yet home.',
  'ending.3': 'Among the commander’s papers lay a seal no faction of ours has ever used.',
  'ending.3b': 'Someone outside the valley paid for this. We will find out who.',

  'cine.pause': 'Pause',
  'cine.resume': 'Resume',
  'cine.hint': '{action:Attack} next · {dir:Down} pause · {action:Pause} skip',
  'cine.stills': 'Still pictures',

  'music.stage1.1': 'River Before Silence',
  'music.stage1.2': 'Fields Without Water',
  'music.stage1.3': 'Bridge Under Watch',
  'music.stage1.4': 'Mill in Motion',
  'music.stage1.5': 'Through the Dry Canal',
  'music.stage1.6': 'Keeper of the Gate',
  'music.stage1.7': 'River Returned',

  'settings.volumeAmbience': 'Ambience',
  'settings.volumeInterface': 'Interface sounds',
  'settings.nowPlaying': 'Now playing: {title}',
  'settings.nothingPlaying': 'No music is playing.',
  'settings.cinematics': 'Cinematics',
  'settings.cinematicsVideo': 'Video clips',
  'settings.cinematicsStills': 'Still pictures with subtitles',
  'settings.cinematicsHint':
    'Still pictures tell the same story with the same subtitles and use less memory.',
  'settings.particles': 'Sparks and particles',
  'settings.particles.full': 'Full',
  'settings.particles.reduced': 'Reduced',
  'settings.particles.off': 'Off',
  'settings.particlesHint':
    'Impact marks, attack warnings and defensive signals always stay visible.',
};

export const M13_ZH: Catalog = {
  'ending.1': '闸门重新打开，河水流回了村庄。',
  'ending.2.all': '所有工人都回家了，全村人聚在河边。',
  'ending.2.some': '全村人聚在河边，还在等那些没有回来的人。',
  'ending.3': '指挥官的文件里有一枚印章，我们这里没有任何势力用过。',
  'ending.3b': '是山谷外的人出钱策划了这一切。我们会查出是谁。',

  'cine.pause': '暂停',
  'cine.resume': '继续',
  'cine.hint': '{action:Attack} 下一个 · {dir:Down} 暂停 · {action:Pause} 跳过',
  'cine.stills': '静态画面',

  'music.stage1.1': '静默之前的河',
  'music.stage1.2': '无水之田',
  'music.stage1.3': '被监视的桥',
  'music.stage1.4': '转动的磨坊',
  'music.stage1.5': '穿过干涸的水渠',
  'music.stage1.6': '闸门守卫',
  'music.stage1.7': '河水归来',

  'settings.volumeAmbience': '环境音',
  'settings.volumeInterface': '界面音效',
  'settings.nowPlaying': '正在播放：{title}',
  'settings.nothingPlaying': '当前没有播放音乐。',
  'settings.cinematics': '过场动画',
  'settings.cinematicsVideo': '视频片段',
  'settings.cinematicsStills': '静态画面加字幕',
  'settings.cinematicsHint': '静态画面讲述同样的故事，字幕相同，占用内存更少。',
  'settings.particles': '火花和粒子',
  'settings.particles.full': '完整',
  'settings.particles.reduced': '减少',
  'settings.particles.off': '关闭',
  'settings.particlesHint': '命中标记、攻击预警和防御信号始终可见。',
};

export const M13_DE: Catalog = {
  'ending.1': 'Als das Tor wieder offen war, floss der Fluss zurück ins Dorf.',
  'ending.2.all': 'Alle Arbeiter kamen heim, und das ganze Dorf versammelte sich am Wasser.',
  'ending.2.some':
    'Das Dorf versammelte sich am Wasser und wartete noch auf die, die nicht heimgekehrt waren.',
  'ending.3':
    'Unter den Papieren des Kommandanten lag ein Siegel, das keine Gruppe bei uns je benutzt hat.',
  'ending.3b': 'Jemand außerhalb des Tals hat das bezahlt. Wir werden herausfinden, wer.',

  'cine.pause': 'Pause',
  'cine.resume': 'Weiter',
  'cine.hint': '{action:Attack} weiter · {dir:Down} Pause · {action:Pause} überspringen',
  'cine.stills': 'Standbilder',

  'music.stage1.1': 'Der Fluss vor der Stille',
  'music.stage1.2': 'Felder ohne Wasser',
  'music.stage1.3': 'Die bewachte Brücke',
  'music.stage1.4': 'Die Mühle in Bewegung',
  'music.stage1.5': 'Durch den trockenen Kanal',
  'music.stage1.6': 'Wächter des Tores',
  'music.stage1.7': 'Der Fluss kehrt zurück',

  'settings.volumeAmbience': 'Umgebung',
  'settings.volumeInterface': 'Menügeräusche',
  'settings.nowPlaying': 'Es läuft: {title}',
  'settings.nothingPlaying': 'Gerade läuft keine Musik.',
  'settings.cinematics': 'Zwischensequenzen',
  'settings.cinematicsVideo': 'Videoclips',
  'settings.cinematicsStills': 'Standbilder mit Untertiteln',
  'settings.cinematicsHint':
    'Standbilder erzählen dieselbe Geschichte mit denselben Untertiteln und brauchen weniger Speicher.',
  'settings.particles': 'Funken und Partikel',
  'settings.particles.full': 'Voll',
  'settings.particles.reduced': 'Reduziert',
  'settings.particles.off': 'Aus',
  'settings.particlesHint':
    'Trefferkerne, Angriffswarnungen und Abwehrsignale bleiben immer sichtbar.',
};

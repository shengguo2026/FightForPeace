import type { Catalog } from '@ffp/platform';

/**
 * M22 Stage 2 media and localization: every narration and dialogue line of the six motion
 * chapters (stable ids `s2.line.*`, which also name the voice files `vo.<locale>.<id>`),
 * the new speakers, the chapter titles, the Prosperity Under Siege cue titles, the voice
 * settings, the new weapon and pursuit sound captions and the Stage 2 Museum entries.
 */
export const M22_EN = {
  'speaker.wind': 'Wind Sentinel',
  'speaker.fire': 'Fire Warden',
  'speaker.tomas': 'Tomas Rell',

  'm22.skipAll': 'Skip all chapters',
  'm22.chapter.interlude': 'Prosperity Interlude',
  'm22.chapter.roadside': 'Roadside Deception',
  'm22.chapter.guest': 'Guest Under Observation',
  'm22.chapter.night': 'The Night Signal',
  'm22.chapter.recovery': 'Community Recovery',
  'm22.chapter.coda': 'Justice and Mystery',

  // Chapter 1 · Prosperity Interlude (the elder).
  's2.line.p01': 'The water came back to the valley. This time, we promised, it would stay.',
  's2.line.p02': 'We built a reserve, stone by stone, so that a dry year could never again empty our homes.',
  's2.line.p03': 'Through every season we raised channels and glasshouses, and learned as we built.',
  's2.line.p04': 'Vegetables grew in water and light, row after patient row.',
  's2.line.p05':
    'Fish, shrimp and plants learned to feed one another: clean water in, clean water out.',
  's2.line.p06': 'Our healers studied the old medicinal plants beside the clinic, carefully and slowly.',
  's2.line.p07': 'What the harvest earned, we gave back to the school.',
  's2.line.p08': 'New homes, a clinic, a council hall. A market where people lingered again.',
  's2.line.p09': 'Our young people trained to protect, with better gear and clearer rules.',
  's2.line.p10': 'Discipline first. Force only when it protects, and never more than it needs.',
  's2.line.p11': 'Faster roads, and equipment that is signed out and signed back in.',
  's2.line.p12': 'Three years. Look at what we built. That is why it had to be protected.',

  // Chapter 2 · Roadside Deception.
  's2.line.r01a': 'Quiet road tonight.',
  's2.line.r01b': 'Quiet is when we look twice.',
  's2.line.r02a': 'Help me! They will kill me!',
  's2.line.r02b': 'Behind us. Stay down.',
  's2.line.r03a': 'The riders turn back the moment the patrol stands between them and the stranger.',
  's2.line.r03b': 'He is bleeding. The clinic, now.',
  's2.line.r04': 'Treat him first. Questions can wait until he can stand.',

  // Chapter 3 · Guest Under Observation.
  's2.line.g01a': 'You saved my life. Let me repay you: a recovery remedy, made from plants.',
  's2.line.g01b': 'We will test it, and we thank you. Rest until you are well.',
  's2.line.g02a': 'Two weeks later, the guest asks to see the whole village.',
  's2.line.g02b': 'Remarkable. And the night shift: when does it change?',
  's2.line.g03a': 'Which road do the supply carts use? Where are the pump controls kept?',
  's2.line.g03b': 'A healer who asks about locks and schedules, and never about medicine.',
  's2.line.g04': 'No accusation without evidence. Keep the guard close, and keep watching.',

  // Chapter 4 · The Night Signal.
  's2.line.n01': 'On the third night, a lantern is lifted at an open window.',
  's2.line.n02a': 'Put the lantern down, Tomas.',
  's2.line.n02b': 'You are too late. They are already here.',
  's2.line.n03': 'Raiders at the glasshouses. Everything we built is inside. Go!',

  // Chapter 5 · Community Recovery (the closing line is the Preservation grade's epilogue).
  's2.line.c01': 'Morning. The pumps turn, and the tanks begin to breathe again.',
  's2.line.c01f': 'The aquaculture hall came through almost untouched.',
  's2.line.c01d': 'The hall is damaged, but every system can be repaired.',
  's2.line.c02': 'The injured are cared for first. The celebration can wait.',
  's2.line.c03': 'The harvest is still alive, and the village gathers it together.',
  's2.line.c03f': 'The crop channels stand full and green.',
  's2.line.c03d': 'Some beds were lost. The seeds in the reserve will replant them.',

  // Chapter 6 · Justice and Mystery Coda.
  's2.line.j01a': 'Tomas surrenders the real formula, with his notes and where it came from.',
  's2.line.j01b': 'Useful knowledge is welcome. It cannot buy innocence.',
  's2.line.docs':
    'The clinic seals the material in quarantine until it can be independently tested.',
  's2.line.j02':
    'Marek Vane and his riders are examined, recorded and handed to the Regional Civil Protection Council, with a receipt for every one.',
  's2.line.j03': 'At dawn, Tomas is escorted out of the valley with food and care, never to return.',
  's2.line.j04': 'This seal. We have seen it before, on the equipment of the first raid.',
  's2.line.seal': 'The same seal, the same order codes. Someone is paying for all of this.',
  's2.line.j05': 'The trail leads to an abandoned depot, cleared in a hurry. The sponsor remains unknown.',

  // The Prosperity Under Siege score (Museum Music Hall).
  'music.stage2.1': 'Water Became a Future',
  'music.stage2.2': 'Roadside Vigil',
  'music.stage2.3': 'Glass and Green',
  'music.stage2.4': 'Alarm Through the Channels',
  'music.stage2.5': 'Protect the Living System',
  'music.stage2.6': 'The Gilded Jackal',
  'music.stage2.7': 'What We Protected',

  // Voice settings (text and voice language are separate).
  'm22.settings.voice': 'Voice language',
  'm22.voice.text': 'Same as text',
  'm22.voice.en': 'English',
  'm22.voice.zh-CN': '简体中文',
  'm22.voice.de': 'Deutsch',
  'm22.voice.off': 'Off (subtitles only)',
  'm22.settings.systemVoice': 'System voice for narration',
  'm22.settings.systemVoiceNote':
    'Reads lines aloud with your computer’s voice when no recorded voice exists. A prototype aid; subtitles always stay on.',

  // Sound captions (essential warnings).
  'm22.cap.aim': '[a firearm is raised]',
  'm22.cap.shot': '[gunshot]',
  'm22.cap.burst': '[burst of fire]',
  'm22.cap.engine': '[engines roar]',
  'm22.cap.crash': '[a bike goes down]',

  // Stage 2 Museum entries.
  'museum.picture.keyart-s2.name': 'Prosperity Under Siege',
  'museum.picture.s2-p01.name': 'The Water Returns',
  'museum.picture.s2-p05.name': 'The Aquaponic Cycle',
  'museum.picture.s2-p12.name': 'The Future They Built',
  'museum.picture.s2-r02.name': 'The Pursued Stranger',
  'museum.picture.s2-g03.name': 'Questions That Do Not Fit',
  'museum.picture.s2-n03.name': 'Raiders at the Glasshouses',
  'museum.picture.s2-brief-02.name': 'The Greenhouse Complex at Night',
  'museum.picture.portrait-tomas.name': 'Tomas Rell',
  'museum.picture.portrait-marek.name': 'Marek Vane, the Gilded Jackal',
  'museum.picture.s2-c01f.name': 'The Hall Still Breathing',
  'museum.picture.s2-j04.name': 'The Matching Seal',
  'museum.picture.s2-j05.name': 'The Abandoned Depot',
  'museum.cinema.stage2.interlude.name': 'Prosperity Interlude',
  'museum.cinema.stage2.roadside.name': 'Roadside Deception',
  'museum.cinema.stage2.guest.name': 'Guest Under Observation',
  'museum.cinema.stage2.night.name': 'The Night Signal',
  'museum.cinema.stage2.recovery.name': 'Community Recovery',
  'museum.cinema.stage2.coda.name': 'Justice and Mystery',
} as const;

export const M22_ZH: Catalog = {
  'speaker.wind': '风神',
  'speaker.fire': '火神',
  'speaker.tomas': '托马斯·雷尔',

  'm22.skipAll': '跳过全部章节',
  'm22.chapter.interlude': '繁荣间章',
  'm22.chapter.roadside': '路边骗局',
  'm22.chapter.guest': '受观察的客人',
  'm22.chapter.night': '夜间信号',
  'm22.chapter.recovery': '社区复原',
  'm22.chapter.coda': '正义与谜团',

  's2.line.p01': '水回到了山谷。这一次，我们发誓要把它留住。',
  's2.line.p02': '我们一石一石地修起了蓄水库，让旱年再也不能掏空我们的家。',
  's2.line.p03': '一年四季，我们修渠道、建温室，边建边学。',
  's2.line.p04': '蔬菜在水和光中生长，一排又一排，耐心而整齐。',
  's2.line.p05': '鱼、虾和植物学会了彼此供养：清水流进，清水流出。',
  's2.line.p06': '我们的医者在诊所旁研究古老的药用植物，细心而缓慢。',
  's2.line.p07': '丰收换来的，我们又投回了学校。',
  's2.line.p08': '新房、诊所、议事厅。集市上，人们又愿意多停留一会儿了。',
  's2.line.p09': '年轻人接受守护训练，有了更好的装备，也有了更清楚的规矩。',
  's2.line.p10': '纪律第一。只在守护时用力，而且绝不多用一分。',
  's2.line.p11': '更快的道路，装备借出要登记，归还也要登记。',
  's2.line.p12': '三年了。看看我们建起的一切。正因如此，它必须被守护。',

  's2.line.r01a': '今晚路上很安静。',
  's2.line.r01b': '越安静，越要多看一眼。',
  's2.line.r02a': '救救我！他们要杀我！',
  's2.line.r02b': '在我们身后。趴低。',
  's2.line.r03a': '巡逻队一挡在陌生人和骑手之间，那些骑手便立刻掉头离去。',
  's2.line.r03b': '他在流血。马上去诊所。',
  's2.line.r04': '先给他治伤。等他能站起来，再问也不迟。',

  's2.line.g01a': '你们救了我的命。让我报答你们吧：一种用植物制成的康复药方。',
  's2.line.g01b': '我们会先检验它，也谢谢你。安心养伤吧。',
  's2.line.g02a': '两周后，这位客人请求参观整个村庄。',
  's2.line.g02b': '了不起。那么夜班是什么时候换岗？',
  's2.line.g03a': '运货的车走哪条路？水泵的控制装置放在哪里？',
  's2.line.g03b': '一个医者，只问门锁和时间表，却从不问医药。',
  's2.line.g04': '没有证据，不作指控。让卫兵守在近处，继续观察。',

  's2.line.n01': '第三天夜里，一盏提灯在敞开的窗口被举了起来。',
  's2.line.n02a': '把灯放下，托马斯。',
  's2.line.n02b': '你们来晚了。他们已经到了。',
  's2.line.n03': '袭击者到了温室！我们建起的一切都在里面。快去！',

  's2.line.c01': '清晨。水泵转动，水箱又开始呼吸了。',
  's2.line.c01f': '水产大厅几乎毫发无损。',
  's2.line.c01d': '大厅受损了，但每一套系统都能修好。',
  's2.line.c02': '先照顾伤者。庆祝可以等一等。',
  's2.line.c03': '庄稼依然活着，全村人一起收获。',
  's2.line.c03f': '作物渠道里满是绿色。',
  's2.line.c03d': '有些苗床毁了。储备的种子会把它们重新种满。',

  's2.line.j01a': '托马斯交出了真正的配方，连同他的笔记和来源。',
  's2.line.j01b': '有用的知识我们欢迎。但它买不来清白。',
  's2.line.docs': '诊所将这些材料封存隔离，直到能够独立检验。',
  's2.line.j02':
    '马雷克·韦恩和他的骑手们经过检查、登记，被移交给地区民防委员会，每一个人都有收押回执。',
  's2.line.j03': '黎明时分，托马斯带着食物、受过照料，被护送出山谷，永远不得返回。',
  's2.line.j04': '这个印章。我们见过它，在第一次袭击的装备上。',
  's2.line.seal': '同样的印章，同样的订单编号。有人在为这一切出钱。',
  's2.line.j05': '线索指向一座匆忙清空的废弃仓库。幕后资助者依然不明。',

  'music.stage2.1': '水成为未来',
  'music.stage2.2': '路边守望',
  'music.stage2.3': '玻璃与绿意',
  'music.stage2.4': '渠道警报',
  'music.stage2.5': '守护生命系统',
  'music.stage2.6': '镀金豺狼',
  'music.stage2.7': '我们守护的一切',

  'm22.settings.voice': '语音语言',
  'm22.voice.text': '与文字相同',
  'm22.voice.en': 'English',
  'm22.voice.zh-CN': '简体中文',
  'm22.voice.de': 'Deutsch',
  'm22.voice.off': '关闭（仅字幕）',
  'm22.settings.systemVoice': '旁白使用系统语音',
  'm22.settings.systemVoiceNote': '没有录制语音时，用电脑自带的语音朗读台词。这是原型辅助功能；字幕始终显示。',

  'm22.cap.aim': '[有人举起枪]',
  'm22.cap.shot': '[枪声]',
  'm22.cap.burst': '[连发枪声]',
  'm22.cap.engine': '[引擎轰鸣]',
  'm22.cap.crash': '[摩托车倒地]',

  'museum.picture.keyart-s2.name': '繁荣之围',
  'museum.picture.s2-p01.name': '水回来了',
  'museum.picture.s2-p05.name': '鱼菜共生循环',
  'museum.picture.s2-p12.name': '他们建起的未来',
  'museum.picture.s2-r02.name': '被追赶的陌生人',
  'museum.picture.s2-g03.name': '不合常理的问题',
  'museum.picture.s2-n03.name': '温室外的袭击者',
  'museum.picture.s2-brief-02.name': '夜色中的温室群',
  'museum.picture.portrait-tomas.name': '托马斯·雷尔',
  'museum.picture.portrait-marek.name': '马雷克·韦恩，镀金豺狼',
  'museum.picture.s2-c01f.name': '仍在呼吸的大厅',
  'museum.picture.s2-j04.name': '相同的印章',
  'museum.picture.s2-j05.name': '废弃的仓库',
  'museum.cinema.stage2.interlude.name': '繁荣间章',
  'museum.cinema.stage2.roadside.name': '路边骗局',
  'museum.cinema.stage2.guest.name': '受观察的客人',
  'museum.cinema.stage2.night.name': '夜间信号',
  'museum.cinema.stage2.recovery.name': '社区复原',
  'museum.cinema.stage2.coda.name': '正义与谜团',
};

export const M22_DE: Catalog = {
  'speaker.wind': 'Wind Sentinel',
  'speaker.fire': 'Fire Warden',
  'speaker.tomas': 'Tomas Rell',

  'm22.skipAll': 'Alle Kapitel überspringen',
  'm22.chapter.interlude': 'Zwischenspiel des Wohlstands',
  'm22.chapter.roadside': 'Täuschung am Straßenrand',
  'm22.chapter.guest': 'Ein Gast unter Beobachtung',
  'm22.chapter.night': 'Das nächtliche Signal',
  'm22.chapter.recovery': 'Die Gemeinschaft erholt sich',
  'm22.chapter.coda': 'Gerechtigkeit und Rätsel',

  's2.line.p01': 'Das Wasser kam ins Tal zurück. Diesmal, so versprachen wir, sollte es bleiben.',
  's2.line.p02':
    'Wir bauten einen Speicher, Stein für Stein, damit kein trockenes Jahr unsere Häuser je wieder leert.',
  's2.line.p03': 'Durch alle Jahreszeiten bauten wir Kanäle und Gewächshäuser und lernten dabei.',
  's2.line.p04': 'Gemüse wuchs in Wasser und Licht, Reihe um geduldige Reihe.',
  's2.line.p05':
    'Fische, Garnelen und Pflanzen lernten, einander zu ernähren: sauberes Wasser hinein, sauberes Wasser hinaus.',
  's2.line.p06':
    'Unsere Heilkundigen erforschten neben der Klinik die alten Heilpflanzen, sorgfältig und langsam.',
  's2.line.p07': 'Was die Ernte einbrachte, gaben wir der Schule zurück.',
  's2.line.p08': 'Neue Häuser, eine Klinik, ein Ratshaus. Ein Markt, auf dem man wieder verweilte.',
  's2.line.p09': 'Unsere Jugend lernte zu schützen, mit besserer Ausrüstung und klareren Regeln.',
  's2.line.p10': 'Disziplin zuerst. Gewalt nur, wenn sie schützt, und nie mehr als nötig.',
  's2.line.p11': 'Schnellere Wege, und Ausrüstung, die ausgetragen und wieder eingetragen wird.',
  's2.line.p12': 'Drei Jahre. Seht, was wir gebaut haben. Darum musste es beschützt werden.',

  's2.line.r01a': 'Ruhige Straße heute Nacht.',
  's2.line.r01b': 'Gerade wenn es ruhig ist, schauen wir zweimal hin.',
  's2.line.r02a': 'Helft mir! Sie bringen mich um!',
  's2.line.r02b': 'Hinter uns. Bleib unten.',
  's2.line.r03a':
    'Kaum stellt sich die Streife zwischen sie und den Fremden, drehen die Reiter ab.',
  's2.line.r03b': 'Er blutet. Sofort in die Klinik.',
  's2.line.r04': 'Zuerst behandeln. Fragen können warten, bis er wieder stehen kann.',

  's2.line.g01a':
    'Ihr habt mir das Leben gerettet. Lasst es mich vergelten: ein Heilmittel aus Pflanzen.',
  's2.line.g01b': 'Wir werden es prüfen, und wir danken dir. Ruh dich aus, bis du gesund bist.',
  's2.line.g02a': 'Zwei Wochen später bittet der Gast darum, das ganze Dorf zu sehen.',
  's2.line.g02b': 'Bemerkenswert. Und die Nachtschicht, wann wird sie abgelöst?',
  's2.line.g03a': 'Welchen Weg nehmen die Versorgungskarren? Wo sind die Pumpensteuerungen?',
  's2.line.g03b': 'Ein Heiler, der nach Schlössern und Zeitplänen fragt und nie nach Medizin.',
  's2.line.g04': 'Keine Anklage ohne Beweise. Die Wache bleibt in der Nähe. Wir beobachten weiter.',

  's2.line.n01': 'In der dritten Nacht wird an einem offenen Fenster eine Laterne gehoben.',
  's2.line.n02a': 'Stell die Laterne ab, Tomas.',
  's2.line.n02b': 'Ihr kommt zu spät. Sie sind schon da.',
  's2.line.n03': 'Plünderer an den Gewächshäusern! Alles, was wir gebaut haben, ist dort. Los!',

  's2.line.c01': 'Morgen. Die Pumpen drehen sich, und die Becken atmen wieder.',
  's2.line.c01f': 'Die Aquakulturhalle hat fast unversehrt überstanden.',
  's2.line.c01d': 'Die Halle ist beschädigt, aber jedes System lässt sich reparieren.',
  's2.line.c02': 'Zuerst werden die Verletzten versorgt. Das Fest kann warten.',
  's2.line.c03': 'Die Ernte lebt noch, und das Dorf bringt sie gemeinsam ein.',
  's2.line.c03f': 'Die Pflanzkanäle stehen voll und grün.',
  's2.line.c03d': 'Einige Beete sind verloren. Das Saatgut aus der Reserve wird sie neu bepflanzen.',

  's2.line.j01a': 'Tomas übergibt die echte Formel, mit seinen Notizen und ihrer Herkunft.',
  's2.line.j01b': 'Nützliches Wissen ist willkommen. Unschuld kann es nicht kaufen.',
  's2.line.docs':
    'Die Klinik stellt das Material unter Quarantäne, bis es unabhängig geprüft werden kann.',
  's2.line.j02':
    'Marek Vane und seine Reiter werden untersucht, erfasst und dem Regionalen Zivilschutzrat übergeben, mit einer Quittung für jeden Einzelnen.',
  's2.line.j03':
    'Im Morgengrauen wird Tomas mit Proviant und versorgt aus dem Tal geleitet. Er darf nie zurückkehren.',
  's2.line.j04': 'Dieses Siegel. Wir haben es schon gesehen, auf der Ausrüstung des ersten Überfalls.',
  's2.line.seal': 'Dasselbe Siegel, dieselben Bestellnummern. Jemand bezahlt für all das.',
  's2.line.j05':
    'Die Spur führt zu einem verlassenen Depot, in aller Eile geräumt. Der Geldgeber bleibt unbekannt.',

  'music.stage2.1': 'Wasser wurde Zukunft',
  'music.stage2.2': 'Wache am Straßenrand',
  'music.stage2.3': 'Glas und Grün',
  'music.stage2.4': 'Alarm in den Kanälen',
  'music.stage2.5': 'Schützt das lebende System',
  'music.stage2.6': 'Der Goldene Schakal',
  'music.stage2.7': 'Was wir beschützt haben',

  'm22.settings.voice': 'Sprachausgabe',
  'm22.voice.text': 'Wie Textsprache',
  'm22.voice.en': 'English',
  'm22.voice.zh-CN': '简体中文',
  'm22.voice.de': 'Deutsch',
  'm22.voice.off': 'Aus (nur Untertitel)',
  'm22.settings.systemVoice': 'Systemstimme für Erzählung',
  'm22.settings.systemVoiceNote':
    'Liest Zeilen mit der Stimme deines Computers vor, wenn keine Aufnahme vorhanden ist. Eine Prototyp-Hilfe; Untertitel bleiben immer an.',

  'm22.cap.aim': '[eine Schusswaffe wird gehoben]',
  'm22.cap.shot': '[Schuss]',
  'm22.cap.burst': '[Feuerstoß]',
  'm22.cap.engine': '[Motoren heulen auf]',
  'm22.cap.crash': '[ein Motorrad stürzt]',

  'museum.picture.keyart-s2.name': 'Wohlstand unter Belagerung',
  'museum.picture.s2-p01.name': 'Das Wasser kehrt zurück',
  'museum.picture.s2-p05.name': 'Der aquaponische Kreislauf',
  'museum.picture.s2-p12.name': 'Die Zukunft, die sie bauten',
  'museum.picture.s2-r02.name': 'Der verfolgte Fremde',
  'museum.picture.s2-g03.name': 'Fragen, die nicht passen',
  'museum.picture.s2-n03.name': 'Plünderer an den Gewächshäusern',
  'museum.picture.s2-brief-02.name': 'Der Gewächshauskomplex bei Nacht',
  'museum.picture.portrait-tomas.name': 'Tomas Rell',
  'museum.picture.portrait-marek.name': 'Marek Vane, der Goldene Schakal',
  'museum.picture.s2-c01f.name': 'Die Halle atmet noch',
  'museum.picture.s2-j04.name': 'Das passende Siegel',
  'museum.picture.s2-j05.name': 'Das verlassene Depot',
  'museum.cinema.stage2.interlude.name': 'Zwischenspiel des Wohlstands',
  'museum.cinema.stage2.roadside.name': 'Täuschung am Straßenrand',
  'museum.cinema.stage2.guest.name': 'Ein Gast unter Beobachtung',
  'museum.cinema.stage2.night.name': 'Das nächtliche Signal',
  'museum.cinema.stage2.recovery.name': 'Die Gemeinschaft erholt sich',
  'museum.cinema.stage2.coda.name': 'Gerechtigkeit und Rätsel',
};

import type { Catalog } from '@ffp/platform';

/**
 * M28 Stage 3 · Shadows over the Herb Mountain: every narration and dialogue line of the
 * three chapters (stable ids `s3.line.*`), the briefing, the results and epilogue cards,
 * the rescued people, the Museum folio and Sponsor Dossier page, the What's New cards, the
 * Coming-soon outfits and the Mist and Resolve cue titles. The achievement, encounter,
 * area, outfit, folio, artifact and phase names are the agreed Stage 3 names (spec §22.3,
 * §22.4, §22.5) in all three languages. The English stage, beat, arena, corridor, Store,
 * achievement and Academy names come from the data files; ZH and DE add them here.
 * Fictional and non-actionable research text only (spec §4.1).
 */
export const M28_EN = {
  'speaker.garran': 'Garran Voss',
  'speaker.renxia': 'Ren Xia',
  'speaker.luofen': 'Luo Fen',
  'speaker.mountain': 'Mountain Guardian',
  'speaker.river': 'River Scout',

  'm22.chapter.silvermist': 'Silvermist',
  'm22.chapter.prepared-route': 'The Prepared Route',
  'm22.chapter.paths': 'Paths through the Mist',

  // Chapter 1 · Silvermist.
  's3.line.h01a':
    'Months of careful work turned the old formula into a research candidate: promising in laboratory mice, unproven in people.',
  's3.line.h01b':
    'It depends on one mountain plant, the Silvervein Moonbell. We take only what is documented, and only with Qinglan’s consent.',
  's3.line.h02a':
    'High in the Silvermist Highlands, the people of Qinglan look after the Moonbell beds.',
  's3.line.h02b':
    'The mountain is not ours. Qinglan are partners in this research, and every sample carries their name.',
  's3.line.h03a': 'An experienced team set out to gather a small, documented sample at the ledge.',
  's3.line.h03b': 'In the mist, riders were waiting.',
  's3.line.h04a':
    'They took Gao Wen, Tao Min, An Bo and Ren Xia. They want the research, and they want it paid for.',
  's3.line.h04b': 'No ransom will rule this village. We bring every one of them home.',
  's3.line.h05':
    'Ride carefully. Free the captives first, protect the beds, and find out who taught these bandits to plan.',

  // Chapter 2 · The Prepared Route (inside the stage).
  's3.line.t01a':
    'Keep the liaison apart from the others. She is the one who can vouch for the records.',
  's3.line.t01b': 'That voice on the radio … it is Tomas.',
  's3.line.t02a': 'Sign it, Ren. Tell them the results are certain, and this ends tonight.',
  's3.line.t02b': 'I will not sign a claim the work does not support.',
  's3.line.t03':
    'A signal flare, a cart through the quarry passage, a horse waiting below. Tomas prepared his way out long before.',

  // Chapter 3 · Paths through the Mist.
  's3.line.e01a': 'You fight like people with something to lose. Fine. I am done.',
  's3.line.e01b': 'Bind his arms, carefully. The clinic sees him first.',
  's3.line.e02a': 'He kept a case of his own, locked and hidden from his own men.',
  's3.line.e02b': 'Inside, a damaged invoice: Garran’s insurance against the man who hired him.',
  's3.line.invoice':
    'The batch reference is half burned away, but the numbers that remain are familiar.',
  's3.line.e03': 'At Qinglan, families wait at the edge of the mist.',
  's3.line.e03secure': 'Everyone comes home on their own feet.',
  's3.line.e03critical':
    'Some come home on stretchers. The clinic team stays beside them, and every one of them recovers.',
  's3.line.e04a': 'The same batch as the brass gears, and the same route as the weapon crate.',
  's3.line.e04b': 'Not the same hand. Someone pays the people who pay the bandits.',
  's3.line.e05a': 'Far below the mountain, Tomas reaches a lowland shelter.',
  's3.line.e05b': 'Find me the broker. I still have records worth selling.',
  's3.line.e06':
    'The paths through the mist are open again. We walk them together, and we keep looking.',

  // Briefing (the elder).
  'm28.brief.1':
    'Four of our people are held on the mountain: Gao Wen, Tao Min, An Bo and Ren Xia.',
  'm28.brief.2':
    'The bandits ride the switchbacks. The mountain horses know the trail: keep them steady.',
  'm28.brief.3':
    'Near a captive, a bandit may start something cruel. Interrupt it. Every one of them comes home.',
  'm28.brief.4':
    'At Moonbell Basin, keep the documented samples safe and seal the record case before you move on.',
  'm28.brief.5': 'Their chief is Garran Voss, on the High Winch Terrace. Bring him in alive.',
  'm28.brief.objective':
    'Rescue the four captives, protect the research record and capture Garran Voss alive.',

  // In play and results.
  'm28.rescued': 'Rescued: on the way to shelter',
  'm28.resultsTitle': 'Stage 3 complete · Shadows over the Herb Mountain',
  'm28.sponsorHook':
    'The damaged invoice names a paid route over the mountain: whoever paid for it is still out of sight.',
  'm28.grade.rescue': 'Rescue (captives freed)',
  'm28.grade.record': 'Research record',
  'm28.grade.capture': 'Capture (Garran Voss)',
  'm28.grade.combat': 'Combat',
  'm28.grade.branches': 'Side paths',
  'm28.hold.1': 'Hold {action:Interact} to free them',
  'm28.hold.2': 'Hold {action:Interact} to collect the record',
  'm28.hold.3': 'Hold {action:Interact} to seal the record',
  'm28.hold.4': 'Hold {action:Interact} to recover the record',
  'm28.recordLine': 'Research record: {state}',
  'm28.horsesLine': 'Horse Stability breaks: {n}',
  'm28.capture.1': 'Garran Voss: Resolve surrender',
  'm28.capture.2': 'Garran Voss: forced capture',
  'm28.hook.0': 'Hookstaff never taken',
  'm28.hook.1': 'Hookstaff disarmed',
  'm28.hook.2': 'Hookstaff broken',
  'm28.hook.3': 'Hookstaff knocked away',
  'm28.redirects': 'winch redirects {n}',
  'm28.rescuesTitle': 'Rescue condition',
  'm28.branchRescue': 'optional branch',
  'm28.goal.rescue': 'Free the captive: hold {action:Interact} beside them',
  'm28.goal.redirect': 'Redirect the winch cargo into Garran',

  // Store, Academy, Museum.
  'm28.comingSoon': 'Coming soon',
  'm28.soonNote': 'A preview: this outfit arrives in a later update. No price yet.',
  'm28.defaultEvolution':
    'In Stage 3 every hero wears the free default evolution: trail boots, a light weather layer, a chest radio and a first-aid pouch.',
  'm28.whatsNewDetail': 'The Stage 3 briefing cards, any time.',
  'm28.folioComplete': 'Complete edition: both branches walked.',
  'm28.folioPartial': 'First edition: walk both branches for the complete folio.',
  'm28.dossierOpen': 'Open the page',
  'm28.achievementEarned': 'Achievement earned: {name}',

  'm21.whatsNew.horses.title': 'Mountain horses',
  'm21.whatsNew.horses.text':
    'On the switchbacks you ride a mountain horse with your own mounted moves. Keep it steady: a Stability break throws you off, and a fresh horse waits at the next safe point.',
  'm21.whatsNew.rescues.title': 'Rescue condition',
  'm21.whatsNew.rescues.text':
    'Bandits near a captive start hostile actions you can see coming. Interrupt them with any hit, grab or redirect. Each group ends Secure, Strained or Critical, and nobody is ever lost.',
  'm21.whatsNew.record.title': 'The research record',
  'm21.whatsNew.record.text':
    'At Moonbell Basin, collect the sample case and hold Interact to seal it. A disturbed case can be recovered. Documented, Recovered or Disturbed changes the grade, never the story.',
  'm21.whatsNew.highland-weapons.title': 'Highland weapons and food',
  'm21.whatsNew.highland-weapons.text':
    'Hiking staffs, wood axes and quarry hammers lie along the route; a revolver has only a few rounds. Trail rice, warm broth, seed cakes and the rare camp meal restore health.',
  'm21.whatsNew.bandits.title': 'Highland bandits',
  'm21.whatsNew.bandits.text':
    'Ambushers, quarry bruisers, rope trappers and mounted raiders. A rope trapper can bind a hero, and a partner frees them faster. Ridge Stalkers and Pack Captains join on higher difficulties.',
  'm21.whatsNew.garran.title': 'Garran Voss',
  'm21.whatsNew.garran.text':
    'The bandit chief fights with a quarry hookstaff, then clinches and throws, then works the terrace winch. Disarm him, break his Resolve and turn the winch cargo against him to capture him alive.',

  'm25.unit.gao-wen': 'Gao Wen',
  'm25.unit.tao-min': 'Tao Min',
  'm25.unit.an-bo': 'An Bo',
  'm25.unit.ren-xia': 'Ren Xia',
  'm25.unit.wei-shan': 'Wei Shan',
  'm25.case.sample-case': 'Research record case',

  'music.stage3.1': 'Silver Veins in Morning Mist',
  'music.stage3.2': 'The Empty Gathering Trail',
  'music.stage3.3': 'Hooves above the Ravine',
  'music.stage3.4': 'Quarry of Echoes',
  'music.stage3.5': 'Captives in the High Camp',
  'music.stage3.6': 'Chief of the Broken Ridge',
  'music.stage3.7': 'Paths through the Mist',
  'music.stage3.9': 'Highland Bed',

  'museum.picture.keyart-s3.name': 'Shadows over the Herb Mountain',
  'museum.picture.s3-h02.name': 'The Qinglan Partnership',
  'museum.picture.s3-h03.name': 'Gathering at the Ledge',
  'museum.picture.s3-h05.name': 'Departure at Dawn',
  'museum.picture.s3-brief-01.name': 'The Expedition Map',
  'museum.picture.s3-t02.name': 'The Planning Cabin',
  'museum.picture.s3-e03.name': 'Reunion at Qinglan',
  'museum.picture.s3-e06.name': 'Paths through the Mist',
  'museum.picture.portrait-garran.name': 'Garran Voss, Chief of the Broken Ridge',
  'museum.cinema.stage3.silvermist.name': 'Stage 3 opening: Silvermist',
  'museum.cinema.stage3.silvermist.desc':
    'The research, the partnership with Qinglan, the ambush at the ledge and the ransom demand.',
  'museum.cinema.stage3.prepared-route.name': 'Stage 3: The Prepared Route',
  'museum.cinema.stage3.prepared-route.desc':
    'Tomas on the open radio, in the planning cabin and on his way out of the quarry.',
  'museum.cinema.stage3.paths.name': 'Stage 3 ending: Paths through the Mist',
  'museum.cinema.stage3.paths.desc':
    'Garran captured, the private case, the reunion at Qinglan and Tomas in the lowlands.',
  'museum.collection.silvermist-ecology-folio.name': 'Silvermist Ecology Folio',
  'museum.collection.silvermist-ecology-folio.desc':
    'An illustrated record of the Silvermist Highlands: the Moonbell beds, their neighbours and how Qinglan watches over them. For looking, not for gathering.',
  'museum.collection.qinglan-rescue-bell.name': 'Qinglan Rescue Bell',
  'museum.collection.qinglan-rescue-bell.desc':
    'The bell beside the repaired Signal Hut. When the radio falls silent, it still carries across the valley.',
  'museum.collection.gao-wen-trail-ledger.name': 'Gao Wen’s Trail Ledger',
  'museum.collection.gao-wen-trail-ledger.desc':
    'Decades of trail notes: which paths wash out, where the beds recover and when to leave the mountain alone.',
  'museum.collection.broken-hookstaff.name': 'The Broken Hookstaff',
  'museum.collection.broken-hookstaff.desc':
    'Garran’s quarry hookstaff, broken on the High Winch Terrace: a work tool he turned into a weapon.',

  'dossier.page.damaged-invoice.name': 'The Damaged Invoice',
  'dossier.page.damaged-invoice':
    'A supplier’s invoice, half burned, kept by Garran in a locked case as leverage against Tomas. Its batch reference matches the brass gears from the sluice gate and the crate from the greenhouse depot. The buyer’s name is torn away.',
  'dossier.fact.invoice-batch':
    'The invoice’s batch reference matches the brass gears and the sealed weapon crate.',
  'dossier.fact.prepared-route':
    'Tomas prepared his escape through the quarry long before the raid: a signal, a cart and a waiting horse.',
  'dossier.theory.paid-route':
    'One procurement route supplied all three attacks, and someone above the middleman pays for it.',
  'research.input.field-samples':
    'The documented Moonbell field samples from the basin, gathered with Qinglan’s consent.',
  'research.input.trail-ledger':
    'Gao Wen’s trail ledger: decades of habitat observations for the independent replication.',

  // Epilogue cards (stage3.yaml `epilogue`).
  'epilogue.stage3.capture.resolve':
    'His Resolve broken, Garran Voss sets down his last weapon and lets the heroes bind his arms.',
  'epilogue.stage3.capture.forced':
    'Garran Voss makes one last lunge. The heroes stop him safely, disarm him and restrain him.',
  'epilogue.stage3.rescue.gao-wen.secure': 'Gao Wen walks back to Qinglan beside the others.',
  'epilogue.stage3.rescue.gao-wen.strained':
    'Gao Wen is shaken and bruised, and rests at the clinic before he walks the trails again.',
  'epilogue.stage3.rescue.gao-wen.critical':
    'Gao Wen is carried down on a stretcher. Weeks later he is back on the trail, slower and stubborn.',
  'epilogue.stage3.rescue.tao-min.secure': 'Tao Min is already writing down everything she saw.',
  'epilogue.stage3.rescue.tao-min.strained':
    'Tao Min needs a few quiet days, then asks to join the next survey.',
  'epilogue.stage3.rescue.tao-min.critical':
    'Tao Min is treated at the clinic for a long week. She recovers, and keeps her notebook close.',
  'epilogue.stage3.rescue.an-bo.secure': 'An Bo leads the recovered horses home himself.',
  'epilogue.stage3.rescue.an-bo.strained':
    'An Bo rides home sore and quiet, but the horses follow his voice.',
  'epilogue.stage3.rescue.an-bo.critical':
    'An Bo is carried down the ridge. The horses wait at the clinic gate until he can stand.',
  'epilogue.stage3.rescue.ren-xia.secure':
    'Ren Xia hands over the provenance records, every seal unbroken.',
  'epilogue.stage3.rescue.ren-xia.strained':
    'Ren Xia is exhausted, but she did not sign. The records stay honest.',
  'epilogue.stage3.rescue.ren-xia.critical':
    'Ren Xia needs long care at the clinic. She recovers, and the records she protected stay honest.',
  'epilogue.stage3.record.documented':
    'The research record is complete: every sample documented and sealed.',
  'epilogue.stage3.record.recovered':
    'The research record was disturbed, but recovered and sealed again.',
  'epilogue.stage3.record.disturbed':
    'The research record is incomplete. Enough documented material remains, and Qinglan will help fill the gaps.',
  'epilogue.stage3.record.missing':
    'The research record case was never collected. The documented samples from the main route are enough to continue.',
  'epilogue.stage3.branch.signal-hut':
    'The Signal Hut works again: Qinglan can reach the village, the clinic and every patrol.',
  'epilogue.stage3.branch.herbalist-shelter':
    'The gathering equipment is back at Qinglan, with Gao Wen’s trail ledger among it.',
  'epilogue.stage3.invoice':
    'In Garran’s private case: a damaged invoice whose batch reference leads back to the same procurement route.',
  'epilogue.stage3.lowland':
    'Tomas Rell escaped by his prepared route. Somewhere in the lowlands, he is making a call.',
} as const;

export const M28_ZH: Catalog = {
  'speaker.garran': '加兰·沃斯',
  'speaker.renxia': '任霞',
  'speaker.luofen': '罗芬',
  'speaker.mountain': '山神',
  'speaker.river': '河神',

  'm22.chapter.silvermist': '银雾',
  'm22.chapter.prepared-route': '预备的退路',
  'm22.chapter.paths': '雾中之径',

  's3.line.h01a':
    '数月的细致工作，让旧配方成为一项研究候选：在实验鼠身上前景可观，在人身上尚未证实。',
  's3.line.h01b':
    '它离不开一种山中植物：银脉月铃草。我们只取有记录的样本，而且必须得到青岚的同意。',
  's3.line.h02a': '在银雾高地深处，青岚村的人守护着月铃草的苗床。',
  's3.line.h02b': '这座山不属于我们。青岚是这项研究的伙伴，每一份样本都写着他们的名字。',
  's3.line.h03a': '一支经验丰富的队伍出发，前往山崖采集少量有记录的样本。',
  's3.line.h03b': '雾中，骑手早已埋伏。',
  's3.line.h04a': '他们抓走了高文、陶敏、安博和任霞。他们要研究成果，还要我们出钱赎人。',
  's3.line.h04b': '赎金休想左右这个村子。我们要把每一个人都带回家。',
  's3.line.h05': '骑行要小心。先救人质，护住苗床，再查清是谁教这些山匪如此周密。',

  's3.line.t01a': '把那个联络员和其他人分开关。只有她能为那些记录作证。',
  's3.line.t01b': '无线电里那个声音……是托马斯。',
  's3.line.t02a': '签了吧，任霞。告诉他们结果板上钉钉，今晚就能了结。',
  's3.line.t02b': '研究不支持的说法，我不会签。',
  's3.line.t03': '一枚信号弹，一辆穿过石场通道的矿车，一匹在山下等候的马。托马斯早就备好了退路。',

  's3.line.e01a': '你们打起来像是有东西要守。好吧，我认了。',
  's3.line.e01b': '绑住他的手臂，小心点。先让诊所看看他。',
  's3.line.e02a': '他自己藏着一只箱子，上了锁，连手下都瞒着。',
  's3.line.e02b': '箱子里是一张残破的发票：加兰用来牵制雇主的筹码。',
  's3.line.invoice': '批次编号烧掉了一半，剩下的数字却似曾相识。',
  's3.line.e03': '在青岚，家人们守在雾的边缘等候。',
  's3.line.e03secure': '每个人都自己走回了家。',
  's3.line.e03critical': '有些人是被担架抬回来的。诊所团队一直守在身旁，每个人都康复了。',
  's3.line.e04a': '和黄铜齿轮是同一批次，和武器箱是同一条路线。',
  's3.line.e04b': '却不是同一只手。有人在给那些付钱给山匪的人付钱。',
  's3.line.e05a': '在远离山区的低地，托马斯来到一处避难所。',
  's3.line.e05b': '给我找那个掮客。我手里还有值钱的记录。',
  's3.line.e06': '雾中的小路重新开放。我们一起走下去，也会继续追查。',

  'm28.brief.1': '我们有四个人被扣在山上：高文、陶敏、安博和任霞。',
  'm28.brief.2': '山匪骑马在盘山道上来去。山马熟悉山路，让它们保持稳定。',
  'm28.brief.3': '在人质身边，山匪可能会动手施暴。打断他们。每个人都要平安回家。',
  'm28.brief.4': '到了月铃谷，护好有记录的样本，离开前把记录箱封好。',
  'm28.brief.5': '他们的头目叫加兰·沃斯，在高索台。活捉他。',
  'm28.brief.objective': '救出四名人质，保护研究记录，活捉加兰·沃斯。',

  'm28.rescued': '已救出：正前往避难处',
  'm28.resultsTitle': '第三章完成 · 药山阴影',
  'm28.sponsorHook': '残损的发票指向一条付钱买下的山路：出钱的人仍在暗处。',
  'm28.grade.rescue': '救援（解救的被困者）',
  'm28.grade.record': '研究记录',
  'm28.grade.capture': '擒获（加兰·沃斯）',
  'm28.grade.combat': '战斗',
  'm28.grade.branches': '支线',
  'm28.hold.1': '长按 {action:Interact} 解救',
  'm28.hold.2': '长按 {action:Interact} 收集记录',
  'm28.hold.3': '长按 {action:Interact} 封存记录',
  'm28.hold.4': '长按 {action:Interact} 寻回记录',
  'm28.recordLine': '研究记录：{state}',
  'm28.horsesLine': '马匹稳定度崩溃：{n}',
  'm28.capture.1': '加兰·沃斯：意志崩溃投降',
  'm28.capture.2': '加兰·沃斯：强制擒获',
  'm28.hook.0': '钩杖始终未被夺下',
  'm28.hook.1': '钩杖被缴下',
  'm28.hook.2': '钩杖被折断',
  'm28.hook.3': '钩杖被打飞',
  'm28.redirects': '绞盘反制 {n} 次',
  'm28.rescuesTitle': '救援状况',
  'm28.branchRescue': '可选支线',
  'm28.goal.rescue': '解救人质：在其身旁按住 {action:Interact}',
  'm28.goal.redirect': '让绞盘货物撞向加兰',

  'm28.comingSoon': '即将推出',
  'm28.soonNote': '预览：这套服装将在后续更新中推出，暂无价格。',
  'm28.defaultEvolution':
    '第三章中，每位英雄都换上免费的默认新装：登山靴、轻便防风层、胸前无线电和急救包。',
  'm28.whatsNewDetail': '随时查看第三章简报卡片。',
  'm28.folioComplete': '完整版：两条支线皆已走过。',
  'm28.folioPartial': '初版：走完两条支线即可获得完整图册。',
  'm28.dossierOpen': '翻开这一页',
  'm28.achievementEarned': '获得成就：{name}',

  'm21.whatsNew.horses.title': '山马',
  'm21.whatsNew.horses.text':
    '在盘山道上，你骑着山马，使用自己的骑乘招式。保持稳定：稳定度崩溃会让你落马，下一个安全点会有新马等候。',
  'm21.whatsNew.rescues.title': '救援状况',
  'm21.whatsNew.rescues.text':
    '人质附近的山匪会发起看得见的敌对行动。用任何攻击、擒拿或反制打断他们。每组人质最终为安稳、吃力或危急，没有人会丢失。',
  'm21.whatsNew.record.title': '研究记录',
  'm21.whatsNew.record.text':
    '在月铃谷收起样本箱，按住互动键将其封存。受扰的箱子可以寻回。已记录、已寻回或受扰只影响评级，不改变故事。',
  'm21.whatsNew.highland-weapons.title': '高地武器与食物',
  'm21.whatsNew.highland-weapons.text':
    '沿途可以拾到登山杖、伐木斧和采石锤；左轮手枪只有几发子弹。山路饭团、热汤、籽饼和稀有的营地餐可以恢复生命。',
  'm21.whatsNew.bandits.title': '高地山匪',
  'm21.whatsNew.bandits.text':
    '伏击者、石场打手、绳索陷阱手和骑马劫掠者。绳索陷阱手能捆住英雄，同伴可以更快解救。更高难度下还有山脊潜行者和头领。',
  'm21.whatsNew.garran.title': '加兰·沃斯',
  'm21.whatsNew.garran.text':
    '山匪首领先用石场钩杖作战，再缠抱摔投，最后操纵台上的绞盘。缴下他的武器，击溃他的意志，让绞盘货物反过来对付他，活捉他。',

  'm25.unit.gao-wen': '高文',
  'm25.unit.tao-min': '陶敏',
  'm25.unit.an-bo': '安博',
  'm25.unit.ren-xia': '任霞',
  'm25.unit.wei-shan': '魏珊',
  'm25.case.sample-case': '研究记录箱',

  'music.stage3.1': '晨雾中的银脉',
  'music.stage3.2': '空荡的采集小路',
  'music.stage3.3': '峡谷上的马蹄',
  'music.stage3.4': '回声石场',
  'music.stage3.5': '高营中的人质',
  'music.stage3.6': '断脊之首',
  'music.stage3.7': '雾中之径',
  'music.stage3.9': '高地底乐',

  'museum.picture.keyart-s3.name': '药山阴影',
  'museum.picture.s3-h02.name': '与青岚的合作',
  'museum.picture.s3-h03.name': '山崖采集',
  'museum.picture.s3-h05.name': '黎明出发',
  'museum.picture.s3-brief-01.name': '考察地图',
  'museum.picture.s3-t02.name': '策划小屋',
  'museum.picture.s3-e03.name': '青岚重聚',
  'museum.picture.s3-e06.name': '雾中之径',
  'museum.picture.portrait-garran.name': '加兰·沃斯，断脊之首',
  'museum.cinema.stage3.silvermist.name': '第三章开场：银雾',
  'museum.cinema.stage3.silvermist.desc': '研究、与青岚的合作、山崖伏击和赎金要求。',
  'museum.cinema.stage3.prepared-route.name': '第三章：预备的退路',
  'museum.cinema.stage3.prepared-route.desc':
    '托马斯在公开频道里、在策划小屋中，以及离开石场的路上。',
  'museum.cinema.stage3.paths.name': '第三章结局：雾中之径',
  'museum.cinema.stage3.paths.desc': '加兰被擒、私人箱子、青岚重聚，以及低地的托马斯。',
  'museum.collection.silvermist-ecology-folio.name': '银雾生态图册',
  'museum.collection.silvermist-ecology-folio.desc':
    '银雾高地的图文记录：月铃草苗床、与它们共生的动植物，以及青岚如何守护它们。只供观赏，不作采集指南。',
  'museum.collection.qinglan-rescue-bell.name': '青岚救援钟',
  'museum.collection.qinglan-rescue-bell.desc':
    '修复后的信号小屋旁的铜钟。无线电沉默时，钟声依然传遍山谷。',
  'museum.collection.gao-wen-trail-ledger.name': '高文的山径记录簿',
  'museum.collection.gao-wen-trail-ledger.desc':
    '几十年的山径笔记：哪些路会被冲毁，苗床在哪里恢复，何时该让大山休息。',
  'museum.collection.broken-hookstaff.name': '断裂的钩杖',
  'museum.collection.broken-hookstaff.desc':
    '加兰的石场钩杖，在高索台上折断：一件被他变成武器的工具。',

  'dossier.page.damaged-invoice.name': '残破的发票',
  'dossier.page.damaged-invoice':
    '一张烧掉一半的供货发票，被加兰锁在箱子里，用来牵制托马斯。批次编号与水闸的黄铜齿轮和温室仓库的箱子一致。买方的名字被撕掉了。',
  'dossier.fact.invoice-batch': '发票的批次编号与黄铜齿轮和密封武器箱一致。',
  'dossier.fact.prepared-route':
    '托马斯早在袭击前就备好了穿过石场的退路：一枚信号、一辆矿车和一匹等候的马。',
  'dossier.theory.paid-route': '三次袭击都由同一条采购路线供货，中间人之上还有人在出钱。',
  'research.input.field-samples': '月铃谷有记录的月铃草野外样本，经青岚同意采集。',
  'research.input.trail-ledger': '高文的山径记录簿：几十年的栖息地观察，供独立重复研究使用。',

  'epilogue.stage3.capture.resolve': '意志崩溃的加兰·沃斯放下最后的武器，任英雄们绑住他的手臂。',
  'epilogue.stage3.capture.forced': '加兰·沃斯最后一次扑来。英雄们安全地拦下他，缴械并将他制服。',
  'epilogue.stage3.rescue.gao-wen.secure': '高文和大家一起走回了青岚。',
  'epilogue.stage3.rescue.gao-wen.strained': '高文受了惊吓和擦伤，在诊所休养后才重新上山。',
  'epilogue.stage3.rescue.gao-wen.critical':
    '高文被担架抬下山。几周后，他又回到山路上，步子慢了，脾气还是那么倔。',
  'epilogue.stage3.rescue.tao-min.secure': '陶敏已经在记录她看到的一切。',
  'epilogue.stage3.rescue.tao-min.strained': '陶敏需要安静几天，随后就申请参加下一次考察。',
  'epilogue.stage3.rescue.tao-min.critical':
    '陶敏在诊所治疗了漫长的一周。她康复了，笔记本始终不离身。',
  'epilogue.stage3.rescue.an-bo.secure': '安博亲自把找回的马匹牵回家。',
  'epilogue.stage3.rescue.an-bo.strained': '安博浑身酸痛、一路无言，但马儿们都跟着他的声音走。',
  'epilogue.stage3.rescue.an-bo.critical':
    '安博被抬下山脊。马儿们一直等在诊所门口，直到他能站起来。',
  'epilogue.stage3.rescue.ren-xia.secure': '任霞交出了来源记录，每一道封签都完好无损。',
  'epilogue.stage3.rescue.ren-xia.strained': '任霞筋疲力尽，但她没有签字。记录依然真实。',
  'epilogue.stage3.rescue.ren-xia.critical':
    '任霞需要在诊所长期休养。她康复了，她守护的记录依然真实。',
  'epilogue.stage3.record.documented': '研究记录完整：每份样本都已记录并封存。',
  'epilogue.stage3.record.recovered': '研究记录曾受扰，但已寻回并重新封存。',
  'epilogue.stage3.record.disturbed': '研究记录不完整。剩下的有记录材料已经足够，青岚会帮忙补齐。',
  'epilogue.stage3.record.missing': '研究记录箱没有被收回。主路上的有记录样本足以让研究继续。',
  'epilogue.stage3.branch.signal-hut': '信号小屋重新运转：青岚可以联系村子、诊所和每一支巡逻队。',
  'epilogue.stage3.branch.herbalist-shelter': '采集装备回到了青岚，高文的山径记录簿也在其中。',
  'epilogue.stage3.invoice': '加兰的私人箱子里有一张残破的发票，批次编号指向同一条采购路线。',
  'epilogue.stage3.lowland': '托马斯·雷尔沿着预备的退路逃走了。在低地的某处，他正在打一通电话。',

  // Data names (spec §22.3, §22.4, §22.5).
  'arena.s3-hoofprints.name': '泥中蹄印',
  'arena.s3-rope-trail.name': '横道绳索',
  'arena.s3-drying-racks.name': '空空晒架',
  'arena.s3-signal-hut.name': '沉默的天线',
  'arena.s3-watch-path.name': '守望小径',
  'arena.s3-mist-beds.name': '苗床雾起',
  'arena.s3-two-voices.name': '雾中两声',
  'arena.s3-loose-scaffold.name': '松动的脚手架',
  'arena.s3-herbalist-shelter.name': '遗落的竹篮',
  'arena.s3-hammer-line.name': '铁锤阵',
  'arena.s3-cart-rails.name': '矿车轨道',
  'arena.s3-outer-fence.name': '外围栅栏',
  'arena.s3-lantern-row.name': '灯笼排',
  'arena.s3-ren-enclosure.name': '任霞的围栏',
  'arena.s3-terrace.name': '断脊之首',
  'stage.stage3.beat.switchback-ride.name': '盘山下道',
  'stage.stage3.beat.switchback-ride.objective': '沿着山匪的踪迹骑上盘山道',
  'stage.stage3.beat.hoofprints.name': '泥中蹄印',
  'stage.stage3.beat.hoofprints.objective': '击退伏击者，辨认踪迹',
  'stage.stage3.beat.hoofprints.clue':
    '一只掉落的采集篮和新鲜的马蹄印：人质被押上盘山道，往石场路去了。',
  'stage.stage3.beat.rope-trail.name': '横道绳索',
  'stage.stage3.beat.rope-trail.objective': '清除横在路上的绳索陷阱',
  'stage.stage3.beat.drying-racks.name': '空空晒架',
  'stage.stage3.beat.drying-racks.objective': '把山匪赶离村里的晒架',
  'stage.stage3.beat.signal-hut.name': '沉默的天线',
  'stage.stage3.beat.signal-hut.objective': '在信号小屋救出魏珊，修好无线电',
  'stage.stage3.beat.signal-hut.clue': '无线电重新工作了：青岚可以联系村子和诊所。',
  'stage.stage3.branch.signal-hut': '信号小屋',
  'stage.stage3.branch.signal-hut.artifact': '青岚救援钟',
  'stage.stage3.beat.watch-path.name': '守望小径',
  'stage.stage3.beat.watch-path.objective': '沿守望小径前往月铃谷',
  'stage.stage3.beat.mist-beds.name': '苗床雾起',
  'stage.stage3.beat.mist-beds.objective': '保护月铃草苗床，护住有记录的样本',
  'stage.stage3.beat.two-voices.name': '雾中两声',
  'stage.stage3.beat.two-voices.objective': '救出高文和陶敏',
  'stage.stage3.beat.loose-scaffold.name': '松动的脚手架',
  'stage.stage3.beat.loose-scaffold.objective': '从松动的脚手架下穿过石场',
  'stage.stage3.beat.herbalist-shelter.name': '遗落的竹篮',
  'stage.stage3.beat.herbalist-shelter.objective': '从草药师草庐找回采集装备',
  'stage.stage3.beat.herbalist-shelter.clue':
    '考察队的竹篮、标签和野外笔记本被遗落在草庐里：高文的山径记录簿也在其中。',
  'stage.stage3.branch.herbalist-shelter': '草药师草庐',
  'stage.stage3.branch.herbalist-shelter.artifact': '高文的山径记录簿',
  'stage.stage3.beat.hammer-line.name': '铁锤阵',
  'stage.stage3.beat.hammer-line.objective': '突破铁锤阵',
  'stage.stage3.beat.cart-rails.name': '矿车轨道',
  'stage.stage3.beat.cart-rails.objective': '在矿车轨道救出安博',
  'stage.stage3.beat.ridge-ride.name': '山脊路',
  'stage.stage3.beat.ridge-ride.objective': '沿山脊路骑往断脊营地',
  'stage.stage3.beat.outer-fence.name': '外围栅栏',
  'stage.stage3.beat.outer-fence.objective': '突破营地的外围栅栏',
  'stage.stage3.beat.lantern-row.name': '灯笼排',
  'stage.stage3.beat.lantern-row.objective': '肃清灯笼排',
  'stage.stage3.beat.ren-enclosure.name': '任霞的围栏',
  'stage.stage3.beat.ren-enclosure.objective': '救出任霞',
  'stage.stage3.beat.terrace.name': '高索台',
  'stage.stage3.beat.terrace.objective': '活捉加兰·沃斯',
  'stage.stage3.beat.terrace.evidence':
    '加兰的私人箱子：一张他留着用来牵制托马斯的残破发票。批次编号与黄铜齿轮和武器箱背后的采购路线一致。',
  'corridor.s3-switchback-ride.name': '盘山下道',
  'corridor.s3-switchback-ride.goal': '沿着山匪的踪迹骑上盘山道',
  'corridor.s3-ridge-pursuit.name': '山脊路',
  'corridor.s3-ridge-pursuit.goal': '沿山脊路骑往山匪营地',
  'store.wardrobe.mountain.mountain-rescue.name': '山地救援服',
  'store.wardrobe.mountain.highland-festival.name': '高地采集节盛装',
  'store.wardrobe.river.mountain-rescue.name': '山地救援服',
  'store.wardrobe.river.highland-festival.name': '高地采集节盛装',
  'store.wardrobe.wind.mountain-rescue.name': '山地救援服',
  'store.wardrobe.wind.highland-festival.name': '高地采集节盛装',
  'store.wardrobe.fire.mountain-rescue.name': '山地救援服',
  'store.wardrobe.fire.highland-festival.name': '高地采集节盛装',
  'ach.stage3.mist-lifts.name': '雾散山明',
  'ach.stage3.every-voice-home.name': '人人平安归',
  'ach.stage3.signal-restored.name': '信号重连',
  'ach.stage3.shelter-remembered.name': '草庐忆旧',
  'ach.stage3.both-paths-walked.name': '双径皆行',
  'ach.stage3.steady-on-the-switchback.name': '盘山稳骑',
  'ach.stage3.hook-unhooked.name': '卸钩',
  'ach.stage3.paper-trail.name': '纸上踪迹',
  'academy.stage3.name': '第三章学堂',
  'academy.stage3.mounted.name': '盘山道上的山马',
  'academy.stage3.rescue.name': '在压力下解救人质',
  'academy.stage3.stalker.name': '新角色：山脊潜行者',
  'academy.stage3.hookstaff.name': '夺下钩杖',
  'academy.stage3.winch.name': '让绞盘反制他',
};

export const M28_DE: Catalog = {
  'speaker.garran': 'Garran Voss',
  'speaker.renxia': 'Ren Xia',
  'speaker.luofen': 'Luo Fen',
  'speaker.mountain': 'Mountain Guardian',
  'speaker.river': 'River Scout',

  'm22.chapter.silvermist': 'Silbernebel',
  'm22.chapter.prepared-route': 'Der vorbereitete Weg',
  'm22.chapter.paths': 'Wege durch den Nebel',

  's3.line.h01a':
    'Monate sorgfältiger Arbeit machten aus der alten Formel einen Forschungskandidaten: vielversprechend bei Labormäusen, beim Menschen unbewiesen.',
  's3.line.h01b':
    'Er hängt an einer Bergpflanze, der Silberader-Mondglocke. Wir nehmen nur, was dokumentiert ist, und nur mit Qinglans Zustimmung.',
  's3.line.h02a':
    'Hoch im Silbernebel-Hochland hüten die Menschen von Qinglan die Mondglocken-Beete.',
  's3.line.h02b':
    'Der Berg gehört nicht uns. Qinglan ist Partner dieser Forschung, und jede Probe trägt ihren Namen.',
  's3.line.h03a':
    'Ein erfahrenes Team brach auf, um am Felsvorsprung eine kleine, dokumentierte Probe zu sammeln.',
  's3.line.h03b': 'Im Nebel warteten Reiter.',
  's3.line.h04a':
    'Sie haben Gao Wen, Tao Min, An Bo und Ren Xia mitgenommen. Sie wollen die Forschung, und sie wollen dafür bezahlt werden.',
  's3.line.h04b':
    'Kein Lösegeld wird über dieses Dorf bestimmen. Wir holen jeden Einzelnen nach Hause.',
  's3.line.h05':
    'Reitet vorsichtig. Befreit zuerst die Gefangenen, schützt die Beete und findet heraus, wer diesen Banditen das Planen beigebracht hat.',

  's3.line.t01a':
    'Haltet die Verbindungsfrau von den anderen fern. Nur sie kann für die Aufzeichnungen bürgen.',
  's3.line.t01b': 'Diese Stimme im Funk … das ist Tomas.',
  's3.line.t02a':
    'Unterschreib, Ren. Sag ihnen, die Ergebnisse sind sicher, und heute Nacht ist alles vorbei.',
  's3.line.t02b': 'Ich unterschreibe keine Behauptung, die die Arbeit nicht trägt.',
  's3.line.t03':
    'Eine Signalrakete, eine Lore durch den Steinbruchgang, ein wartendes Pferd im Tal. Tomas hatte seinen Ausweg längst vorbereitet.',

  's3.line.e01a': 'Ihr kämpft wie Leute, die etwas zu verlieren haben. Gut. Ich gebe auf.',
  's3.line.e01b': 'Bindet ihm die Arme, vorsichtig. Zuerst sieht ihn die Klinik.',
  's3.line.e02a':
    'Er hatte einen eigenen Koffer, verschlossen und vor seinen eigenen Leuten versteckt.',
  's3.line.e02b':
    'Darin eine beschädigte Rechnung: Garrans Versicherung gegen den Mann, der ihn angeheuert hat.',
  's3.line.invoice':
    'Die Chargennummer ist halb verbrannt, doch die übrigen Ziffern kommen bekannt vor.',
  's3.line.e03': 'In Qinglan warten die Familien am Rand des Nebels.',
  's3.line.e03secure': 'Alle kommen auf eigenen Füßen nach Hause.',
  's3.line.e03critical':
    'Manche kommen auf Tragen heim. Das Klinikteam weicht nicht von ihrer Seite, und alle erholen sich.',
  's3.line.e04a': 'Dieselbe Charge wie die Messingzahnräder und derselbe Weg wie die Waffenkiste.',
  's3.line.e04b': 'Aber nicht dieselbe Hand. Jemand bezahlt die Leute, die die Banditen bezahlen.',
  's3.line.e05a': 'Weit unterhalb der Berge erreicht Tomas eine Schutzhütte im Tiefland.',
  's3.line.e05b': 'Besorg mir den Makler. Ich habe noch Unterlagen, die etwas wert sind.',
  's3.line.e06':
    'Die Wege durch den Nebel sind wieder offen. Wir gehen sie gemeinsam, und wir suchen weiter.',

  'm28.brief.1':
    'Vier unserer Leute werden am Berg festgehalten: Gao Wen, Tao Min, An Bo und Ren Xia.',
  'm28.brief.2':
    'Die Banditen reiten die Serpentinen. Die Bergpferde kennen den Pfad: Haltet sie ruhig.',
  'm28.brief.3':
    'Bei einem Gefangenen könnte ein Bandit etwas Grausames beginnen. Unterbrecht ihn. Jeder kommt nach Hause.',
  'm28.brief.4':
    'Im Mondglockental schützt die dokumentierten Proben und versiegelt die Aufzeichnungskiste, bevor ihr weiterzieht.',
  'm28.brief.5':
    'Ihr Anführer ist Garran Voss, auf der Hochseil-Terrasse. Bringt ihn lebend zurück.',
  'm28.brief.objective':
    'Befreit die vier Gefangenen, schützt die Forschungsaufzeichnung und fangt Garran Voss lebend.',

  'm28.rescued': 'Befreit: auf dem Weg in Sicherheit',
  'm28.resultsTitle': 'Kapitel 3 geschafft · Schatten über dem Kräuterberg',
  'm28.sponsorHook':
    'Die beschädigte Rechnung nennt eine bezahlte Route über den Berg: Wer sie bezahlt hat, bleibt im Verborgenen.',
  'm28.grade.rescue': 'Rettung (befreite Gefangene)',
  'm28.grade.record': 'Forschungsaufzeichnung',
  'm28.grade.capture': 'Festnahme (Garran Voss)',
  'm28.grade.combat': 'Kampf',
  'm28.grade.branches': 'Nebenwege',
  'm28.hold.1': '{action:Interact} halten, um sie zu befreien',
  'm28.hold.2': '{action:Interact} halten, um die Aufzeichnung zu sichern',
  'm28.hold.3': '{action:Interact} halten, um die Aufzeichnung zu versiegeln',
  'm28.hold.4': '{action:Interact} halten, um die Aufzeichnung zu bergen',
  'm28.recordLine': 'Forschungsaufzeichnung: {state}',
  'm28.horsesLine': 'Stabilitätsbrüche der Pferde: {n}',
  'm28.capture.1': 'Garran Voss: ergibt sich mit gebrochener Entschlossenheit',
  'm28.capture.2': 'Garran Voss: mit Gewalt festgenommen',
  'm28.hook.0': 'Hakenstab nie abgenommen',
  'm28.hook.1': 'Hakenstab entwaffnet',
  'm28.hook.2': 'Hakenstab zerbrochen',
  'm28.hook.3': 'Hakenstab weggeschlagen',
  'm28.redirects': 'Windenkonter {n}',
  'm28.rescuesTitle': 'Zustand der Geretteten',
  'm28.branchRescue': 'optionaler Abzweig',
  'm28.goal.rescue': 'Den Gefangenen befreien: neben ihm {action:Interact} halten',
  'm28.goal.redirect': 'Die Windenlast gegen Garran lenken',

  'm28.comingSoon': 'Demnächst',
  'm28.soonNote': 'Eine Vorschau: Dieses Outfit kommt mit einem späteren Update. Noch kein Preis.',
  'm28.defaultEvolution':
    'In Kapitel 3 trägt jeder Held die kostenlose Standardweiterentwicklung: Wanderstiefel, eine leichte Wetterschicht, ein Brustfunkgerät und eine Erste-Hilfe-Tasche.',
  'm28.whatsNewDetail': 'Die Einweisungskarten für Kapitel 3, jederzeit.',
  'm28.folioComplete': 'Vollständige Ausgabe: Beide Abzweige wurden gegangen.',
  'm28.folioPartial': 'Erste Ausgabe: Geht beide Abzweige für die vollständige Mappe.',
  'm28.dossierOpen': 'Die Seite öffnen',
  'm28.achievementEarned': 'Erfolg erhalten: {name}',

  'm21.whatsNew.horses.title': 'Bergpferde',
  'm21.whatsNew.horses.text':
    'In den Serpentinen reitest du ein Bergpferd mit deinen eigenen Reitmanövern. Halte es ruhig: Ein Stabilitätsbruch wirft dich ab, und am nächsten sicheren Punkt wartet ein frisches Pferd.',
  'm21.whatsNew.rescues.title': 'Zustand der Geretteten',
  'm21.whatsNew.rescues.text':
    'Banditen bei einem Gefangenen beginnen feindselige Handlungen, die du kommen siehst. Unterbrich sie mit jedem Treffer, Griff oder Konter. Jede Gruppe endet Sicher, Angespannt oder Kritisch, und niemand geht verloren.',
  'm21.whatsNew.record.title': 'Die Forschungsaufzeichnung',
  'm21.whatsNew.record.text':
    'Im Mondglockental nimmst du die Probenkiste auf und versiegelst sie mit gehaltenem Interagieren. Eine gestörte Kiste lässt sich bergen. Dokumentiert, Geborgen oder Gestört ändert die Wertung, nie die Geschichte.',
  'm21.whatsNew.highland-weapons.title': 'Waffen und Essen im Hochland',
  'm21.whatsNew.highland-weapons.text':
    'Wanderstäbe, Holzäxte und Steinbruchhämmer liegen am Weg; ein Revolver hat nur wenige Schuss. Reispäckchen, warme Brühe, Samenkuchen und die seltene Lagermahlzeit stellen Gesundheit wieder her.',
  'm21.whatsNew.bandits.title': 'Banditen des Hochlands',
  'm21.whatsNew.bandits.text':
    'Wegelagerer, Steinbruch-Schläger, Seilfallensteller und berittene Plünderer. Ein Seilfallensteller kann einen Helden fesseln, ein Partner befreit ihn schneller. Gratschleicher und Rudelhauptleute kommen auf höheren Schwierigkeitsgraden dazu.',
  'm21.whatsNew.garran.title': 'Garran Voss',
  'm21.whatsNew.garran.text':
    'Der Bandenchef kämpft erst mit einem Steinbruch-Hakenstab, dann mit Klammern und Würfen, zuletzt mit der Winde der Terrasse. Entwaffne ihn, brich seine Entschlossenheit und lenke die Windenlast gegen ihn, um ihn lebend zu fangen.',

  'm25.unit.gao-wen': 'Gao Wen',
  'm25.unit.tao-min': 'Tao Min',
  'm25.unit.an-bo': 'An Bo',
  'm25.unit.ren-xia': 'Ren Xia',
  'm25.unit.wei-shan': 'Wei Shan',
  'm25.case.sample-case': 'Kiste der Forschungsaufzeichnung',

  'music.stage3.1': 'Silberadern im Morgennebel',
  'music.stage3.2': 'Der leere Sammelpfad',
  'music.stage3.3': 'Hufe über der Schlucht',
  'music.stage3.4': 'Steinbruch der Echos',
  'music.stage3.5': 'Gefangene im Hochlager',
  'music.stage3.6': 'Der Anführer vom Gebrochenen Grat',
  'music.stage3.7': 'Wege durch den Nebel',
  'music.stage3.9': 'Hochland-Grundton',

  'museum.picture.keyart-s3.name': 'Schatten über dem Kräuterberg',
  'museum.picture.s3-h02.name': 'Die Partnerschaft mit Qinglan',
  'museum.picture.s3-h03.name': 'Sammeln am Felsvorsprung',
  'museum.picture.s3-h05.name': 'Aufbruch im Morgengrauen',
  'museum.picture.s3-brief-01.name': 'Die Expeditionskarte',
  'museum.picture.s3-t02.name': 'Die Planungshütte',
  'museum.picture.s3-e03.name': 'Wiedersehen in Qinglan',
  'museum.picture.s3-e06.name': 'Wege durch den Nebel',
  'museum.picture.portrait-garran.name': 'Garran Voss, der Anführer vom Gebrochenen Grat',
  'museum.cinema.stage3.silvermist.name': 'Eröffnung von Kapitel 3: Silbernebel',
  'museum.cinema.stage3.silvermist.desc':
    'Die Forschung, die Partnerschaft mit Qinglan, der Überfall am Felsvorsprung und die Lösegeldforderung.',
  'museum.cinema.stage3.prepared-route.name': 'Kapitel 3: Der vorbereitete Weg',
  'museum.cinema.stage3.prepared-route.desc':
    'Tomas im offenen Funk, in der Planungshütte und auf seinem Weg aus dem Steinbruch.',
  'museum.cinema.stage3.paths.name': 'Ende von Kapitel 3: Wege durch den Nebel',
  'museum.cinema.stage3.paths.desc':
    'Garran gefangen, der private Koffer, das Wiedersehen in Qinglan und Tomas im Tiefland.',
  'museum.collection.silvermist-ecology-folio.name': 'Silbernebel-Ökologiemappe',
  'museum.collection.silvermist-ecology-folio.desc':
    'Eine bebilderte Aufzeichnung des Silbernebel-Hochlands: die Mondglocken-Beete, ihre Nachbarn und wie Qinglan über sie wacht. Zum Anschauen, nicht zum Sammeln.',
  'museum.collection.qinglan-rescue-bell.name': 'Rettungsglocke von Qinglan',
  'museum.collection.qinglan-rescue-bell.desc':
    'Die Glocke neben der reparierten Funkhütte. Wenn der Funk schweigt, trägt sie noch immer über das Tal.',
  'museum.collection.gao-wen-trail-ledger.name': 'Gao Wens Pfadbuch',
  'museum.collection.gao-wen-trail-ledger.desc':
    'Jahrzehnte an Wegnotizen: welche Pfade ausgewaschen werden, wo sich die Beete erholen und wann man den Berg in Ruhe lässt.',
  'museum.collection.broken-hookstaff.name': 'Der zerbrochene Hakenstab',
  'museum.collection.broken-hookstaff.desc':
    'Garrans Steinbruch-Hakenstab, zerbrochen auf der Hochseil-Terrasse: ein Werkzeug, das er zur Waffe machte.',

  'dossier.page.damaged-invoice.name': 'Die beschädigte Rechnung',
  'dossier.page.damaged-invoice':
    'Eine halb verbrannte Lieferantenrechnung, von Garran in einem verschlossenen Koffer als Druckmittel gegen Tomas aufbewahrt. Ihre Chargennummer passt zu den Messingzahnrädern vom Schleusentor und zur Kiste aus dem Gewächshausdepot. Der Name des Käufers ist abgerissen.',
  'dossier.fact.invoice-batch':
    'Die Chargennummer der Rechnung passt zu den Messingzahnrädern und zur versiegelten Waffenkiste.',
  'dossier.fact.prepared-route':
    'Tomas hatte seine Flucht durch den Steinbruch lange vor dem Überfall vorbereitet: ein Signal, eine Lore und ein wartendes Pferd.',
  'dossier.theory.paid-route':
    'Ein einziger Beschaffungsweg belieferte alle drei Angriffe, und jemand über dem Mittelsmann bezahlt dafür.',
  'research.input.field-samples':
    'Die dokumentierten Mondglocken-Feldproben aus dem Tal, gesammelt mit Qinglans Zustimmung.',
  'research.input.trail-ledger':
    'Gao Wens Pfadbuch: Jahrzehnte an Lebensraumbeobachtungen für die unabhängige Wiederholung.',

  'epilogue.stage3.capture.resolve':
    'Mit gebrochener Entschlossenheit legt Garran Voss seine letzte Waffe nieder und lässt sich die Arme binden.',
  'epilogue.stage3.capture.forced':
    'Garran Voss stürzt sich ein letztes Mal nach vorn. Die Helden halten ihn sicher auf, entwaffnen ihn und halten ihn fest.',
  'epilogue.stage3.rescue.gao-wen.secure': 'Gao Wen geht neben den anderen zurück nach Qinglan.',
  'epilogue.stage3.rescue.gao-wen.strained':
    'Gao Wen ist erschüttert und zerschrammt und ruht sich in der Klinik aus, bevor er wieder die Pfade geht.',
  'epilogue.stage3.rescue.gao-wen.critical':
    'Gao Wen wird auf einer Trage hinuntergebracht. Wochen später ist er wieder auf dem Pfad, langsamer und so stur wie immer.',
  'epilogue.stage3.rescue.tao-min.secure': 'Tao Min schreibt schon alles auf, was sie gesehen hat.',
  'epilogue.stage3.rescue.tao-min.strained':
    'Tao Min braucht ein paar ruhige Tage und fragt dann, ob sie bei der nächsten Erhebung mitgehen darf.',
  'epilogue.stage3.rescue.tao-min.critical':
    'Tao Min wird eine lange Woche in der Klinik behandelt. Sie erholt sich und behält ihr Notizbuch immer bei sich.',
  'epilogue.stage3.rescue.an-bo.secure':
    'An Bo führt die wiedergefundenen Pferde selbst nach Hause.',
  'epilogue.stage3.rescue.an-bo.strained':
    'An Bo reitet wund und still nach Hause, doch die Pferde folgen seiner Stimme.',
  'epilogue.stage3.rescue.an-bo.critical':
    'An Bo wird den Grat hinuntergetragen. Die Pferde warten am Tor der Klinik, bis er wieder stehen kann.',
  'epilogue.stage3.rescue.ren-xia.secure':
    'Ren Xia übergibt die Herkunftsunterlagen, jedes Siegel unversehrt.',
  'epilogue.stage3.rescue.ren-xia.strained':
    'Ren Xia ist erschöpft, aber sie hat nicht unterschrieben. Die Unterlagen bleiben ehrlich.',
  'epilogue.stage3.rescue.ren-xia.critical':
    'Ren Xia braucht lange Pflege in der Klinik. Sie erholt sich, und die Unterlagen, die sie geschützt hat, bleiben ehrlich.',
  'epilogue.stage3.record.documented':
    'Die Forschungsaufzeichnung ist vollständig: jede Probe dokumentiert und versiegelt.',
  'epilogue.stage3.record.recovered':
    'Die Forschungsaufzeichnung wurde gestört, aber geborgen und neu versiegelt.',
  'epilogue.stage3.record.disturbed':
    'Die Forschungsaufzeichnung ist unvollständig. Es bleibt genug dokumentiertes Material, und Qinglan hilft, die Lücken zu füllen.',
  'epilogue.stage3.record.missing':
    'Die Kiste der Forschungsaufzeichnung wurde nie aufgenommen. Die dokumentierten Proben vom Hauptweg genügen, um weiterzuforschen.',
  'epilogue.stage3.branch.signal-hut':
    'Die Funkhütte arbeitet wieder: Qinglan erreicht das Dorf, die Klinik und jede Patrouille.',
  'epilogue.stage3.branch.herbalist-shelter':
    'Die Sammelausrüstung ist zurück in Qinglan, und Gao Wens Pfadbuch ist dabei.',
  'epilogue.stage3.invoice':
    'In Garrans privatem Koffer: eine beschädigte Rechnung, deren Chargennummer zum selben Beschaffungsweg zurückführt.',
  'epilogue.stage3.lowland':
    'Tomas Rell ist über seinen vorbereiteten Weg entkommen. Irgendwo im Tiefland führt er ein Telefonat.',

  'arena.s3-hoofprints.name': 'Hufspuren im Schlamm',
  'arena.s3-rope-trail.name': 'Ein Seil über dem Pfad',
  'arena.s3-drying-racks.name': 'Leere Trockengestelle',
  'arena.s3-signal-hut.name': 'Die stumme Antenne',
  'arena.s3-watch-path.name': 'Der Wachpfad',
  'arena.s3-mist-beds.name': 'Nebel über den Beeten',
  'arena.s3-two-voices.name': 'Zwei Stimmen im Nebel',
  'arena.s3-loose-scaffold.name': 'Loses Gerüst',
  'arena.s3-herbalist-shelter.name': 'Zurückgelassene Körbe',
  'arena.s3-hammer-line.name': 'Die Hammerreihe',
  'arena.s3-cart-rails.name': 'Lorengleise',
  'arena.s3-outer-fence.name': 'Der äußere Zaun',
  'arena.s3-lantern-row.name': 'Die Laternenreihe',
  'arena.s3-ren-enclosure.name': 'Ren Xias Verschlag',
  'arena.s3-terrace.name': 'Der Anführer vom Gebrochenen Grat',
  'stage.stage3.beat.switchback-ride.name': 'Untere Serpentinen',
  'stage.stage3.beat.switchback-ride.objective':
    'Auf der Spur der Banditen die Serpentinen hinaufreiten',
  'stage.stage3.beat.hoofprints.name': 'Hufspuren im Schlamm',
  'stage.stage3.beat.hoofprints.objective': 'Die Wegelagerer vertreiben und die Spur lesen',
  'stage.stage3.beat.hoofprints.clue':
    'Ein fallen gelassener Sammelkorb und frische Hufspuren: Die Gefangenen wurden die Serpentinen hinauf zur Steinbruchstraße gebracht.',
  'stage.stage3.beat.rope-trail.name': 'Ein Seil über dem Pfad',
  'stage.stage3.beat.rope-trail.objective': 'Die Seilfalle auf dem Pfad räumen',
  'stage.stage3.beat.drying-racks.name': 'Leere Trockengestelle',
  'stage.stage3.beat.drying-racks.objective':
    'Die Banditen von den Trockengestellen des Dorfs vertreiben',
  'stage.stage3.beat.signal-hut.name': 'Die stumme Antenne',
  'stage.stage3.beat.signal-hut.objective':
    'Wei Shan befreien und den Funk in der Funkhütte reparieren',
  'stage.stage3.beat.signal-hut.clue':
    'Das Funkgerät arbeitet wieder: Qinglan kann das Dorf und die Klinik erreichen.',
  'stage.stage3.branch.signal-hut': 'Funkhütte',
  'stage.stage3.branch.signal-hut.artifact': 'Rettungsglocke von Qinglan',
  'stage.stage3.beat.watch-path.name': 'Der Wachpfad',
  'stage.stage3.beat.watch-path.objective': 'Den Wachpfad zum Mondglockental nehmen',
  'stage.stage3.beat.mist-beds.name': 'Nebel über den Beeten',
  'stage.stage3.beat.mist-beds.objective':
    'Die Mondglocken-Beete schützen und die dokumentierten Proben sichern',
  'stage.stage3.beat.two-voices.name': 'Zwei Stimmen im Nebel',
  'stage.stage3.beat.two-voices.objective': 'Gao Wen und Tao Min befreien',
  'stage.stage3.beat.loose-scaffold.name': 'Loses Gerüst',
  'stage.stage3.beat.loose-scaffold.objective': 'Den Steinbruch unter dem losen Gerüst durchqueren',
  'stage.stage3.beat.herbalist-shelter.name': 'Zurückgelassene Körbe',
  'stage.stage3.beat.herbalist-shelter.objective':
    'Die Sammelausrüstung aus der Kräuterhütte bergen',
  'stage.stage3.beat.herbalist-shelter.clue':
    'Körbe, Anhänger und Feldnotizbücher der Expedition, in der Hütte zurückgelassen: Gao Wens Pfadbuch ist darunter.',
  'stage.stage3.branch.herbalist-shelter': 'Kräuterhütte',
  'stage.stage3.branch.herbalist-shelter.artifact': 'Gao Wens Pfadbuch',
  'stage.stage3.beat.hammer-line.name': 'Die Hammerreihe',
  'stage.stage3.beat.hammer-line.objective': 'Die Hammerreihe durchbrechen',
  'stage.stage3.beat.cart-rails.name': 'Lorengleise',
  'stage.stage3.beat.cart-rails.objective': 'An Bo an den Lorengleisen befreien',
  'stage.stage3.beat.ridge-ride.name': 'Gratstraße',
  'stage.stage3.beat.ridge-ride.objective':
    'Die Gratstraße hinauf zum Lager am Gebrochenen Grat reiten',
  'stage.stage3.beat.outer-fence.name': 'Der äußere Zaun',
  'stage.stage3.beat.outer-fence.objective': 'Den äußeren Zaun des Lagers durchbrechen',
  'stage.stage3.beat.lantern-row.name': 'Die Laternenreihe',
  'stage.stage3.beat.lantern-row.objective': 'Die Laternenreihe räumen',
  'stage.stage3.beat.ren-enclosure.name': 'Ren Xias Verschlag',
  'stage.stage3.beat.ren-enclosure.objective': 'Ren Xia befreien',
  'stage.stage3.beat.terrace.name': 'Hochseil-Terrasse',
  'stage.stage3.beat.terrace.objective': 'Garran Voss lebend fangen',
  'stage.stage3.beat.terrace.evidence':
    'Garrans privater Koffer: eine beschädigte Rechnung, die er als Druckmittel gegen Tomas behielt. Ihre Chargennummer passt zum Beschaffungsweg hinter den Messingzahnrädern und der Waffenkiste.',
  'corridor.s3-switchback-ride.name': 'Untere Serpentinen',
  'corridor.s3-switchback-ride.goal': 'Auf der Spur der Banditen die Serpentinen hinaufreiten',
  'corridor.s3-ridge-pursuit.name': 'Gratstraße',
  'corridor.s3-ridge-pursuit.goal': 'Die Gratstraße hinauf zum Banditenlager reiten',
  'store.wardrobe.mountain.mountain-rescue.name': 'Bergrettungsausrüstung',
  'store.wardrobe.mountain.highland-festival.name': 'Festtracht des Hochland-Sammelfests',
  'store.wardrobe.river.mountain-rescue.name': 'Bergrettungsausrüstung',
  'store.wardrobe.river.highland-festival.name': 'Festtracht des Hochland-Sammelfests',
  'store.wardrobe.wind.mountain-rescue.name': 'Bergrettungsausrüstung',
  'store.wardrobe.wind.highland-festival.name': 'Festtracht des Hochland-Sammelfests',
  'store.wardrobe.fire.mountain-rescue.name': 'Bergrettungsausrüstung',
  'store.wardrobe.fire.highland-festival.name': 'Festtracht des Hochland-Sammelfests',
  'ach.stage3.mist-lifts.name': 'Der Nebel lichtet sich',
  'ach.stage3.every-voice-home.name': 'Alle Stimmen kehren heim',
  'ach.stage3.signal-restored.name': 'Signal wiederhergestellt',
  'ach.stage3.shelter-remembered.name': 'Die Hütte nicht vergessen',
  'ach.stage3.both-paths-walked.name': 'Beide Wege gegangen',
  'ach.stage3.steady-on-the-switchback.name': 'Sicher in den Serpentinen',
  'ach.stage3.hook-unhooked.name': 'Den Haken gelöst',
  'ach.stage3.paper-trail.name': 'Die Papierspur',
  'academy.stage3.name': 'Akademie Kapitel 3',
  'academy.stage3.mounted.name': 'Das Bergpferd in den Serpentinen',
  'academy.stage3.rescue.name': 'Gefangene unter Druck befreien',
  'academy.stage3.stalker.name': 'Neue Rollen: der Gratschleicher',
  'academy.stage3.hookstaff.name': 'Den Hakenstab nehmen',
  'academy.stage3.winch.name': 'Die Winde gegen ihn wenden',
};

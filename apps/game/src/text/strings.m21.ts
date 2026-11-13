import type { Catalog } from '@ffp/platform';

/**
 * M21 campaign, Museum, Store and research: stage select and the Stage 2 briefing, What's
 * New, the Village Museum and Archive (sections, entries, Sponsor Dossier, formula
 * research), the Technique Library's tactical purposes, the Move List and Move Preview,
 * the Stage 2 Academy goals, and the Chinese and German names of the M21 data (the twins'
 * catalogue moves, showcase routes, Stage 2 outfits, achievements and lessons). English
 * data names come from the YAML files through dataCatalog(). The research text is
 * fictional and non-actionable on purpose (Stage 2 spec §14.4).
 */
export const M21_EN = {
  'm21.stageLocked': 'opens after you complete {stage} once',
  'm21.stageOpened': 'New stage open: {stage}',
  'm21.museumNew': 'New in the Museum: {n}',
  'm21.dossierNew': 'The Sponsor Dossier has new findings.',
  'm21.academyLocked': 'Opens with Stage 2 (complete Stage 1 once).',

  'm21.brief.stage2.1':
    'The water runs again, and the valley has planted more than it has in years. That is exactly why they came back.',
  'm21.brief.stage2.2':
    'Raiders hold the Prosperity Greenhouses: the fish tanks, the seed reserve, the medicinal beds. Some of them carry firearms now.',
  'm21.brief.stage2.3':
    'Wind Sentinel and Fire Warden know these halls. Protect the systems first; every tank and bed you keep alive is counted.',
  'm21.brief.stage2.4':
    'Their leader, Marek Vane, has a support gun and a sealed crate. Take him alive if you can, and secure that crate.',
  'm21.brief.stage2.5':
    'Side rooms may hold what the cooperative cannot replace. Go in if you can spare the time; the main road will wait.',
  'm21.brief.stage2.objective':
    'Retake the Prosperity Greenhouses, keep their systems alive, capture Marek Vane and secure the sealed crate.',

  'm21.whatsNewTitle': "What's New",
  'm21.whatsNewDetail': 'The Stage 2 briefing cards, any time.',
  'm21.whatsNewDone': 'Understood',
  'm21.skip': 'Skip',
  'm21.whatsNew.twins.title': 'The twin guardians',
  'm21.whatsNew.twins.text':
    'Wind Sentinel strikes with precision and reach; Fire Warden builds momentum up close. Together they can pass a combo back and forth with a Reciprocal Handoff and share the Twin Guardians’ Accord.',
  'm21.whatsNew.mounted.title': 'Mounted pursuit and Stability',
  'm21.whatsNew.mounted.text':
    'On the perimeter road you ride. Stability falls when you are hit or steer hard; keep it up, protect the people beside the road and dismount riders rather than wreck them.',
  'm21.whatsNew.ledger.title': 'The Preservation Ledger',
  'm21.whatsNew.ledger.text':
    'Every tank, bed and pump in the greenhouses is on the Ledger. Damage lowers it, repairs raise it, and your Preservation grade decides how the valley recovers.',
  'm21.whatsNew.weapons.title': 'Firearms and grenades',
  'm21.whatsNew.weapons.text':
    'Some raiders carry revolvers, breaching grenades and a support gun. Interrupt the draw, return or secure a dropped grenade, and disarm the gunner: a seized weapon is for ending the fight, not for revenge.',
  'm21.whatsNew.containers.title': 'Whose container is it?',
  'm21.whatsNew.containers.text':
    'Crates and lockers belong to someone. Open the raiders’ caches freely; the cooperative’s stores are for returning, not for taking.',
  'm21.whatsNew.enemies.title': 'New enemy roles',
  'm21.whatsNew.enemies.text':
    'The Jackal Signalman calls the others into formation: break his call. The Systems Saboteur goes for the controls: stop the breach before it completes.',

  'm21.museum': 'Museum',
  'm21.museumDetail': 'Pictures, cinema, music, sounds, the collection and the investigation.',
  'm21.newMark': '{n} new',
  'm21.section.picture': 'Pictures',
  'm21.section.cinema': 'Cinema',
  'm21.section.music': 'Music',
  'm21.section.sound': 'Sounds',
  'm21.section.collection': 'Collection',
  'm21.section.investigation': 'Investigation',
  'm21.sectionIntro.picture': 'Story pictures from the stages you have played.',
  'm21.sectionIntro.cinema': 'Watch the story cinematics again.',
  'm21.sectionIntro.music': 'Listen to the score. Choose a piece and press Listen.',
  'm21.sectionIntro.sound': 'The sounds of the fights and the village.',
  'm21.sectionIntro.collection': 'Objects recovered on the way: each one has its story.',
  'm21.sectionIntro.investigation': 'What we know about who equips the raiders.',
  'm21.museumEmpty': 'Nothing here yet.',
  'm21.undiscovered': 'Undiscovered',
  'm21.guestMuseum': 'A Guest can look around, but nothing is kept.',
  'm21.play': 'Play',
  'm21.listen': 'Listen',
  'm21.stop': 'Stop',

  'museum.picture.s1-intro-01.name': 'The valley before the drought',
  'museum.picture.s1-intro-03.name': 'The river stops',
  'museum.picture.s1-intro-05.name': 'The founders answer',
  'museum.picture.s1-brief-01.name': 'The elder’s briefing',
  'museum.picture.s1-end-01.name': 'Water in the canals',
  'museum.picture.s1-end-03.name': 'The pact restored',
  'museum.picture.keyart-title.name': 'Fight for Peace key art',
  'museum.picture.select-wind.name': 'Wind Sentinel',
  'museum.picture.select-fire.name': 'Fire Warden',
  'museum.cinema.stage1.intro.name': 'Stage 1 opening: The Broken Water Pact',
  'museum.cinema.stage1.intro.desc':
    'How the river stopped, and why the founders went to the sluice.',
  'museum.cinema.stage1.ending.name': 'Stage 1 ending: The River Returned',
  'museum.cinema.stage1.ending.desc':
    'The water comes back, and with it the first clue to an outside hand.',
  'museum.sound.exact-block.name': 'Exact Block',
  'museum.sound.heavy-hit.name': 'Heavy hit',
  'museum.sound.ultimate.name': 'Ultimate',
  'museum.sound.team-finisher.name': 'Team finisher',
  'museum.sound.worker-freed.name': 'A worker freed',
  'museum.sound.river-restored.name': 'The river restored',
  'museum.collection.brass-gears.name': 'Brass gears',
  'museum.collection.brass-gears.desc':
    'Machined gears from the sabotaged sluice. Nobody in the valley makes parts like these.',
  'museum.collection.early-aerator-impeller.name': 'Early aerator impeller',
  'museum.collection.early-aerator-impeller.desc':
    'The first impeller the cooperative ever cast. It kept the fish breathing the night the power failed.',
  'museum.collection.first-harvest-seed-tin.name': 'First-harvest seed tin',
  'museum.collection.first-harvest-seed-tin.desc':
    'Seeds from the first harvest after the water came back, kept for the years that go badly.',
  'museum.collection.medicinal-cooperative-field-card.name': 'Medicinal cooperative field card',
  'museum.collection.medicinal-cooperative-field-card.desc':
    'A grower’s card listing where each medicinal bed came from and who tended it.',
  'museum.collection.sealed-weapon-crate.name': 'The sealed weapon crate',
  'museum.collection.sealed-weapon-crate.desc':
    'Marek Vane’s crate, still sealed. The seal is the same as the one on the sluice gears.',

  'm21.dossierTitle': 'Sponsor Dossier',
  'm21.dossierEmpty': 'No findings yet. Complete a stage to start the investigation.',
  'm21.factsTitle': 'Confirmed facts',
  'm21.theoryTitle': 'Current theory',
  'dossier.fact.brass-gears':
    'The sluice was jammed with machined brass gears that nobody in the valley could have made.',
  'dossier.theory.outside-hand': 'Someone outside the valley wanted the river to stop.',
  'dossier.fact.crate-seal':
    'Marek Vane’s weapon crate carries the same seal as the brass gears at the sluice.',
  'dossier.fact.order-code':
    'The crate’s order code points to a supply depot; when the guardians got there, it was empty.',
  'dossier.theory.one-supplier':
    'The sluice sabotage and the armed raid were equipped by the same supplier.',
  'm21.researchTitle': 'Formula research',
  'm21.researchIntro':
    'The cooperative’s growth formula, studied the careful way: one milestone at a time.',
  'm21.milestoneDone': 'complete',
  'm21.milestoneOpen': 'not yet',
  'm21.inputsTitle': 'Recorded for the next milestone',
  'research.quarantine-provenance.name': 'Quarantine and Provenance',
  'research.quarantine-provenance.desc':
    'The recovered formula is sealed away and its origin written down before anyone studies it.',
  'research.independent-replication.name': 'Independent Replication',
  'research.independent-replication.desc':
    'Another team must reach the same results on its own before anyone trusts them.',
  'research.safety-review.name': 'Safety Review',
  'research.safety-review.desc':
    'Growers and healers look at what could go wrong, and for whom, before it goes further.',
  'research.approved-preparation.name': 'Approved Preparation',
  'research.approved-preparation.desc':
    'Only what passed every review is prepared, by the people trusted to do it.',
  'research.input.formula-handover': 'The formula and source notes Tomas Rell handed over.',
  'research.input.provenance-ledger':
    'The provenance ledger from the Medicinal Preparation Room: where each sample came from.',

  'm21.slot': 'Slot: {slot}',
  'm21.purpose.mountain.skybreak-column':
    'Launches a target straight up for an air follow-up; slower than the standard option.',
  'm21.purpose.mountain.still-mountain':
    'Holds your ground and answers a crowd that rushes you, instead of pushing forward.',
  'm21.purpose.river.waterspout-rise':
    'Lifts a target into the air for a juggle; less reach along the ground.',
  'm21.purpose.river.floodline-passage':
    'Carries you through a group and out the other side; less damage on a single target.',
  'm21.purpose.wind.crosswind-arc':
    'An anti-air arc for flyers and jumpers; it covers less ground than the standard option.',
  'm21.purpose.wind.low-gust-sweep':
    'A low sweep that trips a guard set high; short reach, easy to punish when it misses.',
  'm21.purpose.wind.eye-of-the-storm':
    'Pulls the fight toward you and holds a calm space around you; less damage than the standard Ultimate.',
  'm21.purpose.fire.kindling-uppercut':
    'A rising uppercut that starts air chains close up; little reach.',
  'm21.purpose.fire.hearth-sweep':
    'A low sweep that knocks a group off its feet near you; slow to recover.',
  'm21.purpose.fire.banked-coals':
    'Steps back and banks your heat for a stronger next move; it hits less on its own.',

  'm21.moveList': 'Move List and Preview',
  'm21.moveListDetail': 'Showcase routes, combo recipes and techniques, played for you.',
  'm21.moveListIntro':
    'Choose a route and press it to watch it played on a training dummy. Then try it yourself.',
  'm21.showcases': 'Showcase routes',
  'm21.recipes': 'Combo recipes',
  'm21.techniques': 'Techniques',
  'm21.preview': 'Preview',
  'm21.withPartner': 'with {name}',
  'm21.meterNeeded': 'Needs {n}% meter (filled for the preview).',
  'm21.teamStep': 'team finisher',
  'm21.watching': 'Preview · played {n} times',
  'm21.trying': 'Try it: perform the steps in order',
  'm21.halfOn': 'half speed',
  'm21.pausedMark': 'paused',
  'm21.pause': 'Pause',
  'm21.resume': 'Resume',
  'm21.step': 'Step',
  'm21.halfSpeed': 'Half speed',
  'm21.fullSpeed': 'Full speed',
  'm21.tryIt': 'Try it',
  'm21.watchAgain': 'Watch again',
  'm21.leavePreview': 'Leave the Preview',
  'm21.routeDone': 'Route complete! Do it again, or watch it once more.',
  'm21.watchHint': 'Press {action:Attack} to try it yourself. {action:Pause} for the controls.',
  'm21.tryHint': 'Steps tick off as they land. {action:Pause} for the controls.',
  'm21.previewPauseDetail':
    'Pause, step, half speed, try the route yourself, or leave the Preview.',

  'm21.goal.reciprocal': 'Land a Reciprocal Handoff with your partner',
  'm21.goal.teamFinisher': 'Land the Twin Guardians’ Accord together {action:TeamAttack}',
  'm21.goal.pursuitControl': 'Dismount a rider without wrecking him',
  'm21.goal.pursuitSave': 'Protect someone beside the road during the pursuit',
  'm21.goal.firearmShot': 'Interrupt a revolver before the shot',
  'm21.goal.grenadeReturn': 'Return or secure a breaching grenade',
  'm21.goal.disarm': 'Disarm the support gunner',
  'm21.goal.repair': 'Repair a damaged system: hold {action:Interact}',
  'm21.goal.containerOpen': 'Open a raiders’ container (leave the cooperative’s stores)',
  'm21.goal.callBreak': 'Break a Signalman’s call before it completes',
  'm21.goal.breachStop': 'Stop a Control Breach before it completes',
} as const;

export const M21_ZH: Catalog = {
  'm21.stageLocked': '完成一次{stage}后开放',
  'm21.stageOpened': '新章节开放：{stage}',
  'm21.museumNew': '博物馆新增：{n}',
  'm21.dossierNew': '赞助人档案有新的发现。',
  'm21.academyLocked': '第二章开放后可用（完成一次第一章）。',

  'm21.brief.stage2.1': '河水重新流淌，山谷种下的作物比多年来都多。正因如此，他们又回来了。',
  'm21.brief.stage2.2': '袭击者占据了繁荣温室：鱼池、种子储备、药圃。他们中有些人现在带着枪。',
  'm21.brief.stage2.3':
    '风神和火神熟悉这些温室。先保护系统；你保住的每一个水池、每一块苗床都会被记下。',
  'm21.brief.stage2.4':
    '他们的首领马雷克·韦恩有一挺支援枪和一个密封的箱子。尽量活捉他，并保住那个箱子。',
  'm21.brief.stage2.5': '侧室里可能有合作社无法替代的东西。时间允许就进去看看，主路会等你。',
  'm21.brief.stage2.objective': '夺回繁荣温室，保住其中的系统，活捉马雷克·韦恩并保住密封的箱子。',

  'm21.whatsNewTitle': '新内容',
  'm21.whatsNewDetail': '随时查看第二章的简报卡片。',
  'm21.whatsNewDone': '明白了',
  'm21.skip': '跳过',
  'm21.whatsNew.twins.title': '双生守护神',
  'm21.whatsNew.twins.text':
    '风神出手精准、距离远；火神贴身积蓄势头。两人可以用互助交接把连招来回传递，并共同发动双神同心。',
  'm21.whatsNew.mounted.title': '骑乘追击与稳定度',
  'm21.whatsNew.mounted.text':
    '在外围道路上你要骑行。被击中或急转都会降低稳定度；保持稳定，保护路边的人，把骑手打下坐骑而不是撞毁。',
  'm21.whatsNew.ledger.title': '保全账簿',
  'm21.whatsNew.ledger.text':
    '温室里的每个水池、苗床和水泵都记在账簿上。损坏会降低它，修复会提高它，你的保护评级决定山谷如何恢复。',
  'm21.whatsNew.weapons.title': '枪械与手雷',
  'm21.whatsNew.weapons.text':
    '有些袭击者带着左轮、破门手雷和一挺支援枪。打断拔枪，把掉落的手雷扔回或收好，缴下枪手的武器：缴获的武器是用来结束战斗的，不是用来报复的。',
  'm21.whatsNew.containers.title': '这是谁的箱子？',
  'm21.whatsNew.containers.text':
    '箱子和柜子都有主人。袭击者的藏货可以随意打开；合作社的物资是要归还的，不能拿走。',
  'm21.whatsNew.enemies.title': '新的敌人角色',
  'm21.whatsNew.enemies.text':
    '豺狼信号兵会号令其他人列阵：打断他的号令。系统破坏者会冲向控制台：在破坏完成前阻止它。',

  'm21.museum': '博物馆',
  'm21.museumDetail': '图画、影院、音乐、音效、收藏与调查。',
  'm21.newMark': '新 {n}',
  'm21.section.picture': '图画',
  'm21.section.cinema': '影院',
  'm21.section.music': '音乐',
  'm21.section.sound': '音效',
  'm21.section.collection': '收藏',
  'm21.section.investigation': '调查',
  'm21.sectionIntro.picture': '你玩过的章节中的故事图画。',
  'm21.sectionIntro.cinema': '重温故事过场。',
  'm21.sectionIntro.music': '聆听配乐。选一首曲目，然后按“聆听”。',
  'm21.sectionIntro.sound': '战斗与村庄的声音。',
  'm21.sectionIntro.collection': '一路上找回的物品，每一件都有它的故事。',
  'm21.sectionIntro.investigation': '关于是谁在武装袭击者，我们所知道的。',
  'm21.museumEmpty': '这里还没有东西。',
  'm21.undiscovered': '尚未发现',
  'm21.guestMuseum': '访客可以四处看看，但不会保存任何东西。',
  'm21.play': '播放',
  'm21.listen': '聆听',
  'm21.stop': '停止',

  'museum.picture.s1-intro-01.name': '干旱之前的山谷',
  'museum.picture.s1-intro-03.name': '河水断流',
  'museum.picture.s1-intro-05.name': '守护神响应',
  'museum.picture.s1-brief-01.name': '长老的简报',
  'museum.picture.s1-end-01.name': '水渠来水',
  'museum.picture.s1-end-03.name': '水约重立',
  'museum.picture.keyart-title.name': '《和平之战》主视觉',
  'museum.picture.select-wind.name': '风神',
  'museum.picture.select-fire.name': '火神',
  'museum.cinema.stage1.intro.name': '第一章开场：破碎的水约',
  'museum.cinema.stage1.intro.desc': '河水为何断流，守护神们为何前往水闸。',
  'museum.cinema.stage1.ending.name': '第一章结局：河水归来',
  'museum.cinema.stage1.ending.desc': '河水回来了，随之而来的是外部势力的第一条线索。',
  'museum.sound.exact-block.name': '精准格挡',
  'museum.sound.heavy-hit.name': '重击',
  'museum.sound.ultimate.name': '终极技',
  'museum.sound.team-finisher.name': '组合终结技',
  'museum.sound.worker-freed.name': '解救工人',
  'museum.sound.river-restored.name': '河水恢复',
  'museum.collection.brass-gears.name': '黄铜齿轮',
  'museum.collection.brass-gears.desc':
    '从被破坏的水闸里取出的机加工齿轮。山谷里没人能做出这样的零件。',
  'museum.collection.early-aerator-impeller.name': '早期增氧叶轮',
  'museum.collection.early-aerator-impeller.desc':
    '合作社铸造的第一个叶轮。停电那一夜，是它让鱼还能呼吸。',
  'museum.collection.first-harvest-seed-tin.name': '首季种子罐',
  'museum.collection.first-harvest-seed-tin.desc':
    '河水回来后第一季收成的种子，留给收成不好的年份。',
  'museum.collection.medicinal-cooperative-field-card.name': '药材合作社田间卡',
  'museum.collection.medicinal-cooperative-field-card.desc':
    '种植者的卡片，记着每块药圃的来源和照料它的人。',
  'museum.collection.sealed-weapon-crate.name': '密封的武器箱',
  'museum.collection.sealed-weapon-crate.desc':
    '马雷克·韦恩的箱子，仍然封着。封印和水闸齿轮上的一模一样。',

  'm21.dossierTitle': '赞助人档案',
  'm21.dossierEmpty': '还没有发现。完成一个章节，调查就会开始。',
  'm21.factsTitle': '已确认的事实',
  'm21.theoryTitle': '目前的推测',
  'dossier.fact.brass-gears': '水闸被机加工的黄铜齿轮卡住，山谷里没人做得出这种齿轮。',
  'dossier.theory.outside-hand': '山谷外有人想让河水断流。',
  'dossier.fact.crate-seal': '马雷克·韦恩的武器箱上的封印，与水闸黄铜齿轮上的相同。',
  'dossier.fact.order-code': '箱子的订货编号指向一处补给仓库；守护神赶到时，那里已空无一物。',
  'dossier.theory.one-supplier': '破坏水闸和武装袭击的装备来自同一个供应者。',
  'm21.researchTitle': '配方研究',
  'm21.researchIntro': '以谨慎的方式研究合作社的生长配方：一次一个里程碑。',
  'm21.milestoneDone': '已完成',
  'm21.milestoneOpen': '尚未完成',
  'm21.inputsTitle': '为下一个里程碑记录的资料',
  'research.quarantine-provenance.name': '隔离与溯源',
  'research.quarantine-provenance.desc': '找回的配方被封存起来，在任何人研究之前先记下它的来源。',
  'research.independent-replication.name': '独立复现',
  'research.independent-replication.desc': '必须由另一个团队独立得到同样的结果，大家才会信任它。',
  'research.safety-review.name': '安全审查',
  'research.safety-review.desc': '种植者和医者先评估可能出什么问题、会影响谁，然后才继续。',
  'research.approved-preparation.name': '核准制备',
  'research.approved-preparation.desc': '只有通过所有审查的内容，才会由受信任的人来制备。',
  'research.input.formula-handover': '托马斯·雷尔交出的配方和原始笔记。',
  'research.input.provenance-ledger': '药物制备室的溯源账簿：每份样本的来处。',

  'm21.slot': '槽位：{slot}',
  'm21.purpose.mountain.skybreak-column': '把目标直接挑上空中以便空中追击；比标准选项慢。',
  'm21.purpose.mountain.still-mountain': '稳守原地，回应冲向你的人群，而不是向前推进。',
  'm21.purpose.river.waterspout-rise': '把目标托上空中进行浮空连击；地面距离较短。',
  'm21.purpose.river.floodline-passage': '带你穿过一群敌人到另一边；对单个目标伤害较低。',
  'm21.purpose.wind.crosswind-arc': '对付空中和跳跃目标的对空弧；覆盖地面范围比标准选项小。',
  'm21.purpose.wind.low-gust-sweep': '下段横扫，绊倒架高防御的人；距离短，落空时容易被反击。',
  'm21.purpose.wind.eye-of-the-storm': '把战斗拉向你，并在身边保持一片平静；伤害低于标准终极技。',
  'm21.purpose.fire.kindling-uppercut': '近身发动的上勾拳，开启空中连击；距离很短。',
  'm21.purpose.fire.hearth-sweep': '下段横扫，击倒身边的一群人；收招较慢。',
  'm21.purpose.fire.banked-coals': '后撤一步积蓄热量，让下一招更强；本身伤害较低。',

  'm21.moveList': '招式表与预览',
  'm21.moveListDetail': '展示路线、连招配方和技巧，演示给你看。',
  'm21.moveListIntro': '选一条路线，按下即可在训练木桩上观看演示。然后自己试一试。',
  'm21.showcases': '展示路线',
  'm21.recipes': '连招配方',
  'm21.techniques': '技巧',
  'm21.preview': '预览',
  'm21.withPartner': '与{name}一起',
  'm21.meterNeeded': '需要 {n}% 能量（预览时已充满）。',
  'm21.teamStep': '组合终结技',
  'm21.watching': '预览 · 已播放 {n} 次',
  'm21.trying': '试一试：按顺序完成每一步',
  'm21.halfOn': '半速',
  'm21.pausedMark': '已暂停',
  'm21.pause': '暂停',
  'm21.resume': '继续',
  'm21.step': '单步',
  'm21.halfSpeed': '半速',
  'm21.fullSpeed': '全速',
  'm21.tryIt': '试一试',
  'm21.watchAgain': '再看一遍',
  'm21.leavePreview': '离开预览',
  'm21.routeDone': '路线完成！再来一次，或者再看一遍。',
  'm21.watchHint': '按 {action:Attack} 自己试一试。按 {action:Pause} 打开控制选项。',
  'm21.tryHint': '每一步命中后会打勾。按 {action:Pause} 打开控制选项。',
  'm21.previewPauseDetail': '暂停、单步、半速、自己尝试这条路线，或离开预览。',

  'm21.goal.reciprocal': '与搭档完成一次互助交接',
  'm21.goal.teamFinisher': '一起打出双神同心 {action:TeamAttack}',
  'm21.goal.pursuitControl': '把骑手打下坐骑而不撞毁他',
  'm21.goal.pursuitSave': '在追击中保护路边的人',
  'm21.goal.firearmShot': '在左轮开火前打断它',
  'm21.goal.grenadeReturn': '扔回或收好一枚破门手雷',
  'm21.goal.disarm': '缴下支援枪手的武器',
  'm21.goal.repair': '修复损坏的系统：按住 {action:Interact}',
  'm21.goal.containerOpen': '打开一个袭击者的箱子（别动合作社的物资）',
  'm21.goal.callBreak': '在信号兵的号令完成前打断它',
  'm21.goal.breachStop': '在控制破坏完成前阻止它',

  // M21 data names.
  'hero.wind.action.crosswind-arc': '横风弧',
  'hero.wind.action.low-gust-sweep': '低疾风扫',
  'hero.wind.action.eye-of-the-storm': '风暴之眼',
  'hero.fire.action.kindling-uppercut': '引火上勾拳',
  'hero.fire.action.hearth-sweep': '炉膛横扫',
  'hero.fire.action.banked-coals': '封炉余烬',
  'hero.mountain.showcase.rampart-oath': '从壁垒到誓约',
  'hero.mountain.showcase.high-bank-relay': '高堤接力',
  'hero.mountain.showcase.shoulder-gatebreaker': '肩撞接破门',
  'hero.river.showcase.current-to-tempest': '从水流到风暴',
  'hero.river.showcase.northbank-skyline': '北岸天际线',
  'hero.river.showcase.rapids-gale': '急流接疾风轮',
  'hero.wind.showcase.horizon-vigil': '从地平线到守望',
  'hero.wind.showcase.headwind-passage': '逆风通道',
  'hero.wind.showcase.crosswind-temper': '横风淬火（与火神）',
  'hero.wind.showcase.horizon-accord': '地平线接双神同心（与火神）',
  'hero.fire.showcase.furnace-crucible': '从熔炉到坩埚',
  'hero.fire.showcase.flashpoint-route': '燃点路线',
  'hero.fire.showcase.rising-ember-relay': '升腾余烬接力（与风神）',
  'store.wardrobe.mountain.greenhouse-builder.name': '温室建造者',
  'store.wardrobe.mountain.harvest-heritage.name': '丰收传承',
  'store.wardrobe.river.channel-patrol.name': '水渠巡护',
  'store.wardrobe.river.lantern-festival.name': '灯节',
  'store.wardrobe.wind.greenhouse-response.name': '温室应急',
  'store.wardrobe.wind.prosperity-festival.name': '繁荣节',
  'store.wardrobe.fire.pump-house-response.name': '泵房应急',
  'store.wardrobe.fire.ember-heritage.name': '余烬传承',
  'ach.stage2.peace-in-the-glasshouse.name': '玻璃温室里的和平',
  'ach.stage2.every-system-breathing.name': '万物呼吸',
  'ach.stage2.first-to-the-alarm.name': '闻警先至',
  'ach.stage2.guardians-in-accord.name': '守护同心',
  'ach.stage2.breach-denied.name': '破坏落空',
  'ach.stage2.seize-the-moment.name': '把握时机',
  'ach.stage2.strength-without-vengeance.name': '有力而不报复',
  'ach.stage2.silence-the-signal.name': '让信号沉默',
  'ach.stage2.breath-beneath-the-water.name': '水下的呼吸',
  'ach.stage2.seeds-for-tomorrow.name': '留给明天的种子',
  'ach.stage2.knowledge-has-many-roots.name': '知识有许多根',
  'ach.stage2.guardian-of-every-wing.name': '每一翼的守护者',
  'academy.stage2.name': '第二章学堂',
  'academy.stage2.wind.name': '风神：精准连招',
  'academy.stage2.fire.name': '火神：势头连招',
  'academy.stage2.handoff.name': '互助交接',
  'academy.stage2.accord.name': '双神同心',
  'academy.stage2.mounted.name': '骑乘稳定与保护',
  'academy.stage2.revolver.name': '谨慎的左轮',
  'academy.stage2.grenade.name': '扔回破门手雷',
  'academy.stage2.support-gun.name': '缴下支援枪',
  'academy.stage2.preservation.name': '保护与修复',
  'academy.stage2.containers.name': '辨明归属的箱子',
  'academy.stage2.signal.name': '新角色：豺狼信号兵',
  'academy.stage2.saboteur.name': '新角色：系统破坏者',
};

export const M21_DE: Catalog = {
  'm21.stageLocked': 'öffnet sich, wenn du {stage} einmal abgeschlossen hast',
  'm21.stageOpened': 'Neues Kapitel offen: {stage}',
  'm21.museumNew': 'Neu im Museum: {n}',
  'm21.dossierNew': 'Das Gönner-Dossier hat neue Erkenntnisse.',
  'm21.academyLocked': 'Öffnet sich mit Kapitel 2 (schließe Kapitel 1 einmal ab).',

  'm21.brief.stage2.1':
    'Das Wasser fließt wieder, und das Tal hat so viel gepflanzt wie seit Jahren nicht. Genau deshalb sind sie zurückgekommen.',
  'm21.brief.stage2.2':
    'Plünderer halten die Wohlstands-Gewächshäuser: die Fischbecken, die Saatgutreserve, die Heilkräuterbeete. Manche tragen jetzt Schusswaffen.',
  'm21.brief.stage2.3':
    'Wind Sentinel und Fire Warden kennen diese Hallen. Schützt zuerst die Anlagen; jedes Becken und jedes Beet, das ihr am Leben haltet, wird gezählt.',
  'm21.brief.stage2.4':
    'Ihr Anführer Marek Vane hat ein Stützfeuergewehr und eine versiegelte Kiste. Nehmt ihn lebend, wenn ihr könnt, und sichert die Kiste.',
  'm21.brief.stage2.5':
    'In den Seitenräumen liegt vielleicht, was die Genossenschaft nicht ersetzen kann. Geht hinein, wenn ihr die Zeit habt; die Hauptstraße wartet.',
  'm21.brief.stage2.objective':
    'Erobert die Wohlstands-Gewächshäuser zurück, haltet ihre Anlagen am Leben, nehmt Marek Vane fest und sichert die versiegelte Kiste.',

  'm21.whatsNewTitle': 'Was ist neu',
  'm21.whatsNewDetail': 'Die Einweisungskarten für Kapitel 2, jederzeit.',
  'm21.whatsNewDone': 'Verstanden',
  'm21.skip': 'Überspringen',
  'm21.whatsNew.twins.title': 'Die Zwillingswächter',
  'm21.whatsNew.twins.text':
    'Wind Sentinel trifft präzise und mit Reichweite; Fire Warden baut aus nächster Nähe Schwung auf. Mit einer wechselseitigen Übergabe reichen sie sich eine Kombo hin und her und teilen den Einklang der Zwillingswächter.',
  'm21.whatsNew.mounted.title': 'Berittene Verfolgung und Stabilität',
  'm21.whatsNew.mounted.text':
    'Auf der Ringstraße reitest du. Treffer und scharfes Lenken kosten Stabilität; halte sie oben, schütze die Menschen am Straßenrand und hol Reiter vom Sattel, statt sie zu Fall zu bringen.',
  'm21.whatsNew.ledger.title': 'Das Erhaltungsbuch',
  'm21.whatsNew.ledger.text':
    'Jedes Becken, jedes Beet und jede Pumpe der Gewächshäuser steht im Buch. Schäden senken es, Reparaturen heben es, und deine Bewahrungsnote entscheidet, wie sich das Tal erholt.',
  'm21.whatsNew.weapons.title': 'Schusswaffen und Granaten',
  'm21.whatsNew.weapons.text':
    'Manche Plünderer tragen Revolver, Aufbruchgranaten und ein Stützfeuergewehr. Unterbrich das Ziehen, wirf eine fallengelassene Granate zurück oder sichere sie und entwaffne den Schützen: Eine erbeutete Waffe beendet den Kampf, sie dient nicht der Rache.',
  'm21.whatsNew.containers.title': 'Wem gehört die Kiste?',
  'm21.whatsNew.containers.text':
    'Kisten und Spinde gehören jemandem. Die Verstecke der Plünderer darfst du öffnen; die Vorräte der Genossenschaft werden zurückgegeben, nicht genommen.',
  'm21.whatsNew.enemies.title': 'Neue Gegnerrollen',
  'm21.whatsNew.enemies.text':
    'Der Schakal-Signalgeber ruft die anderen in Formation: unterbrich seinen Ruf. Die Systemsaboteurin geht an die Steuerung: stoppe den Eingriff, bevor er abgeschlossen ist.',

  'm21.museum': 'Museum',
  'm21.museumDetail': 'Bilder, Kino, Musik, Klänge, die Sammlung und die Ermittlung.',
  'm21.newMark': '{n} neu',
  'm21.section.picture': 'Bilder',
  'm21.section.cinema': 'Kino',
  'm21.section.music': 'Musik',
  'm21.section.sound': 'Klänge',
  'm21.section.collection': 'Sammlung',
  'm21.section.investigation': 'Ermittlung',
  'm21.sectionIntro.picture': 'Bilder aus den Kapiteln, die du gespielt hast.',
  'm21.sectionIntro.cinema': 'Sieh dir die Zwischensequenzen noch einmal an.',
  'm21.sectionIntro.music': 'Hör dir die Musik an. Wähle ein Stück und drücke „Anhören“.',
  'm21.sectionIntro.sound': 'Die Klänge der Kämpfe und des Dorfes.',
  'm21.sectionIntro.collection': 'Unterwegs geborgene Gegenstände: Jeder hat seine Geschichte.',
  'm21.sectionIntro.investigation': 'Was wir darüber wissen, wer die Plünderer ausrüstet.',
  'm21.museumEmpty': 'Hier ist noch nichts.',
  'm21.undiscovered': 'Unentdeckt',
  'm21.guestMuseum': 'Ein Gast darf sich umsehen, aber nichts wird gespeichert.',
  'm21.play': 'Abspielen',
  'm21.listen': 'Anhören',
  'm21.stop': 'Stopp',

  'museum.picture.s1-intro-01.name': 'Das Tal vor der Dürre',
  'museum.picture.s1-intro-03.name': 'Der Fluss bleibt stehen',
  'museum.picture.s1-intro-05.name': 'Die Gründer antworten',
  'museum.picture.s1-brief-01.name': 'Die Einweisung der Ältesten',
  'museum.picture.s1-end-01.name': 'Wasser in den Kanälen',
  'museum.picture.s1-end-03.name': 'Der Wasserpakt ist erneuert',
  'museum.picture.keyart-title.name': 'Titelbild von Fight for Peace',
  'museum.picture.select-wind.name': 'Porträt: Wind Sentinel',
  'museum.picture.select-fire.name': 'Porträt: Fire Warden',
  'museum.cinema.stage1.intro.name': 'Kapitel 1, Anfang: Der gebrochene Wasserpakt',
  'museum.cinema.stage1.intro.desc':
    'Wie der Fluss stehen blieb und warum die Gründer zur Schleuse gingen.',
  'museum.cinema.stage1.ending.name': 'Kapitel 1, Ende: Der Fluss kehrt zurück',
  'museum.cinema.stage1.ending.desc':
    'Das Wasser kommt zurück und mit ihm die erste Spur einer fremden Hand.',
  'museum.sound.exact-block.name': 'Exakter Block',
  'museum.sound.heavy-hit.name': 'Schwerer Treffer',
  'museum.sound.ultimate.name': 'Ultimate',
  'museum.sound.team-finisher.name': 'Team-Finisher',
  'museum.sound.worker-freed.name': 'Ein Arbeiter befreit',
  'museum.sound.river-restored.name': 'Der Fluss fließt wieder',
  'museum.collection.brass-gears.name': 'Messingzahnräder',
  'museum.collection.brass-gears.desc':
    'Gefräste Zahnräder aus der sabotierten Schleuse. Niemand im Tal stellt solche Teile her.',
  'museum.collection.early-aerator-impeller.name': 'Frühes Belüfterlaufrad',
  'museum.collection.early-aerator-impeller.desc':
    'Das erste Laufrad, das die Genossenschaft je gegossen hat. In der Nacht des Stromausfalls hielt es die Fische am Atmen.',
  'museum.collection.first-harvest-seed-tin.name': 'Saatdose der ersten Ernte',
  'museum.collection.first-harvest-seed-tin.desc':
    'Saatgut der ersten Ernte nach der Rückkehr des Wassers, aufbewahrt für schlechte Jahre.',
  'museum.collection.medicinal-cooperative-field-card.name':
    'Feldkarte der Heilkräuter-Genossenschaft',
  'museum.collection.medicinal-cooperative-field-card.desc':
    'Die Karte einer Gärtnerin: woher jedes Heilkräuterbeet stammt und wer es pflegt.',
  'museum.collection.sealed-weapon-crate.name': 'Die versiegelte Waffenkiste',
  'museum.collection.sealed-weapon-crate.desc':
    'Marek Vanes Kiste, noch versiegelt. Das Siegel ist dasselbe wie auf den Zahnrädern der Schleuse.',

  'm21.dossierTitle': 'Gönner-Dossier',
  'm21.dossierEmpty':
    'Noch keine Erkenntnisse. Schließe ein Kapitel ab, um die Ermittlung zu beginnen.',
  'm21.factsTitle': 'Bestätigte Fakten',
  'm21.theoryTitle': 'Aktuelle Vermutung',
  'dossier.fact.brass-gears':
    'Die Schleuse war mit gefrästen Messingzahnrädern blockiert, die niemand im Tal herstellen konnte.',
  'dossier.theory.outside-hand': 'Jemand außerhalb des Tals wollte, dass der Fluss stehen bleibt.',
  'dossier.fact.crate-seal':
    'Marek Vanes Waffenkiste trägt dasselbe Siegel wie die Messingzahnräder an der Schleuse.',
  'dossier.fact.order-code':
    'Der Bestellcode der Kiste führt zu einem Nachschublager; als die Wächter ankamen, war es leer.',
  'dossier.theory.one-supplier':
    'Die Sabotage an der Schleuse und der bewaffnete Überfall wurden vom selben Lieferanten ausgerüstet.',
  'm21.researchTitle': 'Formelforschung',
  'm21.researchIntro':
    'Die Wachstumsformel der Genossenschaft, sorgfältig untersucht: ein Meilenstein nach dem anderen.',
  'm21.milestoneDone': 'erreicht',
  'm21.milestoneOpen': 'noch offen',
  'm21.inputsTitle': 'Festgehalten für den nächsten Meilenstein',
  'research.quarantine-provenance.name': 'Quarantäne und Herkunft',
  'research.quarantine-provenance.desc':
    'Die geborgene Formel wird verwahrt und ihre Herkunft festgehalten, bevor jemand sie untersucht.',
  'research.independent-replication.name': 'Unabhängige Wiederholung',
  'research.independent-replication.desc':
    'Ein anderes Team muss allein zu denselben Ergebnissen kommen, bevor jemand ihnen traut.',
  'research.safety-review.name': 'Sicherheitsprüfung',
  'research.safety-review.desc':
    'Gärtner und Heilkundige prüfen, was schiefgehen könnte und für wen, bevor es weitergeht.',
  'research.approved-preparation.name': 'Genehmigte Zubereitung',
  'research.approved-preparation.desc':
    'Nur was jede Prüfung bestanden hat, wird zubereitet, von den Menschen, denen man es anvertraut.',
  'research.input.formula-handover': 'Die Formel und die Quellnotizen, die Tomas Rell herausgab.',
  'research.input.provenance-ledger':
    'Das Herkunftsbuch aus der Arzneiküche: woher jede Probe stammt.',

  'm21.slot': 'Platz: {slot}',
  'm21.purpose.mountain.skybreak-column':
    'Schleudert ein Ziel senkrecht hoch für einen Luftangriff; langsamer als die Standardoption.',
  'm21.purpose.mountain.still-mountain':
    'Hält die Stellung und antwortet einer anstürmenden Gruppe, statt vorzurücken.',
  'm21.purpose.river.waterspout-rise':
    'Hebt ein Ziel in die Luft für ein Jonglieren; weniger Reichweite am Boden.',
  'm21.purpose.river.floodline-passage':
    'Trägt dich durch eine Gruppe hindurch auf die andere Seite; weniger Schaden an einem einzelnen Ziel.',
  'm21.purpose.wind.crosswind-arc':
    'Ein Bogen gegen Flieger und Springer; deckt weniger Boden ab als die Standardoption.',
  'm21.purpose.wind.low-gust-sweep':
    'Ein tiefer Feger gegen eine hohe Deckung; kurze Reichweite, leicht zu bestrafen, wenn er verfehlt.',
  'm21.purpose.wind.eye-of-the-storm':
    'Zieht den Kampf zu dir und hält einen ruhigen Raum um dich; weniger Schaden als das Standard-Ultimate.',
  'm21.purpose.fire.kindling-uppercut':
    'Ein steigender Aufwärtshaken, der aus nächster Nähe Luftketten eröffnet; kaum Reichweite.',
  'm21.purpose.fire.hearth-sweep':
    'Ein tiefer Feger, der eine Gruppe in deiner Nähe von den Füßen holt; lange Erholung.',
  'm21.purpose.fire.banked-coals':
    'Ein Schritt zurück, der deine Glut für einen stärkeren nächsten Angriff sammelt; trifft allein schwächer.',

  'm21.moveList': 'Bewegungsliste und Vorschau',
  'm21.moveListDetail': 'Vorführrouten, Kombo-Rezepte und Techniken, für dich vorgespielt.',
  'm21.moveListIntro':
    'Wähle eine Route, um sie an einer Trainingspuppe vorgespielt zu sehen. Dann probiere sie selbst.',
  'm21.showcases': 'Vorführrouten',
  'm21.recipes': 'Kombo-Rezepte',
  'm21.techniques': 'Techniken',
  'm21.preview': 'Vorschau',
  'm21.withPartner': 'mit {name}',
  'm21.meterNeeded': 'Braucht {n} % Leiste (für die Vorschau gefüllt).',
  'm21.teamStep': 'Team-Finisher',
  'm21.watching': 'Vorschau · {n}-mal gespielt',
  'm21.trying': 'Probier es: führe die Schritte der Reihe nach aus',
  'm21.halfOn': 'halbe Geschwindigkeit',
  'm21.pausedMark': 'pausiert',
  'm21.pause': 'Pause',
  'm21.resume': 'Weiter',
  'm21.step': 'Schritt',
  'm21.halfSpeed': 'Halbe Geschwindigkeit',
  'm21.fullSpeed': 'Volle Geschwindigkeit',
  'm21.tryIt': 'Probier es',
  'm21.watchAgain': 'Noch einmal ansehen',
  'm21.leavePreview': 'Vorschau verlassen',
  'm21.routeDone': 'Route geschafft! Noch einmal, oder sieh sie dir erneut an.',
  'm21.watchHint':
    'Drücke {action:Attack}, um es selbst zu probieren. {action:Pause} für die Steuerung.',
  'm21.tryHint': 'Schritte werden abgehakt, sobald sie treffen. {action:Pause} für die Steuerung.',
  'm21.previewPauseDetail':
    'Pause, Schritt, halbe Geschwindigkeit, die Route selbst probieren oder die Vorschau verlassen.',

  'm21.goal.reciprocal': 'Lande mit deinem Partner eine wechselseitige Übergabe',
  'm21.goal.teamFinisher': 'Landet gemeinsam den Einklang der Zwillingswächter {action:TeamAttack}',
  'm21.goal.pursuitControl': 'Hol einen Reiter vom Sattel, ohne ihn zu Fall zu bringen',
  'm21.goal.pursuitSave': 'Schütze während der Verfolgung jemanden am Straßenrand',
  'm21.goal.firearmShot': 'Unterbrich einen Revolver vor dem Schuss',
  'm21.goal.grenadeReturn': 'Wirf eine Aufbruchgranate zurück oder sichere sie',
  'm21.goal.disarm': 'Entwaffne den Stützfeuerschützen',
  'm21.goal.repair': 'Repariere eine beschädigte Anlage: halte {action:Interact}',
  'm21.goal.containerOpen':
    'Öffne einen Behälter der Plünderer (lass die Vorräte der Genossenschaft stehen)',
  'm21.goal.callBreak': 'Unterbrich den Ruf eines Signalgebers, bevor er fertig ist',
  'm21.goal.breachStop': 'Stoppe einen Steuerungseingriff, bevor er abgeschlossen ist',

  // M21 data names.
  'hero.wind.action.crosswind-arc': 'Seitenwindbogen',
  'hero.wind.action.low-gust-sweep': 'Tiefer Böenfeger',
  'hero.wind.action.eye-of-the-storm': 'Auge des Sturms',
  'hero.fire.action.kindling-uppercut': 'Zunder-Aufwärtshaken',
  'hero.fire.action.hearth-sweep': 'Herdfeger',
  'hero.fire.action.banked-coals': 'Gehütete Glut',
  'hero.mountain.showcase.rampart-oath': 'Vom Bollwerk zum Schwur',
  'hero.mountain.showcase.high-bank-relay': 'Hochufer-Staffel',
  'hero.mountain.showcase.shoulder-gatebreaker': 'Schulter in den Torbrecher',
  'hero.river.showcase.current-to-tempest': 'Von der Strömung zum Sturm',
  'hero.river.showcase.northbank-skyline': 'Nordufer-Horizont',
  'hero.river.showcase.rapids-gale': 'Stromschnellen ins Sturmrad',
  'hero.wind.showcase.horizon-vigil': 'Vom Horizont zur Wacht',
  'hero.wind.showcase.headwind-passage': 'Gegenwind-Durchgang',
  'hero.wind.showcase.crosswind-temper': 'Seitenwind-Härtung (mit Fire Warden)',
  'hero.wind.showcase.horizon-accord':
    'Horizont in den Einklang der Zwillingswächter (mit Fire Warden)',
  'hero.fire.showcase.furnace-crucible': 'Vom Ofen zum Tiegel',
  'hero.fire.showcase.flashpoint-route': 'Flammpunkt-Route',
  'hero.fire.showcase.rising-ember-relay': 'Steigende-Glut-Staffel (mit Wind Sentinel)',
  'store.wardrobe.mountain.greenhouse-builder.name': 'Gewächshausbauer',
  'store.wardrobe.mountain.harvest-heritage.name': 'Erntetradition',
  'store.wardrobe.river.channel-patrol.name': 'Kanalstreife',
  'store.wardrobe.river.lantern-festival.name': 'Laternenfest',
  'store.wardrobe.wind.greenhouse-response.name': 'Gewächshaus-Einsatz',
  'store.wardrobe.wind.prosperity-festival.name': 'Wohlstandsfest',
  'store.wardrobe.fire.pump-house-response.name': 'Pumpenhaus-Einsatz',
  'store.wardrobe.fire.ember-heritage.name': 'Glut-Tradition',
  'ach.stage2.peace-in-the-glasshouse.name': 'Frieden im Glashaus',
  'ach.stage2.every-system-breathing.name': 'Jede Anlage atmet',
  'ach.stage2.first-to-the-alarm.name': 'Als Erste beim Alarm',
  'ach.stage2.guardians-in-accord.name': 'Wächter im Einklang',
  'ach.stage2.breach-denied.name': 'Eingriff verhindert',
  'ach.stage2.seize-the-moment.name': 'Den Moment ergreifen',
  'ach.stage2.strength-without-vengeance.name': 'Stärke ohne Rache',
  'ach.stage2.silence-the-signal.name': 'Das Signal verstummt',
  'ach.stage2.breath-beneath-the-water.name': 'Atem unter Wasser',
  'ach.stage2.seeds-for-tomorrow.name': 'Saat für morgen',
  'ach.stage2.knowledge-has-many-roots.name': 'Wissen hat viele Wurzeln',
  'ach.stage2.guardian-of-every-wing.name': 'Wächter jedes Flügels',
  'academy.stage2.name': 'Akademie Kapitel 2',
  'academy.stage2.wind.name': 'Wind Sentinel: Präzisionskette',
  'academy.stage2.fire.name': 'Fire Warden: Schwungkette',
  'academy.stage2.handoff.name': 'Wechselseitige Übergaben',
  'academy.stage2.accord.name': 'Einklang der Zwillingswächter',
  'academy.stage2.mounted.name': 'Stabilität im Sattel und Schutz',
  'academy.stage2.revolver.name': 'Der bedächtige Revolver',
  'academy.stage2.grenade.name': 'Die Aufbruchgranate zurückwerfen',
  'academy.stage2.support-gun.name': 'Das Stützfeuergewehr entwaffnen',
  'academy.stage2.preservation.name': 'Bewahrung und Reparatur',
  'academy.stage2.containers.name': 'Behälter und ihre Besitzer',
  'academy.stage2.signal.name': 'Neue Rollen: der Schakal-Signalgeber',
  'academy.stage2.saboteur.name': 'Neue Rollen: die Systemsaboteurin',
};

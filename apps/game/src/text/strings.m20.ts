import type { Catalog } from '@ffp/platform';

/**
 * M20 Stage 2 journey: HUD banners and branch signs, the results lines (Preservation,
 * Civil-Protection Response, branches, Marek's capture), the layered epilogue's cards and
 * the Chinese and German names of the M20 data (the stage, its beats, branches and
 * artifacts, the new rooms and the seed reserve). The English data names come from the
 * YAML files through dataCatalog().
 */
export const M20_EN = {
  'm20.evidenceReady': 'MAREK CAPTURED · SECURE THE CRATE',
  'm20.branch.1': 'BRANCH COMPLETE',
  'm20.branch.2': 'BRANCH GOAL MISSED',
  'm20.sign.branch': '↑ upper lane: {name} (optional)',
  'm20.sign.main': '↓ lower lane: {name}',
  'm20.resultsTitle': 'Stage 2 complete · Prosperity Under Siege',
  'm20.preservation': 'Preservation: {grade} ({n}%)',
  'm20.response': 'Civil-Protection Response: {grade} ({n}%) · rewinds {r}',
  'm20.ledgerTitle': 'Preservation Ledger',
  'm20.branchesTitle': 'Optional branches',
  'm20.outcome.0': 'skipped',
  'm20.outcome.1': 'completed',
  'm20.outcome.2': 'goal missed',
  'm20.artifact': 'Museum artifact: {name}',
  'm20.capture.1': 'Marek Vane: Resolve surrender',
  'm20.capture.2': 'Marek Vane: forced capture',
  'm20.gun.0': 'support gun never lost',
  'm20.gun.1': 'support gun seized with {n} rounds',
  'm20.gun.2': 'support gun broken',
  'm20.gun.3': 'support gun emptied',
  'm20.intercept.0': 'no intercept',
  'm20.intercept.1': 'intercept broken',
  'm20.intercept.2': 'intercept: forced dismount',
  'm20.scorch.0': 'no Scorched Claim',
  'm20.scorch.stopped': 'Scorched Claim stopped',
  'm20.scorch.done': 'Scorched Claim completed',
  'm20.sponsorHook':
    'The seal matches and the depot is empty: whoever equips the raiders is still out there.',
  'm20.epilogue': 'Epilogue',
  'm20.next': 'Next',
  'm20.skip': 'Skip to the results',
  'epilogue.stage2.capture.resolve':
    'His Resolve broken, Marek drops what he holds and kneels. He accepts the restraints without another word.',
  'epilogue.stage2.capture.forced':
    'Marek makes one last lunge for a weapon. The heroes stop him safely, disarm him and restrain him.',
  'epilogue.stage2.secured':
    'The remaining raiders are secured, the hazards are made safe, and the greenhouse crews confirm that every critical system can recover.',
  'epilogue.stage2.ledger.aquatic.sound': 'The fish and shrimp tanks never stopped breathing.',
  'epilogue.stage2.ledger.aquatic.damaged':
    'Some tanks clouded over, but the aeration crew kept the stock alive through the night.',
  'epilogue.stage2.ledger.aquatic.recovering':
    'The aquatic halls took heavy damage; the backup air held, and every tank can be restocked.',
  'epilogue.stage2.ledger.crops.sound': 'The crop channels and medicinal beds stand untouched.',
  'epilogue.stage2.ledger.crops.damaged':
    'Trampled rows are replanted by morning; most of the harvest is saved.',
  'epilogue.stage2.ledger.crops.recovering':
    'Many beds were lost, but the seedlings survive to start again.',
  'epilogue.stage2.ledger.systems.sound':
    'Pumps, filtration and glazing run as if nothing happened.',
  'epilogue.stage2.ledger.systems.damaged':
    'Repair crews patch pumps and controls; the water keeps moving.',
  'epilogue.stage2.ledger.systems.recovering':
    'The systems run on safe fallback until the repairs are done. Nothing essential was lost.',
  'epilogue.stage2.ledger.supplies.sound': 'The research cargo and the supplies are intact.',
  'epilogue.stage2.ledger.supplies.damaged':
    'Some crates are scorched, but the research material is safe.',
  'epilogue.stage2.ledger.supplies.recovering':
    'Much of the cargo is damaged; what matters most is salvaged.',
  'epilogue.stage2.formula':
    'Tomas hands over the formula, his source notes and what he knows of where it came from. The clinic seals it all for independent validation; it is not medicine until it is proven.',
  'epilogue.stage2.seal':
    'The marked weapon crate bears the same seal as the gears from the sluice. A returning founder recognises it, and the elder compares the two incomplete order codes: the same structure.',
  'epilogue.stage2.justice':
    'Marek is treated under guard and held for a documented transfer to the Regional Civil Protection Council. Tomas receives care and provisions and is escorted out of the valley at dawn; the Council is told.',
  'epilogue.stage2.branch.aeration':
    'The annex worker is back with the aquaculture crew. The Early Aerator Impeller goes to the Museum.',
  'epilogue.stage2.branch.seed':
    'The sealed seed reserves are safe. The First-Harvest Seed Tin goes to the Museum.',
  'epilogue.stage2.branch.medicinal':
    'The rescued researcher and the provenance ledger show the formula had many contributors. The Medicinal Cooperative Field Card goes to the Museum.',
  'epilogue.stage2.recovery.flourishing':
    'By evening the greenhouse is flourishing again: workers reunited, every system breathing.',
  'epilogue.stage2.recovery.secure':
    'The village gathers to clear the damage. The greenhouse is secure, and the work goes on together.',
  'epilogue.stage2.recovery.strained':
    'It will take weeks of shared work, but the village rebuilds what the raid broke.',
  'epilogue.stage2.recovery.recovered':
    'The raid cost the greenhouse dearly. Neighbours arrive with tools and seed: together, it will grow again.',
  'epilogue.stage2.depot':
    'Scouts reach the intermediary depot at dawn. It is empty, cleared in a hurry. The sponsor remains unknown.',
  'grade.preservation': 'Preservation (Ledger)',
  'grade.response': 'Civil-Protection Response',
} as const;

export const M20_ZH: Catalog = {
  'm20.evidenceReady': '马雷克被擒 · 收缴武器箱',
  'm20.branch.1': '支线完成',
  'm20.branch.2': '支线目标未达成',
  'm20.sign.branch': '↑ 上方通道：{name}（可选）',
  'm20.sign.main': '↓ 下方通道：{name}',
  'm20.resultsTitle': '第二章完成 · 繁荣之围',
  'm20.preservation': '保护记录：{grade}（{n}%）',
  'm20.response': '民防响应：{grade}（{n}%）· 回退 {r} 次',
  'm20.ledgerTitle': '保护记录明细',
  'm20.branchesTitle': '可选支线',
  'm20.outcome.0': '未进入',
  'm20.outcome.1': '已完成',
  'm20.outcome.2': '目标未达成',
  'm20.artifact': '博物馆藏品：{name}',
  'm20.capture.1': '马雷克·瓦恩：意志崩溃投降',
  'm20.capture.2': '马雷克·瓦恩：强制擒获',
  'm20.gun.0': '支援机枪未曾失手',
  'm20.gun.1': '夺下支援机枪，剩余 {n} 发',
  'm20.gun.2': '支援机枪损毁',
  'm20.gun.3': '支援机枪弹药耗尽',
  'm20.intercept.0': '未进行拦截',
  'm20.intercept.1': '拦截成功',
  'm20.intercept.2': '拦截：被迫下车',
  'm20.scorch.0': '未发动焦土夺取',
  'm20.scorch.stopped': '焦土夺取被阻止',
  'm20.scorch.done': '焦土夺取得逞',
  'm20.sponsorHook': '印记吻合，中转仓库却已人去楼空：武装袭击者的幕后之人仍在暗处。',
  'm20.epilogue': '尾声',
  'm20.next': '继续',
  'm20.skip': '跳到结算',
  'epilogue.stage2.capture.resolve':
    '意志被击溃的马雷克放下手中之物，跪倒在地，一言不发地接受了束缚。',
  'epilogue.stage2.capture.forced': '马雷克最后一次扑向武器。英雄们安全地拦下他，缴械并将他制服。',
  'epilogue.stage2.secured':
    '剩余的袭击者被控制，危险已被排除，温室工作人员确认所有关键系统都能恢复。',
  'epilogue.stage2.ledger.aquatic.sound': '鱼缸和虾池的供氧从未中断。',
  'epilogue.stage2.ledger.aquatic.damaged':
    '部分水池变得浑浊，但增氧班组整夜守护，鱼虾都活了下来。',
  'epilogue.stage2.ledger.aquatic.recovering':
    '水产大厅损失惨重；备用供氧坚持住了，每个水池都能重新放养。',
  'epilogue.stage2.ledger.crops.sound': '作物水渠和药用苗床完好无损。',
  'epilogue.stage2.ledger.crops.damaged': '被踩坏的苗垄天亮前重新种好，大部分收成保住了。',
  'epilogue.stage2.ledger.crops.recovering': '许多苗床毁了，但幼苗活了下来，可以重新开始。',
  'epilogue.stage2.ledger.systems.sound': '水泵、过滤和玻璃顶照常运转，仿佛什么都没发生。',
  'epilogue.stage2.ledger.systems.damaged': '维修班组修补水泵和控制台，水流从未停下。',
  'epilogue.stage2.ledger.systems.recovering':
    '各系统以安全降级模式运行，直到修复完成。没有任何关键设施损失。',
  'epilogue.stage2.ledger.supplies.sound': '研究货物和物资完好无损。',
  'epilogue.stage2.ledger.supplies.damaged': '几只箱子被烧焦，但研究资料安然无恙。',
  'epilogue.stage2.ledger.supplies.recovering': '大部分货物受损，最重要的东西被抢救了出来。',
  'epilogue.stage2.formula':
    '托马斯交出配方、原始笔记以及他所知道的来源。诊所将这一切封存，等待独立验证；在得到证实之前，它还不是药。',
  'epilogue.stage2.seal':
    '带标记的武器箱上的印记与水闸处齿轮上的相同。归来的创始英雄认出了它，长老比对两段不完整的订单编号：结构一模一样。',
  'epilogue.stage2.justice':
    '马雷克在看守下接受治疗，并被羁押，等待有记录地移交给区域民防委员会。托马斯得到治疗和补给，于黎明时分被护送出山谷；委员会已获通报。',
  'epilogue.stage2.branch.aeration': '增氧附属间的工人回到了水产班组。早期增氧叶轮被送进博物馆。',
  'epilogue.stage2.branch.seed': '密封的种子储备安然无恙。首次丰收种子罐被送进博物馆。',
  'epilogue.stage2.branch.medicinal':
    '获救的研究员和来源账簿表明，这个配方出自多位贡献者之手。药用合作社田野卡片被送进博物馆。',
  'epilogue.stage2.recovery.flourishing':
    '傍晚时分，温室再次欣欣向荣：工人们团聚，每个系统都在呼吸。',
  'epilogue.stage2.recovery.secure': '村民们聚在一起清理损坏。温室稳固如初，大家一起继续工作。',
  'epilogue.stage2.recovery.strained': '需要数周的共同努力，但村庄会重建被袭击破坏的一切。',
  'epilogue.stage2.recovery.recovered':
    '这次袭击让温室损失惨重。邻居们带着工具和种子赶来：齐心协力，它会再次生长。',
  'epilogue.stage2.depot':
    '侦察员在黎明时分赶到中转仓库。那里空无一人，显然被匆忙清空。幕后资助者依然不明。',
  'grade.preservation': '保护（记录）',
  'grade.response': '民防响应',
  // Data names.
  'stage.stage2.name': '繁荣之围',
  'stage.stage2.beat.perimeter.name': '外围追击',
  'stage.stage2.beat.perimeter.objective': '沿服务道路骑行，在温室前截住袭击者',
  'stage.stage2.beat.loading-yard.name': '装卸场',
  'stage.stage2.beat.loading-yard.objective': '夺回安全门旁的装卸场',
  'stage.stage2.beat.aquaculture.name': '水产大厅',
  'stage.stage2.beat.aquaculture.objective': '保护鱼虾养殖系统',
  'stage.stage2.beat.aeration-annex.name': '应急增氧附属间',
  'stage.stage2.beat.aeration-annex.objective': '救出维修工人，保持备用增氧运转',
  'stage.stage2.beat.vestibule.name': '卫生缓冲间',
  'stage.stage2.beat.vestibule.objective': '封闭缓冲间，喘口气',
  'stage.stage2.beat.crop-channels.name': '作物水渠',
  'stage.stage2.beat.crop-channels.objective': '把袭击者赶出作物水渠',
  'stage.stage2.beat.seed-bay.name': '种子储备间',
  'stage.stage2.beat.seed-bay.objective': '阻止袭击者夺走密封的种子储备',
  'stage.stage2.beat.medicinal-wing.name': '药用植物区',
  'stage.stage2.beat.medicinal-wing.objective': '守住药用植物区',
  'stage.stage2.beat.prep-room.name': '药物制备室',
  'stage.stage2.beat.prep-room.objective': '救出研究员，找回来源账簿',
  'stage.stage2.beat.prep-room.clue':
    '来源账簿：托马斯提供的配方由多位贡献者的笔记拼合而成，其中包括一个研究合作社。',
  'stage.stage2.beat.filtration.name': '过滤控制室',
  'stage.stage2.beat.filtration.objective': '阻止控制系统破坏，守住过滤系统',
  'stage.stage2.beat.production-hall.name': '生产大厅',
  'stage.stage2.beat.production-hall.objective': '击溃占据生产大厅的袭击者',
  'stage.stage2.beat.recovery-bay.name': '休整间',
  'stage.stage2.beat.recovery-bay.objective': '进入调度场前休整并检查装备',
  'stage.stage2.beat.intercept.name': '调度摩托',
  'stage.stage2.beat.intercept.objective': '在马雷克到达货场前拦住他',
  'stage.stage2.beat.dispatch-yard.name': '调度场',
  'stage.stage2.beat.dispatch-yard.objective': '擒获马雷克·瓦恩',
  'stage.stage2.beat.dispatch-yard.evidence':
    '马雷克摩托上的一只武器箱带着与水闸齿轮相同的印记，订单编号也相互关联：同一个外部供应者装备了两次袭击。',
  'stage.stage2.branch.aeration': '应急增氧附属间',
  'stage.stage2.branch.aeration.artifact': '早期增氧叶轮',
  'stage.stage2.branch.seed': '种子储备间',
  'stage.stage2.branch.seed.artifact': '首次丰收种子罐',
  'stage.stage2.branch.medicinal': '药物制备室',
  'stage.stage2.branch.medicinal.artifact': '药用合作社田野卡片',
  'gh.asset.seed-reserve': '种子储备',
  'gh.room.s2-aquaculture-hall': '水产大厅',
  'gh.room.s2-aeration-annex': '应急增氧附属间',
  'gh.room.s2-hygiene-vestibule': '卫生缓冲间',
  'gh.room.s2-crop-channels': '作物水渠',
  'gh.room.s2-seed-reserve-bay': '种子储备间',
  'gh.room.s2-medicinal-wing': '药用植物区',
  'gh.room.s2-medicinal-prep-room': '药物制备室',
  'gh.room.s2-production-hall': '生产大厅',
  'gh.room.s2-recovery-bay': '休整间',
};

export const M20_DE: Catalog = {
  'm20.evidenceReady': 'MAREK GEFASST · SICHERT DIE KISTE',
  'm20.branch.1': 'NEBENWEG GESCHAFFT',
  'm20.branch.2': 'ZIEL DES NEBENWEGS VERFEHLT',
  'm20.sign.branch': '↑ obere Spur: {name} (optional)',
  'm20.sign.main': '↓ untere Spur: {name}',
  'm20.resultsTitle': 'Kapitel 2 geschafft · Wohlstand unter Belagerung',
  'm20.preservation': 'Bewahrung: {grade} ({n} %)',
  'm20.response': 'Zivilschutz-Einsatz: {grade} ({n} %) · Rücksetzer {r}',
  'm20.ledgerTitle': 'Bewahrungsbuch',
  'm20.branchesTitle': 'Optionale Nebenwege',
  'm20.outcome.0': 'ausgelassen',
  'm20.outcome.1': 'geschafft',
  'm20.outcome.2': 'Ziel verfehlt',
  'm20.artifact': 'Museumsstück: {name}',
  'm20.capture.1': 'Marek Vane: Aufgabe nach Willensbruch',
  'm20.capture.2': 'Marek Vane: erzwungene Festnahme',
  'm20.gun.0': 'Stützwaffe nie verloren',
  'm20.gun.1': 'Stützwaffe mit {n} Schuss erbeutet',
  'm20.gun.2': 'Stützwaffe zerbrochen',
  'm20.gun.3': 'Stützwaffe leergeschossen',
  'm20.intercept.0': 'kein Abfangen',
  'm20.intercept.1': 'Abfangen gelungen',
  'm20.intercept.2': 'Abfangen: erzwungenes Absteigen',
  'm20.scorch.0': 'kein Verbrannter Anspruch',
  'm20.scorch.stopped': 'Verbrannter Anspruch gestoppt',
  'm20.scorch.done': 'Verbrannter Anspruch vollendet',
  'm20.sponsorHook':
    'Das Siegel passt, das Depot ist leer: Wer die Plünderer ausrüstet, ist noch immer da draußen.',
  'm20.epilogue': 'Epilog',
  'm20.next': 'Weiter',
  'm20.skip': 'Zur Auswertung springen',
  'epilogue.stage2.capture.resolve':
    'Sein Wille ist gebrochen: Marek lässt fallen, was er hält, und kniet nieder. Wortlos lässt er sich fesseln.',
  'epilogue.stage2.capture.forced':
    'Marek greift ein letztes Mal nach einer Waffe. Die Helden halten ihn sicher auf, entwaffnen und fesseln ihn.',
  'epilogue.stage2.secured':
    'Die übrigen Plünderer sind festgesetzt, die Gefahren gebannt, und die Gewächshaus-Teams bestätigen: Jedes wichtige System kann sich erholen.',
  'epilogue.stage2.ledger.aquatic.sound': 'Fisch- und Garnelenbecken haben nie aufgehört zu atmen.',
  'epilogue.stage2.ledger.aquatic.damaged':
    'Einige Becken trübten ein, doch das Belüftungsteam hielt den Bestand die Nacht über am Leben.',
  'epilogue.stage2.ledger.aquatic.recovering':
    'Die Aquakulturhallen sind schwer getroffen; die Notbelüftung hielt, und jedes Becken kann neu besetzt werden.',
  'epilogue.stage2.ledger.crops.sound': 'Anbaurinnen und Heilpflanzenbeete stehen unberührt.',
  'epilogue.stage2.ledger.crops.damaged':
    'Zertrampelte Reihen sind bis zum Morgen neu gepflanzt; der Großteil der Ernte ist gerettet.',
  'epilogue.stage2.ledger.crops.recovering':
    'Viele Beete sind verloren, doch die Setzlinge überleben und fangen neu an.',
  'epilogue.stage2.ledger.systems.sound':
    'Pumpen, Filter und Verglasung laufen, als wäre nichts geschehen.',
  'epilogue.stage2.ledger.systems.damaged':
    'Reparaturteams flicken Pumpen und Steuerungen; das Wasser fließt weiter.',
  'epilogue.stage2.ledger.systems.recovering':
    'Die Systeme laufen im sicheren Notbetrieb, bis die Reparaturen fertig sind. Nichts Lebenswichtiges ging verloren.',
  'epilogue.stage2.ledger.supplies.sound': 'Forschungsfracht und Vorräte sind unversehrt.',
  'epilogue.stage2.ledger.supplies.damaged':
    'Ein paar Kisten sind angesengt, doch das Forschungsmaterial ist sicher.',
  'epilogue.stage2.ledger.supplies.recovering':
    'Viel Fracht ist beschädigt; das Wichtigste ist gerettet.',
  'epilogue.stage2.formula':
    'Tomas übergibt die Formel, seine Quellennotizen und was er über ihre Herkunft weiß. Die Klinik versiegelt alles für eine unabhängige Prüfung: Ein Heilmittel ist es erst, wenn es bewiesen ist.',
  'epilogue.stage2.seal':
    'Die markierte Waffenkiste trägt dasselbe Siegel wie die Zahnräder von der Schleuse. Ein zurückgekehrter Gründer erkennt es, und die Älteste vergleicht die beiden unvollständigen Bestellnummern: derselbe Aufbau.',
  'epilogue.stage2.justice':
    'Marek wird unter Bewachung versorgt und für eine dokumentierte Übergabe an den Regionalen Zivilschutzrat festgehalten. Tomas erhält Pflege und Vorräte und wird im Morgengrauen aus dem Tal geleitet; der Rat wird unterrichtet.',
  'epilogue.stage2.branch.aeration':
    'Der Arbeiter aus dem Nebenraum ist zurück bei der Aquakultur-Mannschaft. Das Frühe Belüfterlaufrad kommt ins Museum.',
  'epilogue.stage2.branch.seed':
    'Die versiegelten Saatgutreserven sind sicher. Die Saatdose der ersten Ernte kommt ins Museum.',
  'epilogue.stage2.branch.medicinal':
    'Die gerettete Forscherin und das Herkunftsbuch zeigen: Die Formel hat viele Urheber. Die Feldkarte der Heilpflanzen-Genossenschaft kommt ins Museum.',
  'epilogue.stage2.recovery.flourishing':
    'Am Abend blüht das Gewächshaus wieder: Die Arbeiter sind vereint, jedes System atmet.',
  'epilogue.stage2.recovery.secure':
    'Das Dorf räumt gemeinsam die Schäden auf. Das Gewächshaus ist gesichert, und die Arbeit geht gemeinsam weiter.',
  'epilogue.stage2.recovery.strained':
    'Es wird Wochen gemeinsamer Arbeit brauchen, doch das Dorf baut wieder auf, was der Überfall zerstört hat.',
  'epilogue.stage2.recovery.recovered':
    'Der Überfall hat das Gewächshaus viel gekostet. Nachbarn kommen mit Werkzeug und Saatgut: Gemeinsam wird es wieder wachsen.',
  'epilogue.stage2.depot':
    'Späher erreichen im Morgengrauen das Zwischendepot. Es ist leer, in aller Eile geräumt. Der Geldgeber bleibt unbekannt.',
  'grade.preservation': 'Bewahrung (Buch)',
  'grade.response': 'Zivilschutz-Einsatz',
  // Data names.
  'stage.stage2.name': 'Wohlstand unter Belagerung',
  'stage.stage2.beat.perimeter.name': 'Verfolgung am Außenring',
  'stage.stage2.beat.perimeter.objective':
    'Fahrt die Wirtschaftsstraße entlang und stoppt die Plünderer vor dem Gewächshaus',
  'stage.stage2.beat.loading-yard.name': 'Ladehof',
  'stage.stage2.beat.loading-yard.objective': 'Erobert den Ladehof am Sicherheitstor zurück',
  'stage.stage2.beat.aquaculture.name': 'Aquakulturhalle',
  'stage.stage2.beat.aquaculture.objective': 'Schützt die Fisch- und Garnelenanlagen',
  'stage.stage2.beat.aeration-annex.name': 'Notbelüftungsraum',
  'stage.stage2.beat.aeration-annex.objective':
    'Befreit den Wartungsarbeiter und haltet die Notbelüftung am Laufen',
  'stage.stage2.beat.vestibule.name': 'Hygieneschleuse',
  'stage.stage2.beat.vestibule.objective': 'Versiegelt die Schleuse und kommt zu Atem',
  'stage.stage2.beat.crop-channels.name': 'Anbaurinnen',
  'stage.stage2.beat.crop-channels.objective': 'Vertreibt die Plünderer aus den Anbaurinnen',
  'stage.stage2.beat.seed-bay.name': 'Saatgutlager',
  'stage.stage2.beat.seed-bay.objective':
    'Verhindert, dass die Plünderer die versiegelten Saatgutreserven mitnehmen',
  'stage.stage2.beat.medicinal-wing.name': 'Heilpflanzenflügel',
  'stage.stage2.beat.medicinal-wing.objective': 'Sichert den Heilpflanzenflügel',
  'stage.stage2.beat.prep-room.name': 'Arzneiküche',
  'stage.stage2.beat.prep-room.objective': 'Befreit die Forscherin und holt das Herkunftsbuch',
  'stage.stage2.beat.prep-room.clue':
    'Das Herkunftsbuch: Die Formel, die Tomas anbot, ist aus den Notizen mehrerer Beteiligter zusammengesetzt, darunter eine Forschungsgenossenschaft.',
  'stage.stage2.beat.filtration.name': 'Filtersteuerung',
  'stage.stage2.beat.filtration.objective': 'Stoppt den Steuerungseinbruch und sichert die Filter',
  'stage.stage2.beat.production-hall.name': 'Produktionshalle',
  'stage.stage2.beat.production-hall.objective':
    'Zerschlagt die Plünderer, die die Produktionshalle halten',
  'stage.stage2.beat.recovery-bay.name': 'Erholungsraum',
  'stage.stage2.beat.recovery-bay.objective':
    'Erholt euch und prüft die Ausrüstung vor dem Dispohof',
  'stage.stage2.beat.intercept.name': 'Einsatzmotorräder',
  'stage.stage2.beat.intercept.objective': 'Fangt Marek ab, bevor er den Hof erreicht',
  'stage.stage2.beat.dispatch-yard.name': 'Dispohof',
  'stage.stage2.beat.dispatch-yard.objective': 'Nehmt Marek Vane fest',
  'stage.stage2.beat.dispatch-yard.evidence':
    'Eine Waffenkiste von Mareks Motorrädern trägt dasselbe Siegel wie die Messingzahnräder von der Schleuse, mit verwandter Bestellnummer: Ein auswärtiger Lieferant hat beide Überfälle ausgerüstet.',
  'stage.stage2.branch.aeration': 'Notbelüftungsraum',
  'stage.stage2.branch.aeration.artifact': 'Frühes Belüfterlaufrad',
  'stage.stage2.branch.seed': 'Saatgutlager',
  'stage.stage2.branch.seed.artifact': 'Saatdose der ersten Ernte',
  'stage.stage2.branch.medicinal': 'Arzneiküche',
  'stage.stage2.branch.medicinal.artifact': 'Feldkarte der Heilpflanzen-Genossenschaft',
  'gh.asset.seed-reserve': 'Saatgutreserve',
  'gh.room.s2-aquaculture-hall': 'Aquakulturhalle',
  'gh.room.s2-aeration-annex': 'Notbelüftungsraum',
  'gh.room.s2-hygiene-vestibule': 'Hygieneschleuse',
  'gh.room.s2-crop-channels': 'Anbaurinnen',
  'gh.room.s2-seed-reserve-bay': 'Saatgutlager',
  'gh.room.s2-medicinal-wing': 'Heilpflanzenflügel',
  'gh.room.s2-medicinal-prep-room': 'Arzneiküche',
  'gh.room.s2-production-hall': 'Produktionshalle',
  'gh.room.s2-recovery-bay': 'Erholungsraum',
};

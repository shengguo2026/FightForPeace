import { STORY_STAGE1 } from '@ffp/platform';
import { clock } from '@ffp/sim';
import { difficultyName, heroName, locale, stageName, t } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Panel, Screen } from '../ui';

/** Collection and Records: the mission record per content ID and the recent runs. */
export function RecordsScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('village'));
  const p = shell.active.value;
  const m = p?.missions[STORY_STAGE1];
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="records">
      <Panel style={{ width: '760px', maxHeight: '86vh', overflow: 'auto' }}>
        <h1 class="ffp-title">{t('records.title')}</h1>
        <h2>{t('records.stage')}</h2>
        <div class="ffp-btn" data-testid="record-stage1" style={{ display: 'block' }}>
          <b>{stageName('stage1')}</b>
          {m && m.clears > 0 ? (
            <div class="ffp-hint">
              {t('records.clears', { n: m.clears })} ·{' '}
              {t('records.best', { grade: m.bestGrade ?? '—' })} ·{' '}
              {t('records.time', {
                time: m.bestTimeFrames === null ? '—' : clock(m.bestTimeFrames),
              })}{' '}
              ·{' '}
              {t('records.highest', {
                difficulty: m.highestDifficulty ? difficultyName(m.highestDifficulty) : '—',
              })}
            </div>
          ) : (
            <div class="ffp-hint">{t('records.none')}</div>
          )}
        </div>
        <h2>{t('records.archive')}</h2>
        {(p?.runArchive ?? []).length === 0 ? (
          <p class="ffp-hint">{t('records.archiveEmpty')}</p>
        ) : (
          (p?.runArchive ?? []).slice(0, 8).map((r) => (
            <div class="ffp-hint" data-testid="record-run">
              {new Date(r.endedAt).toLocaleString(locale.value)} · {difficultyName(r.difficulty)} ·{' '}
              {r.grade ?? '—'} · {r.heroes.map(heroName).join(' + ')}
            </div>
          ))
        )}
        <p class="ffp-hint">{t('records.collection')}</p>
        <Button label={t('common.back')} onPress={() => shell.go('village')} autofocus />
      </Panel>
    </Screen>
  );
}

/** Village Store and Guide: shown in the menu, opening with M11. */
export function LaterScreen({ shell, which }: { shell: Shell; which: 'store' | 'guide' }) {
  void locale.value;
  useNav(() => shell.go('village'));
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId={`later-${which}`}>
      <Panel style={{ width: '560px' }}>
        <h1 class="ffp-title">{which === 'store' ? t('menu.store') : t('menu.guide')}</h1>
        <p>{t('common.later')}</p>
        <Button label={t('common.back')} onPress={() => shell.go('village')} autofocus />
      </Panel>
    </Screen>
  );
}

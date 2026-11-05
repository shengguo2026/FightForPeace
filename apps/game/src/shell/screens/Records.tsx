import { ACHIEVEMENTS, STORY_STAGE1, achievementProgress, masteryLevel } from '@ffp/platform';
import { HERO_ROSTER } from '../shell';
import { clock } from '@ffp/sim';
import { difficultyName, dt, heroName, locale, stageName, t, type TextId } from '../../text/i18n';
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
        {p ? (
          <>
            <h2>{t('records.categories')}</h2>
            {Object.entries(p.progress.records[STORY_STAGE1] ?? {}).length === 0 ? (
              <p class="ffp-hint">{t('records.none')}</p>
            ) : (
              Object.entries(p.progress.records[STORY_STAGE1] ?? {}).map(([cat, r]) => {
                const [kind, mode, diff] = cat.split('.');
                return (
                  <div class="ffp-hint" data-testid="record-category">
                    {kind === 'open' ? t('results.open') : t('results.standard')} ·{' '}
                    {t(mode === 'coop' ? 'records.coop' : 'records.solo')} ·{' '}
                    {difficultyName(diff ?? '')} ·{' '}
                    {t('records.bestScore', { n: r.bestScore.toLocaleString(), rank: r.bestRank })}
                  </div>
                );
              })
            )}
            {p.progress.cheatHighest[STORY_STAGE1] ? (
              <p class="ffp-hint" data-testid="record-cheat">
                {t('records.cheatHighest', {
                  difficulty: difficultyName(p.progress.cheatHighest[STORY_STAGE1]!),
                })}
              </p>
            ) : null}
            <h2>{t('records.mastery')}</h2>
            {HERO_ROSTER.map((h) => (
              <div class="ffp-hint" data-testid={`record-mastery-${h}`}>
                {heroName(h)} ·{' '}
                {t('records.masteryLevel', {
                  level: masteryLevel(p.progress.mastery[h] ?? 0),
                  points: p.progress.mastery[h] ?? 0,
                })}
              </div>
            ))}
            <h2>{t('records.achievements')}</h2>
            {ACHIEVEMENTS.map((a) => {
              const got = p.progress.achievements[a.id] !== undefined;
              const prog = achievementProgress(p, a);
              return (
                <div
                  class="ffp-hint"
                  data-testid="record-achievement"
                  data-earned={got ? 'yes' : 'no'}
                >
                  {got ? '✓ ' : '○ '}
                  <b>{dt(`${a.id}.name`, a.name)}</b> · {t(`achgroup.${a.group}` as TextId)} ·{' '}
                  {t('records.achCredits', { n: a.credits })}
                  {!got && prog ? ` · ${prog.n}/${prog.of}` : ''}
                </div>
              );
            })}
            <h2>{t('records.ledger')}</h2>
            {p.progress.ledger.length === 0 ? (
              <p class="ffp-hint">{t('records.ledgerEmpty')}</p>
            ) : (
              p.progress.ledger.slice(0, 8).map((l) => (
                <div class="ffp-hint" data-testid="record-ledger">
                  {new Date(l.at).toLocaleString(locale.value)} · {t(`ledger.${l.kind}` as TextId)}{' '}
                  · {l.amount > 0 ? `+${l.amount}` : l.amount}
                </div>
              ))
            )}
          </>
        ) : null}
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

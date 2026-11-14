import { useState } from 'preact/hooks';
import {
  CAMPAIGN,
  contentIdOf,
  stageCompleted,
  stageOpen,
  titleScreenFor,
  type Profile,
} from '@ffp/platform';
import { clock } from '@ffp/sim';
import { difficultyName, heroName, locale, stageName, t, type TextId } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Panel, Screen } from '../ui';

const when = (ms: number) => (ms ? new Date(ms).toLocaleString(locale.value) : '—');

function stageState(p: Profile, stage: string): TextId {
  if (stageCompleted(p, stage)) return 'profile.completed';
  if (p.campaign.started.includes(stage)) return 'profile.started';
  return stageOpen(p, stage) ? 'profile.stateOpen' : 'profile.locked';
}

/**
 * Profile data (Guo, 14 Nov): a read-only view of the loaded profile, for checking what the
 * game recorded (completed stages, records, unlocks) and, behind a toggle, the raw save.
 */
export function ProfileScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('records'));
  const [raw, setRaw] = useState(false);
  const p = shell.active.value;
  const back = <Button label={t('common.back')} onPress={() => shell.go('records')} autofocus />;
  if (!p)
    return (
      <Screen bg={ART('menu-bg')} dim align="start" testId="profile">
        <Panel style={{ width: '760px' }}>
          <h1 class="ffp-title">{t('profile.title')}</h1>
          <p class="ffp-hint">{t('profile.none')}</p>
          {back}
        </Panel>
      </Screen>
    );
  const screen = titleScreenFor(p);
  const titleStage = CAMPAIGN.find((c) => c.titleScreen.clip === screen.clip)?.id ?? 'stage1';
  const cp = p.checkpoint;
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="profile">
      <Panel style={{ width: '760px', maxHeight: '86vh', overflow: 'auto' }}>
        <h1 class="ffp-title">{t('profile.title')}</h1>
        <h2>{t('profile.identity')}</h2>
        <div class="ffp-hint">{t('profile.name', { name: p.name })}</div>
        <div class="ffp-hint">{t('profile.created', { when: when(p.createdAt) })}</div>
        <div class="ffp-hint">{t('profile.saved', { when: when(p.updatedAt) })}</div>
        <div class="ffp-hint">
          {t('profile.language', { lang: t(`m22.voice.${p.locale}` as TextId) })}
        </div>
        <div class="ffp-hint" data-testid="profile-credits">
          {t('profile.credits', { n: p.progress.credits.toLocaleString(locale.value) })}
        </div>
        <h2>{t('profile.campaign')}</h2>
        {CAMPAIGN.map((c) => (
          <div
            class="ffp-hint"
            data-testid={`profile-stage-${c.id}`}
            data-state={stageState(p, c.id)}
          >
            {t('profile.stageLine', { stage: stageName(c.id), state: t(stageState(p, c.id)) })}
          </div>
        ))}
        <div class="ffp-hint" data-testid="profile-title-screen" data-stage={titleStage}>
          {t('profile.titleScreen', { stage: stageName(titleStage) })}
        </div>
        <div class="ffp-hint">
          {cp
            ? t('profile.checkpoint', {
                stage: stageName(cp.stage),
                n: cp.beat + 1,
                difficulty: difficultyName(cp.difficulty),
              })
            : t('profile.noCheckpoint')}
        </div>
        <h2>{t('profile.missions')}</h2>
        {CAMPAIGN.map((c) => {
          const m = p.missions[contentIdOf(c.id)];
          const cheat = p.progress.cheatHighest[contentIdOf(c.id)];
          return (
            <>
              <div class="ffp-hint" data-testid={`profile-mission-${c.id}`}>
                {m && m.clears > 0
                  ? t('profile.mission', {
                      stage: stageName(c.id),
                      clears: m.clears,
                      grade: m.bestGrade ?? '—',
                      time: m.bestTimeFrames === null ? '—' : clock(m.bestTimeFrames),
                      difficulty: m.highestDifficulty ? difficultyName(m.highestDifficulty) : '—',
                    })
                  : `${stageName(c.id)}: ${t('records.none')}`}
              </div>
              {cheat ? (
                <div class="ffp-hint">
                  {t('profile.cheatHighest', {
                    stage: stageName(c.id),
                    difficulty: difficultyName(cheat),
                  })}
                </div>
              ) : null}
            </>
          );
        })}
        <h2>{t('profile.unlocks')}</h2>
        <div class="ffp-hint">
          {t('profile.counts', {
            owned: p.progress.owned.length,
            ach: Object.keys(p.progress.achievements).length,
            museum: Object.keys(p.museum.unlocked).length,
            dossier: Object.keys(p.sponsorDossier.unlocked).length,
            research: Object.keys(p.research.milestones).length,
          })}
        </div>
        <div class="ffp-hint">
          {t('profile.heroes', {
            heroes: p.lastHeroes.length ? p.lastHeroes.map(heroName).join(' + ') : '—',
          })}
        </div>
        <Button
          label={t(raw ? 'profile.hideRaw' : 'profile.raw')}
          onPress={() => setRaw(!raw)}
          testId="profile-raw-toggle"
        />
        {raw ? (
          <pre
            data-testid="profile-raw"
            style={{
              fontSize: '12px',
              maxHeight: '40vh',
              overflow: 'auto',
              background: 'rgba(0,0,0,0.45)',
              padding: '8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {JSON.stringify(p, null, 2)}
          </pre>
        ) : null}
        {back}
      </Panel>
    </Screen>
  );
}

import { useState } from 'preact/hooks';
import { HEROES, STAGES, DIFFICULTIES } from '@ffp/sim';
import { PromptText } from '../../ui/InputPrompt';
import type { LabState } from '../../ui/labState';
import { difficultyName, dt, heroName, locale, t, type TextId } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { Button, Panel } from '../ui';
import type { Category } from './Settings';

type Item =
  | 'resume'
  | 'moves'
  | 'howTo'
  | 'controls'
  | 'access'
  | 'objective'
  | 'restart'
  | 'village'
  | 'secrets'
  | 'guide'
  | 'lessonRestart'
  | 'lessonLeave'
  | 'saveCombo'
  | 'practiceLeave';

const HOW_TO: TextId[] = [
  'pause.howTo1',
  'pause.howTo2',
  'pause.howTo3',
  'pause.howTo4',
  'pause.howTo5',
  'pause.howTo6',
];

/**
 * The Pause menu with a detail pane (Module 16). Restart and Return to Village ask for a
 * confirmation; in co-op every player confirms from their own controls.
 */
export function PauseMenu({ shell, state }: { shell: Shell; state: LabState }) {
  void locale.value;
  const [focused, setFocused] = useState<Item>('resume');
  const confirm = shell.pauseConfirm.value;
  const players = state.players.value;
  const ctx = players[0]?.ctx;
  const world = shell.session.world;
  const run = world.run;
  const stage = run ? STAGES[run.stage] : undefined;
  const beat = stage && run ? stage.beats[run.beat] : undefined;
  const joined = shell.session.devices.slots.filter((s) => s.joined).length;

  const agree = (slot: number) => {
    const c = shell.pauseConfirm.value;
    if (!c) return;
    const agreed = c.agreed.map((a, i) => a || i === slot);
    if (agreed.every(Boolean)) {
      if (c.kind === 'restart') shell.restartFromCheckpoint();
      else shell.returnToVillage();
    } else shell.pauseConfirm.value = { ...c, agreed };
  };

  useNav(
    () => {
      if (shell.pauseConfirm.value) shell.pauseConfirm.value = null;
      else shell.resume();
    },
    (e) => {
      const c = shell.pauseConfirm.value;
      if (!c || joined < 2 || !e.confirm) return false;
      // Co-op: each player agrees with their own device.
      const slot = shell.session.devices.slots.findIndex((s) => s.device === e.source);
      if (slot >= 0) agree(slot);
      return true;
    },
  );

  const openSettings = (category: Category) => {
    shell.settingsFrom.value = shell.screen.value;
    shell.settingsCategory.value = category;
    shell.go('settings');
  };
  const ask = (kind: 'restart' | 'village') =>
    (shell.pauseConfirm.value = { kind, agreed: Array.from({ length: joined }, () => false) });

  const item = (id: Item, label: string, run: () => void, disabled = false) => (
    <Button
      label={label}
      testId={`pause-${id}`}
      autofocus={id === 'resume'}
      disabled={disabled}
      onFocus={() => setFocused(id)}
      onPress={run}
    />
  );

  const hero = run || shell.screen.value === 'lab' ? HEROES[world.playerHero[0] ?? 0] : undefined;
  const detail = () => {
    if (!ctx) return null;
    switch (focused) {
      case 'resume':
        return <PromptText text={t('prompt.paused')} ctx={ctx} />;
      case 'moves':
        return hero ? (
          <div data-testid="pause-detail-moves">
            <b>{heroName(hero.id)}</b>
            <ul style={{ margin: '6px 0', paddingLeft: '20px', columns: 2 }}>
              {hero.actions.slice(0, 24).map((a) => (
                <li>{dt(`hero.${hero.id}.action.${a.id}`, a.name)}</li>
              ))}
            </ul>
          </div>
        ) : null;
      case 'howTo':
        return (
          <div data-testid="pause-detail-howto">
            {HOW_TO.map((k) => (
              <p style={{ margin: '4px 0' }}>
                <PromptText text={t(k)} ctx={ctx} />
              </p>
            ))}
          </div>
        );
      case 'controls':
        return <p>{t('settings.remapHint')}</p>;
      case 'access':
        return <p>{t('pause.accessHint')}</p>;
      case 'objective':
        return (
          <div data-testid="pause-detail-objective">
            {stage && beat ? (
              <>
                <b>{dt(`stage.${stage.id}.beat.${beat.id}.name`, beat.name)}</b>
                <p>{dt(`stage.${stage.id}.beat.${beat.id}.objective`, beat.objective)}</p>
              </>
            ) : (
              <p>{t('menu.academyDetail')}</p>
            )}
            {run ? (
              <p class="ffp-hint">
                {t('pause.locked', {
                  difficulty: difficultyName(DIFFICULTIES[run.difficulty]?.id ?? 'medium'),
                })}
              </p>
            ) : null}
          </div>
        );
      case 'secrets':
        return (
          <p data-testid="pause-detail-secrets">
            {world.cheats.marked ? t('secrets.alreadyMarked') : t('secrets.pauseDetail')}
          </p>
        );
      case 'guide':
        return <p>{t('menu.guideDetail')}</p>;
      case 'lessonRestart':
      case 'lessonLeave':
        return <p>{t('lesson.pauseDetail')}</p>;
      case 'saveCombo':
      case 'practiceLeave':
        return <p>{t('practice.pauseDetail')}</p>;
      case 'restart':
        return <p>{t('pause.confirmRestart')}</p>;
      case 'village':
        return <p>{t('pause.confirmVillage')}</p>;
    }
  };

  return (
    <div
      data-testid="pause-overlay"
      data-shell-screen
      class="ffp-shell"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        pointerEvents: 'auto',
      }}
    >
      <div class="ffp-row" style={{ width: '980px', maxWidth: '94vw' }}>
        <Panel style={{ width: '360px' }} testId="pause-menu">
          <h1 class="ffp-title">{t('pause.title')}</h1>
          {world.cheats.marked ? (
            <div data-testid="pause-cheat" style={{ color: '#ffb36b' }}>
              {t('hud.cheatAssisted')}
            </div>
          ) : null}
          {ctx ? (
            <div class="ffp-hint" data-testid="pause-hint">
              <PromptText text={t('prompt.paused')} ctx={ctx} />
            </div>
          ) : null}
          {item('resume', t('pause.resume'), () => shell.resume())}
          {item('moves', t('pause.moves'), () => setFocused('moves'))}
          {item('howTo', t('pause.howTo'), () => setFocused('howTo'))}
          {item('controls', t('pause.controls'), () => openSettings('controls'))}
          {item('access', t('pause.access'), () => openSettings('accessibility'))}
          {item('objective', t('pause.objective'), () => setFocused('objective'))}
          {run && shell.screen.value === 'game'
            ? item('secrets', t('secrets.title'), () => {
                shell.secretsFrom.value = 'game';
                shell.go('secrets');
              })
            : null}
          {shell.fromShell.value || shell.screen.value !== 'lab'
            ? item('guide', t('menu.guide'), () => {
                shell.guideFrom.value = shell.screen.value;
                shell.go('guide');
              })
            : null}
          {shell.screen.value === 'lesson' ? (
            <>
              {item('lessonRestart', t('lesson.restart'), () => {
                shell.academy.restartLesson();
                shell.resume();
              })}
              {item('lessonLeave', t('lesson.leave'), () => {
                shell.resume();
                shell.academy.leaveLesson();
              })}
            </>
          ) : null}
          {shell.screen.value === 'practice' ? (
            <>
              {item(
                'saveCombo',
                t('practice.save'),
                () => {
                  const id = shell.academy.saveLastCombo();
                  shell.showToast(id ? t('practice.saved') : t('practice.notSaved'));
                },
                !shell.academy.lastCombo.value || !!shell.active.value?.guest,
              )}
              {item('practiceLeave', t('practice.leave'), () => {
                shell.resume();
                shell.academy.leavePractice(
                  shell.academy.practice.value?.playing ? 'combos' : 'academy',
                );
              })}
            </>
          ) : null}
          {run ? item('restart', t('pause.restart'), () => ask('restart')) : null}
          {shell.fromShell.value ? item('village', t('pause.village'), () => ask('village')) : null}
        </Panel>
        <Panel style={{ flex: 1 }} testId="pause-detail">
          {confirm ? (
            <div data-testid="pause-confirm">
              <p>
                {confirm.kind === 'restart' ? t('pause.confirmRestart') : t('pause.confirmVillage')}
              </p>
              {joined < 2 ? (
                <>
                  <Button
                    label={t('common.yes')}
                    testId="pause-confirm-yes"
                    autofocus
                    onPress={() => agree(0)}
                  />
                  <Button
                    label={t('common.no')}
                    onPress={() => (shell.pauseConfirm.value = null)}
                  />
                </>
              ) : (
                confirm.agreed.map((a, i) =>
                  a ? (
                    <p>{t('common.player', { n: i + 1 })} ✓</p>
                  ) : ctx ? (
                    <p data-testid={`pause-confirm-p${i + 1}`}>
                      <PromptText
                        text={t('pause.coopConfirm', { n: i + 1 })}
                        ctx={players[i]?.ctx ?? ctx}
                      />
                    </p>
                  ) : null,
                )
              )}
            </div>
          ) : (
            detail()
          )}
        </Panel>
      </div>
    </div>
  );
}

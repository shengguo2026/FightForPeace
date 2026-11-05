import { useState } from 'preact/hooks';
import { CHEATS, HEROES, type ActionDef, type LessonGoal, type RecipeStep } from '@ffp/sim';
import { ACADEMY_ROUTES, MY_COMBOS_CAP, STORE, deleteCombo, renameCombo } from '@ffp/platform';
import type { PromptContext } from '@ffp/platform';
import { PromptText } from '../../ui/InputPrompt';
import { moveInputText } from '../../text/en';
import { dt, heroName, locale, t, type TextId } from '../../text/i18n';
import { lessonDef } from '../../academy/runner';
import type { Shell } from '../shell';
import { HERO_ROSTER } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Choice, Panel, Screen } from '../ui';

/** Player 1's prompt context (current bindings and device). */
export function ctx0(shell: Shell): PromptContext | undefined {
  return shell.lab.players.value[0]?.ctx;
}

/** The input of a move as prompt tokens, drawn with the player's current bindings. */
export function actionInput(a: ActionDef): string {
  return moveInputText(a.context, a.dir < 0 ? 0 : a.dir);
}

const actionName = (hero: string, a: ActionDef) => dt(`hero.${hero}.action.${a.id}`, a.name);

/** A list of recipe steps, each with its move name and input for the player's bindings. */
export function StepList({
  hero,
  steps,
  ctx,
  done = 0,
  testId,
}: {
  hero: string;
  steps: readonly RecipeStep[];
  ctx: PromptContext | undefined;
  done?: number;
  testId?: string;
}) {
  const kit = HEROES.find((h) => h.id === hero)!;
  let k = 0;
  return (
    <ol style={{ margin: '4px 0', paddingLeft: '22px' }} data-testid={testId}>
      {steps.map((s) => {
        if (s.jump)
          return (
            <li class="ffp-hint">
              {t('academy.jumpChase')} {ctx ? <PromptText text="{action:Jump}" ctx={ctx} /> : null}
            </li>
          );
        k += 1;
        const a = s.any.map((i) => kit.actions[i]!).filter(Boolean);
        return (
          <li style={{ opacity: k <= done ? 0.55 : 1 }} data-testid="step">
            {k <= done ? '✓ ' : ''}
            {a.map((x) => actionName(hero, x)).join(' / ')} ·{' '}
            {ctx && a[0] ? <PromptText text={actionInput(a[0])} ctx={ctx} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

const STATE_KEY: Record<string, TextId> = {
  available: 'academy.state.available',
  practiced: 'academy.state.practiced',
  certified: 'academy.state.certified',
  mastered: 'academy.state.mastered',
};

/** The Academy: the First Steps route, Free Practice, My Combos and the Training Lab. */
export function AcademyScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('village'));
  const set = shell.practice.value;
  const heroOptions = HERO_ROSTER.map((h) => ({ value: h as string, label: heroName(h) }));
  const [focus, setFocus] = useState<string | null>(null);
  const def = focus ? lessonDef(focus) : undefined;
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="academy">
      <div class="ffp-row" style={{ width: '88vw', alignItems: 'flex-start' }}>
        <Panel style={{ width: '520px', maxHeight: '88vh', overflow: 'auto' }}>
          <h1 class="ffp-title">{t('academy.title')}</h1>
          <Choice
            label={t('academy.hero')}
            value={set.hero}
            options={heroOptions}
            testId="academy-hero"
            onChange={(hero) => (shell.practice.value = { ...set, hero, trial: [] })}
          />
          {ACADEMY_ROUTES.map((r) => (
            <>
              <h2 style={{ margin: '12px 0 4px' }}>{dt(`${r.id}.name`, r.name)}</h2>
              {r.lessons.map((l, i) => (
                <Button
                  label={`${i + 1}. ${dt(`${l.id}.name`, l.name)}`}
                  mark={t(STATE_KEY[shell.academy.stateOf(l.id)]!)}
                  testId={`lesson-${l.id.split('.').pop()}`}
                  autofocus={i === 0}
                  onFocus={() => setFocus(l.id)}
                  onPress={() => shell.academy.startLesson(l.id)}
                />
              ))}
            </>
          ))}
          <h2 style={{ margin: '12px 0 4px' }}>{t('academy.more')}</h2>
          <Button
            label={t('academy.practice')}
            detail={t('academy.practiceDetail')}
            testId="academy-practice"
            onFocus={() => setFocus(null)}
            onPress={() => shell.go('practiceSetup')}
          />
          <Button
            label={t('academy.combos')}
            detail={t('academy.combosDetail', {
              n: shell.active.value?.progress.combos.length ?? 0,
              max: MY_COMBOS_CAP,
            })}
            testId="academy-combos"
            onFocus={() => setFocus(null)}
            onPress={() => shell.go('combos')}
          />
          <Button
            label={t('academy.lab')}
            detail={t('menu.academyDetail')}
            testId="academy-lab"
            onFocus={() => setFocus(null)}
            onPress={() => shell.openLab()}
          />
          <Button label={t('common.back')} onPress={() => shell.go('village')} />
        </Panel>
        <Panel style={{ flex: 1, marginLeft: 'auto', maxWidth: '520px' }} testId="academy-detail">
          {def ? (
            <>
              <h2 style={{ marginTop: 0 }}>{dt(`${def.id}.name`, def.name)}</h2>
              <p>{t(`academy.course.${def.course}` as TextId)}</p>
              <p class="ffp-hint">{t('academy.phases')}</p>
              <p class="ffp-hint">{t('academy.rewards', { certified: 100, mastered: 150 })}</p>
            </>
          ) : (
            <p>{t('academy.intro')}</p>
          )}
        </Panel>
      </div>
    </Screen>
  );
}

const GOAL_KEY: Record<LessonGoal, TextId> = {
  walk: 'lesson.goal.walk',
  jump: 'lesson.goal.jump',
  dash: 'lesson.goal.dash',
  recipe: 'lesson.goal.recipe',
  guard: 'lesson.goal.guard',
  exact: 'lesson.goal.exact',
  counter: 'lesson.goal.counter',
  special: 'lesson.goal.special',
  ultimate: 'lesson.goal.ultimate',
};

const PHASE_KEY: Record<string, TextId> = {
  demo: 'lesson.phase.demo',
  guided: 'lesson.phase.guided',
  trial: 'lesson.phase.trial',
  mastery: 'lesson.phase.mastery',
  done: 'lesson.phase.done',
};

/** The lesson panel over live practice: phase, goals and the inputs for this player. */
export function LessonHud({ shell }: { shell: Shell }) {
  void locale.value;
  const v = shell.academy.lesson.value;
  const ctx = ctx0(shell);
  if (!v || !ctx) return null;
  const def = lessonDef(v.lesson)!;
  const kit = HEROES.find((h) => h.id === v.hero)!;
  const recipe = def.recipe ?? def.demo;
  const r = recipe ? kit.recipes.find((x) => x.id === recipe) : undefined;
  return (
    <div class="ffp-hud" data-testid="lesson-hud">
      <div
        class="ffp-panel"
        style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '620px',
          padding: '12px 18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <b>{dt(`${def.id}.name`, def.name)}</b>
          <span data-testid="lesson-phase" data-phase={v.phase}>
            {t(PHASE_KEY[v.phase]!)}
          </span>
        </div>
        {v.phase === 'demo' ? (
          <p style={{ margin: '6px 0' }} data-testid="lesson-demo">
            <PromptText text={t('lesson.demoHint')} ctx={ctx} />
          </p>
        ) : v.phase === 'done' ? (
          <p style={{ margin: '6px 0' }}>
            <PromptText text={t('lesson.doneHint')} ctx={ctx} />
          </p>
        ) : (
          <>
            {v.count > 1 ? (
              <div class="ffp-hint" data-testid="lesson-count">
                {t('lesson.count', { done: v.done, count: v.count })}
                {v.left !== null ? ` · ${t('lesson.left', { s: v.left })}` : ''}
              </div>
            ) : v.left !== null ? (
              <div class="ffp-hint">{t('lesson.left', { s: v.left })}</div>
            ) : null}
            <ul style={{ margin: '6px 0', paddingLeft: '20px' }}>
              {v.goals.map((g) => (
                <li data-testid={`lesson-goal-${g}`} data-met={v.met.includes(g) ? 'yes' : 'no'}>
                  {v.met.includes(g) ? '✓ ' : ''}
                  <PromptText text={t(GOAL_KEY[g])} ctx={ctx} />
                </li>
              ))}
            </ul>
          </>
        )}
        {r && v.phase !== 'done' ? (
          <StepList hero={v.hero} steps={r.steps} ctx={ctx} testId="lesson-steps" />
        ) : null}
        <div class="ffp-hint">
          <PromptText text={t('lesson.pauseHint')} ctx={ctx} />
        </div>
      </div>
    </div>
  );
}

/** Free Practice set-up: hero, technique trials (no Credits needed) and Cheat Practice. */
export function PracticeSetupScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('academy'));
  const set = shell.practice.value;
  const owned = shell.active.value?.progress.owned ?? [];
  const techniques = STORE.filter((s) => s.group === 'technique' && s.hero === set.hero);
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  const kit = HEROES.find((h) => h.id === set.hero)!;
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="practice-setup">
      <Panel style={{ width: '760px', maxHeight: '88vh', overflow: 'auto' }}>
        <h1 class="ffp-title">{t('academy.practice')}</h1>
        <Choice
          label={t('academy.hero')}
          value={set.hero}
          options={HERO_ROSTER.map((h) => ({ value: h as string, label: heroName(h) }))}
          onChange={(hero) => (shell.practice.value = { ...set, hero, trial: [] })}
          autofocus
        />
        <h2 style={{ margin: '10px 0 2px' }}>{t('practice.trials')}</h2>
        <p class="ffp-hint">{t('practice.trialsHint')}</p>
        {techniques.map((s) => {
          const a = kit.actions.find((x) => x.id === s.action)!;
          return (
            <Button
              label={actionName(set.hero, a)}
              testId={`trial-${s.action}`}
              detail={owned.includes(s.id) ? t('store.owned') : t('practice.notOwned')}
              mark={set.trial.includes(s.id) ? '✓' : ''}
              onPress={() => (shell.practice.value = { ...set, trial: toggle(set.trial, s.id) })}
            />
          );
        })}
        <h2 style={{ margin: '10px 0 2px' }}>{t('practice.cheats')}</h2>
        <p class="ffp-hint">{t('practice.cheatsHint')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          {CHEATS.filter((c) => c.active).map((c) => (
            <Button
              label={t(`cheat.${c.code}.name` as TextId)}
              testId={`practice-cheat-${c.code}`}
              mark={set.cheats.includes(c.code) ? '✓' : ''}
              onPress={() =>
                (shell.practice.value = { ...set, cheats: toggle(set.cheats, c.code) })
              }
            />
          ))}
        </div>
        <Button
          label={t('practice.start')}
          testId="practice-start"
          onPress={() => shell.academy.startPractice()}
        />
        <Button label={t('common.back')} onPress={() => shell.go('academy')} />
      </Panel>
    </Screen>
  );
}

/** Free Practice over live play: the last recorded combo and the playback state. */
export function PracticeHud({ shell }: { shell: Shell }) {
  void locale.value;
  const v = shell.academy.practice.value;
  const last = shell.academy.lastCombo.value;
  const ctx = ctx0(shell);
  if (!v || !ctx) return null;
  const kit = HEROES.find((h) => h.id === (last?.hero ?? v.hero))!;
  return (
    <div class="ffp-hud" data-testid="practice-hud">
      <div
        class="ffp-panel"
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          width: '430px',
          padding: '12px 16px',
        }}
      >
        <b>{v.playing ? t('practice.playing', { name: v.playing }) : t('academy.practice')}</b>
        {v.cheats.length > 0 ? (
          <div data-testid="practice-cheat-label" style={{ color: '#ffb36b' }}>
            {t('practice.cheatLabel')}
          </div>
        ) : null}
        {v.playing && v.yourTurn ? (
          <div data-testid="practice-your-turn">
            {t('practice.yourTurn')} {v.performed > 0 ? `✓ ×${v.performed}` : ''}
          </div>
        ) : null}
        {last ? (
          <div data-testid="practice-last">
            <div class="ffp-hint">
              {t('practice.last', { hits: last.hits, damage: last.damage })}
            </div>
            <ol style={{ margin: '2px 0', paddingLeft: '20px' }}>
              {last.steps.map((s) => {
                if (s === 'jump') return <li class="ffp-hint">{t('academy.jumpChase')}</li>;
                const a = kit.actions.find((x) => x.id === s);
                return a ? (
                  <li>
                    {actionName(kit.id, a)} · <PromptText text={actionInput(a)} ctx={ctx} />
                  </li>
                ) : null;
              })}
            </ol>
            <div class="ffp-hint">
              <PromptText text={t('practice.saveHint')} ctx={ctx} />
            </div>
          </div>
        ) : (
          <div class="ffp-hint">{t('practice.recordHint')}</div>
        )}
      </div>
    </div>
  );
}

/** My Combos: saved recipes with their inputs for the current bindings; watch, rename, delete. */
export function CombosScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('academy'));
  const p = shell.active.value;
  const combos = p?.progress.combos ?? [];
  const ctx = ctx0(shell);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="combos">
      <Panel style={{ width: '820px', maxHeight: '88vh', overflow: 'auto' }}>
        <h1 class="ffp-title">{t('academy.combos')}</h1>
        <p class="ffp-hint">{t('combos.hint', { n: combos.length, max: MY_COMBOS_CAP })}</p>
        {combos.length === 0 ? <p data-testid="combos-empty">{t('combos.empty')}</p> : null}
        {combos.map((c) => {
          const kit = HEROES.find((h) => h.id === c.hero)!;
          return (
            <div
              class="ffp-panel"
              style={{ margin: '8px 0', padding: '10px 14px' }}
              data-testid="combo"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b data-testid="combo-name">{c.name}</b>
                <span class="ffp-hint">
                  {heroName(c.hero)} · {t('practice.last', { hits: c.hits, damage: c.damage })}
                </span>
              </div>
              {c.cheats.length > 0 ? (
                <div class="ffp-hint" style={{ color: '#ffb36b' }}>
                  {t('practice.cheatLabel')}
                </div>
              ) : null}
              {c.needs.length > 0 ? (
                <div class="ffp-hint">
                  {t('combos.needs', {
                    moves: c.needs
                      .map((n) => STORE.find((s) => s.id === n))
                      .map((s) => {
                        const a = kit.actions.find((x) => x.id === s?.action);
                        return a ? actionName(c.hero, a) : '';
                      })
                      .join(', '),
                  })}
                </div>
              ) : null}
              <ol style={{ margin: '4px 0', paddingLeft: '22px' }}>
                {c.steps.map((s) => {
                  if (s === 'jump') return <li class="ffp-hint">{t('academy.jumpChase')}</li>;
                  const a = kit.actions.find((x) => x.id === s);
                  return a ? (
                    <li data-testid="combo-step">
                      {actionName(c.hero, a)} ·{' '}
                      {ctx ? <PromptText text={actionInput(a)} ctx={ctx} /> : null}
                    </li>
                  ) : null;
                })}
              </ol>
              {renaming === c.id ? (
                <div class="ffp-row" style={{ alignItems: 'center' }}>
                  <input
                    data-nav
                    data-testid="combo-rename-input"
                    value={name}
                    maxLength={40}
                    onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
                    style={{ font: 'inherit', padding: '6px 10px', borderRadius: '6px', flex: 1 }}
                  />
                  <Button
                    label={t('combos.save')}
                    testId="combo-rename-save"
                    onPress={() => {
                      shell.update((x) => renameCombo(x, c.id, name.trim()));
                      setRenaming(null);
                    }}
                  />
                </div>
              ) : (
                <div class="ffp-row">
                  <Button
                    label={t('combos.watch')}
                    testId="combo-watch"
                    onPress={() => shell.academy.playCombo(c.id)}
                  />
                  <Button
                    label={t('combos.rename')}
                    testId="combo-rename"
                    onPress={() => {
                      setName(c.name);
                      setRenaming(c.id);
                    }}
                  />
                  <Button
                    label={t('combos.delete')}
                    testId="combo-delete"
                    onPress={() => shell.update((x) => deleteCombo(x, c.id))}
                  />
                </div>
              )}
            </div>
          );
        })}
        <Button
          label={t('common.back')}
          onPress={() => shell.go('academy')}
          autofocus={combos.length === 0}
        />
      </Panel>
    </Screen>
  );
}

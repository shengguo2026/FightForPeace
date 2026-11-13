import { useState } from 'preact/hooks';
import { HEROES, type ShowcaseStep } from '@ffp/sim';
import { CAMPAIGN, STORE, storeStatus, type PromptContext } from '@ffp/platform';
import { PromptText } from '../../ui/InputPrompt';
import { dt, heroName, locale, t, type TextId } from '../../text/i18n';
import type { PreviewView } from '../../academy/runner';
import type { Shell } from '../shell';
import { HERO_ROSTER } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Choice, Panel, Screen } from '../ui';
import { actionInput, ctx0 } from './Academy';

/** The localized name of a showcase route. */
export function showcaseName(hero: string, id: string, fallback: string): string {
  return dt(`hero.${hero}.showcase.${id}`, fallback);
}

/**
 * The steps of a route in the player's bindings: each move with its input, a jump, or the
 * team part, the partner's steps marked with the partner's name. `current` is highlighted
 * and landed steps are ticked.
 */
export function RouteSteps({
  hero,
  partner,
  steps,
  ctx,
  landed,
  current = -1,
  testId,
}: {
  hero: string;
  partner: string | null;
  steps: readonly ShowcaseStep[];
  ctx: PromptContext | undefined;
  landed?: readonly boolean[];
  current?: number;
  testId?: string;
}) {
  return (
    <ol style={{ margin: '4px 0', paddingLeft: '22px' }} data-testid={testId}>
      {steps.map((s, i) => {
        const who = s.slot === 1 && partner ? partner : hero;
        const kit = HEROES.find((h) => h.id === who)!;
        const a = s.any.map((n) => kit.actions[n]!).filter(Boolean);
        const done = landed?.[i] ?? false;
        const now = i === current;
        const by = s.slot === 1 && partner ? `${heroName(partner)}: ` : '';
        return (
          <li
            data-testid="route-step"
            data-current={now ? '' : undefined}
            data-landed={done ? '' : undefined}
            style={{
              opacity: done && !now ? 0.6 : 1,
              color: now ? '#ffd27a' : undefined,
              fontWeight: now ? 700 : undefined,
            }}
          >
            {done ? '✓ ' : ''}
            {by}
            {s.jump ? (
              <>
                {t('academy.jumpChase')}{' '}
                {ctx && s.slot === 0 ? <PromptText text="{action:Jump}" ctx={ctx} /> : null}
              </>
            ) : s.team ? (
              <>
                {t('m21.teamStep')}{' '}
                {ctx && s.slot === 0 ? <PromptText text="{action:TeamAttack}" ctx={ctx} /> : null}
              </>
            ) : (
              <>
                {a.map((x) => dt(`hero.${who}.action.${x.id}`, x.name)).join(' / ')}
                {ctx && a[0] && s.slot === 0 ? (
                  <>
                    {' · '}
                    <PromptText text={actionInput(a[0])} ctx={ctx} />
                  </>
                ) : null}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * M21 Move List (Academy): each hero's showcase routes, combo recipes and catalogue
 * techniques, each with a Preview.
 */
export function MoveListScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('academy'));
  const set = shell.practice.value;
  const hero = set.hero;
  const kit = HEROES.find((h) => h.id === hero)!;
  const ctx = ctx0(shell);
  const p = shell.active.value;
  const [focus, setFocus] = useState<string | null>(null);
  const showcases = kit.showcases ?? [];
  const techniques = STORE.filter(
    (s) => s.group === 'technique' && s.hero === hero && (!p || storeStatus(p, s) !== 'hidden'),
  );
  const preview = (kind: PreviewView['kind'], id: string) =>
    shell.academy.startPreview(hero, kind, id, 'movelist');
  const sel = showcases.find((s) => `sc:${s.id}` === focus);
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="movelist">
      <div class="ffp-row" style={{ width: '90vw', alignItems: 'flex-start' }}>
        <Panel style={{ width: '540px', maxHeight: '88vh', overflow: 'auto' }}>
          <h1 class="ffp-title">{t('m21.moveList')}</h1>
          <Choice
            label={t('academy.hero')}
            value={hero}
            options={HERO_ROSTER.map((h) => ({ value: h as string, label: heroName(h) }))}
            testId="movelist-hero"
            autofocus
            onChange={(h) => (shell.practice.value = { ...set, hero: h, trial: [] })}
          />
          <h2 style={{ margin: '12px 0 4px' }}>{t('m21.showcases')}</h2>
          {showcases.map((s) => (
            <Button
              label={showcaseName(hero, s.id, s.name)}
              detail={s.partner ? t('m21.withPartner', { name: heroName(s.partner) }) : undefined}
              mark={t('m21.preview')}
              testId={`preview-showcase-${s.id}`}
              onFocus={() => setFocus(`sc:${s.id}`)}
              onPress={() => preview('showcase', s.id)}
            />
          ))}
          <h2 style={{ margin: '12px 0 4px' }}>{t('m21.recipes')}</h2>
          {kit.recipes.map((r) => (
            <Button
              label={dt(`hero.${hero}.recipe.${r.id}`, r.name)}
              mark={t('m21.preview')}
              testId={`preview-recipe-${r.id}`}
              onFocus={() => setFocus(null)}
              onPress={() => preview('recipe', r.id)}
            />
          ))}
          {techniques.length > 0 ? (
            <h2 style={{ margin: '12px 0 4px' }}>{t('m21.techniques')}</h2>
          ) : null}
          {techniques.map((s) => {
            const a = kit.actions.find((x) => x.id === s.action);
            return (
              <Button
                label={a ? dt(`hero.${hero}.action.${a.id}`, a.name) : s.id}
                detail={ctx && a ? <PromptText text={actionInput(a)} ctx={ctx} /> : undefined}
                mark={t('m21.preview')}
                testId={`preview-technique-${s.action}`}
                onFocus={() => setFocus(null)}
                onPress={() => preview('technique', s.id)}
              />
            );
          })}
          <Button label={t('common.back')} onPress={() => shell.go('academy')} />
        </Panel>
        <Panel style={{ flex: 1, marginLeft: 'auto', maxWidth: '560px' }} testId="movelist-detail">
          {sel ? (
            <>
              <h2 style={{ marginTop: 0 }}>{showcaseName(hero, sel.id, sel.name)}</h2>
              {sel.meter > 0 ? (
                <p class="ffp-hint">{t('m21.meterNeeded', { n: sel.meter })}</p>
              ) : null}
              <RouteSteps hero={hero} partner={sel.partner} steps={sel.steps} ctx={ctx} />
            </>
          ) : (
            <p>{t('m21.moveListIntro')}</p>
          )}
        </Panel>
      </div>
    </Screen>
  );
}

/** Over the live Preview: the route's steps and its controls (pointer; keys: pause menu). */
export function PreviewHud({ shell }: { shell: Shell }) {
  void locale.value;
  const v = shell.academy.preview.value;
  const ac = shell.academy;
  if (!v) return null;
  const ctx = ctx0(shell);
  const complete = v.current >= v.steps.length;
  // Mouse buttons that give the focus back at once, so game keys never press them.
  const btn = (label: string, testId: string, run: () => void) => (
    <button
      type="button"
      class="ffp-btn"
      data-testid={testId}
      style={{ width: 'auto', padding: '4px 12px', margin: '2px' }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        (e.currentTarget as HTMLElement).blur();
        run();
      }}
    >
      {label}
    </button>
  );
  return (
    <div class="ffp-hud">
      <div
        class="ffp-panel"
        data-testid="preview"
        style={{
          position: 'absolute',
          right: '2%',
          top: '3%',
          width: '440px',
          maxHeight: '90vh',
          overflow: 'auto',
          pointerEvents: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 4px' }} data-testid="preview-name">
          {v.kind === 'showcase' ? showcaseName(v.hero, v.id, v.name) : v.name}
        </h2>
        <p class="ffp-hint" data-testid="preview-mode" data-mode={v.mode}>
          {v.mode === 'watch' ? t('m21.watching', { n: v.plays }) : t('m21.trying')}
          {v.half ? ` · ${t('m21.halfOn')}` : ''}
          {v.paused ? ` · ${t('m21.pausedMark')}` : ''}
        </p>
        <RouteSteps
          hero={v.hero}
          partner={v.partner}
          steps={v.steps}
          ctx={ctx}
          landed={v.landed}
          current={v.current}
          testId="preview-steps"
        />
        {v.mode === 'try' && complete ? (
          <p data-testid="preview-complete" style={{ color: '#9fe3a8' }}>
            {t('m21.routeDone')}
          </p>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {btn(v.paused ? t('m21.resume') : t('m21.pause'), 'preview-pause', () =>
            ac.togglePause(),
          )}
          {v.mode === 'watch' ? btn(t('m21.step'), 'preview-step', () => ac.stepOnce()) : null}
          {btn(v.half ? t('m21.fullSpeed') : t('m21.halfSpeed'), 'preview-half', () =>
            ac.toggleHalf(),
          )}
          {v.mode === 'watch'
            ? btn(t('m21.tryIt'), 'preview-try', () => ac.tryIt())
            : btn(t('m21.watchAgain'), 'preview-watch', () => ac.watchAgain())}
          {btn(t('common.back'), 'preview-back', () => ac.leavePreview())}
        </div>
        {ctx ? (
          <p class="ffp-hint">
            <PromptText
              text={v.mode === 'watch' ? t('m21.watchHint') : t('m21.tryHint')}
              ctx={ctx}
            />
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * M21 What's New (Stage 2 spec §15 layer 1): one card at a time before the first run of a
 * stage, and any time from the Academy.
 */
export function WhatsNewScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const w = shell.whatsNew.value;
  const cards = CAMPAIGN.find((c) => c.id === w.stage)?.whatsNew ?? [];
  const [page, setPage] = useState(0);
  const last = page >= cards.length - 1;
  useNav(() => shell.whatsNewDone());
  const card = cards[Math.min(page, cards.length - 1)];
  return (
    <Screen bg={ART('menu-bg')} dim testId="whats-new">
      <Panel style={{ width: '720px' }}>
        <p class="ffp-hint">
          {t('m21.whatsNewTitle')} · {page + 1}/{cards.length}
        </p>
        {card ? (
          <>
            <h1 class="ffp-title" data-testid="whats-new-title">
              {t(`m21.whatsNew.${card}.title` as TextId)}
            </h1>
            <p data-testid="whats-new-text">{t(`m21.whatsNew.${card}.text` as TextId)}</p>
          </>
        ) : null}
        <Button
          label={last ? t('m21.whatsNewDone') : t('common.next')}
          testId="whats-new-next"
          autofocus
          onPress={() => (last ? shell.whatsNewDone() : setPage(page + 1))}
        />
        {!last ? (
          <Button
            label={t('m21.skip')}
            testId="whats-new-skip"
            onPress={() => shell.whatsNewDone()}
          />
        ) : null}
      </Panel>
    </Screen>
  );
}

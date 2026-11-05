import { useState } from 'preact/hooks';
import {
  CHEATS,
  PRESETS,
  cheatDef,
  lookupCode,
  sortCodes,
  supersededCodes,
  type CheatDef,
} from '@ffp/sim';
import { PromptText } from '../../ui/InputPrompt';
import { PLAYER_COLORS } from '../../ui/InputPrompt';
import { heroName, locale, t, type TextId } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Panel, Screen } from '../ui';
import { ctx0 } from './Academy';

/** Guide chapters (spec §17): each has a title, a body and control cards for the player's bindings. */
export const CHAPTERS: readonly { id: string; cards: readonly [TextId, string][] }[] = [
  { id: 'start', cards: [['guide.card.pause', '{action:Pause}']] },
  {
    id: 'move',
    cards: [
      ['guide.card.move', '{dir:Up}{dir:Left}{dir:Down}{dir:Right}'],
      ['guide.card.jump', '{action:Jump}'],
      ['guide.card.dash', '{action:Dash}'],
    ],
  },
  {
    id: 'attack',
    cards: [
      ['guide.card.attack', '{action:Attack}'],
      ['guide.card.forward', '{dir:Forward}+{action:Attack}'],
      ['guide.card.low', '{action:LowAttack}'],
    ],
  },
  { id: 'air', cards: [['guide.card.air', '{action:Jump} {action:Attack}']] },
  { id: 'ground', cards: [['guide.card.ground', '{dir:Down}+{action:Attack}']] },
  {
    id: 'defense',
    cards: [
      ['guide.card.guard', '{action:Guard}'],
      ['guide.card.breaker', '{action:Guard}+{action:Ultimate}'],
    ],
  },
  { id: 'counter', cards: [['guide.card.counter', '{dir:Forward}+{action:Guard}']] },
  {
    id: 'grab',
    cards: [
      ['guide.card.grab', '{action:Interact}'],
      ['guide.card.throw', '{dir:Backward}+{action:Interact}'],
    ],
  },
  {
    id: 'resources',
    cards: [
      ['guide.card.special', '{action:Special}'],
      ['guide.card.ultimate', '{action:Ultimate}'],
    ],
  },
  { id: 'weapons', cards: [['guide.card.pickup', '{action:Interact}']] },
  {
    id: 'team',
    cards: [
      ['guide.card.team', '{action:TeamAttack}'],
      ['guide.card.revive', '{action:Interact}'],
    ],
  },
  { id: 'stage', cards: [['guide.card.hold', '{action:Interact}']] },
  { id: 'grade', cards: [] },
  { id: 'store', cards: [] },
  { id: 'academy', cards: [] },
  { id: 'secrets', cards: [] },
];

const title = (id: string) => t(`guide.${id}.title` as TextId);
const body = (id: string) => t(`guide.${id}.body` as TextId);

/** Card text for one Elder's Secret: name, scope, description, Stage 1 note. */
function SecretCard({ c, mark, testId }: { c: CheatDef; mark?: string; testId?: string }) {
  return (
    <div class="ffp-panel" style={{ padding: '8px 12px', margin: '6px 0' }} data-testid={testId}>
      <b>{t(`cheat.${c.code}.name` as TextId)}</b> <code>{c.code}</code>
      <span class="ffp-scope">
        {t(c.scope === 'hero' ? 'secrets.scopeHero' : 'secrets.scopeSession')}
      </span>
      {mark ? <span style={{ float: 'right' }}>{mark}</span> : null}
      <div class="ffp-hint">{t(`cheat.${c.code}.desc` as TextId)}</div>
      {!c.active ? <div class="ffp-hint">{t('secrets.noEffect')}</div> : null}
    </div>
  );
}

/** The Guide: sixteen chapters, search, and control cards drawn with the current bindings. */
export function GuideScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const back = () => shell.go(shell.guideFrom.value);
  useNav(back);
  const [query, setQuery] = useState('');
  const chapter = shell.guideChapter.value;
  const ctx = ctx0(shell);
  const q = query.trim().toLowerCase();
  const list = CHAPTERS.filter(
    (c) => !q || title(c.id).toLowerCase().includes(q) || body(c.id).toLowerCase().includes(q),
  );
  const cur = CHAPTERS.find((c) => c.id === chapter) ?? CHAPTERS[0]!;
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="guide">
      <div class="ffp-row" style={{ width: '92vw', alignItems: 'flex-start' }}>
        <Panel style={{ width: '380px', maxHeight: '88vh', overflow: 'auto' }}>
          <h1 class="ffp-title">{t('menu.guide')}</h1>
          <label class="ffp-btn" style={{ display: 'grid', gap: '4px' }}>
            <span class="ffp-hint">{t('guide.search')}</span>
            <input
              data-nav
              data-testid="guide-search"
              value={query}
              maxLength={40}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
              style={{ font: 'inherit', padding: '4px 8px', borderRadius: '6px' }}
            />
          </label>
          {list.length === 0 ? <p class="ffp-hint">{t('guide.noMatch')}</p> : null}
          {list.map((c, i) => (
            <Button
              label={title(c.id)}
              testId={`guide-chapter-${c.id}`}
              mark={c.id === cur.id ? '●' : ''}
              autofocus={c.id === cur.id || (i === 0 && !list.some((x) => x.id === cur.id))}
              onFocus={() => (shell.guideChapter.value = c.id)}
              onPress={() => (shell.guideChapter.value = c.id)}
            />
          ))}
          <Button label={t('common.back')} onPress={back} />
        </Panel>
        <Panel style={{ flex: 1, maxHeight: '88vh', overflow: 'auto' }} testId="guide-page">
          <h2 style={{ marginTop: 0 }} data-testid="guide-title">
            {title(cur.id)}
          </h2>
          {body(cur.id)
            .split('\n')
            .map((para) => (
              <p>{ctx ? <PromptText text={para} ctx={ctx} /> : para}</p>
            ))}
          {cur.cards.length > 0 && ctx ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
              {cur.cards.map(([label, tokens]) => (
                <div class="ffp-panel" style={{ padding: '8px 12px' }} data-testid="guide-card">
                  <div class="ffp-hint">{t(label)}</div>
                  <PromptText text={tokens} ctx={ctx} />
                </div>
              ))}
            </div>
          ) : null}
          {cur.id === 'secrets' ? (
            <div data-testid="guide-secrets">
              <h3>{t('secrets.presets')}</h3>
              {PRESETS.map((p) => (
                <div class="ffp-panel" style={{ padding: '8px 12px', margin: '6px 0' }}>
                  <b>{t(`preset.${p.code}.name` as TextId)}</b> <code>{p.code}</code>
                  <div class="ffp-hint">
                    {p.codes.map((c) => t(`cheat.${c}.name` as TextId)).join(' · ')}
                  </div>
                </div>
              ))}
              <h3>{t('secrets.cards')}</h3>
              {CHEATS.map((c) => (
                <SecretCard c={c} testId={`guide-cheat-${c.code}`} />
              ))}
              <Button
                label={t('secrets.choose')}
                testId="guide-open-secrets"
                onPress={() => {
                  shell.secretsFrom.value = 'guide';
                  shell.go('secrets');
                }}
              />
            </div>
          ) : null}
        </Panel>
      </div>
    </Screen>
  );
}

/**
 * Elder's Secrets: pick cards per player (hero scope) and for the run (session scope),
 * apply a preset, or type a code exactly (nothing is guessed). Every player accepts the
 * Cheat-Assisted consequence on their own before the codes take effect.
 */
export function SecretsScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const from = shell.secretsFrom.value;
  const inRun = from === 'game';
  const players = inRun
    ? Math.max(1, shell.session.devices.joinedCount())
    : from === 'guide'
      ? 1
      : Math.max(1, shell.chosenHeroes().length);
  const heroes = shell.chosenHeroes();
  const draft = shell.cheatDraft.value;
  const consent = shell.cheatConsent.value;
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const marked = shell.session.world.cheats.marked;
  const back = () => shell.go(from);
  useNav(back);

  const setDraft = (hero: string[][], session: string[]) => {
    shell.cheatDraft.value = { hero: hero.map((h) => sortCodes(h)), session: sortCodes(session) };
    shell.cheatConsent.value = [];
  };
  const toggle = (slot: number | null, c: string) => {
    if (slot === null) {
      const s = draft.session.includes(c)
        ? draft.session.filter((x) => x !== c)
        : [...draft.session, c];
      setDraft(draft.hero, s);
    } else {
      const hero = [0, 1].map((i) => [...(draft.hero[i] ?? [])]);
      hero[slot] = hero[slot]!.includes(c)
        ? hero[slot]!.filter((x) => x !== c)
        : [...hero[slot]!, c];
      setDraft(hero, draft.session);
    }
  };
  const applyPreset = (codes: readonly string[]) => {
    const heroCodes = codes.filter((c) => cheatDef(c)?.scope === 'hero');
    const sessionCodes = codes.filter((c) => cheatDef(c)?.scope === 'session');
    setDraft(
      [0, 1].map((i) => (i < players ? [...heroCodes] : [])),
      sessionCodes,
    );
  };
  const enter = () => {
    const m = lookupCode(code);
    if (!m) {
      setMsg(t('secrets.unknown'));
      return;
    }
    if (m.kind === 'preset') {
      applyPreset(m.preset.codes);
      setMsg(t('secrets.presetApplied', { name: t(`preset.${m.preset.code}.name` as TextId) }));
    } else {
      toggle(m.cheat.scope === 'hero' ? 0 : null, m.cheat.code);
      setMsg(t('secrets.codeToggled', { name: t(`cheat.${m.cheat.code}.name` as TextId) }));
    }
    setCode('');
  };
  const any = draft.session.length > 0 || draft.hero.some((h, i) => i < players && h.length > 0);
  const allConsent = Array.from({ length: players }, (_, i) => consent[i] === true).every(Boolean);
  const done = () => {
    if (any && !allConsent) {
      setMsg(t('secrets.needConsent'));
      return;
    }
    shell.saveHeroPrefs();
    if (inRun) shell.applyCheatsNow();
    back();
  };
  const selected = [...draft.session, ...draft.hero.flat()];
  const superseded = new Set(
    [0, 1].flatMap((i) => supersededCodes([...(draft.hero[i] ?? []), ...draft.session])),
  );
  const mark = (on: boolean, c: string) =>
    on ? (superseded.has(c as never) ? t('secrets.superseded') : '✓') : '';

  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="secrets">
      <Panel style={{ width: '92vw', maxWidth: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
        <h1 class="ffp-title">{t('secrets.title')}</h1>
        <p class="ffp-hint">{t('secrets.intro')}</p>
        {marked ? <p data-testid="secrets-marked">{t('secrets.alreadyMarked')}</p> : null}
        <div class="ffp-row" style={{ alignItems: 'flex-end' }}>
          <label class="ffp-btn" style={{ display: 'grid', gap: '4px', flex: 1 }}>
            <span class="ffp-hint">{t('secrets.typeCode')}</span>
            <input
              data-nav
              data-testid="secrets-code"
              value={code}
              maxLength={24}
              onInput={(e) => setCode((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  enter();
                }
              }}
              style={{ font: 'inherit', padding: '4px 8px', borderRadius: '6px' }}
            />
          </label>
          <div style={{ width: '220px' }}>
            <Button label={t('secrets.enter')} testId="secrets-enter" onPress={enter} />
          </div>
        </div>
        {msg ? (
          <p data-testid="secrets-msg" role="status">
            {msg}
          </p>
        ) : null}
        <h3 style={{ margin: '8px 0 2px' }}>{t('secrets.presets')}</h3>
        <div class="ffp-row" style={{ gap: '6px' }}>
          {PRESETS.map((p) => (
            <Button
              label={t(`preset.${p.code}.name` as TextId)}
              testId={`secrets-preset-${p.code}`}
              onPress={() => applyPreset(p.codes)}
            />
          ))}
        </div>
        <div class="ffp-row" style={{ alignItems: 'flex-start' }}>
          {Array.from({ length: players }, (_, slot) => {
            const hero = heroes[slot] ?? 'mountain';
            const prefs = shell.profileOf(slot)?.cheats.heroPrefs[hero];
            return (
              <div style={{ flex: 1 }} data-testid={`secrets-p${slot + 1}`}>
                <h3 style={{ color: PLAYER_COLORS[slot], margin: '8px 0 2px' }}>
                  {t('common.player', { n: slot + 1 })} · {heroName(hero)}
                </h3>
                {prefs && prefs.length > 0 ? (
                  <Button
                    label={t('secrets.usePrefs')}
                    testId={`secrets-prefs-p${slot + 1}`}
                    onPress={() => {
                      const h = [0, 1].map((i) => [...(draft.hero[i] ?? [])]);
                      h[slot] = [...prefs];
                      setDraft(h, draft.session);
                    }}
                  />
                ) : null}
                {CHEATS.filter((c) => c.scope === 'hero').map((c) => {
                  const on = draft.hero[slot]?.includes(c.code) ?? false;
                  return (
                    <Button
                      label={t(`cheat.${c.code}.name` as TextId)}
                      detail={
                        c.active ? t(`cheat.${c.code}.desc` as TextId) : t('secrets.noEffect')
                      }
                      mark={mark(on, c.code)}
                      testId={`secrets-p${slot + 1}-${c.code}`}
                      onPress={() => toggle(slot, c.code)}
                    />
                  );
                })}
              </div>
            );
          })}
          <div style={{ flex: 1 }} data-testid="secrets-session">
            <h3 style={{ margin: '8px 0 2px' }}>{t('secrets.session')}</h3>
            {CHEATS.filter((c) => c.scope === 'session').map((c) => {
              const on = draft.session.includes(c.code);
              return (
                <Button
                  label={t(`cheat.${c.code}.name` as TextId)}
                  detail={c.active ? t(`cheat.${c.code}.desc` as TextId) : t('secrets.noEffect')}
                  mark={mark(on, c.code)}
                  testId={`secrets-s-${c.code}`}
                  onPress={() => toggle(null, c.code)}
                />
              );
            })}
          </div>
        </div>
        {any ? (
          <div data-testid="secrets-consent">
            <p style={{ color: '#ffb36b' }}>{t('secrets.consequence')}</p>
            <div class="ffp-row">
              {Array.from({ length: players }, (_, slot) => (
                <Button
                  label={t('secrets.accept', { n: slot + 1 })}
                  mark={consent[slot] ? '✓' : ''}
                  testId={`secrets-accept-p${slot + 1}`}
                  onPress={() => {
                    const c = [...shell.cheatConsent.value];
                    c[slot] = true;
                    shell.cheatConsent.value = c;
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div class="ffp-row">
          <Button label={t('secrets.done')} testId="secrets-done" onPress={done} />
          <Button
            label={t('secrets.clear')}
            testId="secrets-clear"
            disabled={selected.length === 0}
            onPress={() => setDraft([[], []], [])}
          />
          <Button label={t('common.back')} onPress={back} />
        </div>
      </Panel>
    </Screen>
  );
}

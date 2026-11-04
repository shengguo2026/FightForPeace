import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ACTION_NAMES,
  DEFAULT_GAMEPAD,
  DEFAULT_KEYBOARD_P1,
  DIRECTIONS,
  PAD_BUTTONS,
  keyboardP2,
  rebind,
  resolvePrompt,
  type BindableInput,
  type Bindings,
  type PromptContext,
} from '@ffp/platform';
import { locale, t, type TextId } from '../../text/i18n';
import { InputPrompt } from '../../ui/InputPrompt';
import { captureNextKey, readPads } from '../../input/browserInput';
import { bindingsOf, type Shell } from '../shell';
import { useNav } from '../hooks';
import { Button } from '../ui';

export type RemapKind = 'keyboard' | 'keyboardP2' | 'gamepad';

const GROUPS: { id: TextId; inputs: BindableInput[] }[] = [
  { id: 'remap.groupMovement', inputs: [...DIRECTIONS] },
  {
    id: 'remap.groupCombat',
    inputs: [
      'Attack',
      'Jump',
      'Guard',
      'Special',
      'Ultimate',
      'Interact',
      'TeamAttack',
      'Dash',
      'LowAttack',
    ],
  },
  { id: 'remap.groupSystem', inputs: ['Pause'] },
];

function inputLabel(input: BindableInput): string {
  if ((DIRECTIONS as readonly string[]).includes(input)) return t(`remap.${input}` as TextId);
  return t(`remap.action.${input}` as TextId);
}

function defaults(kind: RemapKind): Bindings {
  return kind === 'keyboard'
    ? DEFAULT_KEYBOARD_P1
    : kind === 'gamepad'
      ? DEFAULT_GAMEPAD
      : keyboardP2('numpad');
}

/** Inputs that must keep a binding, or the mapping is not applied. */
function required(kind: RemapKind): BindableInput[] {
  const base: BindableInput[] = [...DIRECTIONS, 'Attack', 'Jump'];
  return kind === 'keyboardP2' ? base : [...base, 'Pause'];
}

export function missingRequired(b: Bindings, kind: RemapKind): BindableInput[] {
  return required(kind).filter((i) => b.codes[i].length === 0);
}

/** The other input in the same binding set that already uses `code`. */
export function conflictOf(b: Bindings, input: BindableInput, code: string): BindableInput | null {
  for (const other of [...DIRECTIONS, ...ACTION_NAMES] as BindableInput[])
    if (other !== input && b.codes[other].includes(code)) return other;
  return null;
}

/** Replace: the other input loses the code. Swap: it takes this input's old codes. */
export function resolveConflict(
  b: Bindings,
  input: BindableInput,
  code: string,
  other: BindableInput,
  how: 'replace' | 'swap',
): Bindings {
  const mine = b.codes[input];
  let next = rebind(
    b,
    other,
    how === 'swap' ? [...mine] : b.codes[other].filter((c) => c !== code),
  );
  next = rebind(next, input, [code]);
  return next;
}

/**
 * Guided Action List with a Live Tester (Module 16): device tabs, actions grouped by
 * context, listen-for-input rebinding with Replace / Swap / Cancel on conflicts, resets,
 * presets, and a tester that shows what the draft mapping would do without playing.
 */
export function RemapPanel({ shell, onClose }: { shell: Shell; onClose: () => void }) {
  void locale.value;
  const [kind, setKind] = useState<RemapKind>('keyboard');
  const [draft, setDraft] = useState<Bindings>(() => bindingsOf(shell.active.value, 'keyboard'));
  const [listening, setListening] = useState<BindableInput | null>(null);
  const [conflict, setConflict] = useState<{
    input: BindableInput;
    code: string;
    other: BindableInput;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [held, setHeld] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const listenStart = useRef<boolean[]>([]);

  const switchKind = (k: RemapKind) => {
    setKind(k);
    setDraft(bindingsOf(shell.active.value, k));
    setListening(null);
    setConflict(null);
    setNote('');
  };

  const assign = (input: BindableInput, code: string) => {
    setListening(null);
    const other = conflictOf(draft, input, code);
    if (other) setConflict({ input, code, other });
    else setDraft(rebind(draft, input, [code]));
  };

  // Keyboard: the next real key press (Escape cancels).
  useEffect(() => {
    if (!listening || kind === 'gamepad') return;
    captureNextKey((code) => {
      if (code === 'Escape' && listening !== 'Pause') setListening(null);
      else assign(listening, code);
    });
    return () => captureNextKey(null);
  }, [listening, kind]);

  // Gamepad: the next newly pressed button.
  useEffect(() => {
    if (!listening || kind !== 'gamepad') return;
    const pads = readPads().filter((p) => p !== null);
    listenStart.current = PAD_BUTTONS.map((_, i) => pads.some((p) => p!.buttons[i]));
    let raf = 0;
    const tick = () => {
      for (const p of readPads()) {
        if (!p) continue;
        const i = p.buttons.findIndex((b, n) => b && !listenStart.current[n]);
        if (i >= 0) {
          assign(listening, PAD_BUTTONS[i]!);
          return;
        }
        listenStart.current = listenStart.current.map((was, n) => was && p.buttons[n] === true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening, kind]);

  // Live tester: keys held (keyboard) or buttons held (gamepad).
  useEffect(() => {
    if (!testing) return;
    if (kind === 'gamepad') {
      let raf = 0;
      const tick = () => {
        const s = new Set<string>();
        for (const p of readPads()) p?.buttons.forEach((b, i) => b && s.add(PAD_BUTTONS[i]!));
        setHeld(s);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    const down = (e: KeyboardEvent) => setHeld((h) => new Set(h).add(e.code));
    const up = (e: KeyboardEvent) =>
      setHeld((h) => {
        const n = new Set(h);
        n.delete(e.code);
        return n;
      });
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
    };
  }, [testing, kind]);

  useNav(
    () => (testing ? setTesting(false) : onClose()),
    (e) => {
      if (listening) return true;
      if (testing) {
        if (e.back && e.source === 'kb:p1') {
          setTesting(false);
          setHeld(new Set());
        }
        return true;
      }
      return false;
    },
  );

  const ctx: PromptContext = {
    bindings: draft,
    labels: shell.session.labels,
    family:
      shell.lab.promptStyle.value === 'auto'
        ? (shell.session.devices.padFamilyFor(0) ?? 'xbox')
        : shell.lab.promptStyle.value,
    facing: 1,
  };
  const prompt = (input: BindableInput) =>
    resolvePrompt(
      ctx,
      (DIRECTIONS as readonly string[]).includes(input)
        ? { dir: input as 'up' }
        : { action: input as 'Attack' },
    );
  const apply = () => {
    const missing = missingRequired(draft, kind);
    if (missing.length > 0) {
      setNote(t('remap.incomplete'));
      return;
    }
    shell.update((p) => (p.bindings[kind] = draft));
    setNote(shell.active.value?.guest ? t('remap.guest') : t('remap.applied'));
  };
  const active = [...DIRECTIONS, ...ACTION_NAMES].filter((i) =>
    draft.codes[i as BindableInput].some((c) => held.has(c)),
  ) as BindableInput[];

  return (
    <div data-testid="remap" class="ffp-col" style={{ gap: '6px' }}>
      <div class="ffp-row" style={{ gap: '8px' }}>
        {(['keyboard', 'keyboardP2', 'gamepad'] as const).map((k) => (
          <button
            type="button"
            class="ffp-btn"
            data-nav
            data-testid={`remap-tab-${k}`}
            style={{ width: 'auto', borderColor: k === kind ? 'var(--ffp-accent)' : undefined }}
            onClick={() => switchKind(k)}
          >
            {k === 'gamepad'
              ? t('remap.gamepad')
              : `${t('remap.keyboard')} · ${t('common.player', { n: k === 'keyboard' ? 1 : 2 })}`}
          </button>
        ))}
      </div>
      {listening ? (
        <div class="ffp-panel" data-testid="remap-listening">
          {t('remap.listening', { action: inputLabel(listening) })}
        </div>
      ) : null}
      {conflict ? (
        <div class="ffp-panel" data-testid="remap-conflict">
          <p>
            {t('remap.conflict', {
              key: kind === 'gamepad' ? conflict.code : shell.session.labels.label(conflict.code),
              other: inputLabel(conflict.other),
            })}
          </p>
          <Button
            label={t('remap.replace')}
            testId="remap-replace"
            autofocus
            onPress={() => {
              setDraft(
                resolveConflict(draft, conflict.input, conflict.code, conflict.other, 'replace'),
              );
              setConflict(null);
            }}
          />
          <Button
            label={t('remap.swap')}
            testId="remap-swap"
            onPress={() => {
              setDraft(
                resolveConflict(draft, conflict.input, conflict.code, conflict.other, 'swap'),
              );
              setConflict(null);
            }}
          />
          <Button label={t('common.cancel')} onPress={() => setConflict(null)} />
        </div>
      ) : null}
      {GROUPS.map((g) => (
        <>
          <div class="ffp-hint" style={{ marginTop: '6px' }}>
            {t(g.id)}{' '}
            <button
              type="button"
              class="ffp-btn"
              data-nav
              style={{ display: 'inline', width: 'auto', padding: '2px 10px' }}
              onClick={() => {
                let next = draft;
                for (const i of g.inputs) next = rebind(next, i, defaults(kind).codes[i]);
                setDraft(next);
              }}
            >
              {t('remap.resetGroup')}
            </button>
          </div>
          {g.inputs.map((input) => (
            <button
              type="button"
              class="ffp-btn ffp-choice"
              data-nav
              data-testid={`remap-${input}`}
              onClick={() => setListening(input)}
              style={{ padding: '6px 14px', margin: '2px 0' }}
            >
              <span>{inputLabel(input)}</span>
              <span class="ffp-value">
                {draft.codes[input].length === 0 ? (
                  <i>{t('remap.unassigned')}</i>
                ) : (
                  <InputPrompt prompt={prompt(input)} />
                )}
              </span>
            </button>
          ))}
        </>
      ))}
      <div class="ffp-row" style={{ gap: '8px', flexWrap: 'wrap' }}>
        {kind === 'keyboardP2'
          ? (['numpad', 'laptop'] as const).map((preset) => (
              <button
                type="button"
                class="ffp-btn"
                data-nav
                style={{ width: 'auto' }}
                data-testid={`remap-preset-${preset}`}
                onClick={() => setDraft(keyboardP2(preset))}
              >
                {t('remap.preset')}:{' '}
                {preset === 'numpad' ? t('remap.presetNumpad') : t('remap.presetLaptop')}
              </button>
            ))
          : null}
        <button
          type="button"
          class="ffp-btn"
          data-nav
          style={{ width: 'auto' }}
          onClick={() => setDraft(defaults(kind))}
          data-testid="remap-reset"
        >
          {t('remap.resetDevice')}
        </button>
        <button
          type="button"
          class="ffp-btn"
          data-nav
          style={{ width: 'auto' }}
          data-testid="remap-tester"
          onClick={() => setTesting(!testing)}
        >
          {t('remap.tester')} {testing ? '●' : ''}
        </button>
        <button
          type="button"
          class="ffp-btn"
          data-nav
          style={{ width: 'auto' }}
          onClick={apply}
          data-testid="remap-apply"
        >
          {t('remap.apply')}
        </button>
      </div>
      {testing ? (
        <div class="ffp-panel" data-testid="remap-tester-panel">
          <div class="ffp-hint">{t('remap.testerHint')}</div>
          <div data-testid="remap-tester-active" style={{ minHeight: '1.6em', fontWeight: 600 }}>
            {active.map(inputLabel).join(' + ')}
          </div>
        </div>
      ) : null}
      {kind === 'gamepad' && shell.session.devices.pads.size === 0 ? (
        <p class="ffp-hint">{t('remap.noPad')}</p>
      ) : null}
      {note ? (
        <p data-testid="remap-note" class="ffp-hint">
          {note}
        </p>
      ) : null}
    </div>
  );
}

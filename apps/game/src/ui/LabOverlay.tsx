import { CANCEL_TIMING, type FacingMode, HEROES, type HeroDef } from '@ffp/sim';
import type { KeyboardP2Preset, LayoutName } from '@ffp/platform';
import { LINK_TEXT, TEXT, moveInputText } from '../text/en';
import { InputPrompt, PLAYER_COLORS, PromptText } from './InputPrompt';
import type { LabState, PlayerView, PromptStyle, TargetView } from './labState';

export interface LabActions {
  setFacing(slot: number, mode: FacingMode): void;
  setPromptStyle(style: PromptStyle): void;
  setLayout(layout: LayoutName): void;
  setP2Preset(preset: KeyboardP2Preset): void;
  rebindAttack(): void;
  resetBindings(): void;
  setDummiesChase(on: boolean): void;
  setShowCollision(on: boolean): void;
  setHero(slot: number, heroId: string): void;
  setInfiniteMeter(on: boolean): void;
  setCounterHit(on: boolean): void;
  setRefill(on: boolean): void;
}

const panel = {
  padding: '8px 12px',
  font: '13px/1.5 ui-monospace, Consolas, monospace',
  color: '#e8e8e8',
  background: 'rgba(0, 0, 0, 0.72)',
  borderRadius: '4px',
  minWidth: '200px',
} as const;

function PlayerPanel({ p }: { p: PlayerView }) {
  const color = PLAYER_COLORS[p.slot];
  if (!p.joined) {
    return (
      <div
        style={{ ...panel, borderLeft: `4px solid ${color}` }}
        data-testid={`lab-p${p.slot + 1}`}
      >
        <div style={{ color }}>Player {p.slot + 1} · not joined</div>
        <div>
          <PromptText text={TEXT.joinKeyboard} ctx={p.ctx} color={color} />
        </div>
        <div>or Start on a second gamepad</div>
      </div>
    );
  }
  return (
    <div style={{ ...panel, borderLeft: `4px solid ${color}` }} data-testid={`lab-p${p.slot + 1}`}>
      <div style={{ color }}>
        Player {p.slot + 1} · <span data-testid={`lab-p${p.slot + 1}-device`}>{p.device}</span>
      </div>
      <div>
        state <span data-testid={`lab-p${p.slot + 1}-state`}>{p.state}</span> · facing {p.facing} (
        {p.facingMode})
      </div>
      <div>
        hero <span data-testid={`lab-p${p.slot + 1}-hero`}>{p.hero}</span>
      </div>
      <div>
        move <span data-testid={`lab-p${p.slot + 1}-action`}>{p.action}</span> · {p.phase}
      </div>
      <div data-testid={`lab-p${p.slot + 1}-verdict`}>cancel {p.verdict}</div>
      <div>
        meter <span data-testid={`lab-p${p.slot + 1}-meter`}>{p.meter}</span>% · {p.bridge}
      </div>
      <div>speed {p.speed}</div>
      <div>
        buffered <span data-testid={`lab-p${p.slot + 1}-buffer`}>{p.buffered}</span> · target{' '}
        {p.target}
      </div>
      <div
        data-testid={p.slot === 0 ? 'lab-input' : 'lab-input-p2'}
        style={{ whiteSpace: 'pre', marginTop: '4px' }}
      >
        {p.history.map((e) => (
          <div key={e.frame}>
            {String(e.frame).padStart(6, ' ')}{' '}
            {e.prompts.length === 0
              ? '·'
              : e.prompts.map((pr) => <InputPrompt prompt={pr} color={color} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Select<T extends string>(props: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  testId: string;
}) {
  return (
    <label style={{ display: 'block', margin: '2px 0' }}>
      {props.label}{' '}
      <select
        data-testid={props.testId}
        value={props.value}
        onChange={(e) => {
          const el = e.target as HTMLSelectElement;
          props.onChange(el.value as T);
          el.blur(); // keep game keys away from the focused control
        }}
      >
        {props.options.map((o) => (
          <option value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Settings({ state, actions }: { state: LabState; actions: LabActions }) {
  const players = state.players.value;
  return (
    <div style={{ ...panel, pointerEvents: 'auto' }} data-testid="lab-settings">
      <div>Lab settings · F2 to close</div>
      {[0, 1].map((slot) => (
        <Select
          label={`Player ${slot + 1} hero`}
          value={players[slot]?.heroId ?? 'mountain'}
          options={HEROES.map((h) => h.id)}
          onChange={(v) => actions.setHero(slot, v)}
          testId={`set-hero-p${slot + 1}`}
        />
      ))}
      {[0, 1].map((slot) => (
        <Select
          label={`Player ${slot + 1} facing`}
          value={players[slot]?.facingMode ?? 'manual'}
          options={['manual', 'assisted'] as const}
          onChange={(v) => actions.setFacing(slot, v)}
          testId={`set-facing-p${slot + 1}`}
        />
      ))}
      <Select
        label="Button prompt style"
        value={state.promptStyle.value}
        options={['auto', 'xbox', 'playstation', 'nintendo', 'generic'] as const}
        onChange={actions.setPromptStyle}
        testId="set-prompt-style"
      />
      <Select
        label="Keyboard layout"
        value={state.layout.value}
        options={['qwerty', 'qwertz', 'azerty'] as const}
        onChange={actions.setLayout}
        testId="set-layout"
      />
      <Select
        label="Player 2 keyboard"
        value={state.p2Preset.value}
        options={['numpad', 'laptop'] as const}
        onChange={actions.setP2Preset}
        testId="set-p2-preset"
      />
      <div style={{ margin: '4px 0' }}>
        <button
          data-testid="rebind-attack"
          onClick={(e) => {
            (e.target as HTMLElement).blur();
            actions.rebindAttack();
          }}
        >
          {state.rebinding.value ? 'Press a key…' : 'Rebind P1 Attack'}
        </button>{' '}
        <button
          data-testid="reset-bindings"
          onClick={(e) => {
            (e.target as HTMLElement).blur();
            actions.resetBindings();
          }}
        >
          Reset P1 keys
        </button>
      </div>
      <label style={{ display: 'block' }}>
        <input
          type="checkbox"
          data-testid="set-chase"
          checked={state.dummiesChase.value}
          onChange={(e) => actions.setDummiesChase((e.target as HTMLInputElement).checked)}
        />{' '}
        Dummies chase (F4)
      </label>
      <label style={{ display: 'block' }}>
        <input
          type="checkbox"
          data-testid="set-collision"
          checked={state.showCollision.value}
          onChange={(e) => actions.setShowCollision((e.target as HTMLInputElement).checked)}
        />{' '}
        Hitboxes and collision (F3)
      </label>
      <Check
        label="Infinite attack meter"
        checked={state.infiniteMeter.value}
        onChange={actions.setInfiniteMeter}
        testId="set-meter"
      />
      <Check
        label="Counter-hit dummies (every hit is a counter-hit)"
        checked={state.counterHit.value}
        onChange={actions.setCounterHit}
        testId="set-counter"
      />
      <Check
        label="Dummies refill health when a combo ends"
        checked={state.refill.value}
        onChange={actions.setRefill}
        testId="set-refill"
      />
    </div>
  );
}

function Check(props: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  testId: string;
}) {
  return (
    <label style={{ display: 'block' }}>
      <input
        type="checkbox"
        data-testid={props.testId}
        checked={props.checked}
        onChange={(e) => {
          const el = e.target as HTMLInputElement;
          props.onChange(el.checked);
          el.blur();
        }}
      />{' '}
      {props.label}
    </label>
  );
}

function TargetPanel({ t }: { t: TargetView | null }) {
  if (!t) {
    return (
      <div style={panel} data-testid="lab-target">
        <div>Target · hit a dummy</div>
      </div>
    );
  }
  return (
    <div style={{ ...panel, borderLeft: '4px solid #9a9ea6' }} data-testid="lab-target">
      <div>
        {t.name} · {t.open ? 'combo' : 'combo ended'}
      </div>
      <div>health {t.health}</div>
      <div>
        hits <span data-testid="lab-target-hits">{t.hits}</span> · damage{' '}
        <span data-testid="lab-target-damage">{t.damage}</span>
      </div>
      <div>
        damage scale <span data-testid="lab-target-scale">{t.scale}</span>%
      </div>
      <div>
        hit-stun budget {t.stunBudget} ({t.stunBand}%){t.exhausted ? ' · exhausted' : ''}
      </div>
      <div>meter-gain budget {t.meterBudget}%</div>
      <div>juggle budget {t.juggleBudget} (M3)</div>
      <div>dash bridge {t.bridge ? 'used' : 'available'}</div>
      <div>
        state {t.reaction} · ground {t.ground}
      </div>
    </div>
  );
}

function linkLabel(hero: HeroDef, l: HeroDef['actions'][number]['links'][number]) {
  const when = [l.onHit ? 'hit' : '', l.onGuard ? 'guard' : '', l.onWhiff ? 'whiff' : '']
    .filter(Boolean)
    .join('/');
  const t = CANCEL_TIMING[l.category];
  const timing = `${t.buffer}f before, ${t.window}f after contact`;
  const cost = l.premium > 0 ? `, ${l.premium}% meter` : '';
  const later = l.kind === 'special' || l.kind === 'ultimate' ? ' — M5' : '';
  const text = l.kind === 'action' ? hero.actions[l.to]!.name : LINK_TEXT[l.kind];
  return { text, note: `(${when}; ${timing}${cost})${later}` };
}

/** F5: every action of each joined hero, with input, frame data, damage and cancels. */
function MoveList({ players }: { players: PlayerView[] }) {
  return (
    <div
      style={{ ...panel, maxHeight: '86vh', overflowY: 'auto', pointerEvents: 'auto' }}
      data-testid="lab-movelist"
    >
      <div>Move list · F5 to close</div>
      {players
        .filter((p) => p.joined)
        .map((p) => {
          const hero = HEROES.find((h) => h.id === p.heroId)!;
          const color = PLAYER_COLORS[p.slot];
          return (
            <div style={{ marginTop: '6px' }} data-testid={`movelist-p${p.slot + 1}`}>
              <div style={{ color }}>
                P{p.slot + 1} · {hero.name}
              </div>
              {hero.actions.map((a) => (
                <div style={{ margin: '3px 0', opacity: a.context === 'groundFocus' ? 0.6 : 1 }}>
                  <b>{a.name}</b> [{a.category}]{' '}
                  <PromptText text={moveInputText(a.context, a.dir)} ctx={p.ctx} color={color} /> ·{' '}
                  {a.startup}/{a.active.join('+')}/{a.recovery}
                  {a.landing ? ' landing' : ''} · {a.damage} dmg
                  {a.links.map((l) => {
                    const { text, note } = linkLabel(hero, l);
                    return (
                      <div style={{ paddingLeft: '16px' }}>
                        →{' '}
                        {l.kind === 'action' ? (
                          text
                        ) : (
                          <PromptText text={text} ctx={p.ctx} color={color} />
                        )}{' '}
                        {note}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
}

export function LabOverlay({ state, actions }: { state: LabState; actions: LabActions }) {
  const players = state.players.value;
  return (
    <>
      {state.visible.value ? (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            pointerEvents: 'none',
          }}
          data-testid="lab-overlay"
        >
          <div style={panel}>
            <div>Lab · F1 hide · F2 settings</div>
            <div>F3 hitboxes · F5 moves · F6 slow{state.slowMotion.value ? ' (on)' : ''}</div>
            <div>
              frame <span data-testid="lab-frame">{state.frame.value}</span>
              {state.paused.value ? ' (paused)' : ''}
            </div>
            <div>
              hash <span data-testid="lab-hash">{state.hash.value}</span>
            </div>
            <div>
              fps <span data-testid="lab-fps">{state.fps.value}</span>
            </div>
            <div data-testid="lab-held">held {state.heldKeys.value.join(' ') || '—'}</div>
          </div>
          {players.map((p) => (
            <PlayerPanel p={p} />
          ))}
          <TargetPanel t={state.target.value} />
          {state.settingsOpen.value ? <Settings state={state} actions={actions} /> : null}
          {state.moveListOpen.value ? <MoveList players={players} /> : null}
        </div>
      ) : null}
      <HintBar players={players} />
    </>
  );
}

/** Bottom-of-screen control hints, drawn from each player's own bindings. */
function HintBar({ players }: { players: PlayerView[] }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        right: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        font: '14px/1.6 system-ui, sans-serif',
        color: '#e8e8e8',
      }}
    >
      {players
        .filter((p) => p.joined)
        .map((p) => {
          const color = PLAYER_COLORS[p.slot];
          return (
            <div style={{ ...panel, font: 'inherit' }} data-testid={`hint-p${p.slot + 1}`}>
              <span style={{ color }}>P{p.slot + 1}</span>{' '}
              {[
                TEXT.hintMove,
                TEXT.hintDash,
                TEXT.hintJump,
                TEXT.hintAttack,
                TEXT.hintAirAttack,
                TEXT.hintLowAttack,
              ].map((t) => (
                <span style={{ marginRight: '12px' }}>
                  <PromptText text={t} ctx={p.ctx} color={color} />
                </span>
              ))}
            </div>
          );
        })}
    </div>
  );
}

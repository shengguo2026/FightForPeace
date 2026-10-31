import type { FacingMode } from '@ffp/sim';
import type { KeyboardP2Preset, LayoutName } from '@ffp/platform';
import { TEXT } from '../text/en';
import { InputPrompt, PLAYER_COLORS, PromptText } from './InputPrompt';
import type { LabState, PlayerView, PromptStyle } from './labState';

export interface LabActions {
  setFacing(slot: number, mode: FacingMode): void;
  setPromptStyle(style: PromptStyle): void;
  setLayout(layout: LayoutName): void;
  setP2Preset(preset: KeyboardP2Preset): void;
  rebindAttack(): void;
  resetBindings(): void;
  setDummiesChase(on: boolean): void;
  setShowCollision(on: boolean): void;
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
        Collision shapes (F3)
      </label>
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
          {state.settingsOpen.value ? <Settings state={state} actions={actions} /> : null}
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

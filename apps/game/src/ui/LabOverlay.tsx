import { type Signal, signal } from '@preact/signals';
import {
  type BindableInput,
  type Bindings,
  ACTION_NAMES,
  Action,
  describeBinding,
} from '@ffp/platform';
import type { FrameInput } from '@ffp/sim';

export interface InputEntry {
  frame: number;
  label: string;
}

export interface LabState {
  visible: Signal<boolean>;
  frame: Signal<number>;
  hash: Signal<string>;
  fps: Signal<number>;
  inputs: Signal<InputEntry[]>;
}

export function createLabState(visible: boolean): LabState {
  return {
    visible: signal(visible),
    frame: signal(0),
    hash: signal('00000000'),
    fps: signal(0),
    inputs: signal([]),
  };
}

const HISTORY_LENGTH = 12;

/** Key labels for one frame's input, always through describeBinding(). */
export function labelInput(b: Bindings, input: FrameInput): string {
  const parts: string[] = [];
  const dir = (d: BindableInput) => parts.push(describeBinding(b, d));
  if (input.moveZ === -1) dir('up');
  if (input.moveZ === 1) dir('down');
  if (input.moveX === -1) dir('left');
  if (input.moveX === 1) dir('right');
  for (const name of ACTION_NAMES) {
    if (input.pressed & Action[name]) parts.push(describeBinding(b, name));
  }
  return parts.length === 0 ? '·' : parts.join('+');
}

/** Records an input in the history when it differs from the newest entry. */
export function pushInput(state: LabState, frame: number, label: string): void {
  const history = state.inputs.value;
  if (history[0]?.label === label) return;
  state.inputs.value = [{ frame, label }, ...history].slice(0, HISTORY_LENGTH);
}

const panel = {
  position: 'absolute',
  top: '8px',
  left: '8px',
  padding: '8px 12px',
  font: '13px/1.5 ui-monospace, Consolas, monospace',
  color: '#e8e8e8',
  background: 'rgba(0, 0, 0, 0.7)',
  borderRadius: '4px',
  pointerEvents: 'none',
  minWidth: '180px',
} as const;

export function LabOverlay({ state }: { state: LabState }) {
  if (!state.visible.value) return null;
  return (
    <div style={panel} data-testid="lab-overlay">
      <div>Lab · F1 to hide</div>
      <div>
        frame <span data-testid="lab-frame">{state.frame.value}</span>
      </div>
      <div>
        hash <span data-testid="lab-hash">{state.hash.value}</span>
      </div>
      <div>
        fps <span data-testid="lab-fps">{state.fps.value}</span>
      </div>
      <div data-testid="lab-input" style={{ whiteSpace: 'pre' }}>
        {state.inputs.value.map((e) => (
          <div key={e.frame}>
            {String(e.frame).padStart(6, ' ')} {e.label}
          </div>
        ))}
      </div>
    </div>
  );
}

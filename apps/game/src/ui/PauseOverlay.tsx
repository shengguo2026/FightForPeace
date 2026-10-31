import { TEXT } from '../text/en';
import { PLAYER_COLORS, PromptText } from './InputPrompt';
import type { LabState } from './labState';

/** Shown while gameplay is paused: a lost controller, or a pause the player asked for. */
export function PauseOverlay({ state }: { state: LabState }) {
  if (!state.paused.value) return null;
  const players = state.players.value;
  const waiting = state.waiting.value;
  const ctx = players[waiting[0] ?? 0]?.ctx ?? players[0]?.ctx;
  if (!ctx) return null;
  return (
    <div
      data-testid="pause-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        pointerEvents: 'none',
        font: '22px/1.6 system-ui, sans-serif',
        color: '#f2f2f2',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '760px', padding: '24px' }}>
        {waiting.length > 0 ? (
          waiting.map((slot) => (
            <div data-testid="pause-controller-lost">
              <div style={{ color: PLAYER_COLORS[slot] }}>
                <PromptText text={TEXT.controllerLost} ctx={ctx} values={{ player: slot + 1 }} />
              </div>
              <PromptText text={TEXT.controllerReconnect} ctx={ctx} />
            </div>
          ))
        ) : (
          <PromptText text={TEXT.paused} ctx={players[0]!.ctx} />
        )}
      </div>
    </div>
  );
}

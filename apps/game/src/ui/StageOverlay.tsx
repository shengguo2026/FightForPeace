import { STAGE_TEXT } from '../text/en';
import { PLAYER_COLORS, PromptText } from './InputPrompt';
import type { LabState } from './labState';

const box = {
  background: 'rgba(10,12,16,0.82)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: '6px',
  padding: '8px 14px',
  color: '#f2f2f2',
} as const;

/**
 * M9 stage HUD on the interface layer: each player's interaction prompt on the lower edge
 * (only while actionable, drawn from that player's own bindings), the hold progress, the
 * story text of a clue or the sponsor evidence, and short notices.
 */
export function StageHud({ state }: { state: LabState }) {
  const hud = state.stage.value;
  if (!hud.active || state.results.value) return null;
  const players = state.players.value;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        font: '20px/1.5 system-ui, sans-serif',
      }}
      data-testid="stage-hud"
    >
      {hud.notice ? (
        <div
          data-testid="stage-notice"
          style={{ ...box, position: 'absolute', left: '16px', top: '150px' }}
        >
          {hud.notice}
        </div>
      ) : null}
      {hud.story ? (
        <div
          data-testid="stage-story"
          style={{
            ...box,
            position: 'absolute',
            left: '50%',
            top: '22%',
            transform: 'translateX(-50%)',
            maxWidth: '760px',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          {hud.story}
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '64px',
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
        }}
      >
        {hud.prompts.map((p) => {
          const ctx = players[p.slot]?.ctx ?? players[0]?.ctx;
          if (!ctx) return null;
          const color = PLAYER_COLORS[p.slot];
          return (
            <div style={box} data-testid={`stage-prompt-p${p.slot + 1}`}>
              <span style={{ color }}>P{p.slot + 1}</span>{' '}
              <PromptText text={p.text} ctx={ctx} color={color} />
              {p.progress >= 0 ? (
                <div
                  style={{
                    marginTop: '6px',
                    height: '8px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    data-testid={`stage-progress-p${p.slot + 1}`}
                    style={{
                      width: `${Math.round(Math.min(1, p.progress) * 100)}%`,
                      height: '100%',
                      background: color,
                      borderRadius: '4px',
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const GRADE_COLORS: Record<string, string> = {
  S: '#ffd76a',
  A: '#7ddc7d',
  B: '#8fc7ff',
  C: '#d0d0d0',
};

/** M9 results screen: the list of grades, the overall grade, the counters and the hook. */
export function ResultsOverlay({
  state,
  onAgain,
  onLab,
}: {
  state: LabState;
  onAgain: () => void;
  onLab: () => void;
}) {
  const r = state.results.value;
  if (!r) return null;
  const button = (label: string, testId: string, run: () => void) => (
    <button
      data-testid={testId}
      style={{ font: '18px system-ui, sans-serif', padding: '8px 18px', marginRight: '12px' }}
      onClick={(e) => {
        (e.target as HTMLElement).blur();
        run();
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      data-testid="results"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        font: '20px/1.6 system-ui, sans-serif',
        color: '#f2f2f2',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ ...box, padding: '24px 32px', minWidth: '560px', maxWidth: '820px' }}>
        <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{r.title}</div>
        <div style={{ opacity: 0.8, marginBottom: '12px' }}>{r.difficulty}</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <tbody>
            {r.grades.map((g) => (
              <tr data-testid="results-grade">
                <td style={{ padding: '4px 0' }}>{g.label}</td>
                <td style={{ textAlign: 'right', padding: '4px 16px' }}>{g.value}</td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 'bold',
                    fontSize: '26px',
                    color: GRADE_COLORS[g.grade] ?? '#fff',
                  }}
                >
                  {g.grade}
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ paddingTop: '8px', fontWeight: 'bold' }}>{STAGE_TEXT.overall}</td>
              <td />
              <td
                data-testid="results-overall"
                style={{
                  textAlign: 'right',
                  fontWeight: 'bold',
                  fontSize: '40px',
                  color: GRADE_COLORS[r.overall] ?? '#fff',
                }}
              >
                {r.overall}
              </td>
            </tr>
          </tbody>
        </table>
        {r.lines.map((l) => (
          <div style={{ fontSize: '17px' }}>{l}</div>
        ))}
        <div style={{ marginTop: '16px' }}>
          {button(STAGE_TEXT.playAgain, 'results-again', onAgain)}
          {button(STAGE_TEXT.backToLab, 'results-lab', onLab)}
        </div>
      </div>
    </div>
  );
}

/** M9 portable build v1: the game version, always in the lower right corner. */
export function VersionTag({ version }: { version: string }) {
  return (
    <div
      data-testid="version"
      style={{
        position: 'absolute',
        right: '8px',
        bottom: '2px',
        font: '11px system-ui, sans-serif',
        color: 'rgba(255,255,255,0.55)',
        pointerEvents: 'none',
      }}
    >
      Fight For Peace v{version}
    </div>
  );
}

import { ACHIEVEMENTS, STORE, type Settlement } from '@ffp/platform';
import { HEROES } from '@ffp/sim';
import { useState } from 'preact/hooks';
import { dt, heroName, t, type TextId } from '../text/i18n';
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
          bottom: `${promptBottom()}px`,
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

/**
 * The hold prompts sit just above the control hint bar, whose height grows when the hints
 * of two players wrap onto several lines (co-op), so a prompt is never hidden behind it.
 */
function promptBottom(): number {
  let bar = 0;
  for (const el of document.querySelectorAll('[data-testid^="hint-p"]'))
    bar = Math.max(bar, (el as HTMLElement).offsetHeight);
  return Math.max(64, Math.ceil(bar) + 20);
}

/** M9 results screen: the list of grades, the overall grade, the counters and the hook. */
export function ResultsOverlay({
  state,
  onAgain,
  onLab,
  village,
  continuedFrom,
  settlement,
  completion,
  again,
  hidden,
}: {
  state: LabState;
  /** M13: hidden while the ending cinematic plays over it. */
  hidden?: () => boolean;
  onAgain: () => void;
  /** M12: whether Play again is offered (not in a Wi-Fi game). */
  again?: () => boolean;
  onLab: () => void;
  /** M10: started from the village, so the second button returns there. */
  village?: () => boolean;
  /** M10: the beat (0-based) a Continue started from, or null. */
  continuedFrom?: () => number | null;
  /** M11: each player's payout, records and achievements (null: not settled). */
  settlement?: () => readonly (Settlement | null)[];
  /** M21: what the run completed (a stage opened, new Museum entries). */
  completion?: () => readonly string[];
}) {
  const r = state.results.value;
  // M20: the layered epilogue's cards come one by one before the results (Next / Skip).
  const [seen, setSeen] = useState<{ of: unknown; page: number }>({ of: null, page: 0 });
  if (!r || hidden?.()) return null;
  const page = seen.of === r ? seen.page : 0;
  const cards = r.epilogue ?? [];
  const toVillage = village?.() ?? false;
  const cont = continuedFrom?.() ?? null;
  const settled = settlement?.() ?? [];
  const button = (label: string, testId: string, run: () => void) => (
    <button
      data-testid={testId}
      data-nav
      style={{ font: '18px system-ui, sans-serif', padding: '8px 18px', marginRight: '12px' }}
      onClick={(e) => {
        (e.target as HTMLElement).blur();
        run();
      }}
    >
      {label}
    </button>
  );
  if (page < cards.length)
    return (
      <div
        data-testid="epilogue"
        data-shell-screen
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.75)',
          font: '22px/1.6 system-ui, sans-serif',
          color: '#f2f2f2',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ ...box, padding: '28px 36px', maxWidth: '760px' }}>
          <div style={{ opacity: 0.7, fontSize: '16px', marginBottom: '10px' }}>
            {t('m20.epilogue')} · {page + 1}/{cards.length}
          </div>
          <div data-testid="epilogue-card" style={{ marginBottom: '20px' }}>
            {cards[page]}
          </div>
          {button(t('m20.next'), 'epilogue-next', () => setSeen({ of: r, page: page + 1 }))}
          {button(t('m20.skip'), 'epilogue-skip', () => setSeen({ of: r, page: cards.length }))}
        </div>
      </div>
    );
  return (
    <div
      data-testid="results"
      data-shell-screen
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
      <div
        style={{
          ...box,
          padding: '24px 32px',
          minWidth: '560px',
          maxWidth: '820px',
          maxHeight: '94vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{r.title}</div>
        <div style={{ opacity: 0.8, marginBottom: '12px' }} data-testid="results-difficulty">
          {cont !== null && toVillage
            ? `${r.difficulty.split(' · ')[0]} · ${t('results.continued', { n: cont + 1 })}`
            : r.difficulty}
        </div>
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
              <td style={{ paddingTop: '8px', fontWeight: 'bold' }}>{t('run.overall')}</td>
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
        <div data-testid="results-points" style={{ fontSize: '17px' }}>
          {t('results.points', { n: r.points })}
          {r.capped ? ` · ${t('results.capped', { category: r.capped })}` : ''}
        </div>
        <div data-testid="results-score" style={{ fontSize: '17px' }}>
          {t('results.score', { n: r.score.toLocaleString() })} ·{' '}
          {r.standard ? t('results.standard') : t('results.open')}
        </div>
        {r.cheatAssisted ? (
          <div data-testid="results-cheat" style={{ color: '#ffb36b', fontSize: '17px' }}>
            {t('results.cheatAssisted', { codes: r.cheatCodes.join(', ') })}
          </div>
        ) : null}
        {r.lines.map((l) => (
          <div style={{ fontSize: '17px' }}>{l}</div>
        ))}
        {(r.sections ?? []).map((sec) => (
          <div data-testid="results-section" style={{ marginTop: '10px', fontSize: '16px' }}>
            <div style={{ fontWeight: 'bold' }}>{sec.title}</div>
            {sec.lines.map((l) => (
              <div style={{ opacity: 0.9 }}>{l}</div>
            ))}
          </div>
        ))}
        {settled.map((s, slot) =>
          s ? <Payout s={s} slot={slot} many={settled.length > 1} /> : null,
        )}
        {(completion?.() ?? []).map((l) => (
          <div data-testid="results-completion" style={{ marginTop: '8px', color: '#9fe3a8' }}>
            {l}
          </div>
        ))}
        <div style={{ marginTop: '16px' }}>
          {(again?.() ?? true) ? button(t('results.again'), 'results-again', onAgain) : null}
          {toVillage
            ? button(t('results.village'), 'results-village', onLab)
            : button(t('run.backToLab'), 'results-lab', onLab)}
        </div>
      </div>
    </div>
  );
}

const PAY_KEY: Record<string, TextId> = {
  completion: 'pay.completion',
  difficulty: 'pay.difficulty',
  rank: 'pay.rank',
  firstClear: 'pay.firstClear',
  'firstRank.B': 'pay.firstRank',
  'firstRank.A': 'pay.firstRank',
  'firstRank.S': 'pay.firstRank',
  allClues: 'pay.allClues',
  achievement: 'pay.achievement',
  mastery: 'pay.mastery',
};

/** One player's payout: Credits lines (struck through when suppressed), records, mastery. */
function Payout({ s, slot, many }: { s: Settlement; slot: number; many: boolean }) {
  const achName = (id: string) =>
    dt(`${id}.name`, ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id);
  return (
    <div
      data-testid={`results-payout-p${slot + 1}`}
      style={{
        marginTop: '10px',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        fontSize: '17px',
      }}
    >
      <b>
        {many ? `${t('common.player', { n: slot + 1 })} · ` : ''}
        {s.practice ? t('pay.practice') : t('pay.total', { n: s.total })}
      </b>
      {s.cheatAssisted ? <div style={{ color: '#ffb36b' }}>{t('pay.suppressed')}</div> : null}
      {s.lines.map((l) => (
        <div
          data-testid="results-pay-line"
          style={{
            textDecoration: l.suppressed ? 'line-through' : undefined,
            opacity: l.suppressed ? 0.6 : 1,
          }}
        >
          {t(PAY_KEY[l.id] ?? 'pay.completion', {
            name:
              l.id === 'achievement' && l.ref
                ? achName(l.ref)
                : l.id.startsWith('firstRank')
                  ? l.id.slice(-1)
                  : (l.ref ?? ''),
          })}{' '}
          +{l.amount}
        </div>
      ))}
      {s.newBest ? <div data-testid="results-best">{t('pay.newBest')}</div> : null}
      {s.achievements.length > 0 ? (
        <div data-testid="results-achievements">
          {t('pay.achievements', { names: s.achievements.map(achName).join(', ') })}
        </div>
      ) : null}
      {s.mastery.gained > 0 ? (
        <div data-testid="results-mastery">
          {t('pay.masteryGain', {
            hero: heroName(s.mastery.hero),
            n: s.mastery.gained,
            level: s.mastery.to,
          })}
        </div>
      ) : null}
      {s.granted.length > 0 ? (
        <div data-testid="results-granted">
          {t('pay.granted', {
            names: s.granted
              .map((id) => {
                const item = STORE.find((x) => x.id === id);
                const a = HEROES.find((h) => h.id === item?.hero)?.actions.find(
                  (x) => x.id === item?.action,
                );
                return a ? dt(`hero.${item!.hero}.action.${a.id}`, a.name) : id;
              })
              .join(', '),
          })}
        </div>
      ) : null}
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

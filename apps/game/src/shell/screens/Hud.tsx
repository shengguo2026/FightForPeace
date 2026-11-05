import { signal } from '@preact/signals';
import { HEROES, METER, STAGES, heroOf } from '@ffp/sim';
import type { GameSession } from '../../game';
import { PLAYER_COLORS } from '../../ui/InputPrompt';
import { dt, heroName, locale, t } from '../../text/i18n';
import { ART } from '../ui';

export interface HudPlayer {
  slot: number;
  hero: string;
  health: number;
  defense: number;
  meter: number;
  full: boolean;
  down: boolean;
}

export interface HudView {
  players: HudPlayer[];
  continues: number | null;
  objective: string;
  /** M11: the run is Cheat-Assisted. */
  cheat: boolean;
}

export const hud = signal<HudView>({ players: [], continues: null, objective: '', cheat: false });
let lastKey = '';

/** Reads the HUD values from the world (presentation only), once per render frame. */
export function refreshHud(session: GameSession): void {
  const world = session.world;
  const players: HudPlayer[] = [];
  for (let slot = 0; slot < 2; slot += 1) {
    if (slot > 0 && !session.devices.slots[slot]?.joined) continue;
    const f = heroOf(world, slot);
    if (!f) continue;
    players.push({
      slot,
      hero: HEROES[f.hero]?.id ?? 'mountain',
      health: Math.max(0, Math.round((100 * f.health) / Math.max(1, f.maxHealth))),
      defense: Math.round(f.defense),
      meter: Math.round((100 * f.meter) / METER.max),
      full: f.meter >= METER.max,
      down: f.health <= 0,
    });
  }
  const run = world.run;
  const stage = run ? STAGES[run.stage] : undefined;
  const beat = stage?.beats[run!.beat];
  const view: HudView = {
    players,
    continues: run ? run.continues : null,
    cheat: world.cheats.marked,
    objective:
      stage && beat ? dt(`stage.${stage.id}.beat.${beat.id}.objective`, beat.objective) : '',
  };
  const key = JSON.stringify(view) + locale.value;
  if (key === lastKey) return;
  lastKey = key;
  hud.value = view;
}

function Bar({ value, color, testId }: { value: number; color: string; testId?: string }) {
  return (
    <div class="ffp-bar" data-testid={testId}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

/**
 * Corner clusters (Module 16): portrait, health, defense, attack bar and continues for
 * Player 1 in the upper left; Player 2 mirrored in the upper right only in co-op. The
 * objective stays in the stage banner at the top centre.
 */
export function HudClusters() {
  void locale.value;
  const v = hud.value;
  return (
    <div class="ffp-hud" data-testid="hud">
      {v.players.map((p) => (
        <div
          class={`ffp-cluster ${p.slot === 0 ? 'left' : 'right'}`}
          data-testid={`hud-p${p.slot + 1}`}
        >
          <img
            src={ART(`portrait-${p.hero}`)}
            alt=""
            width={72}
            height={72}
            style={{
              borderRadius: '8px',
              border: `3px solid ${PLAYER_COLORS[p.slot]}`,
              objectFit: 'cover',
              filter: p.down ? 'grayscale(1)' : undefined,
            }}
          />
          <div>
            <div style={{ fontWeight: 700, color: PLAYER_COLORS[p.slot] }}>
              {heroName(p.hero)}
              {p.down ? ` · ${t('hud.down')}` : ''}
            </div>
            <Bar value={p.health} color="#e05050" testId={`hud-health-p${p.slot + 1}`} />
            <Bar
              value={p.defense}
              color={p.defense >= 75 ? '#7ddc7d' : p.defense >= 25 ? '#e0c050' : '#e05050'}
            />
            <Bar value={p.meter} color={p.full ? '#ff5ea0' : '#ffb347'} />
            <div style={{ fontSize: '14px', opacity: 0.85 }}>
              {p.full
                ? t('hud.ready')
                : `${t('hud.health')} · ${t('hud.defense')} · ${t('hud.attack')}`}
            </div>
            {p.slot === 0 && v.cheat ? (
              <div data-testid="hud-cheat" style={{ fontSize: '15px', color: '#ffb36b' }}>
                {t('hud.cheatAssisted')}
              </div>
            ) : null}
            {p.slot === 0 && v.continues !== null ? (
              <div data-testid="hud-continues" style={{ fontSize: '15px' }}>
                {t('hud.continues', { n: v.continues })}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

import {
  CANCEL_TIMING,
  ENEMIES,
  type FacingMode,
  HEROES,
  type HeroDef,
  TRAINER_INTERVALS,
  type TrainerSettings,
  compatibleMoves,
  WEAPONS,
  arenaNames,
  stageNames,
  difficultyNames,
  CORRIDORS,
  ROOMS,
  MountedSlot,
  mountedKit,
} from '@ffp/sim';
import type { KeyboardP2Preset, LayoutName, QualitySetting } from '@ffp/platform';
import { LINK_TEXT, moveInputText, profileText } from '../text/en';
import { dt, t as tx } from '../text/i18n';
import { InputPrompt, PLAYER_COLORS, PromptText } from './InputPrompt';
import type {
  DefenseView,
  GrabPlayerView,
  LabState,
  PlayerView,
  PromptStyle,
  RecipePlayerView,
  TargetView,
  WeaponPanelView,
} from './labState';

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
  dummyToWall(): void;
  practise(slot: number, recipeId: string): void;
  setInfiniteDefense(on: boolean): void;
  setTrainer(settings: Partial<TrainerSettings>): void;
  /** Puts a move (action id, or null to empty) into a Special or Ultimate slot. */
  equip(slot: number, kind: 'special' | 'ultimate', dir: number, action: string | null): void;
  /** Dummy 1 fights with a weapon (index, -1 = unarmed). */
  armDummy(weapon: number): void;
  resetArmory(): void;
  resetEnvironment(): void;
  dummyToPillar(): void;
  /** M7: starts (or restarts) the picked arena; null goes back to the Lab. */
  startArena(arena: string | null): void;
  pickArena(pick: Partial<{ arena: string; difficulty: string; beat: number }>): void;
  /** M17: pursuit options (steering assistance, STEADYRIDE) for the next start. */
  pickPursuit(pick: Partial<{ assist: boolean; steady: boolean }>): void;
  /** M8 Auto Quality: auto, or a fixed presentation level. */
  setQuality(setting: QualitySetting): void;
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
          <PromptText text={tx('prompt.joinKeyboard')} ctx={p.ctx} color={color} />
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
      <Check
        label="Infinite Defense meter"
        checked={state.infiniteDefense.value}
        onChange={actions.setInfiniteDefense}
        testId="set-defense"
      />
      <LoadoutSettings state={state} actions={actions} />
      <TrainerSettingsView state={state} actions={actions} />
      <div style={{ margin: '4px 0' }}>
        <button
          data-testid="dummy-to-wall"
          onClick={(e) => {
            (e.target as HTMLElement).blur();
            actions.dummyToWall();
          }}
        >
          Dummy 1 to the wall
        </button>
      </div>
    </div>
  );
}

const SLOT_NAMES = ['neutral', 'forward', 'backward', 'up', 'down'] as const;
const EMPTY = '— empty —';

/** F2: the five-slot Special and Ultimate loadout of each joined player. */
function LoadoutSettings({ state, actions }: { state: LabState; actions: LabActions }) {
  const views = state.grab.value;
  return (
    <div
      style={{ marginTop: '6px', borderTop: '1px solid #555', paddingTop: '4px' }}
      data-testid="lab-loadout"
    >
      <div>Loadout (direction + Special or Ultimate)</div>
      {views.map((v) => {
        const p = state.players.value[v.slot];
        const hero = HEROES.find((h) => h.id === p?.heroId);
        if (!hero) return null;
        return (['special', 'ultimate'] as const).map((kind) => {
          const names = kind === 'special' ? v.specials : v.ultimates;
          return (
            <div style={{ marginTop: '2px' }}>
              <div style={{ color: PLAYER_COLORS[v.slot] }}>
                P{v.slot + 1} {kind === 'special' ? 'Specials' : 'Ultimates'} · neutral {names[0]}{' '}
                (fixed)
              </div>
              {[1, 2, 3, 4].map((dir) => {
                const options = compatibleMoves(hero, kind, dir).map((i) => hero.actions[i]!);
                return (
                  <Select
                    label={`  ${SLOT_NAMES[dir]}`}
                    value={names[dir] === '—' ? EMPTY : names[dir]!}
                    options={[EMPTY, ...options.map((a) => a.name)]}
                    onChange={(name) =>
                      actions.equip(
                        v.slot,
                        kind,
                        dir,
                        options.find((a) => a.name === name)?.id ?? null,
                      )
                    }
                    testId={`loadout-p${v.slot + 1}-${kind}-${SLOT_NAMES[dir]}`}
                  />
                );
              })}
            </div>
          );
        });
      })}
      {state.equipNote.value ? (
        <div style={{ color: '#f0a0a0' }} data-testid="loadout-note">
          {state.equipNote.value}
        </div>
      ) : null}
    </div>
  );
}

const DUMMY_WEAPONS = [
  'unarmed',
  ...WEAPONS.filter((w) => w.id !== 'timber-board').map((w) => w.name),
];

function Button(props: { label: string; onClick: () => void; testId: string }) {
  return (
    <button
      data-testid={props.testId}
      style={{ marginRight: '6px', marginTop: '4px' }}
      onClick={(e) => {
        (e.target as HTMLElement).blur();
        props.onClick();
      }}
    >
      {props.label}
    </button>
  );
}

/** F10: weapons (what each hero holds, the items on stage) and the environmental slice. */
/** M7 arena mode: pick an arena and a difficulty, start, restart, and the director's numbers. */
function ArenaPanel({ state, actions }: { state: LabState; actions: LabActions }) {
  const pick = state.arenaPick.value;
  // M9: the stage journeys come first (all five difficulties), then the M7 arenas.
  const stages = stageNames();
  const arenas = [
    ...stages.map((s, i) => ({
      id: s.id,
      name: `Stage ${i + 1}: ${s.name} (full journey)`,
      minDifficulty: 0,
      beats: s.beats,
      allDifficulties: true,
    })),
    // M17: the mounted Guided Pursuit Corridors (all five difficulties).
    ...CORRIDORS.map((c) => ({
      id: c.id,
      name: `${c.name} (mounted pursuit, greybox)`,
      minDifficulty: 0,
      beats: [] as string[],
      allDifficulties: true,
    })),
    // M18: the greenhouse test room (all five difficulties).
    ...ROOMS.map((r) => ({
      id: r.id,
      name: `${r.name} (Preservation Ledger, greybox)`,
      minDifficulty: 0,
      beats: [] as string[],
      allDifficulties: true,
    })),
    ...arenaNames().map((a) => ({ ...a, beats: [] as string[], allDifficulties: false })),
  ];
  const isPursuit = CORRIDORS.some((c) => c.id === pick.arena);
  const diffs = difficultyNames();
  const arena = arenas.find((a) => a.id === pick.arena) ?? arenas[0]!;
  const diff = diffs.find((d) => d.id === pick.difficulty) ?? diffs[1]!;
  const isStage = arena.beats.length > 0;
  const allowed = diffs.filter(
    (_, i) => i >= arena.minDifficulty && (arena.allDifficulties || i <= 2),
  );
  const beatName = (b: string, i: number) => `${i + 1}. ${b}`;
  const view = state.arena.value;
  const button = (label: string, testId: string, run: () => void) => (
    <button
      data-testid={testId}
      style={{ marginRight: '6px' }}
      onClick={(e) => {
        (e.target as HTMLElement).blur();
        run();
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ ...panel, maxWidth: '420px', pointerEvents: 'auto' }} data-testid="lab-arena">
      <div>Stage and arenas · Home restarts · End back to the Lab</div>
      <Select
        label="Arena"
        value={arena.name}
        options={arenas.map((a) => a.name)}
        onChange={(name) => {
          const a = arenas.find((x) => x.name === name)!;
          const d = diffs.findIndex((x) => x.id === pick.difficulty);
          const tooHard = !a.allDifficulties && d > 2;
          actions.pickArena({
            arena: a.id,
            difficulty:
              d < a.minDifficulty
                ? diffs[a.minDifficulty]!.id
                : tooHard
                  ? diffs[2]!.id
                  : pick.difficulty,
            beat: 0,
          });
        }}
        testId="arena-pick"
      />
      <Select
        label="Difficulty"
        value={diff.name}
        options={allowed.map((d) => d.name)}
        onChange={(name) =>
          actions.pickArena({ difficulty: diffs.find((x) => x.name === name)!.id })
        }
        testId="arena-difficulty"
      />
      {isStage ? (
        <Select
          label="Start at beat"
          value={beatName(arena.beats[pick.beat] ?? arena.beats[0]!, pick.beat)}
          options={arena.beats.map(beatName)}
          onChange={(name) =>
            actions.pickArena({ beat: Math.max(0, arena.beats.map(beatName).indexOf(name)) })
          }
          testId="arena-beat"
        />
      ) : null}
      {isPursuit ? (
        <div>
          <Check
            label="Steering assistance (stronger lane guidance)"
            checked={state.pursuitPick.value.assist}
            onChange={(on) => actions.pickPursuit({ assist: on })}
            testId="pursuit-assist"
          />
          <Check
            label="STEADYRIDE for both players (marks the run Cheat-Assisted)"
            checked={state.pursuitPick.value.steady}
            onChange={(on) => actions.pickPursuit({ steady: on })}
            testId="pursuit-steadyride"
          />
        </div>
      ) : null}
      <div style={{ margin: '4px 0' }}>
        {button(view.running ? 'Restart' : 'Start', 'arena-start', () =>
          actions.startArena(pick.arena),
        )}
        {view.running ? button('Back to Lab', 'arena-leave', () => actions.startArena(null)) : null}
      </div>
      <div data-testid="arena-diagnostics">
        {view.lines.map((l) => (
          <div>{l}</div>
        ))}
      </div>
    </div>
  );
}

const QUALITY_OPTIONS = ['auto', 'high', 'medium', 'low', 'minimal'] as const;

/** M8 same-device co-op: invitation, handoffs, bundles, telemetry, quality and focus pause. */
function CoopPanel({ state, actions }: { state: LabState; actions: LabActions }) {
  const view = state.coop.value;
  const q = state.quality.value;
  return (
    <div style={{ ...panel, maxWidth: '460px', pointerEvents: 'auto' }} data-testid="coop-panel">
      <div>Co-op · handoffs, Team Attack, rescue</div>
      <div data-testid="coop-lines">
        {view.lines.map((l) => (
          <div>{l}</div>
        ))}
      </div>
      <Select
        label="Quality"
        value={q.setting}
        options={QUALITY_OPTIONS}
        onChange={(v) => actions.setQuality(v)}
        testId="quality-setting"
      />
      <div data-testid="quality-level">
        drawing {q.level} · frame {q.ms.toFixed(1)} ms
      </div>
      <div data-testid="focus-pause">focus pause {state.focusPaused.value ? 'on' : 'off'}</div>
    </div>
  );
}

function WeaponPanel(props: { view: WeaponPanelView; state: LabState; actions: LabActions }) {
  const { view, actions } = props;
  const arm = props.state.trainer.value.arm;
  const armName = arm < 0 ? 'unarmed' : (WEAPONS[arm]?.name ?? 'unarmed');
  return (
    <div style={{ ...panel, maxWidth: '460px', pointerEvents: 'auto' }} data-testid="lab-weapons">
      <div>Weapons and scenery · F10 to close</div>
      {view.players.map((p) => (
        <div style={{ marginTop: '6px' }} data-testid={`weapon-p${p.slot + 1}`}>
          <div
            style={{ color: PLAYER_COLORS[p.slot] }}
            data-testid={`weapon-holding-p${p.slot + 1}`}
          >
            P{p.slot + 1} · {p.holding}
          </div>
          <div data-testid={`weapon-log-p${p.slot + 1}`}>
            {p.log.map((e, i) => (
              <div style={{ color: e.good ? '#9be89b' : '#f0a0a0', opacity: i === 0 ? 1 : 0.7 }}>
                {String(e.frame).padStart(6, ' ')} {e.text}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ marginTop: '6px' }} data-testid="weapon-items">
        {view.items.length === 0 ? <div style={{ opacity: 0.7 }}>no weapons on stage</div> : null}
        {view.items.map((t) => (
          <div>{t}</div>
        ))}
      </div>
      <div style={{ marginTop: '6px' }} data-testid="weapon-scenery">
        {view.scenery.map((t) => (
          <div>{t}</div>
        ))}
        <div style={{ opacity: 0.85 }} data-testid="weapon-env-event">
          {view.lastEvent}
        </div>
      </div>
      <Select
        label="Dummy 1 weapon"
        value={armName}
        options={DUMMY_WEAPONS}
        onChange={(v) =>
          actions.armDummy(v === 'unarmed' ? -1 : WEAPONS.findIndex((w) => w.name === v))
        }
        testId="set-dummy-weapon"
      />
      <div>
        <Button label="Reset weapons" onClick={actions.resetArmory} testId="reset-weapons" />
        <Button label="Reset scenery" onClick={actions.resetEnvironment} testId="reset-scenery" />
        <Button label="Dummy to pillar" onClick={actions.dummyToPillar} testId="dummy-to-pillar" />
      </div>
      <div style={{ marginTop: '6px', opacity: 0.85 }}>
        Interact (Grab key) next to a weapon picks it up · Interact while holding throws it · Down +
        Interact drops it. The staff replaces your Attack moves; the Handwheel keeps them.
      </div>
    </div>
  );
}

/** F9: holds, Grab escape windows and grab outcomes per player. */
function GrabPanel({ views }: { views: GrabPlayerView[] }) {
  return (
    <div style={{ ...panel, maxWidth: '420px' }} data-testid="lab-grab">
      <div>Grabs · F9 to close</div>
      {views.map((v) => (
        <div style={{ marginTop: '6px' }} data-testid={`grab-p${v.slot + 1}`}>
          <div style={{ color: PLAYER_COLORS[v.slot] }}>
            P{v.slot + 1} · {v.state} · meter {v.meter}%
          </div>
          <div data-testid={`grab-hold-p${v.slot + 1}`}>{v.hold}</div>
          <div data-testid={`grab-log-p${v.slot + 1}`} style={{ marginTop: '2px' }}>
            {v.log.length === 0 ? (
              <div style={{ opacity: 0.7 }}>no grabs yet</div>
            ) : (
              v.log.map((e, i) => (
                <div style={{ color: e.good ? '#9be89b' : '#f0a0a0', opacity: i === 0 ? 1 : 0.7 }}>
                  {String(e.frame).padStart(6, ' ')} {e.text}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
      <div style={{ marginTop: '6px', opacity: 0.85 }}>
        Training enemy grabs:{' '}
        {TRAINER.actions
          .filter((a) => a.grab)
          .map((a) => a.name)
          .join(', ')}{' '}
        (F2 attack list)
      </div>
    </div>
  );
}

const TRAINER = ENEMIES[0]!;
const ATTACKERS = ['none', 'Dummy 1', 'all dummies'] as const;

/** F2: the training enemy's script. */
function TrainerSettingsView({ state, actions }: { state: LabState; actions: LabActions }) {
  const t = state.trainer.value;
  const patterns = ['cycle through all', ...TRAINER.actions.map((a) => a.name)];
  return (
    <div style={{ marginTop: '6px', borderTop: '1px solid #555', paddingTop: '4px' }}>
      <div>Training enemy</div>
      <Select
        label="Attacking dummies"
        value={ATTACKERS[t.attackers] ?? 'none'}
        options={ATTACKERS}
        onChange={(v) => actions.setTrainer({ attackers: ATTACKERS.indexOf(v) })}
        testId="set-attackers"
      />
      <Select
        label="Attack"
        value={patterns[t.pattern + 1] ?? patterns[0]!}
        options={patterns}
        onChange={(v) => actions.setTrainer({ pattern: patterns.indexOf(v) - 1 })}
        testId="set-pattern"
      />
      <Select
        label="Frames between attacks"
        value={String(t.interval)}
        options={TRAINER_INTERVALS.map(String)}
        onChange={(v) => actions.setTrainer({ interval: Number(v) })}
        testId="set-interval"
      />
      <Check
        label="Walk into range"
        checked={t.approach}
        onChange={(on) => actions.setTrainer({ approach: on })}
        testId="set-approach"
      />
    </div>
  );
}

/** F8: Defense meter, guard facing and timing readouts per player, plus the attack list. */
function DefensePanel({ views, trainer }: { views: DefenseView[]; trainer: LabState['trainer'] }) {
  const t = trainer.value;
  return (
    <div style={{ ...panel, maxWidth: '420px' }} data-testid="lab-defense">
      <div>Defense · F8 to close</div>
      {views.map((v) => {
        const color = PLAYER_COLORS[v.slot];
        const c = v.counts;
        return (
          <div style={{ marginTop: '6px' }} data-testid={`defense-p${v.slot + 1}`}>
            <div style={{ color }}>
              P{v.slot + 1} · Defense{' '}
              <span data-testid={`defense-meter-p${v.slot + 1}`}>{v.defense}</span>%
              {v.defense < 25 ? ' (below the 25 % floor: recovers when calm)' : ''}
            </div>
            <div style={{ height: '8px', background: '#333', margin: '2px 0 4px', width: '200px' }}>
              <div
                style={{
                  height: '8px',
                  width: `${v.defense * 2}px`,
                  background: v.defense >= 75 ? '#7ddc7d' : v.defense >= 25 ? '#e0c050' : '#e05050',
                }}
              />
            </div>
            <div>
              state {v.state} · guard {v.guard}
            </div>
            <div data-testid={`defense-counts-p${v.slot + 1}`}>
              exact {c.exact} · counter {c.counter} · guard {c.guard} · early {c.early} · late{' '}
              {c.late} · hit {c.hit} · crush {c.crush} · breaker {c.breaker}
            </div>
            <div data-testid={`defense-log-p${v.slot + 1}`} style={{ marginTop: '2px' }}>
              {v.log.length === 0 ? (
                <div style={{ opacity: 0.7 }}>no defense yet</div>
              ) : (
                v.log.map((e, i) => (
                  <div
                    style={{ color: e.good ? '#9be89b' : '#f0a0a0', opacity: i === 0 ? 1 : 0.7 }}
                  >
                    {String(e.frame).padStart(6, ' ')} {e.text}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: '6px', opacity: 0.85 }}>
        Training enemy:{' '}
        {t.attackers === 0
          ? 'not attacking (F2 to arm it)'
          : `${ATTACKERS[t.attackers]} · ${t.pattern < 0 ? 'cycle' : TRAINER.actions[t.pattern]?.name} · every ${t.interval} f`}
      </div>
      {TRAINER.actions.map((a) => (
        <div style={{ paddingLeft: '8px', opacity: 0.85 }}>
          {a.name}: {a.startup}/{a.active.join('+')}/{a.recovery} ·{' '}
          {profileText(a.tags) || 'standard'}
        </div>
      ))}
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
      <div>
        juggle budget <span data-testid="lab-target-juggle">{t.juggleBudget}</span> (lift{' '}
        {t.juggleBand}%)
      </div>
      <div data-testid="lab-target-bounces">
        wall rebound {t.wallBounce} · ground bounce {t.groundBounce}
      </div>
      <div>dash bridge {t.bridge ? 'used' : 'available'}</div>
      <div>
        state {t.reaction} · knockdown {t.ground}
      </div>
      <div data-testid="lab-target-ground">ground route {t.groundRoute}</div>
      <div data-testid="lab-target-protection">recovery {t.protection}</div>
      <div data-testid="lab-target-route" style={{ maxWidth: '260px' }}>
        route {t.route.length > 0 ? t.route.join(' → ') : '—'}
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
  const text = l.kind === 'action' ? hero.actions[l.to]!.name : LINK_TEXT[l.kind];
  return { text, note: `(${when}; ${timing}${cost})` };
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
                <div style={{ margin: '3px 0' }}>
                  <b>{a.name}</b> [{a.category}
                  {a.catalogue ? ', catalogue' : ''}
                  {a.category === 'ultimate' ? ', full bar' : ''}]{' '}
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

/** F7: the Academy recipes from spec §8.3, ticked off live against the followed dummy. */
function RecipesPanel(props: {
  views: RecipePlayerView[];
  players: PlayerView[];
  actions: LabActions;
}) {
  return (
    <div
      style={{ ...panel, maxHeight: '86vh', overflowY: 'auto', pointerEvents: 'auto' }}
      data-testid="lab-recipes"
    >
      <div>Academy recipes · F7 to close</div>
      {props.views.map((v) => {
        const p = props.players[v.slot];
        const color = PLAYER_COLORS[v.slot];
        return (
          <div style={{ marginTop: '6px' }} data-testid={`recipes-p${v.slot + 1}`}>
            <div style={{ color }}>
              P{v.slot + 1} · {v.hero}
            </div>
            {v.recipes.map((r) => (
              <div
                style={{
                  margin: '4px 0',
                  paddingLeft: '6px',
                  borderLeft: `2px solid ${r.done ? '#7ddc7d' : '#555'}`,
                }}
                data-testid={`recipe-p${v.slot + 1}-${r.id}`}
              >
                <div>
                  <b>{r.name}</b>
                  {r.done ? ' ✓' : ''} · performed{' '}
                  <span data-testid={`recipe-count-p${v.slot + 1}-${r.id}`}>{r.performed}</span>{' '}
                  <button
                    data-testid={`practise-p${v.slot + 1}-${r.id}`}
                    onClick={(e) => {
                      (e.target as HTMLElement).blur();
                      props.actions.practise(v.slot, r.id);
                    }}
                  >
                    Practise
                  </button>
                </div>
                {r.counterHit ? (
                  <div style={{ opacity: 0.8 }}>needs counter-hit dummies</div>
                ) : null}
                {r.steps.map((s, i) => (
                  <div style={{ paddingLeft: '12px', opacity: s.jump ? 0.8 : 1 }}>
                    {s.done ? '✓' : `${i + 1}.`} {s.label}{' '}
                    {p ? <PromptText text={s.input} ctx={p.ctx} color={color} /> : null}
                  </div>
                ))}
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
            right: '8px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'flex-start',
            pointerEvents: 'none',
          }}
          data-testid="lab-overlay"
        >
          <div style={panel}>
            <div>Lab · F1 hide · F2 settings</div>
            <div>
              F3 hitboxes · F5 moves · F6 slow{state.slowMotion.value ? ' (on)' : ''} · F7 recipes ·
              F8 defense · F9 grabs · F10 weapons
            </div>
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
          <ArenaPanel state={state} actions={actions} />
          <CoopPanel state={state} actions={actions} />
          {state.settingsOpen.value ? <Settings state={state} actions={actions} /> : null}
          {state.moveListOpen.value ? <MoveList players={players} /> : null}
          {state.recipesOpen.value ? (
            <RecipesPanel views={state.recipes.value} players={players} actions={actions} />
          ) : null}
          {state.defenseOpen.value ? (
            <DefensePanel views={state.defense.value} trainer={state.trainer} />
          ) : null}
          {state.grabOpen.value ? <GrabPanel views={state.grab.value} /> : null}
          {state.weaponOpen.value ? (
            <WeaponPanel view={state.weapons.value} state={state} actions={actions} />
          ) : null}
        </div>
      ) : null}
      <GrabCues players={players} grab={state.grab.value} />
      <TeamCue state={state} />
      <HintBar players={players} riding={state.riding.value} />
    </>
  );
}

/** Bottom-of-screen control hints, drawn from each player's own bindings. */
/** M17: the mounted controls with the hero's own mounted move names. */
function rideHints(heroId: string): { text: string; name?: string }[] {
  const i = HEROES.findIndex((h) => h.id === heroId);
  const kit = mountedKit(Math.max(0, i));
  const n = (slot: number) => {
    const a = kit[slot];
    return a ? dt(`mounted.${heroId}.${a.id}`, a.name) : '';
  };
  return [
    { text: tx('prompt.hintRideSteer') },
    { text: tx('prompt.hintRideAttack'), name: n(MountedSlot.Neutral) },
    { text: tx('prompt.hintRideKick'), name: n(MountedSlot.Directional) },
    { text: tx('prompt.hintRideHop'), name: n(MountedSlot.Hop) },
    { text: tx('prompt.hintRideLean'), name: n(MountedSlot.Lean) },
    { text: tx('prompt.hintRideSpecial'), name: n(MountedSlot.Special) },
    { text: tx('prompt.hintRideUltimate'), name: n(MountedSlot.Ultimate) },
    { text: tx('prompt.hintRideRescue') },
  ];
}

function HintBar({ players, riding }: { players: PlayerView[]; riding: boolean }) {
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
              {riding
                ? rideHints(p.heroId).map((h) => (
                    <span style={{ marginRight: '12px' }}>
                      <PromptText
                        text={h.text}
                        ctx={p.ctx}
                        color={color}
                        values={h.name === undefined ? undefined : { name: h.name }}
                      />
                    </span>
                  ))
                : null}
              {riding
                ? null
                : [
                    tx('prompt.hintMove'),
                    tx('prompt.hintDash'),
                    tx('prompt.hintJump'),
                    tx('prompt.hintAttack'),
                    tx('prompt.hintAirAttack'),
                    tx('prompt.hintLowAttack'),
                    tx('prompt.hintGuard'),
                    tx('prompt.hintCounter'),
                    tx('prompt.hintBreaker'),
                    tx('prompt.hintSpecial'),
                    tx('prompt.hintUltimate'),
                    tx('prompt.hintGrab'),
                    tx('prompt.hintEscape'),
                    tx('prompt.hintTeam'),
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

/**
 * Grab cues over the stage: the hold route while a hero holds, the ESCAPE prompt while the
 * Grab escape window is open, and the rescue prompt while restrained. Prompts use each
 * player's own bindings.
 */
function GrabCues({ players, grab }: { players: PlayerView[]; grab: GrabPlayerView[] }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        font: '18px/1.6 system-ui, sans-serif',
        color: '#e8e8e8',
        textAlign: 'center',
      }}
    >
      {grab.map((v) => {
        const p = players[v.slot];
        if (!p) return null;
        const color = PLAYER_COLORS[v.slot];
        let text = '';
        if (v.escape) text = tx('prompt.escapeNow');
        else if (v.state === 'RESTRAINED') text = tx('prompt.restrained');
        else if (v.state === 'holding a grab') text = tx('prompt.grabRoute');
        if (!text) return null;
        return (
          <div
            style={{
              ...panel,
              font: 'inherit',
              margin: '4px 0',
              fontWeight: v.escape ? 'bold' : 'normal',
              border: v.escape ? '2px solid #ffd166' : 'none',
            }}
            data-testid={`grab-cue-p${v.slot + 1}`}
          >
            <span style={{ color }}>P{v.slot + 1}</span>{' '}
            <PromptText text={text} ctx={p.ctx} color={color} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * M8 Team Attack: the invited partner sees their own Team Attack prompt and a countdown;
 * the inviter sees that the request is waiting.
 */
function TeamCue({ state }: { state: LabState }) {
  const inv = state.coop.value.invite;
  if (!inv) return null;
  const players = state.players.value;
  const to = players[inv.to];
  const from = players[inv.from];
  if (!to || !from) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: '38%',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        font: '22px/1.6 system-ui, sans-serif',
        color: '#e8e8e8',
        textAlign: 'center',
      }}
    >
      <div
        style={{ ...panel, font: 'inherit', fontWeight: 'bold', border: '2px solid #7dffb0' }}
        data-testid="team-invite"
      >
        <span style={{ color: PLAYER_COLORS[inv.to] }}>P{inv.to + 1}</span>{' '}
        <PromptText text={tx('prompt.teamInvite')} ctx={to.ctx} color={PLAYER_COLORS[inv.to]} />{' '}
        <span data-testid="team-invite-left">{inv.left}</span>
        <div style={{ fontWeight: 'normal', fontSize: '16px' }}>
          {inv.name} · <span style={{ color: PLAYER_COLORS[inv.from] }}>P{inv.from + 1}</span>{' '}
          <PromptText text={tx('prompt.teamWaiting')} ctx={from.ctx} />
        </div>
      </div>
    </div>
  );
}

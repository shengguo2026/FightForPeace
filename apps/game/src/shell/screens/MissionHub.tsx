import { useState } from 'preact/hooks';
import type { CSSProperties } from 'preact/compat';
import {
  ARCHIVE_KEEP,
  MISSION_FAMILIES,
  RUN_MODES,
  archiveOf,
  hasLegacy,
  hubEntries,
  isLegacy,
  launchBlock,
  missionHeroes,
  missionPackage,
  missionState,
  operationPool,
  personalPaths,
  pinRun,
  replayTarget,
  stageOfContent,
  type MissionState,
  type Profile,
  type RunArchiveEntry,
  type RunMode,
} from '@ffp/platform';
import { HEROES, clock, type MissionPackageDef } from '@ffp/sim';
import { difficultyName, dt, heroName, locale, stageName, t, type TextId } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Choice, Panel, Screen, hoverFocus } from '../ui';

/**
 * M26 Archive-led Mission Hub (expanded game modes spec §5.1): four destinations with their
 * own frames on one navigation system, mission cards with every spoiler-safe fact, the
 * Random Operations board (its generator arrives with M41), the Run Archive (spec §7) and
 * the mission results. Locked entries show their localized clue, never a blank tile; every
 * state is written out, never shown by colour alone.
 */

/** Each destination's frame: Archive record, reconstruction, case file, operations board. */
const FRAME: Record<string, CSSProperties> = {
  chronicle: { border: '2px solid #d9b56a', background: 'rgba(52,40,22,0.9)' },
  remix: { border: '2px dashed #b48cff', background: 'rgba(34,24,52,0.9)' },
  curated: { border: '4px double #5fc4c0', background: 'rgba(14,38,40,0.9)' },
  operation: { border: '2px solid #ff9f4a', background: 'rgba(48,30,12,0.9)' },
};

const STATE_MARK: Record<MissionState, string> = {
  locked: '🔒',
  notInstalled: '○',
  open: '▶',
};

export const missionName = (id: string) => dt(`mission.${id}.name`, id);
const missionText = (id: string, part: 'desc' | 'clue' | 'era') => dt(`mission.${id}.${part}`, '');
/** A playable hero's name, or a character that is not playable yet. */
const castName = (id: string) =>
  HEROES.some((h) => h.id === id) ? heroName(id) : dt(`m26.cast.${id}`, id);
const familyName = (f: string) => t(`m26.family.${f}` as TextId);
const canonName = (c: string) => t(`m26.canon.${c}` as TextId);

/** What a run's archive line calls its content (a story stage or a package). */
export function contentName(contentId: string): string {
  const stage = stageOfContent(contentId);
  return stage ? stageName(stage) : missionName(contentId);
}

function stateText(s: MissionState): string {
  return `${STATE_MARK[s]} ${t(`m26.state.${s}` as TextId)}`;
}

/** The title an entry shows: its own once the gate is met, else its sealed placeholder. */
function shownTitle(p: Profile, m: MissionPackageDef): string {
  return missionState(p, m) === 'locked'
    ? t(`m26.sealed.${m.family}` as TextId)
    : missionName(m.id);
}

function recordLine(p: Profile, m: MissionPackageDef): string {
  const r = p.missions[m.id];
  return r && r.clears > 0
    ? t('m26.record', { n: r.clears, grade: r.bestGrade ?? '—' })
    : t('m26.record.none');
}

export function MissionHubScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('village'));
  const p = shell.active.value;
  const lab = shell.hubLab.value;
  const fam = shell.hubFamily.value;
  const entries = hubEntries(fam, lab);
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="missions">
      <div class="ffp-row" style={{ width: '90vw', alignItems: 'flex-start' }}>
        <Panel style={{ width: '360px' }}>
          <h1 class="ffp-title">{t('m26.hub.title')}</h1>
          <p class="ffp-sub">{t('m26.hub.sub')}</p>
          {lab ? (
            <p class="ffp-hint" data-testid="hub-lab" style={{ color: '#ffb36b' }}>
              {t('m26.labProfile')}
            </p>
          ) : null}
          {MISSION_FAMILIES.map((f) => (
            <button
              type="button"
              class="ffp-btn"
              data-nav
              data-autofocus={f === fam ? '' : undefined}
              data-testid={`hub-family-${f}`}
              aria-pressed={f === fam}
              onMouseMove={hoverFocus}
              onFocus={() => (shell.hubFamily.value = f)}
              onClick={() => (shell.hubFamily.value = f)}
              style={{ ...FRAME[f], margin: '8px 0', display: 'block' }}
            >
              <div style={{ fontWeight: 700 }}>
                {f === fam ? '◆ ' : ''}
                {familyName(f)}
              </div>
              <div class="ffp-hint">{t(`m26.frame.${f}` as TextId)}</div>
            </button>
          ))}
          <Button
            label={t('m26.archive')}
            detail={t('m26.archive.detail')}
            onPress={() => {
              shell.archiveFrom.value = 'missions';
              shell.go('archive');
            }}
            testId="hub-archive"
          />
          <Button label={t('common.back')} onPress={() => shell.go('village')} testId="hub-back" />
        </Panel>
        <Panel
          style={{ ...FRAME[fam], flex: 1, maxHeight: '86vh', overflow: 'auto' }}
          testId={`hub-list-${fam}`}
          scrollLabel={familyName(fam)}
        >
          <h2 style={{ marginTop: 0 }}>{familyName(fam)}</h2>
          {entries.length === 0 || !p ? <p class="ffp-hint">{t('m26.empty')}</p> : null}
          {p
            ? entries.map((m) => {
                const s = missionState(p, m);
                const legacy = hasLegacy(p, m);
                return (
                  <button
                    type="button"
                    class="ffp-btn"
                    data-nav
                    data-testid={`hub-entry-${m.id}`}
                    data-state={s}
                    onMouseMove={hoverFocus}
                    onClick={() =>
                      m.family === 'operation' ? shell.go('operations') : shell.openMission(m.id)
                    }
                    style={{ display: 'block' }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                      <b>{shownTitle(p, m)}</b>
                      <span class="ffp-scope">{canonName(m.canon)}</span>
                      <span style={{ marginLeft: 'auto' }} data-testid="entry-state">
                        {stateText(s)}
                        {legacy ? ` · ${t('m26.state.legacy')}` : ''}
                      </span>
                    </div>
                    <div class="ffp-hint">
                      {t('m26.after', { stage: stageName(m.after) })} ·{' '}
                      {t(`m26.objective.${m.objective}` as TextId)}
                      {s === 'open' ? ` · ${recordLine(p, m)}` : ''}
                    </div>
                    {s === 'locked' ? (
                      <div class="ffp-hint" data-testid="entry-clue">
                        {t('m26.clue', { clue: missionText(m.id, 'clue') })}
                      </div>
                    ) : null}
                  </button>
                );
              })
            : null}
        </Panel>
      </div>
    </Screen>
  );
}

/** Players, heroes and difficulties of a package, written out (spec §5.1 card facts). */
function PackageFacts({ m }: { m: MissionPackageDef }) {
  const players = m.players.map((n) => t(`m26.players.${n}` as TextId)).join(' · ');
  const h = m.heroes;
  const heroes =
    h.rule === 'any'
      ? t('m26.heroes.any')
      : h.rule === 'fixed'
        ? t('m26.heroes.fixed', { list: h.list.map(castName).join(', ') })
        : t('m26.heroes.pool', { list: h.list.map(castName).join(', ') });
  return (
    <>
      <p data-testid="card-objective">{t(`m26.objective.${m.objective}` as TextId)}</p>
      <p data-testid="card-players">{t('m26.players', { list: players })}</p>
      <p data-testid="card-heroes">{heroes}</p>
      <p data-testid="card-difficulties">
        {t('m26.difficulties', { list: m.difficulties.map(difficultyName).join(', ') })}
      </p>
    </>
  );
}

/** A mission's card: its facts, records and state; Play solo or co-op when it is open. */
export function MissionScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('missions'));
  const p = shell.active.value;
  const m = missionPackage(shell.missionFocus.value);
  if (!p || !m)
    return (
      <Screen bg={ART('menu-bg')} dim testId="mission-card">
        <Panel>
          <p>{t('m26.block.unknown')}</p>
          <Button label={t('common.back')} onPress={() => shell.go('missions')} autofocus />
        </Panel>
      </Screen>
    );
  const s = missionState(p, m);
  const locked = s === 'locked';
  const block = (n: number) => launchBlock(p, m, n);
  const reason = (n: number) => {
    const b = block(n);
    if (!b) return undefined;
    return b === 'locked'
      ? t('m26.block.locked', { clue: missionText(m.id, 'clue') })
      : t(`m26.block.${b}` as TextId);
  };
  const legacy = hasLegacy(p, m);
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="mission-card">
      <Panel style={{ ...FRAME[m.family], width: '760px', maxHeight: '88vh', overflow: 'auto' }}>
        <div class="ffp-hint">{familyName(m.family)}</div>
        <h1 class="ffp-title" data-testid="card-title">
          {shownTitle(p, m)}
        </h1>
        <p>
          <span class="ffp-scope" data-testid="card-canon" style={{ marginLeft: 0 }}>
            {canonName(m.canon)}
          </span>{' '}
          <span data-testid="card-state">{stateText(s)}</span>
          {legacy ? <span data-testid="card-legacy"> · {t('m26.state.legacy')}</span> : null}
        </p>
        <p class="ffp-hint" data-testid="card-era">
          {t('m26.after', { stage: stageName(m.after) })}
          {locked ? '' : ` · ${missionText(m.id, 'era')}`}
        </p>
        {locked ? (
          <p data-testid="card-clue">{t('m26.clue', { clue: missionText(m.id, 'clue') })}</p>
        ) : (
          <>
            <p data-testid="card-desc">{missionText(m.id, 'desc')}</p>
            <PackageFacts m={m} />
            <p class="ffp-hint" data-testid="card-record">
              {recordLine(p, m)}
            </p>
          </>
        )}
        {shell.hubLab.value && m.milestone ? (
          <p class="ffp-hint">{t('m26.milestone', { m: m.milestone })}</p>
        ) : null}
        {[1, 2].map((n) =>
          m.players.includes(n) || n === 1 ? (
            <Button
              label={n === 1 ? t('m26.playSolo') : t('m26.playCoop')}
              detail={reason(n)}
              disabled={block(n) !== null}
              onPress={() => shell.playMission(m.id, n === 1 ? 'solo' : 'coop')}
              testId={`card-play-${n === 1 ? 'solo' : 'coop'}`}
              autofocus={n === 1 && block(1) === null}
            />
          ) : null,
        )}
        <Button
          label={t('common.back')}
          onPress={() => shell.go('missions')}
          testId="card-back"
          autofocus={block(1) !== null}
        />
      </Panel>
    </Screen>
  );
}

/** The mission's set-up after the lobby: its difficulty (the stage screen of Story Mode). */
export function MissionSetupScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('lobby'));
  const pick = shell.missionPick.value;
  const m = pick ? missionPackage(pick.id) : undefined;
  if (!pick || !m) return null;
  const rule = missionHeroes(m, Math.max(1, shell.lobby.value.length));
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="stage-select">
      <Panel style={{ ...FRAME[m.family], width: '640px' }}>
        <h1 class="ffp-title">{t('m26.setup.title')}</h1>
        <p data-testid="setup-mission">
          <b>{missionName(m.id)}</b> <span class="ffp-scope">{canonName(m.canon)}</span>
        </p>
        <Choice
          label={t('play.difficulty')}
          value={pick.difficulty}
          options={m.difficulties.map((d) => ({ value: d, label: difficultyName(d) }))}
          onChange={(v) => (shell.missionPick.value = { ...pick, difficulty: v })}
          testId="stage-difficulty"
          autofocus
        />
        <p class="ffp-hint" data-testid="setup-heroes">
          {rule.fixed
            ? t('m26.heroes.fixed', { list: rule.fixed.map(castName).join(', ') })
            : t('m26.heroes.pool', { list: rule.eligible.map(castName).join(', ') })}
        </p>
        <Button label={t('common.next')} onPress={() => shell.stageDone()} testId="stage-next" />
        <Button label={t('common.back')} onPress={() => shell.go('lobby')} />
      </Panel>
    </Screen>
  );
}

/** The Random Operations board: its objectives, the eligible content pool, the flow. */
export function OperationsScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('missions'));
  const p = shell.active.value;
  if (!p) return null;
  const ops = hubEntries('operation', shell.hubLab.value);
  const pool = operationPool(p);
  const open = ops.some((m) => missionState(p, m) !== 'locked');
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="operations">
      <Panel style={{ ...FRAME.operation, width: '820px', maxHeight: '88vh', overflow: 'auto' }}>
        <div class="ffp-hint">{familyName('operation')}</div>
        <h1 class="ffp-title">{t('m26.ops.board')}</h1>
        <p>
          <span class="ffp-scope" style={{ marginLeft: 0 }}>
            {canonName('generated')}
          </span>
        </p>
        {ops.map((m) => {
          const s = missionState(p, m);
          return (
            <div class="ffp-btn" style={{ display: 'block' }} data-testid={`ops-${m.id}`}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <b>{missionName(m.id)}</b>
                <span style={{ marginLeft: 'auto' }}>{stateText(s)}</span>
              </div>
              <div class="ffp-hint">
                {s === 'locked'
                  ? t('m26.clue', { clue: missionText(m.id, 'clue') })
                  : missionText(m.id, 'desc')}
              </div>
            </div>
          );
        })}
        <h2>{t('m26.ops.pool')}</h2>
        <p data-testid="ops-stages">
          {t('m26.ops.stages', {
            list: pool.stages.length ? pool.stages.map(stageName).join(', ') : t('m26.ops.none'),
          })}
        </p>
        <p data-testid="ops-arenas">{t('m26.ops.arenas', { n: pool.arenas })}</p>
        <p data-testid="ops-enemies">{t('m26.ops.enemies', { n: pool.enemies.length })}</p>
        <p>{t('m26.ops.heroes', { list: pool.heroes.map(heroName).join(', ') })}</p>
        <p class="ffp-hint">{t('m26.ops.flow')}</p>
        <Button
          label={t('m26.ops.generate')}
          detail={open ? t('m26.ops.later') : t('mission.operation.defeat.clue')}
          disabled
          onPress={() => {}}
          testId="ops-generate"
        />
        <Button
          label={t('common.back')}
          onPress={() => shell.go('missions')}
          autofocus
          testId="ops-back"
        />
      </Panel>
    </Screen>
  );
}

/** One archived run: when, what, how, its labels; Replay and Pin. */
function ArchiveRow({ shell, e }: { shell: Shell; e: RunArchiveEntry }) {
  const p = shell.active.value!;
  const target = replayTarget(p, e, shell.hubLab.value);
  const legacy = isLegacy(e);
  const result =
    e.outcome === 'failed'
      ? t('m26.outcome.failed')
      : e.points !== null && e.grade
        ? t('m26.points', { points: e.points, rank: e.grade })
        : `${t('m26.outcome.cleared')} · ${e.grade ?? t('m26.noGrade')}`;
  return (
    <div
      class="ffp-btn"
      style={{ display: 'block' }}
      data-testid="archive-run"
      data-content={e.contentId}
      data-mode={e.mode}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <b>{contentName(e.contentId)}</b>
        <span class="ffp-scope">{t(`m26.mode.${e.mode}` as TextId)}</span>
        <span class="ffp-scope">{canonName(e.canon)}</span>
        {e.pinned ? <span class="ffp-scope">📌 {t('m26.archive.pinned')}</span> : null}
        {e.labels.map((l) => (
          <span class="ffp-scope" style={{ color: '#ffb36b' }} data-testid="archive-label">
            {t(`m26.label.${l}` as TextId)}
          </span>
        ))}
      </div>
      <div class="ffp-hint">
        {new Date(e.endedAt).toLocaleString(locale.value)} · {difficultyName(e.difficulty)} ·{' '}
        {e.heroes.map(heroName).join(' + ')} · {result}
        {e.timeFrames !== null ? ` · ${t('m26.time', { time: clock(e.timeFrames) })}` : ''}
      </div>
      {legacy ? (
        <div class="ffp-hint" data-testid="archive-legacy">
          {t('m26.archive.legacy', { v: e.packageVersion })}
        </div>
      ) : null}
      <div class="ffp-row" style={{ gap: '8px' }}>
        <button
          type="button"
          class="ffp-btn"
          data-nav
          data-testid="archive-replay"
          disabled={target.kind === 'blocked'}
          onMouseMove={hoverFocus}
          onClick={() => shell.replayRun(e)}
          style={{ width: 'auto' }}
        >
          ↻ {t('m26.archive.replay')}
          {target.kind === 'blocked'
            ? ` · ${target.reason === 'locked' ? t('m26.state.locked') : t(`m26.block.${target.reason}` as TextId)}`
            : ''}
        </button>
        <button
          type="button"
          class="ffp-btn"
          data-nav
          data-testid="archive-pin"
          onMouseMove={hoverFocus}
          onClick={() => shell.update((x) => pinRun(x, e.id, !e.pinned))}
          style={{ width: 'auto' }}
        >
          📌 {e.pinned ? t('m26.archive.unpin') : t('m26.archive.pin')}
        </button>
      </div>
    </div>
  );
}

/** The Run Archive: every finished run, filtered by mode, with Replay and Pin. */
export function ArchiveScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const back = () => shell.go(shell.archiveFrom.value);
  useNav(back);
  const [mode, setMode] = useState<RunMode | 'all'>('all');
  const p = shell.active.value;
  const list = p ? archiveOf(p, mode) : [];
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="archive">
      <Panel style={{ width: '900px', maxHeight: '88vh', overflow: 'auto' }}>
        <h1 class="ffp-title">{t('m26.archive.title')}</h1>
        <Choice
          label={t('m26.archive.filter')}
          value={mode}
          options={[
            { value: 'all' as const, label: t('m26.archive.all') },
            ...RUN_MODES.map((m) => ({ value: m, label: t(`m26.mode.${m}` as TextId) })),
          ]}
          onChange={setMode}
          testId="archive-filter"
          autofocus
        />
        <p class="ffp-hint">{t('m26.archive.keep', { n: ARCHIVE_KEEP })}</p>
        {list.length === 0 ? (
          <p class="ffp-hint" data-testid="archive-empty">
            {t('m26.archive.empty')}
          </p>
        ) : (
          list.slice(0, 40).map((e) => <ArchiveRow shell={shell} e={e} />)
        )}
        <Button label={t('common.back')} onPress={back} testId="archive-back" />
      </Panel>
    </Screen>
  );
}

/** A finished mission: outcome, grade, Record Authenticated and what it opened. */
export function MissionResultsScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.leaveMission());
  const r = shell.missionResult.value;
  const m = r ? missionPackage(r.id) : undefined;
  if (!r || !m) return null;
  return (
    <Screen bg={ART('menu-bg')} dim testId="mission-results">
      <Panel style={{ ...FRAME[m.family], width: '720px', textAlign: 'center' }}>
        <div class="ffp-hint">{t('m26.results.title')}</div>
        <h1 class="ffp-title">{missionName(m.id)}</h1>
        <p>
          <span class="ffp-scope" style={{ marginLeft: 0 }}>
            {canonName(m.canon)}
          </span>{' '}
          {difficultyName(r.difficulty)} · {r.heroes.map(heroName).join(' + ')}
        </p>
        <h2 data-testid="results-outcome">{t(`m26.outcome.${r.outcome}` as TextId)}</h2>
        <p data-testid="results-grade" style={{ fontSize: '28px', fontWeight: 700 }}>
          {r.grade !== null && r.points !== null
            ? t('m26.points', { points: r.points, rank: r.grade })
            : t('m26.noGrade')}
        </p>
        {r.capped ? (
          <p class="ffp-hint">
            {t('m26.capped', { reason: dt(`objective.ladder.${r.capped}`, r.capped) })}
          </p>
        ) : null}
        <p class="ffp-hint">{t('m26.time', { time: clock(r.timeFrames) })}</p>
        {r.cheatAssisted ? (
          <p style={{ color: '#ffb36b' }} data-testid="results-cheat">
            {t('m26.results.cheat')}
          </p>
        ) : null}
        {r.authenticated ? (
          <p data-testid="results-authenticated" style={{ color: '#f2c36b', fontWeight: 700 }}>
            ✓ {t('m26.results.authenticated')}
          </p>
        ) : null}
        {r.opened.map((id) => (
          <p data-testid="results-opened">{t('m26.results.opened', { name: missionName(id) })}</p>
        ))}
        <Button
          label={t('m26.results.again')}
          onPress={() => shell.missionAgain()}
          testId="results-again"
        />
        <Button
          label={t('m26.results.hub')}
          onPress={() => shell.leaveMission()}
          autofocus
          testId="results-hub"
        />
        <Button
          label={t('m26.results.village')}
          onPress={() => shell.returnToVillage()}
          testId="results-village"
        />
      </Panel>
    </Screen>
  );
}

/** Records: the Personal Paths of the story choice record (spec §9.2). */
export function PersonalPaths({ p }: { p: Profile }) {
  void locale.value;
  const paths = personalPaths(p);
  return (
    <>
      <h2>{t('m26.paths')}</h2>
      {paths.length === 0 ? (
        <p class="ffp-hint" data-testid="paths-none">
          {t('m26.paths.none')}
        </p>
      ) : (
        paths.map((x) => (
          <p class="ffp-hint" data-testid="path-choice">
            {stageName(x.def.stage)} · {dt(`m26.choice.${x.def.id}`, x.def.id)}:{' '}
            <b>{dt(`m26.option.${x.option}`, x.option)}</b>
          </p>
        ))
      )}
      <p class="ffp-hint">{t('m26.paths.note')}</p>
    </>
  );
}

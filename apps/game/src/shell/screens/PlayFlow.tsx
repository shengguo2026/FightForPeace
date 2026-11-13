import { can } from '../../system/probe';
import { useLayoutEffect, useState } from 'preact/hooks';
import type { DeviceId } from '@ffp/platform';
import { DIFFICULTIES, HEROES, STAGES, defaultLoadout, equipMove, SLOTS } from '@ffp/sim';
import { moveInputText } from '../../text/en';
import { difficultyName, dt, heroName, locale, stageName, t, type TextId } from '../../text/i18n';
import { PLAYER_COLORS, PromptText } from '../../ui/InputPrompt';
import { HERO_ROSTER, type Shell } from '../shell';
import { useNav } from '../hooks';
import type { NavEvent } from '../nav';
import { ART, Button, Choice, Panel, Screen } from '../ui';
import {
  type CinematicDef,
  STAGE1_ENDING,
  STAGE1_INTRO,
  STAGE2_BRIEF_STILLS,
  STAGE2_ENDING,
  STAGE2_INTRO,
  type StoryState,
  campaignList,
} from '@ffp/platform';
import { Cinematic } from '../../media/Cinematic';
import type { VoiceSettings } from '../../media/narration';

/** Player 1's prompt context (bindings, labels, pad family) from the Lab's player views. */
function ctxOf(shell: Shell, slot: number) {
  return shell.lab.players.value[slot]?.ctx ?? shell.lab.players.value[0]!.ctx;
}

function deviceName(id: DeviceId): string {
  if (id === 'kb:p1') return t('remap.keyboard');
  if (id === 'kb:p2') return `${t('remap.keyboard')} 2`;
  return `${t('remap.gamepad')} ${Number(id.slice(4)) + 1}`;
}

/** Which lobby player an event belongs to (solo: Player 1 follows any device). */
function slotFor(shell: Shell, e: NavEvent): number {
  const l = shell.lobby.value;
  const i = l.findIndex((p) => p.device === e.source);
  if (i >= 0) return i;
  if (shell.mode.value === 'solo' || l.length >= 2) return 0;
  return -1;
}

export function ModeScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('village'));
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="mode">
      <Panel style={{ width: '620px' }}>
        <h1 class="ffp-title">{t('play.modeTitle')}</h1>
        <Button
          label={t('play.solo')}
          detail={t('play.soloDetail')}
          onPress={() => shell.chooseMode('solo')}
          icon={0}
          autofocus
          testId="mode-solo"
        />
        <Button
          label={t('play.coop')}
          detail={t('play.coopDetail')}
          onPress={() => shell.chooseMode('coop')}
          icon={1}
          testId="mode-coop"
        />
        <Button
          label={t('play.wifi')}
          detail={can('wifiCoop') ? t('play.wifiDetail') : t('system.feature.wifiCoop.off')}
          disabled={!can('wifiCoop')}
          onPress={() => {
            shell.fromShell.value = true;
            shell.go('wifi');
          }}
          icon={2}
          testId="mode-wifi"
        />
        <Button label={t('common.back')} onPress={() => shell.go('village')} />
      </Panel>
    </Screen>
  );
}

/**
 * The Adaptive Readiness Lobby (Module 16): one card per player with profile, controls and
 * an own ready state. Player 2 joins by pressing Attack on an unused keyboard half or pad.
 */
export function LobbyScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const lobby = shell.lobby.value;
  const profiles = shell.profiles.value;
  useLayoutEffect(() => {
    if (lobby.length > 0 && lobby.every((p) => p.ready)) shell.lobbyDone();
  }, [lobby]);
  const cycleP1 = (d: number) => {
    const ids = profiles.map((p) => p.id);
    if (ids.length < 2) return;
    const i = ids.indexOf(shell.active.value?.id ?? '');
    void shell.useProfile(ids[(i + d + ids.length) % ids.length]!);
    shell.setLobbyReady(0, false);
  };
  const p2Options = () => [
    'guest',
    ...profiles.filter((p) => p.id !== shell.active.value?.id).map((p) => p.id),
  ];
  const cycleP2 = (d: number) => {
    const ids = p2Options();
    const i = Math.max(0, ids.indexOf(lobby[1]?.profile ?? 'guest'));
    void shell.setPartnerProfile(ids[(i + d + ids.length) % ids.length]!);
  };
  useNav(
    () => shell.go('mode'),
    (e) => {
      const slot = slotFor(shell, e);
      if (slot < 0) {
        if (e.confirm) shell.joinLobby(e.source);
        return true;
      }
      if (shell.mode.value === 'solo' && lobby[0] && lobby[0].device !== e.source)
        shell.lobby.value = [{ ...lobby[0], device: e.source }];
      if (e.back) {
        if (slot === 1) shell.leaveLobby(1);
        else if (lobby[0]?.ready) shell.setLobbyReady(0, false);
        else shell.go('mode');
        return true;
      }
      if (e.confirm) shell.setLobbyReady(slot, !lobby[slot]!.ready);
      if (e.dir === 'left' || e.dir === 'right') {
        const d = e.dir === 'left' ? -1 : 1;
        if (slot === 0) cycleP1(d);
        else cycleP2(d);
      }
      return true;
    },
  );
  const card = (slot: number) => {
    const p = lobby[slot];
    const color = PLAYER_COLORS[slot];
    if (!p)
      return (
        <Panel style={{ width: '420px', minHeight: '260px' }} testId={`lobby-card-p${slot + 1}`}>
          <h2 style={{ color }}>{t('common.player', { n: slot + 1 })}</h2>
          <p data-testid="lobby-join">
            <PromptText text={t('play.lobbyJoin')} ctx={ctxOf(shell, 1)} />
          </p>
          <Button label="+" onPress={() => shell.joinLobby('kb:p2')} testId="lobby-join-button" />
        </Panel>
      );
    const profile = slot === 0 ? shell.active.value : shell.partner.value;
    return (
      <Panel style={{ width: '420px', minHeight: '260px' }} testId={`lobby-card-p${slot + 1}`}>
        <h2 style={{ color }}>{t('common.player', { n: slot + 1 })}</h2>
        <div class="ffp-btn" style={{ justifyContent: 'space-between' }}>
          <span>{t('play.lobbyProfile')}</span>
          <span>
            <button
              type="button"
              class="ffp-btn"
              style={{ display: 'inline', width: 'auto' }}
              onClick={() => (slot === 0 ? cycleP1(-1) : cycleP2(-1))}
            >
              ‹
            </button>{' '}
            <b data-testid={`lobby-profile-p${slot + 1}`}>
              {profile?.guest ? t('play.lobbyGuest') : (profile?.name ?? '—')}
            </b>{' '}
            <button
              type="button"
              class="ffp-btn"
              style={{ display: 'inline', width: 'auto' }}
              onClick={() => (slot === 0 ? cycleP1(1) : cycleP2(1))}
            >
              ›
            </button>
          </span>
        </div>
        <p data-testid={`lobby-device-p${slot + 1}`}>
          {t('play.lobbyDevice', { device: deviceName(p.device) })}
        </p>
        <button
          type="button"
          class="ffp-btn"
          data-testid={`lobby-ready-p${slot + 1}`}
          onClick={() => shell.setLobbyReady(slot, !p.ready)}
          style={{ borderColor: p.ready ? '#7ddc7d' : undefined }}
        >
          {p.ready ? `✓ ${t('play.lobbyReady')}` : t('play.lobbyNotReady')}
          <span class="ffp-mark">
            <PromptText text={t('play.lobbyToggleReady')} ctx={ctxOf(shell, slot)} color={color} />
          </span>
        </button>
      </Panel>
    );
  };
  return (
    <Screen bg={ART('menu-bg')} dim testId="lobby">
      <h1 class="ffp-title" style={{ position: 'relative' }}>
        {t('play.lobbyTitle')}
      </h1>
      <div class="ffp-row" style={{ position: 'relative' }}>
        {card(0)}
        {shell.mode.value === 'coop' ? card(1) : null}
      </div>
      <p class="ffp-hint" style={{ position: 'relative' }}>
        {t('play.lobbyWaiting')}
      </p>
    </Screen>
  );
}

export function StageScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const pick = shell.stagePick.value;
  useNav(() => shell.go('lobby'));
  const diffs = DIFFICULTIES.map((d) => ({ value: d.id, label: difficultyName(d.id) }));
  const stage = STAGES.find((s) => s.id === pick.stage);
  const di = DIFFICULTIES.findIndex((d) => d.id === pick.difficulty);
  const continues = stage?.continues[di] ?? 0;
  // M21: every campaign stage of the data, in Story Mode order; locked ones say why.
  const me = shell.active.value;
  const list = me ? campaignList(me) : [];
  const open = list.filter((c) => c.open).map((c) => c.def.id);
  const locked = list.filter((c) => !c.open);
  if (open.length === 0) open.push('stage1');
  useLayoutEffect(() => {
    if (!open.includes(pick.stage)) shell.setStagePick({ stage: open[0]! });
  }, [pick.stage, open.join()]);
  return (
    <Screen bg={ART('s1-intro-01')} dim align="start" testId="stage-select">
      <Panel style={{ width: '640px' }}>
        <h1 class="ffp-title">{t('play.stageTitle')}</h1>
        <Choice
          label={t('play.stage')}
          value={pick.stage}
          options={open.map((id) => ({ value: id, label: stageName(id) }))}
          onChange={(v) => shell.setStagePick({ stage: v })}
          testId="stage-pick"
        />
        {locked.map((c) => (
          <p class="ffp-hint" data-testid={`stage-locked-${c.def.id}`}>
            🔒 {stageName(c.def.id)} ·{' '}
            {t('m21.stageLocked', { stage: stageName(c.def.opens ?? 'stage1') })}
          </p>
        ))}
        <Choice
          label={t('play.difficulty')}
          value={pick.difficulty}
          options={diffs}
          onChange={(v) => shell.setStagePick({ difficulty: v })}
          testId="stage-difficulty"
          autofocus
        />
        <p class="ffp-hint">{t('play.continues', { n: continues })}</p>
        <Button label={t('common.next')} onPress={() => shell.stageDone()} testId="stage-next" />
        <Button label={t('common.back')} onPress={() => shell.go('lobby')} />
      </Panel>
    </Screen>
  );
}

/**
 * Split Independent Selection with Unique Heroes (Module 16): every player has a panel;
 * a confirmed hero is reserved and the other panel shows who chose it.
 */
export function HeroesScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const picks = shell.heroPicks.value;
  useLayoutEffect(() => {
    if (picks.length > 0 && picks.every((p) => p.confirmed)) {
      const id = setTimeout(() => shell.heroesDone(), 400);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [picks]);
  useNav(
    () => shell.go('stage'),
    (e) => {
      const slot = Math.max(0, slotFor(shell, e));
      const p = picks[slot];
      if (!p) return true;
      if (e.back) {
        if (p.confirmed) shell.releaseHero(slot);
        else if (slot === 0) shell.go('stage');
        return true;
      }
      if (e.dir === 'left' || e.dir === 'up') shell.moveHeroCursor(slot, -1);
      if (e.dir === 'right' || e.dir === 'down') shell.moveHeroCursor(slot, 1);
      if (e.confirm) shell.confirmHero(slot);
      return true;
    },
  );
  return (
    <Screen bg={ART('menu-bg')} dim testId="heroes">
      <h1 class="ffp-title" style={{ position: 'relative' }}>
        {t('play.heroesTitle')}
      </h1>
      <div class="ffp-row" style={{ position: 'relative' }}>
        {picks.map((p, slot) => {
          const id = HERO_ROSTER[p.cursor]!;
          const owner = shell.heroOwner(p.cursor);
          const taken = owner >= 0 && owner !== slot;
          const color = PLAYER_COLORS[slot];
          return (
            <Panel
              style={{ width: '440px', textAlign: 'center' }}
              testId={`hero-panel-p${slot + 1}`}
            >
              <h2 style={{ color, margin: '0 0 6px' }}>{t('common.player', { n: slot + 1 })}</h2>
              <div class="ffp-row" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <button
                  type="button"
                  class="ffp-btn"
                  style={{ width: 'auto' }}
                  onClick={() => shell.moveHeroCursor(slot, -1)}
                >
                  ‹
                </button>
                <img
                  src={ART(`select-${id}`)}
                  alt={heroName(id)}
                  onClick={() => shell.confirmHero(slot)}
                  style={{ height: '420px', opacity: taken ? 0.35 : 1, cursor: 'pointer' }}
                />
                <button
                  type="button"
                  class="ffp-btn"
                  style={{ width: 'auto' }}
                  onClick={() => shell.moveHeroCursor(slot, 1)}
                >
                  ›
                </button>
              </div>
              <div
                data-testid={`hero-name-p${slot + 1}`}
                style={{ fontSize: '28px', fontWeight: 700 }}
              >
                {heroName(id)}
              </div>
              <div class="ffp-hint" data-testid={`hero-state-p${slot + 1}`}>
                {p.confirmed ? (
                  <>
                    ✓ {t('play.heroConfirmed')} ·{' '}
                    <PromptText text={t('play.heroChange')} ctx={ctxOf(shell, slot)} />
                  </>
                ) : taken ? (
                  t('play.heroTaken', { n: owner + 1 })
                ) : (
                  <PromptText text={t('play.heroPick')} ctx={ctxOf(shell, slot)} color={color} />
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </Screen>
  );
}

/** M22: the profile's narration settings for a cinematic. */
export function voiceOf(shell: Shell): VoiceSettings | undefined {
  const s = shell.active.value?.settings;
  return s
    ? {
        voiceLanguage: s.voiceLanguage,
        systemVoice: s.systemVoice,
        volumeMaster: s.volumeMaster,
        volumeVoice: s.volumeVoice,
      }
    : undefined;
}

/** M22: a chapter's localized title (`cine.stage2.roadside` → `m22.chapter.roadside`). */
export function chapterTitle(def: CinematicDef): string {
  return t(`m22.chapter.${def.id.split('.').pop()}` as TextId);
}

/**
 * M22: several chapters in a row (each skippable on its own; Skip all leaves the
 * sequence). Each chapter is a fresh cinematic with its own music, subtitles and voice.
 */
export function Chapters({
  shell,
  defs,
  state,
  testId,
  onDone,
}: {
  shell: Shell;
  defs: readonly CinematicDef[];
  state?: StoryState;
  testId: string;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const s = shell.active.value?.settings;
  const def = defs[i];
  if (!def) return null;
  return (
    <Cinematic
      key={def.id}
      def={def}
      {...(state ? { state } : {})}
      stills={s?.cinematics === 'stills'}
      speakerLabels={s?.speakerLabels ?? true}
      ctx={ctxOf(shell, 0)}
      testId={testId}
      title={chapterTitle(def)}
      {...(voiceOf(shell) ? { voice: voiceOf(shell)! } : {})}
      onDone={() => (i + 1 < defs.length ? setI(i + 1) : onDone())}
      onSkipAll={onDone}
    />
  );
}

/**
 * The intro cinematic (M13): the six Flow clips with subtitles, or the same shots as
 * still pictures (setting, missing or failing clips). Skip, next and pause. M22: Stage 2
 * opens with its four chapters (Prosperity Interlude, Roadside Deception, Guest Under
 * Observation, The Night Signal).
 */
export function IntroScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const s = shell.active.value?.settings;
  if (shell.stagePick.value.stage === 'stage2')
    return (
      <Chapters
        shell={shell}
        defs={STAGE2_INTRO}
        testId="intro"
        onDone={() => shell.go('briefing')}
      />
    );
  return (
    <Cinematic
      def={STAGE1_INTRO}
      stills={s?.cinematics === 'stills'}
      speakerLabels={s?.speakerLabels ?? true}
      ctx={ctxOf(shell, 0)}
      testId="intro"
      {...(voiceOf(shell) ? { voice: voiceOf(shell)! } : {})}
      onDone={() => shell.go('briefing')}
    />
  );
}

/**
 * The ending cinematic over the finished stage (M13), chosen by the run's outcome. M22:
 * Stage 2's Community Recovery and Justice and Mystery Coda chapters, after its epilogue.
 */
export function EndingScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const s = shell.active.value?.settings;
  const state = shell.ending.value;
  if (!state) return null;
  return (
    <div class="ffp-shell" style={{ pointerEvents: 'auto', zIndex: 40 }}>
      {state.stage === 'stage2' ? (
        <Chapters
          shell={shell}
          defs={STAGE2_ENDING}
          state={state}
          testId="ending"
          onDone={() => (shell.ending.value = null)}
        />
      ) : (
        <Cinematic
          def={STAGE1_ENDING}
          state={state}
          stills={s?.cinematics === 'stills'}
          speakerLabels={s?.speakerLabels ?? true}
          ctx={ctxOf(shell, 0)}
          testId="ending"
          {...(voiceOf(shell) ? { voice: voiceOf(shell)! } : {})}
          onDone={() => (shell.ending.value = null)}
        />
      )}
    </div>
  );
}

const BRIEF = [1, 2, 3, 4, 5] as const;
/** The briefing lines of a stage (M21: Stage 2 has its own). */
function briefKey(stage: string, n: (typeof BRIEF)[number]): TextId {
  return stage === 'stage2' ? `m21.brief.stage2.${n}` : `brief.${n}`;
}
/** Elder briefing pose (cell of the 3 × 2 sheet) for each line. */
const POSE = [0, 1, 3, 4, 2];

function Loadout({ heroId, slot, shell }: { heroId: string; slot: number; shell: Shell }) {
  const kit = HEROES.find((h) => h.id === heroId)!;
  const lo = defaultLoadout(kit);
  // M11: owned catalogue moves the player equipped replace the default in their slot.
  const changes = shell.loadoutsFor(shell.chosenHeroes())[slot] ?? [];
  for (const c of changes) {
    const ai = kit.actions.findIndex((a) => a.id === c.action);
    if (ai >= 0) equipMove(lo, kit, c.kind, c.dir, ai);
  }
  const open = changes.length > 0;
  const rows = lo
    .map((ai, i) => ({ ai, kind: i < SLOTS ? 'special' : 'ultimate', dir: i % SLOTS }))
    .filter((r) => r.ai >= 0);
  return (
    <div data-testid={`loadout-p${slot + 1}`}>
      <b style={{ color: PLAYER_COLORS[slot] }}>
        {t('common.player', { n: slot + 1 })} · {heroName(heroId)}
      </b>{' '}
      <span class="ffp-scope" data-testid={`loadout-kind-p${slot + 1}`}>
        {open ? t('results.open') : t('results.standard')}
      </span>
      {(shell.cheatDraft.value.hero[slot] ?? []).length > 0 ? (
        <span class="ffp-scope" style={{ color: '#ffb36b' }}>
          {t('hud.cheatAssisted')}
        </span>
      ) : null}
      {rows.map((r) => {
        const a = kit.actions[r.ai]!;
        return (
          <div class="ffp-hint">
            {dt(`hero.${heroId}.action.${a.id}`, a.name)} ·{' '}
            <PromptText
              text={moveInputText(r.kind, a.dir < 0 ? 0 : a.dir)}
              ctx={ctxOf(shell, slot)}
            />
          </div>
        );
      })}
    </div>
  );
}

/** The elder's briefing: dialogue with speaker labels, objective, loadout, transcript. */
export function BriefingScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const [line, setLine] = useState(0);
  const done = line >= BRIEF.length;
  useNav(
    () => (done ? shell.go('heroes') : setLine(BRIEF.length)),
    (e) => {
      if (done) return false;
      if (e.confirm) setLine(line + 1);
      else if (e.back) setLine(BRIEF.length);
      return true;
    },
  );
  const speaker = shell.active.value?.settings.speakerLabels ?? true;
  const heroes = shell.chosenHeroes();
  const pose = POSE[Math.min(line, BRIEF.length - 1)]!;
  const stage = shell.stagePick.value.stage;
  // M22: the Stage 2 briefing over its own stills (the room, then the perimeter at night).
  const bg =
    stage === 'stage2'
      ? STAGE2_BRIEF_STILLS[Math.min(line, BRIEF.length - 1)]!
      : 's1-brief-01';
  return (
    <Screen bg={ART(bg)} testId="briefing">
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '2%',
          bottom: 0,
          width: '34vw',
          height: '34vw',
          maxWidth: '520px',
          maxHeight: '520px',
          backgroundImage: `url(${ART('elder-briefing')})`,
          backgroundSize: '300% 200%',
          backgroundPosition: `${(pose % 3) * 50}% ${Math.floor(pose / 3) * 100}%`,
        }}
      />
      {!done ? (
        <div style={{ position: 'absolute', bottom: '60px', left: '30%', right: '4%' }}>
          <div class="ffp-caption" data-testid="briefing-line" style={{ textAlign: 'left' }}>
            {speaker ? <b>{t('speaker.elder')}: </b> : null}
            {t(briefKey(stage, BRIEF[line]!))}
          </div>
          <div class="ffp-hint" style={{ marginTop: '8px' }}>
            <PromptText text={t('play.skipHint')} ctx={ctxOf(shell, 0)} />{' '}
            <button
              type="button"
              class="ffp-btn"
              style={{ display: 'inline', width: 'auto' }}
              data-testid="briefing-next"
              onClick={() => setLine(line + 1)}
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      ) : (
        <div
          class="ffp-row"
          style={{ position: 'absolute', right: '3%', top: '6%', bottom: '6%', width: '62%' }}
        >
          <Panel style={{ flex: 1, overflow: 'auto' }} testId="briefing-summary">
            <h1 class="ffp-title">{t('play.briefingTitle')}</h1>
            <h3>{t('play.objective')}</h3>
            <p data-testid="briefing-objective">
              {t(stage === 'stage2' ? 'm21.brief.stage2.objective' : 'brief.objective')}
            </p>
            <h3>{t('play.loadout')}</h3>
            {heroes.map((h, slot) => (
              <Loadout heroId={h} slot={slot} shell={shell} />
            ))}
            <h3>{t('play.transcript')}</h3>
            {BRIEF.map((n) => (
              <p class="ffp-hint">
                {speaker ? <b>{t('speaker.elder')}: </b> : null}
                {t(briefKey(stage, n))}
              </p>
            ))}
            <Button
              label={t('common.next')}
              onPress={() => shell.go('ready')}
              autofocus
              testId="briefing-continue"
            />
            <Button
              label={t('secrets.title')}
              detail={shell.draftCheats() ? t('secrets.chosen') : t('secrets.briefingDetail')}
              testId="briefing-secrets"
              onPress={() => {
                shell.secretsFrom.value = 'briefing';
                shell.go('secrets');
              }}
            />
          </Panel>
        </div>
      )}
    </Screen>
  );
}

/** Readiness: every player confirms on their own device, then the stage starts. */
export function ReadyScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const ready = shell.ready.value;
  const n = shell.lobby.value.length;
  useLayoutEffect(() => {
    if (n > 0 && ready.length === n && ready.every(Boolean)) shell.startStage();
  }, [ready]);
  const mark = (slot: number) => {
    const r = [...shell.ready.value];
    r[slot] = true;
    shell.ready.value = r;
  };
  useNav(
    () => shell.go('briefing'),
    (e) => {
      const slot = Math.max(0, slotFor(shell, e));
      if (e.confirm) mark(slot);
      else if (e.back) shell.go('briefing');
      return true;
    },
  );
  const waiting = ready.findIndex((r) => !r);
  return (
    <Screen bg={ART('s1-intro-06')} dim testId="ready">
      <Panel style={{ width: '620px', textAlign: 'center' }}>
        <h1 class="ffp-title">{t('play.readyTitle')}</h1>
        <p>
          {stageName(shell.stagePick.value.stage)} ·{' '}
          {difficultyName(shell.stagePick.value.difficulty)}
        </p>
        {shell.chosenHeroes().map((h, slot) => (
          <p style={{ color: PLAYER_COLORS[slot] }} data-testid={`ready-p${slot + 1}`}>
            {t('common.player', { n: slot + 1 })} · {heroName(h)} {ready[slot] ? '✓' : ''}
          </p>
        ))}
        {shell.draftCheats() ? (
          <p data-testid="ready-cheat" style={{ color: '#ffb36b' }}>
            {t('hud.cheatAssisted')}
          </p>
        ) : null}
        <p class="ffp-hint">
          <PromptText text={t('play.readyHint')} ctx={ctxOf(shell, 0)} />
        </p>
        {waiting >= 0 && n > 1 ? (
          <p class="ffp-hint">{t('play.readyWaiting', { n: waiting + 1 })}</p>
        ) : null}
        <Button
          label={t('play.start')}
          onPress={() => (n === 1 ? shell.startStage() : mark(waiting >= 0 ? waiting : 0))}
          autofocus
          testId="ready-start"
        />
      </Panel>
    </Screen>
  );
}

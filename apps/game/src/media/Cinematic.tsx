import { signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  AssetRegistry,
  type CinematicDef,
  type PromptContext,
  CinematicPlayer,
  type Locale,
  MOTIFS,
  type StoryState,
  resolveCinematic,
} from '@ffp/platform';
import { locale, t, tIn } from '../text/i18n';
import { useNav } from '../shell/hooks';
import { PromptText } from '../ui/InputPrompt';
import { audio } from './audio';

const assets = new AssetRegistry();

/** The cinematic on screen (music and tests read it), or null. */
export const activeCinematic = signal<{
  id: string;
  player: CinematicPlayer<Locale>;
  /** Clips with their own soundtrack are playing (the score stays out of the way). */
  video: boolean;
  music?: { cue: string; state: string };
} | null>(null);

/**
 * M13 cinematic screen: the shots of a cinematic as video clips (WebM, MP4 fallback)
 * with the approved still behind each one, or as the stills alone (setting, missing
 * clip or a clip that fails to load), localized subtitles latched per cue, and pause,
 * next and skip by mouse, keyboard or gamepad. The player's own clock drives timing,
 * so both modes tell the same story at the same pace.
 */
export function Cinematic({
  def,
  state = {},
  stills,
  speakerLabels,
  ctx,
  testId,
  onDone,
}: {
  def: CinematicDef;
  state?: StoryState;
  stills: boolean;
  speakerLabels: boolean;
  ctx: PromptContext;
  testId: string;
  onDone: () => void;
}) {
  const player = useMemo(
    () => new CinematicPlayer<Locale>(resolveCinematic(def, MOTIFS, state)),
    // The state is read once: a cinematic does not change shots while it plays.
    [def],
  );
  const [, setTick] = useState(0);
  const failed = useRef(new Set<string>());
  const video = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    player.skip();
    onDone();
  };
  useNav(finish, (e) => {
    if (e.confirm) player.next();
    else if (e.back) finish();
    else if (e.dir === 'down' || e.dir === 'up') player.togglePause();
    else return true;
    setTick((n) => n + 1);
    return true;
  });
  useLayoutEffect(() => {
    let last = performance.now();
    let id = 0;
    const loop = (now: number) => {
      player.advance(Math.min(100, now - last));
      last = now;
      if (player.done) {
        finish();
        return;
      }
      setTick((n) => (n + 1) % 1_000_000);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [player]);
  const frame = player.frame();
  const shot = frame?.shot;
  const clip =
    shot?.clip && !stills && !failed.current.has(shot.clip) ? assets.video(shot.clip) : undefined;
  useEffect(() => {
    activeCinematic.value = {
      id: def.id,
      player,
      video: !!clip?.video.audio,
      ...(def.music ? { music: def.music } : {}),
    };
  }, [def, player, !!clip?.video.audio]);
  useEffect(() => () => void (activeCinematic.value = null), []);
  // Keep the clip on the player's clock: play/pause with it, and re-seek on a jump.
  useEffect(() => {
    const v = video.current;
    if (!v || !frame) return;
    v.volume = Math.max(0, Math.min(1, audio.videoVolume()));
    if (frame.paused && !v.paused) v.pause();
    else if (!frame.paused && v.paused && v.readyState >= 2) void v.play().catch(() => {});
    if (v.readyState >= 1 && Math.abs(v.currentTime * 1000 - frame.time) > 500)
      v.currentTime = Math.min(frame.time / 1000, Math.max(0, v.duration - 0.05) || 0);
  });
  if (!frame || !shot) return null;
  const sub = player.subtitle(locale.value);
  const still = assets.url(shot.still);
  return (
    <div
      class="ffp-screen"
      data-shell-screen
      data-testid={testId}
      data-shot={shot.id}
      data-mode={clip ? 'video' : 'still'}
      data-paused={frame.paused ? 'true' : 'false'}
      style={{ backgroundImage: still ? `url(${still})` : undefined, background: '#000' }}
    >
      {still ? (
        <img
          src={still}
          alt=""
          data-testid={`${testId}-still`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : null}
      {clip ? (
        <video
          key={shot.id}
          ref={video}
          data-testid={`${testId}-video`}
          autoplay
          playsInline
          muted={!clip.video.audio}
          preload="auto"
          poster={still}
          onError={() => failed.current.add(shot.clip!)}
          onCanPlay={(e) => {
            const v = e.currentTarget;
            if (!player.isPaused) void v.play().catch(() => {});
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        >
          <source src={clip.video.webm} type="video/webm" onError={() => undefined} />
          <source
            src={clip.video.mp4}
            type="video/mp4"
            // The last source failing means no clip: the still is already behind it.
            onError={() => {
              failed.current.add(shot.clip!);
              setTick((n) => n + 1);
            }}
          />
        </video>
      ) : null}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          minHeight: '1px',
        }}
      >
        {sub ? (
          <div class="ffp-caption" data-testid={`${testId}-caption`} data-locale={sub.locale}>
            {speakerLabels && sub.cue.speaker ? <b>{tIn(sub.locale, sub.cue.speaker)}: </b> : null}
            {tIn(sub.locale, sub.cue.text)}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: 'absolute',
          top: '18px',
          right: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <span
          class="ffp-hint"
          style={{ background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '6px' }}
        >
          <PromptText text={t('cine.hint')} ctx={ctx} />
        </span>
        {!clip ? (
          <span class="ffp-hint" data-testid={`${testId}-stills`}>
            {t('cine.stills')}
          </span>
        ) : null}
        <button
          type="button"
          class="ffp-btn"
          style={{ width: 'auto' }}
          data-testid={`${testId}-pause`}
          onClick={() => {
            player.togglePause();
            setTick((n) => n + 1);
          }}
        >
          {frame.paused ? t('cine.resume') : t('cine.pause')}
        </button>
        <button
          type="button"
          class="ffp-btn"
          style={{ width: 'auto' }}
          data-testid={`${testId}-skip`}
          onClick={finish}
        >
          {t('play.skip')}
        </button>
        <button
          type="button"
          class="ffp-btn"
          style={{ width: 'auto' }}
          data-testid={`${testId}-next`}
          onClick={() => {
            player.next();
            if (player.done) finish();
            else setTick((n) => n + 1);
          }}
        >
          {t('common.next')} ({frame.index + 1}/{frame.count})
        </button>
      </div>
    </div>
  );
}

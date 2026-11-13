import { AssetRegistry, type Locale, TTS_LANG, pickVoice, type VoiceLanguage } from '@ffp/platform';
import { tIn } from '../text/i18n';
import { audio } from './audio';

const assets = new AssetRegistry();

/** What was spoken, newest last (`file:<asset>`, `tts:<locale>:<line>`, `none:<line>`), for tests. */
export const narrationLog: string[] = [];

export interface VoiceSettings {
  voiceLanguage: VoiceLanguage;
  systemVoice: boolean;
  volumeMaster: number;
  volumeVoice: number;
}

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

/**
 * M22: speaks one subtitle line (spec §16, Subtitle-Complete, Narration-Led): a delivered
 * voice file in the chosen voice language (or English), else the temporary system voice
 * when the player turned it on, else nothing (the subtitle is always shown). The previous
 * line stops first. Presentation only.
 */
export function narrate(textId: string, textLocale: Locale, s: VoiceSettings): void {
  hush();
  const pick = pickVoice(
    textId,
    s.voiceLanguage,
    textLocale,
    (a) => assets.audio(a) !== undefined,
    s.systemVoice,
  );
  if (pick.kind === 'file') {
    narrationLog.push(`file:${pick.asset}`);
    audio.voice(pick.asset);
    return;
  }
  if (pick.kind === 'tts') {
    narrationLog.push(`tts:${pick.locale}:${textId}`);
    const tts = synth();
    if (!tts) return;
    try {
      const u = new SpeechSynthesisUtterance(tIn(pick.locale, textId));
      u.lang = TTS_LANG[pick.locale];
      const voice = tts
        .getVoices()
        .find((v) => v.lang.toLowerCase().startsWith(pick.locale.toLowerCase().slice(0, 2)));
      if (voice) u.voice = voice;
      u.volume = Math.max(0, Math.min(1, (s.volumeMaster / 100) * (s.volumeVoice / 100)));
      u.rate = 0.95;
      tts.speak(u);
      audio.duck(0.6, 2500);
    } catch {
      /* no system voice: the subtitle carries the line */
    }
    return;
  }
  narrationLog.push(`none:${textId}`);
}

/** Stops any line being spoken (a skipped shot or a closed cinematic). */
export function hush(): void {
  audio.stopVoice();
  try {
    synth()?.cancel();
  } catch {
    /* nothing to stop */
  }
}

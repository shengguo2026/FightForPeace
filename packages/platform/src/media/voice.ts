/**
 * M22 Subtitle-Complete, Narration-Led Voice Pipeline (Stage 2 spec §16, story line §14).
 *
 * Stable localization ids drive subtitles, transcripts, temporary TTS and final voice
 * files: a voice file for line `s2.line.p01` in German is the manifest id
 * `vo.de.s2.line.p01`, so text and audio can never silently diverge. Subtitles are always
 * complete; voice only adds to them.
 *
 * Text language and voice language are chosen independently. The voice resolves in this
 * explicit order: a delivered file in the chosen voice language, then a delivered English
 * file, then (only when the player turned it on) the temporary system voice (Windows TTS
 * through the browser, a prototype and accessibility fallback that never ships as a file),
 * then nothing: the subtitles carry the line.
 */
import type { Locale } from '../i18n/i18n';

export type VoiceLanguage = 'text' | Locale | 'off';

export type VoicePick =
  | { kind: 'file'; asset: string; locale: Locale }
  | { kind: 'tts'; locale: Locale }
  | { kind: 'none' };

/** Manifest id of a line's voice file in one language. */
export function voiceAsset(locale: Locale, textId: string): string {
  return `vo.${locale}.${textId}`;
}

/** The language the voice should speak (null: voice off). */
export function voiceLocale(setting: VoiceLanguage, textLocale: Locale): Locale | null {
  if (setting === 'off') return null;
  return setting === 'text' ? textLocale : setting;
}

/** Which voice plays a line (see the module comment for the order). */
export function pickVoice(
  textId: string,
  setting: VoiceLanguage,
  textLocale: Locale,
  hasFile: (asset: string) => boolean,
  tts: boolean,
): VoicePick {
  const want = voiceLocale(setting, textLocale);
  if (!want) return { kind: 'none' };
  for (const locale of want === 'en' ? (['en'] as const) : ([want, 'en'] as const)) {
    const asset = voiceAsset(locale, textId);
    if (hasFile(asset)) return { kind: 'file', asset, locale };
  }
  return tts ? { kind: 'tts', locale: want } : { kind: 'none' };
}

/** BCP 47 tag the system voice is asked for. */
export const TTS_LANG: Readonly<Record<Locale, string>> = {
  en: 'en-GB',
  'zh-CN': 'zh-CN',
  de: 'de-DE',
};

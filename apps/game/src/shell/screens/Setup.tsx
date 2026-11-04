import { useLayoutEffect, useState } from 'preact/hooks';
import {
  DEFAULT_SETTINGS,
  LOCALES,
  LOCALE_NAMES,
  type LayoutName,
  type Locale,
  type ProfileSettings,
} from '@ffp/platform';
import { locale, setLocale, t } from '../../text/i18n';
import { applyPresentation, type Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Choice, Panel, Screen } from '../ui';
import { focusFirst } from '../nav';

const SIZES = ['small', 'medium', 'large'] as const;

/**
 * First launch (Module 16): language, subtitle defaults, essential accessibility, the
 * keyboard layout picker (D6) and the first input device, then the village.
 */
export function SetupScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<ProfileSettings>({ ...DEFAULT_SETTINGS });
  const [device, setDevice] = useState<'keyboard' | 'gamepad' | null>(null);
  const [name, setName] = useState(() => t('setup.defaultName'));
  const total = 4;
  const set = (patch: Partial<ProfileSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    applyPresentation(next);
  };
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-shell-screen]');
    if (root) focusFirst(root);
  }, [step]);
  useNav(
    () => setStep((s) => Math.max(0, s - 1)),
    (e) => {
      if (step === 3 && device === null) {
        setDevice(e.source.startsWith('pad:') ? 'gamepad' : 'keyboard');
        shell.setupDevice.value = e.source.startsWith('pad:') ? 'gamepad' : 'keyboard';
        return true;
      }
      return false;
    },
  );
  const pickLanguage = (l: Locale) => {
    setLocale(l);
    setName(t('setup.defaultName'));
    setStep(1);
  };
  const pickLayout = (l: LayoutName) => {
    shell.lab.layout.value = l;
    shell.session.labels.setPickedLayout(l);
    set({ layout: l });
    setStep(3);
  };
  const on = (v: boolean) =>
    [
      { value: true, label: t('common.on') },
      { value: false, label: t('common.off') },
    ].find((o) => o.value === v)!;
  const onOff = [on(true), on(false)];
  return (
    <Screen bg={ART('keyart-title')} dim align="start" testId="setup">
      <Panel style={{ width: '680px', maxWidth: '92vw' }} testId={`setup-step-${step + 1}`}>
        <div class="ffp-hint">{t('setup.step', { n: step + 1, total })}</div>
        <h1 class="ffp-title">{t('setup.title')}</h1>
        {step === 0 ? (
          <>
            <p class="ffp-sub">{t('setup.intro')}</p>
            <h2>{t('setup.language')}</h2>
            {LOCALES.map((l) => (
              <Button
                label={LOCALE_NAMES[l]}
                onPress={() => pickLanguage(l)}
                autofocus={l === locale.value}
                testId={`setup-language-${l}`}
                mark={l === locale.value ? '✓' : undefined}
              />
            ))}
          </>
        ) : null}
        {step === 1 ? (
          <>
            <h2>{t('setup.subtitles')}</h2>
            <Choice
              label={t('setup.subtitleSize')}
              value={settings.subtitleSize}
              options={SIZES.map((s) => ({ value: s, label: t(`settings.size.${s}`) }))}
              onChange={(v) => set({ subtitleSize: v })}
              testId="setup-subtitle-size"
              autofocus
            />
            <Choice
              label={t('settings.subtitleBackground')}
              value={settings.subtitleBackground}
              options={onOff}
              onChange={(v) => set({ subtitleBackground: v })}
            />
            <h2>{t('setup.accessibility')}</h2>
            <Choice
              label={t('settings.reducedFlashing')}
              value={settings.reducedFlashing}
              options={onOff}
              onChange={(v) => set({ reducedFlashing: v })}
              testId="setup-reduced-flashing"
            />
            <Choice
              label={t('settings.reducedShake')}
              value={settings.reducedShake}
              options={onOff}
              onChange={(v) => set({ reducedShake: v })}
            />
            <Choice
              label={t('settings.highContrast')}
              value={settings.highContrast}
              options={onOff}
              onChange={(v) => set({ highContrast: v })}
            />
            <Choice
              label={t('settings.hudScale')}
              value={settings.hudScale}
              options={[75, 100, 125, 150].map((v) => ({ value: v, label: `${v} %` }))}
              onChange={(v) => set({ hudScale: v })}
            />
            <Button label={t('common.next')} onPress={() => setStep(2)} testId="setup-next" />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h2>{t('setup.layout')}</h2>
            <p class="ffp-sub">{t('setup.layoutHint')}</p>
            {(['qwerty', 'qwertz', 'azerty'] as const).map((l) => (
              <Button
                label={l.toUpperCase()}
                onPress={() => pickLayout(l)}
                autofocus={l === (settings.layout ?? shell.lab.layout.value)}
                testId={`setup-layout-${l}`}
              />
            ))}
          </>
        ) : null}
        {step === 3 ? (
          <>
            <h2>{t('setup.device')}</h2>
            {device === null ? (
              <>
                <p class="ffp-sub" data-testid="setup-device-prompt">
                  {t('setup.devicePrompt')}
                </p>
                <Button label={t('setup.deviceKeyboard')} onPress={() => setDevice('keyboard')} />
                <Button label={t('setup.deviceGamepad')} onPress={() => setDevice('gamepad')} />
              </>
            ) : (
              <>
                <p class="ffp-sub" data-testid="setup-device">
                  {device === 'gamepad' ? t('setup.deviceGamepad') : t('setup.deviceKeyboard')} ✓
                </p>
                <label class="ffp-btn" style={{ display: 'grid', gap: '6px' }}>
                  <span>{t('setup.name')}</span>
                  <input
                    data-nav
                    data-testid="setup-name"
                    value={name}
                    maxLength={24}
                    onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
                    style={{
                      font: 'inherit',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #888',
                    }}
                  />
                </label>
                <Button
                  label={t('setup.start')}
                  autofocus
                  testId="setup-finish"
                  onPress={() => void shell.finishSetup({ name, locale: locale.value, settings })}
                />
              </>
            )}
          </>
        ) : null}
      </Panel>
    </Screen>
  );
}

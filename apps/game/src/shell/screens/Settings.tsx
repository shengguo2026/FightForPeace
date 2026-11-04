import { useEffect, useRef, useState } from 'preact/hooks';
import {
  LOCALES,
  LOCALE_NAMES,
  type ImportPreview,
  type LayoutName,
  type ProfileSettings,
  type QualitySetting,
} from '@ffp/platform';
import { locale, t, type TextId } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Choice, Panel, Screen } from '../ui';
import { RemapPanel } from './Remap';

export const CATEGORIES = [
  'gameplay',
  'controls',
  'accessibility',
  'audio',
  'display',
  'language',
  'profile',
] as const;
export type Category = (typeof CATEGORIES)[number];

const onOff = () => [
  { value: true, label: t('common.on') },
  { value: false, label: t('common.off') },
];
const SIZES = ['small', 'medium', 'large'] as const;
const VOLUMES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/** Sets one profile setting and saves the profile. */
function useSetting(shell: Shell) {
  return <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) =>
    shell.update((p) => (p.settings[key] = value));
}

/** Small hint line under a group of settings. */
function Hint({ id }: { id: TextId }) {
  return <p class="ffp-hint">{t(id)}</p>;
}

export function GameplayPanel({ shell }: { shell: Shell }) {
  const s = shell.active.value!.settings;
  const set = useSetting(shell);
  return (
    <>
      <Choice
        label={t('settings.facing')}
        scope={t('scope.profile')}
        value={s.facing}
        options={[
          { value: 'manual' as const, label: t('settings.facingManual') },
          { value: 'assisted' as const, label: t('settings.facingAssisted') },
        ]}
        onChange={(v) => set('facing', v)}
        testId="setting-facing"
        autofocus
      />
      <Hint id="settings.facingHint" />
    </>
  );
}

export function ControlsPanel({ shell }: { shell: Shell }) {
  const s = shell.active.value!.settings;
  const set = useSetting(shell);
  const [remap, setRemap] = useState(false);
  if (remap) return <RemapPanel shell={shell} onClose={() => setRemap(false)} />;
  return (
    <>
      <Choice
        label={t('settings.promptStyle')}
        scope={t('scope.profile')}
        value={s.promptStyle}
        options={[
          { value: 'auto' as const, label: t('settings.promptAuto') },
          { value: 'xbox' as const, label: 'Xbox' },
          { value: 'playstation' as const, label: 'PlayStation' },
          { value: 'nintendo' as const, label: 'Nintendo' },
        ]}
        onChange={(v) => set('promptStyle', v)}
        testId="setting-prompt-style"
        autofocus
      />
      <Hint id="settings.promptHint" />
      <Choice
        label={t('settings.layout')}
        scope={t('scope.profile')}
        value={s.layout ?? shell.lab.layout.value}
        options={(['qwerty', 'qwertz', 'azerty'] as LayoutName[]).map((l) => ({
          value: l,
          label: l.toUpperCase(),
        }))}
        onChange={(v) => set('layout', v)}
        testId="setting-layout"
      />
      <Button label={t('settings.remap')} onPress={() => setRemap(true)} testId="setting-remap" />
      <Hint id="settings.remapHint" />
    </>
  );
}

export function AccessibilityPanel({ shell }: { shell: Shell }) {
  const s = shell.active.value!.settings;
  const set = useSetting(shell);
  const scope = t('scope.profile');
  return (
    <>
      <Choice
        label={t('settings.subtitleSize')}
        scope={scope}
        value={s.subtitleSize}
        options={SIZES.map((v) => ({ value: v, label: t(`settings.size.${v}`) }))}
        onChange={(v) => set('subtitleSize', v)}
        testId="setting-subtitle-size"
        autofocus
      />
      <Choice
        label={t('settings.subtitleBackground')}
        scope={scope}
        value={s.subtitleBackground}
        options={onOff()}
        onChange={(v) => set('subtitleBackground', v)}
      />
      <Choice
        label={t('settings.speakerLabels')}
        scope={scope}
        value={s.speakerLabels}
        options={onOff()}
        onChange={(v) => set('speakerLabels', v)}
      />
      <Choice
        label={t('settings.hudScale')}
        scope={scope}
        value={s.hudScale}
        options={[75, 100, 125, 150].map((v) => ({ value: v, label: `${v} %` }))}
        onChange={(v) => set('hudScale', v)}
        testId="setting-hud-scale"
      />
      <Choice
        label={t('settings.highContrast')}
        scope={scope}
        value={s.highContrast}
        options={onOff()}
        onChange={(v) => set('highContrast', v)}
        testId="setting-high-contrast"
      />
      <Choice
        label={t('settings.readableFont')}
        scope={scope}
        value={s.readableFont}
        options={onOff()}
        onChange={(v) => set('readableFont', v)}
      />
      <Choice
        label={t('settings.reducedFlashing')}
        scope={scope}
        value={s.reducedFlashing}
        options={onOff()}
        onChange={(v) => set('reducedFlashing', v)}
        testId="setting-reduced-flashing"
      />
      <Choice
        label={t('settings.reducedShake')}
        scope={scope}
        value={s.reducedShake}
        options={onOff()}
        onChange={(v) => set('reducedShake', v)}
      />
      <Hint id="settings.presentationHint" />
    </>
  );
}

export function AudioPanel({ shell }: { shell: Shell }) {
  const s = shell.active.value!.settings;
  const set = useSetting(shell);
  const volume = (
    key: 'volumeMaster' | 'volumeMusic' | 'volumeEffects' | 'volumeVoice',
    label: TextId,
    first = false,
  ) => (
    <Choice
      label={t(label)}
      scope={t('scope.profile')}
      value={s[key]}
      options={VOLUMES.map((v) => ({ value: v, label: `${v} %` }))}
      onChange={(v) => set(key, v)}
      testId={`setting-${key}`}
      autofocus={first}
    />
  );
  return (
    <>
      {volume('volumeMaster', 'settings.volumeMaster', true)}
      {volume('volumeMusic', 'settings.volumeMusic')}
      {volume('volumeEffects', 'settings.volumeEffects')}
      {volume('volumeVoice', 'settings.volumeVoice')}
      <Hint id="settings.audioHint" />
    </>
  );
}

function DisplayPanel({ shell }: { shell: Shell }) {
  const d = shell.device.value;
  const scale = d?.uiScale ?? 100;
  const [pending, setPending] = useState<{ from: number; left: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPending(null);
  };
  const change = (v: number) => {
    const from = pending?.from ?? scale;
    shell.setUiScale(v);
    if (timer.current) clearInterval(timer.current);
    let left = 10;
    setPending({ from, left });
    timer.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        shell.setUiScale(from);
        stop();
      } else setPending({ from, left });
    }, 1000);
  };
  const q = shell.lab.quality.value.setting;
  return (
    <>
      <Choice
        label={t('settings.uiScale')}
        scope={t('scope.device')}
        value={scale}
        options={[80, 90, 100, 110, 125, 150].map((v) => ({ value: v, label: `${v} %` }))}
        onChange={change}
        testId="setting-ui-scale"
        autofocus
      />
      <Hint id="settings.uiScaleHint" />
      {pending ? (
        <div class="ffp-panel" data-testid="setting-ui-scale-confirm">
          <p>{t('settings.keepChange', { n: pending.left })}</p>
          <Button label={t('settings.keep')} onPress={stop} testId="setting-ui-scale-keep" />
          <Button
            label={t('settings.revert')}
            onPress={() => {
              shell.setUiScale(pending.from);
              stop();
            }}
          />
        </div>
      ) : null}
      <Choice
        label={t('settings.quality')}
        scope={t('scope.session')}
        value={q}
        options={[
          { value: 'auto' as QualitySetting, label: t('settings.qualityAuto') },
          { value: 'high' as QualitySetting, label: t('settings.qualityHigh') },
          { value: 'low' as QualitySetting, label: t('settings.qualityLow') },
        ]}
        onChange={(v) => shell.onQuality(v)}
        testId="setting-quality"
      />
      <Hint id="settings.qualityHint" />
    </>
  );
}

function LanguagePanel({ shell }: { shell: Shell }) {
  return (
    <>
      {LOCALES.map((l) => (
        <Button
          label={LOCALE_NAMES[l]}
          mark={l === locale.value ? '✓' : undefined}
          autofocus={l === locale.value}
          onPress={() => shell.setLanguage(l)}
          testId={`setting-language-${l}`}
        />
      ))}
      <p class="ffp-hint">
        {t('settings.languageHint')} <span class="ffp-scope">{t('scope.device')}</span>
      </p>
    </>
  );
}

/** Downloads text as a file (export of a backup). */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ProfilePanel({ shell }: { shell: Shell }) {
  const p = shell.active.value!;
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ text: string; info: ImportPreview } | null>(null);
  const [message, setMessage] = useState('');
  const [backups, setBackups] = useState<{ name: string; day: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void shell.store?.backups(p.id).then(setBackups);
  }, [p.id, p.updatedAt]);
  const where =
    shell.storage.value === 'server'
      ? t('settings.storageServer')
      : shell.storage.value === 'indexeddb'
        ? t('settings.storageBrowser')
        : t('settings.storageMemory');
  const readFile = async (file: File) => {
    const text = await file.text();
    const info = await shell.store!.previewImport(text);
    if (!info.ok) {
      setPreview(null);
      setMessage(t('settings.importBad', { reason: info.error ?? '' }));
    } else {
      setMessage('');
      setPreview({ text, info });
    }
  };
  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!preview) return;
    const how =
      mode === 'merge'
        ? ({ mode: 'merge' } as const)
        : ({
            mode: 'replace',
            ids: preview.info.profiles.filter((x) => x.id === p.id).map((x) => x.id),
          } as const);
    await shell.flushSave();
    await shell.store!.applyImport(preview.text, how);
    await shell.refreshProfiles();
    setPreview(null);
    setMessage(t('settings.importDone'));
  };
  return (
    <>
      <label class="ffp-btn" style={{ display: 'grid', gap: '6px' }}>
        <span>
          {t('settings.profileName')}
          <span class="ffp-scope">{t('scope.profile')}</span>
        </span>
        <input
          data-nav
          data-autofocus
          data-testid="setting-profile-name"
          value={p.name}
          maxLength={24}
          onChange={(e) => {
            const v = (e.currentTarget as HTMLInputElement).value.trim();
            if (v) shell.update((x) => (x.name = v));
          }}
          style={{
            font: 'inherit',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #888',
          }}
        />
      </label>
      <h3>{t('settings.profiles')}</h3>
      {shell.profiles.value.map((x) => (
        <div
          class="ffp-row"
          style={{ gap: '8px', alignItems: 'center' }}
          data-testid={`profile-row-${x.id}`}
        >
          <span style={{ flex: 1 }}>
            {x.name}
            {x.id === p.id ? ' ✓' : ''}
          </span>
          {x.id !== p.id ? (
            <button
              type="button"
              class="ffp-btn"
              data-nav
              style={{ width: 'auto' }}
              onClick={() => void shell.useProfile(x.id)}
            >
              {t('settings.useProfile')}
            </button>
          ) : null}
          <button
            type="button"
            class="ffp-btn"
            data-nav
            style={{ width: 'auto' }}
            data-testid={`profile-delete-${x.id}`}
            onClick={() => setConfirmDelete(x.id)}
          >
            {t('settings.deleteProfile')}
          </button>
        </div>
      ))}
      {confirmDelete ? (
        <div class="ffp-panel" data-testid="profile-confirm-delete">
          <p>
            {t('settings.confirmDelete', {
              name: shell.profiles.value.find((x) => x.id === confirmDelete)?.name ?? '',
            })}
          </p>
          <Button
            label={t('common.yes')}
            testId="profile-confirm-yes"
            onPress={() => {
              const id = confirmDelete;
              setConfirmDelete(null);
              void shell.deleteProfile(id);
            }}
          />
          <Button label={t('common.no')} autofocus onPress={() => setConfirmDelete(null)} />
        </div>
      ) : null}
      <div class="ffp-row" style={{ gap: '8px' }}>
        <input
          data-nav
          data-testid="profile-new-name"
          value={name}
          maxLength={24}
          placeholder={t('settings.newProfile')}
          onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
          style={{
            font: 'inherit',
            flex: 1,
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #888',
          }}
        />
        <button
          type="button"
          class="ffp-btn"
          data-nav
          style={{ width: 'auto' }}
          data-testid="profile-new"
          onClick={() => {
            if (!name.trim()) return;
            void shell.newProfile(name.trim());
            setName('');
          }}
        >
          {t('settings.newProfile')}
        </button>
      </div>
      <h3>{t('settings.backups')}</h3>
      {backups.length === 0 ? <p class="ffp-hint">{t('settings.noBackups')}</p> : null}
      {backups.map((b) => (
        <div class="ffp-row" style={{ gap: '8px', alignItems: 'center' }}>
          <span
            style={{ flex: 1 }}
          >{`${b.day.slice(0, 4)}-${b.day.slice(4, 6)}-${b.day.slice(6)}`}</span>
          <button
            type="button"
            class="ffp-btn"
            data-nav
            style={{ width: 'auto' }}
            onClick={async () => {
              await shell.flushSave();
              await shell.store!.restoreBackup(b.name);
              await shell.refreshProfiles();
              setMessage(t('settings.restored'));
            }}
          >
            {t('settings.restore')}
          </button>
        </div>
      ))}
      <Button
        label={t('settings.export')}
        testId="profile-export"
        onPress={async () => {
          await shell.flushSave();
          const text = await shell.store!.exportBackup();
          const stamp = new Date().toISOString().slice(0, 10);
          download(`fight-for-peace-${stamp}.ffpsave`, text);
        }}
      />
      <Hint id="settings.exportHint" />
      <Button
        label={t('settings.import')}
        testId="profile-import"
        onPress={() => fileRef.current?.click()}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".ffpsave,application/json"
        data-testid="profile-import-file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = (e.currentTarget as HTMLInputElement).files?.[0];
          if (f) void readFile(f);
          (e.currentTarget as HTMLInputElement).value = '';
        }}
      />
      <Hint id="settings.importHint" />
      {preview ? (
        <div class="ffp-panel" data-testid="profile-import-preview">
          <p>
            {t('settings.importPreview', {
              date: new Date(preview.info.exportedAt ?? 0).toLocaleString(locale.value),
              version: preview.info.gameVersion ?? '?',
            })}
          </p>
          <ul>
            {preview.info.profiles.map((x) => (
              <li>
                {x.name} ({x.exists ? t('settings.importExists') : t('settings.importNew')})
              </li>
            ))}
          </ul>
          <Button
            label={t('settings.importMerge')}
            testId="profile-import-merge"
            autofocus
            onPress={() => void applyImport('merge')}
          />
          {preview.info.profiles.some((x) => x.id === p.id) ? (
            <Button
              label={t('settings.importReplace')}
              testId="profile-import-replace"
              onPress={() => void applyImport('replace')}
            />
          ) : null}
          <Button label={t('common.cancel')} onPress={() => setPreview(null)} />
        </div>
      ) : null}
      {message ? (
        <p data-testid="profile-message" class="ffp-hint">
          {message}
        </p>
      ) : null}
      <p class="ffp-hint" data-testid="profile-storage">
        {t('settings.storage', { where })}
      </p>
    </>
  );
}

export function CategoryPanel({ shell, category }: { shell: Shell; category: Category }) {
  void locale.value;
  if (!shell.active.value) return null;
  switch (category) {
    case 'gameplay':
      return <GameplayPanel shell={shell} />;
    case 'controls':
      return <ControlsPanel shell={shell} />;
    case 'accessibility':
      return <AccessibilityPanel shell={shell} />;
    case 'audio':
      return <AudioPanel shell={shell} />;
    case 'display':
      return <DisplayPanel shell={shell} />;
    case 'language':
      return <LanguagePanel shell={shell} />;
    case 'profile':
      return <ProfilePanel shell={shell} />;
  }
}

/**
 * Settings (Module 16): a category rail and a content pane. Every setting names its scope
 * (Profile or Device); presentation settings say that the fight is unchanged.
 */
export function SettingsScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const category = shell.settingsCategory.value as Category;
  const [inPane, setInPane] = useState(false);
  const close = () => shell.go(shell.settingsFrom.value);
  useNav(() => (inPane ? setInPane(false) : close()));
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="settings">
      <div class="ffp-row" style={{ width: '90vw', gap: '18px', alignItems: 'flex-start' }}>
        <Panel style={{ width: '300px' }} testId="settings-rail">
          <h1 class="ffp-title">{t('settings.title')}</h1>
          {CATEGORIES.map((c) => (
            <button
              type="button"
              class="ffp-btn"
              data-nav
              data-autofocus={c === category && !inPane ? '' : undefined}
              data-testid={`settings-${c}`}
              style={{ borderColor: c === category ? 'var(--ffp-accent)' : undefined }}
              onFocus={() => {
                shell.settingsCategory.value = c;
                setInPane(false);
              }}
              onClick={() => {
                shell.settingsCategory.value = c;
                setInPane(true);
                requestAnimationFrame(() => {
                  const first = document.querySelector<HTMLElement>(
                    '[data-testid="settings-pane"] [data-nav]',
                  );
                  first?.focus();
                });
              }}
            >
              {t(`settings.${c}` as TextId)}
            </button>
          ))}
          <Button label={t('common.back')} onPress={close} testId="settings-back" />
        </Panel>
        <Panel style={{ flex: 1, maxHeight: '86vh', overflow: 'auto' }} testId="settings-pane">
          <h2>{t(`settings.${category}` as TextId)}</h2>
          <CategoryPanel shell={shell} category={category} />
        </Panel>
      </div>
    </Screen>
  );
}

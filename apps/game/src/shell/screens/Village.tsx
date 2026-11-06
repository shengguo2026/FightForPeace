import { useState } from 'preact/hooks';
import { locale, difficultyName, stageName, t } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, MenuIcon, Panel, Screen, hoverFocus } from '../ui';
import { AssetRegistry, STAGE1_TITLE_LOOP, STORE } from '@ffp/platform';

/** M13: the seamless Flow title loop behind the village menu (muted, decorative). */
const titleLoop = new AssetRegistry().video(STAGE1_TITLE_LOOP.clip);
import { itemName } from './Store';

type Item = 'continue' | 'play' | 'academy' | 'store' | 'records' | 'guide' | 'settings';

/**
 * The Hybrid Village Command Menu (Module 16): the illustrated village with a short focus
 * menu. Continue only appears with a saved checkpoint and then takes the default focus.
 */
export function VillageScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const p = shell.active.value;
  const cp = p?.checkpoint ?? null;
  const [focused, setFocused] = useState<Item>(cp ? 'continue' : 'play');
  useNav();
  const detail: Record<Item, string> = {
    continue: cp
      ? t('menu.continueDetail', {
          stage: stageName(cp.stage),
          beat: cp.beat + 1,
          difficulty: difficultyName(cp.difficulty),
        })
      : '',
    play: t('play.modeTitle'),
    academy: t('menu.academyDetail'),
    store: t('menu.storeDetail'),
    records: t('records.collection'),
    guide: t('menu.guideDetail'),
    settings: t('settings.title'),
  };
  const item = (
    id: Item,
    label: string,
    icon: number | null,
    onPress: () => void,
    sheet?: string,
  ) => (
    <button
      type="button"
      class="ffp-btn"
      data-nav
      data-autofocus={focused === id ? '' : undefined}
      data-testid={`menu-${id}`}
      onFocus={() => setFocused(id)}
      onMouseMove={hoverFocus}
      onClick={onPress}
      style={{ padding: '4px 14px', margin: '4px 0' }}
    >
      {icon !== null ? <MenuIcon index={icon} sheet={sheet} /> : null}
      <span style={{ fontSize: '22px' }}>{label}</span>
    </button>
  );
  const badgeItem = STORE.find((s) => s.id === p?.progress.badge);
  const badge = badgeItem ? itemName(badgeItem) : '';
  const storage =
    shell.storage.value === 'server'
      ? t('menu.storageServer')
      : shell.storage.value === 'indexeddb'
        ? t('menu.storageBrowser')
        : t('menu.storageMemory');
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="village">
      {titleLoop && p?.settings.cinematics !== 'stills' && !p?.settings.reducedFlashing ? (
        <video
          data-testid="title-loop"
          autoplay
          muted
          loop
          playsInline
          poster={ART('menu-bg')}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -2,
            pointerEvents: 'none',
          }}
        >
          <source src={titleLoop.video.webm} type="video/webm" />
          <source src={titleLoop.video.mp4} type="video/mp4" />
        </video>
      ) : null}
      <div class="ffp-row" style={{ width: '88vw', alignItems: 'flex-start' }}>
        <div class="ffp-col" style={{ width: '440px' }}>
          <h1
            data-testid="title-logo"
            style={{
              fontSize: '54px',
              margin: '0 0 10px',
              color: '#f7e2b0',
              textShadow: '0 3px 12px rgba(0,0,0,0.8)',
              letterSpacing: '0.03em',
            }}
          >
            {t('title.logo')}
          </h1>
          {cp
            ? item('continue', t('menu.continue'), 2, () => shell.continueRun(), 'icons-hud')
            : null}
          {item('play', t('menu.play'), 0, () => shell.startPlay())}
          {item('academy', t('menu.academy'), 1, () => shell.go('academy'))}
          {item('store', t('menu.store'), 2, () => shell.go('store'))}
          {item('records', t('menu.records'), 3, () => shell.go('records'))}
          {item('guide', t('menu.guide'), 4, () => {
            shell.guideFrom.value = 'village';
            shell.go('guide');
          })}
          {item('settings', t('menu.settings'), 5, () => {
            shell.settingsFrom.value = 'village';
            shell.go('settings');
          })}
        </div>
        <div class="ffp-col" style={{ marginLeft: 'auto', width: '420px', gap: '12px' }}>
          <Panel testId="menu-detail">
            <div style={{ fontSize: '22px', fontWeight: 600 }}>{detail[focused]}</div>
          </Panel>
          {shell.readOnly.value ? <Panel testId="menu-readonly">{t('menu.readOnly')}</Panel> : null}
          {shell.recovered.value ? <Panel>{t('menu.recovered')}</Panel> : null}
          {shell.storage.value === 'memory' ? <Panel>{t('menu.noStorage')}</Panel> : null}
        </div>
      </div>
      <div
        class="ffp-hint"
        style={{
          position: 'absolute',
          right: '4%',
          bottom: '14px',
          display: 'flex',
          gap: '24px',
          pointerEvents: 'none',
        }}
      >
        <span data-testid="menu-profile">
          {t('menu.profile', { name: p?.name ?? '—' })}
          {badge ? ` · ${badge}` : ''}
        </span>
        <span data-testid="menu-credits">
          {t('store.credits', { n: p?.progress.credits ?? 0 })}
        </span>
        <span data-testid="menu-storage">{storage}</span>
        <span>{t('menu.version', { v: shell.gameVersion })}</span>
      </div>
    </Screen>
  );
}

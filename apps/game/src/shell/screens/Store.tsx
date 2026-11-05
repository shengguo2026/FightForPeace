import { useState } from 'preact/hooks';
import { HEROES, type StoreItemDef } from '@ffp/sim';
import {
  ACHIEVEMENTS,
  STORE,
  buy,
  masteryLevel,
  setBadge,
  setTechnique,
  storeStatus,
  toggleGoal,
  wearOutfit,
  type Profile,
} from '@ffp/platform';
import { PromptText } from '../../ui/InputPrompt';
import { dt, heroName, locale, t, type TextId } from '../../text/i18n';
import type { Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Panel, Screen } from '../ui';
import { actionInput, ctx0 } from './Academy';

const GROUPS = ['technique', 'wardrobe', 'training', 'collection'] as const;

/** The display name of a store entry (technique: its move name). */
export function itemName(item: StoreItemDef): string {
  if (item.group === 'technique') {
    const a = HEROES.find((h) => h.id === item.hero)?.actions.find((x) => x.id === item.action);
    return a ? dt(`hero.${item.hero}.action.${a.id}`, a.name) : item.id;
  }
  return dt(`${item.id}.name`, item.name ?? item.id);
}

function equipped(p: Profile, item: StoreItemDef): boolean {
  if (item.kind === 'badge') return p.progress.badge === item.id;
  const eq = p.progress.equipped[item.hero ?? ''];
  if (item.kind === 'outfit') return eq?.outfit === item.id;
  return eq?.techniques.includes(item.id) ?? false;
}

/**
 * The Village Store (D10 slice): Techniques, Wardrobe, Training Hall and Collection.
 * Published prices, explicit purchases, no randomness; owned moves are equipped here and
 * in the briefing they show as the Open Loadout.
 */
export function StoreScreen({ shell }: { shell: Shell }) {
  void locale.value;
  useNav(() => shell.go('village'));
  const p = shell.active.value;
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('technique');
  const [focus, setFocus] = useState<string | null>(null);
  const ctx = ctx0(shell);
  if (!p) return null;
  const items = STORE.filter((s) => s.group === group);
  const visible = items.filter((s) => storeStatus(p, s) !== 'hidden');
  const hidden = items.length - visible.length;
  const sel = STORE.find((s) => s.id === focus);

  const press = (item: StoreItemDef) => {
    const st = storeStatus(p, item);
    if (st === 'owned') {
      const on = !equipped(p, item);
      shell.update((x) => {
        if (item.kind === 'badge') setBadge(x, on ? item.id : null);
        else if (item.kind === 'outfit') wearOutfit(x, item.hero!, on ? item.id : null);
        else setTechnique(x, item.hero!, item.id, on);
      });
      shell.showToast(
        on
          ? t('store.equippedNow', { name: itemName(item) })
          : t('store.removed', { name: itemName(item) }),
      );
      return;
    }
    if (st !== 'available') return;
    let result = '';
    if (p.guest) result = 'guest';
    else shell.update((x) => (result = buy(x, item.id)));
    if (result === 'ok')
      shell.showToast(t('store.bought', { name: itemName(item), n: item.price }));
    else if (result === 'credits')
      shell.showToast(t('store.notEnough', { n: item.price - p.progress.credits }));
    else if (result === 'guest') shell.showToast(t('store.guest'));
  };

  const status = (item: StoreItemDef) => {
    const st = storeStatus(p, item);
    if (st === 'owned') return equipped(p, item) ? t('store.equipped') : t('store.owned');
    if (st === 'locked') return t('store.locked');
    return t('store.price', { n: item.price });
  };

  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="store">
      <div class="ffp-row" style={{ width: '90vw', alignItems: 'flex-start' }}>
        <Panel style={{ width: '560px', maxHeight: '88vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h1 class="ffp-title">{t('menu.store')}</h1>
            <b data-testid="store-credits">{t('store.credits', { n: p.progress.credits })}</b>
          </div>
          <div class="ffp-row" style={{ gap: '6px' }}>
            {GROUPS.map((g) => (
              <Button
                label={t(`store.group.${g}` as TextId)}
                testId={`store-group-${g}`}
                mark={group === g ? '●' : ''}
                autofocus={g === group}
                onPress={() => setGroup(g)}
              />
            ))}
          </div>
          {visible.length === 0 && hidden === 0 ? (
            <p data-testid="store-empty">{t(`store.empty.${group}` as TextId)}</p>
          ) : null}
          {visible.map((item) => (
            <Button
              label={itemName(item)}
              detail={item.hero ? heroName(item.hero) : t('store.profileWide')}
              mark={
                <span data-testid={`store-status-${item.id.split('.').pop()}`}>
                  {p.progress.goals.includes(item.id) ? '★ ' : ''}
                  {status(item)}
                </span>
              }
              testId={`store-item-${item.id.split('.').pop()}`}
              onFocus={() => setFocus(item.id)}
              onPress={() => press(item)}
            />
          ))}
          {hidden > 0 ? <p class="ffp-hint">{t('store.hiddenMore', { n: hidden })}</p> : null}
          {p.guest ? <p class="ffp-hint">{t('store.guest')}</p> : null}
          <Button label={t('common.back')} onPress={() => shell.go('village')} />
        </Panel>
        <Panel style={{ flex: 1, marginLeft: 'auto', maxWidth: '540px' }} testId="store-detail">
          {sel ? (
            <StoreDetail shell={shell} p={p} item={sel} ctx={ctx} />
          ) : (
            <>
              <p>{t('store.intro')}</p>
              <p class="ffp-hint">{t('store.earn')}</p>
            </>
          )}
        </Panel>
      </div>
    </Screen>
  );
}

function StoreDetail({
  shell,
  p,
  item,
  ctx,
}: {
  shell: Shell;
  p: Profile;
  item: StoreItemDef;
  ctx: ReturnType<typeof ctx0>;
}) {
  const st = storeStatus(p, item);
  const kit = item.hero ? HEROES.find((h) => h.id === item.hero) : undefined;
  const a = kit?.actions.find((x) => x.id === item.action);
  const req = item.requires ? ACHIEVEMENTS.find((x) => x.id === item.requires) : undefined;
  const lvl = item.hero ? masteryLevel(p.progress.mastery[item.hero] ?? 0) : 0;
  return (
    <div data-testid="store-preview">
      <h2 style={{ marginTop: 0 }}>{itemName(item)}</h2>
      {a && ctx ? (
        <p>
          {t(item.kind === 'ultimate' ? 'store.kind.ultimate' : 'store.kind.special')} ·{' '}
          <PromptText text={actionInput(a)} ctx={ctx} />
        </p>
      ) : null}
      {item.kind === 'outfit' ? (
        <p>
          {t('store.kind.outfit')}{' '}
          <span
            style={{
              display: 'inline-block',
              width: '28px',
              height: '18px',
              verticalAlign: 'middle',
              borderRadius: '4px',
              background: item.tint ?? '#fff',
            }}
          />
        </p>
      ) : null}
      {item.kind === 'badge' ? <p>{t('store.kind.badge')}</p> : null}
      <p>{t('store.price', { n: item.price })}</p>
      {item.mastery > 0 && item.hero ? (
        <p class="ffp-hint">
          {t('store.masteryPath', { level: item.mastery, hero: heroName(item.hero), now: lvl })}
        </p>
      ) : null}
      {req && st === 'locked' ? (
        <p class="ffp-hint">{t('store.requires', { name: dt(`${req.id}.name`, req.name) })}</p>
      ) : null}
      {item.group === 'technique' ? <p class="ffp-hint">{t('store.openLoadout')}</p> : null}
      {st !== 'owned' ? (
        <Button
          label={p.progress.goals.includes(item.id) ? t('store.unmarkGoal') : t('store.markGoal')}
          testId="store-goal"
          onPress={() => shell.update((x) => toggleGoal(x, item.id))}
        />
      ) : null}
    </div>
  );
}

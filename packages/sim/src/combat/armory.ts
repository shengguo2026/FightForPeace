import { WEAPON_DATA } from './heroes.gen';
import type { ActionDef, HeroDef, InputContext, WeaponDef } from './types';

/**
 * The weapon registry (spec §11, F&D §7.1): Stage 1's Canal Workstaff and Iron Gate
 * Handwheel first, then the other weapon files. Weapons are data; later content packages
 * (and tests) register more with registerWeapon.
 */
const REGISTRY: WeaponDef[] = [...WEAPON_DATA];
export const WEAPONS: readonly WeaponDef[] = REGISTRY;

/** Adds a weapon definition and returns its index. Never removes or reorders. */
export function registerWeapon(def: WeaponDef): number {
  const known = REGISTRY.findIndex((w) => w.id === def.id);
  if (known !== -1) return known;
  REGISTRY.push(def);
  return REGISTRY.length - 1;
}

export function weaponIndex(id: string): number {
  const i = REGISTRY.findIndex((w) => w.id === id);
  if (i === -1) throw new Error(`unknown weapon "${id}"`);
  return i;
}

/** Contexts of the ordinary Attack graph that a melee weapon's core replaces. */
const ATTACK_CONTEXTS: readonly InputContext[] = [
  'neutral',
  'chain',
  'air',
  'groundFocus',
  'dash',
  'dashLow',
];

const cache = new Map<string, HeroDef>();

/**
 * Weapon Core with Hero-Affinity Overrides: the holder's kit with the weapon's actions
 * appended (after every own action, so every own action index stays valid). A melee core
 * replaces the ordinary Attack graph: those actions stay in the kit but no input selects
 * them. The holder's affinity entries replace single core actions.
 */
export function armedKit(base: HeroDef, kitKey: string, weapon: number): HeroDef {
  const key = `${kitKey}/${weapon}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = REGISTRY[weapon]!;
  const off = base.actions.length;
  const overrides = new Map(
    (w.affinity.find((x) => x.hero === base.id)?.actions ?? []).map((o) => [o.replaces, o.action]),
  );
  // Any other core takes over only the exact inputs it defines (a revolver's neutral shot).
  const taken = (a: ActionDef) =>
    w.actions.some(
      (c) => c.context === a.context && c.dir === a.dir && c.context !== 'weaponThrow',
    );
  const own = base.actions.map((a): ActionDef =>
    (w.melee && ATTACK_CONTEXTS.includes(a.context)) || (!w.melee && taken(a))
      ? { ...a, context: 'script' }
      : a,
  );
  const core = w.actions.map((a, i): ActionDef => {
    const src = overrides.get(i) ?? a;
    return {
      ...src,
      links: src.links.map((l) => (l.kind === 'action' ? { ...l, to: l.to + off } : l)),
    };
  });
  const kit: HeroDef = { ...base, actions: [...own, ...core], recipes: base.recipes };
  cache.set(key, kit);
  return kit;
}

/** Index of the first weapon action in an armed kit (the own kit's length). */
export function weaponActionBase(base: HeroDef): number {
  return base.actions.length;
}

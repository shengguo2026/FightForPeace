import type { Bindings, DeviceId, PadSnapshot } from '@ffp/platform';
import { PAD_BUTTONS, stickDirection } from '@ffp/platform';

/**
 * M10 menu navigation (Module 16: keyboard, gamepad and pointer operate every shell
 * screen; a mouse is never required). Each keyboard half and each gamepad produces its
 * own events, so split screens (lobby, hero selection) can give every player a panel.
 *
 * Protected controls: besides each player's own bindings (movement, Attack or Jump to
 * confirm, Pause to go back), the arrows, Enter, Space, Escape and Backspace always
 * navigate, so a bad remap can never leave the menus unusable.
 */
export type NavDir = 'up' | 'down' | 'left' | 'right';
export interface NavEvent {
  source: DeviceId;
  dir?: NavDir;
  confirm?: boolean;
  back?: boolean;
}

const FIXED: Record<string, Omit<NavEvent, 'source'>> = {
  ArrowUp: { dir: 'up' },
  ArrowDown: { dir: 'down' },
  ArrowLeft: { dir: 'left' },
  ArrowRight: { dir: 'right' },
  Enter: { confirm: true },
  NumpadEnter: { confirm: true },
  Space: { confirm: true },
  Escape: { back: true },
  Backspace: { back: true },
};

function fromBindings(b: Bindings, code: string): Omit<NavEvent, 'source'> | null {
  const has = (k: keyof Bindings['codes']) => b.codes[k].includes(code);
  if (has('up')) return { dir: 'up' };
  if (has('down')) return { dir: 'down' };
  if (has('left')) return { dir: 'left' };
  if (has('right')) return { dir: 'right' };
  if (has('Attack') || has('Jump')) return { confirm: true };
  if (has('Pause')) return { back: true };
  return null;
}

/**
 * The menu event for a key: the keyboard half whose bindings use the key, else the fixed
 * menu keys (credited to `kb:p2` when its bindings use that key, as the arrows are).
 */
export function keyNav(code: string, p1: Bindings, p2: Bindings): NavEvent | null {
  const a = fromBindings(p1, code);
  if (a) return { source: 'kb:p1', ...a };
  const b = fromBindings(p2, code);
  if (b) return { source: 'kb:p2', ...b };
  const f = FIXED[code];
  return f ? { source: 'kb:p1', ...f } : null;
}

const BUTTON = (name: (typeof PAD_BUTTONS)[number]) => PAD_BUTTONS.indexOf(name);

/** Edge-detected menu events from gamepad snapshots (D-pad, left stick, South, East, Start). */
export class PadNav {
  private last = new Map<number, Set<string>>();

  poll(pads: readonly (PadSnapshot | null)[]): NavEvent[] {
    const out: NavEvent[] = [];
    const seen = new Set<number>();
    for (const p of pads) {
      if (!p || !p.connected) continue;
      seen.add(p.index);
      const now = new Set<string>();
      const b = (n: (typeof PAD_BUTTONS)[number]) => p.buttons[BUTTON(n)] === true;
      const [sx, sy] = stickDirection(p.axes[0] ?? 0, p.axes[1] ?? 0, 0.5);
      if (b('DpadUp') || sy < 0) now.add('up');
      if (b('DpadDown') || sy > 0) now.add('down');
      if (b('DpadLeft') || sx < 0) now.add('left');
      if (b('DpadRight') || sx > 0) now.add('right');
      if (b('South')) now.add('confirm');
      if (b('East') || b('Start')) now.add('back');
      const before = this.last.get(p.index) ?? new Set<string>();
      const source = `pad:${p.index}` as const;
      for (const k of now) {
        if (before.has(k)) continue;
        if (k === 'confirm') out.push({ source, confirm: true });
        else if (k === 'back') out.push({ source, back: true });
        else out.push({ source, dir: k as NavDir });
      }
      this.last.set(p.index, now);
    }
    for (const i of [...this.last.keys()]) if (!seen.has(i)) this.last.delete(i);
    return out;
  }

  /** Forget held buttons (a screen change must not repeat a held confirm). */
  reset(pads: readonly (PadSnapshot | null)[]): void {
    this.poll(pads);
  }
}

/**
 * Spatial focus: moves DOM focus to the nearest `[data-nav]` element inside `root` in the
 * direction pressed. Elements with `data-adjust` take left/right themselves (sliders,
 * choices) through an `adjust` event with `detail` -1 or +1.
 */
export function moveFocus(root: HTMLElement, dir: NavDir): void {
  const items = [...root.querySelectorAll<HTMLElement>('[data-nav]')].filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
  );
  if (items.length === 0) return;
  const current = document.activeElement as HTMLElement | null;
  if (!current || !items.includes(current)) {
    items[0]!.focus();
    return;
  }
  if ((dir === 'left' || dir === 'right') && current.hasAttribute('data-adjust')) {
    current.dispatchEvent(new CustomEvent('adjust', { detail: dir === 'left' ? -1 : 1 }));
    return;
  }
  const r = current.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of items) {
    if (el === current) continue;
    const e = el.getBoundingClientRect();
    const ex = e.left + e.width / 2;
    const ey = e.top + e.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;
    const along = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
    const across = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
    if (along <= 1) continue;
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) best.focus();
  else if (dir === 'up' || dir === 'down') {
    // Wrap around in vertical lists.
    const sorted = [...items].sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    );
    (dir === 'down' ? sorted[0] : sorted[sorted.length - 1])!.focus();
  }
}

/** Focuses the element marked `data-autofocus`, else the first `[data-nav]`. */
export function focusFirst(root: HTMLElement): void {
  const el =
    root.querySelector<HTMLElement>('[data-autofocus]') ??
    root.querySelector<HTMLElement>('[data-nav]');
  el?.focus();
}

/**
 * The open screen's handlers. `onEvent` sees every event first (split screens use the
 * source); returning true consumes it. Otherwise directions move the focus, confirm
 * presses the focused item and back calls `onBack`.
 */
export interface NavHandlers {
  onEvent?: (e: NavEvent) => boolean;
  onBack?: () => void;
}

const stack: NavHandlers[] = [];

/** Registers handlers while a screen or overlay is open (the last one opened wins). */
export function pushNav(h: NavHandlers): () => void {
  stack.push(h);
  return () => {
    const i = stack.lastIndexOf(h);
    if (i >= 0) stack.splice(i, 1);
  };
}

export function dispatchNav(e: NavEvent): void {
  const h = stack[stack.length - 1];
  if (h?.onEvent?.(e)) return;
  const roots = document.querySelectorAll<HTMLElement>('[data-shell-screen]');
  const root = roots[roots.length - 1];
  if (e.back) {
    h?.onBack?.();
    return;
  }
  if (!root) return;
  if (e.dir) moveFocus(root, e.dir);
  else if (e.confirm) {
    const el = document.activeElement as HTMLElement | null;
    if (el && root.contains(el) && el.hasAttribute('data-nav')) el.click();
    else focusFirst(root);
  }
}

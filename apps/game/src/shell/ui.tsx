import type { CSSProperties } from 'preact';
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { focusFirst } from './nav';

/** Shell art (tools/art/import_shell_art.py); paths are relative, so any port works. */
export const ART = (name: string) => `art/shell/${name}.webp`;

export const SHELL_CSS = `
:root { --ffp-ui-scale: 1; --ffp-hud-scale: 1; --ffp-accent: #f2c36b; --ffp-panel: rgba(16,18,24,0.86); }
.ffp-shell { position: absolute; inset: 0; font: 20px/1.45 system-ui, 'Microsoft YaHei', 'PingFang SC', sans-serif; color: #f4efe6; zoom: var(--ffp-ui-scale); }
.ffp-readable .ffp-shell, .ffp-readable .ffp-hud { font-family: Verdana, 'Atkinson Hyperlegible', 'Microsoft YaHei', sans-serif; letter-spacing: 0.02em; }
.ffp-screen { position: absolute; inset: 0; isolation: isolate; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0b0d12 center/cover no-repeat; overflow: auto; }
.ffp-dim::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(8,9,12,0.88) 0%, rgba(8,9,12,0.55) 45%, rgba(8,9,12,0.15) 100%); pointer-events: none; }
.ffp-panel { position: relative; background: var(--ffp-panel); border: 1px solid rgba(255,255,255,0.16); border-radius: 10px; padding: 22px 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.45); }
.ffp-title { font-size: 34px; font-weight: 700; margin: 0 0 12px; letter-spacing: 0.02em; }
.ffp-sub { opacity: 0.8; margin: 0 0 16px; }
.ffp-btn { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; font: inherit; color: inherit; background: rgba(255,255,255,0.06); border: 2px solid transparent; border-radius: 8px; padding: 10px 16px; margin: 6px 0; cursor: pointer; }
.ffp-btn:hover { background: rgba(255,255,255,0.12); }
.ffp-btn:focus, .ffp-btn:focus-visible { outline: none; border-color: var(--ffp-accent); background: rgba(242,195,107,0.18); }
.ffp-btn[disabled] { opacity: 0.45; cursor: default; }
.ffp-btn .ffp-mark { margin-left: auto; opacity: 0.85; font-size: 0.85em; }
.ffp-choice { display: grid; grid-template-columns: 1fr auto; align-items: center; }
.ffp-choice .ffp-value { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.ffp-scope { display: inline-block; font-size: 0.7em; padding: 1px 8px; border-radius: 99px; border: 1px solid currentColor; opacity: 0.8; margin-left: 10px; }
.ffp-hint { font-size: 0.85em; opacity: 0.75; }
.ffp-table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; }
.ffp-table th, .ffp-table td { text-align: left; vertical-align: top; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.12); }
.ffp-table th { font-weight: 600; white-space: nowrap; }
.ffp-table tr[data-ok='false'] td { color: #ffb38a; }
.ffp-toast { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); background: var(--ffp-panel); border: 1px solid var(--ffp-accent); border-radius: 8px; padding: 8px 18px; z-index: 50; }
.ffp-row { display: flex; gap: 18px; align-items: stretch; }
.ffp-col { display: flex; flex-direction: column; }
.ffp-icon { width: 56px; height: 56px; flex: none; background-repeat: no-repeat; background-size: 300% 200%; }
.ffp-contrast .ffp-shell, .ffp-contrast .ffp-hud { --ffp-panel: rgba(0,0,0,0.96); --ffp-accent: #ffe14d; }
.ffp-contrast .ffp-btn { border-color: rgba(255,255,255,0.5); }
.ffp-contrast .ffp-btn:focus { border-color: #ffe14d; background: #33300a; }
.ffp-caption { font-size: 26px; line-height: 1.5; padding: 10px 18px; border-radius: 8px; max-width: 1100px; text-align: center; }
.ffp-subtitle-bg .ffp-caption { background: rgba(0,0,0,0.72); }
[data-subtitle-size='small'] .ffp-caption { font-size: 20px; }
[data-subtitle-size='large'] .ffp-caption { font-size: 34px; }
.ffp-hud { position: absolute; inset: 0; pointer-events: none; font: 18px/1.3 system-ui, 'Microsoft YaHei', sans-serif; color: #f4efe6; zoom: var(--ffp-ui-scale); }
.ffp-cluster { position: absolute; top: 14px; display: flex; gap: 10px; align-items: flex-start; transform-origin: top left; transform: scale(var(--ffp-hud-scale)); background: rgba(10,12,16,0.62); border-radius: 10px; padding: 8px 12px; }
.ffp-cluster.right { right: 14px; flex-direction: row-reverse; transform-origin: top right; text-align: right; }
.ffp-cluster.left { left: 14px; }
.ffp-bar { position: relative; height: 14px; width: 260px; background: rgba(255,255,255,0.14); border-radius: 4px; overflow: hidden; margin: 3px 0; }
.ffp-bar > div { height: 100%; }
.ffp-contrast .ffp-bar { outline: 2px solid #fff; }
`;

/**
 * Pointer hover moves the focus, but only for a real pointer movement: a screen that
 * opens under a resting pointer keeps its default focus.
 */
export function hoverFocus(e: MouseEvent): void {
  if (e.movementX === 0 && e.movementY === 0) return;
  const el = e.currentTarget as HTMLElement;
  if (document.activeElement !== el) el.focus();
}

let styled = false;
export function injectShellStyles(): void {
  if (styled) return;
  styled = true;
  const el = document.createElement('style');
  el.textContent = SHELL_CSS;
  document.head.appendChild(el);
}

/** A full-screen shell page; focuses its first item (or `data-autofocus`) when it opens. */
export function Screen({
  bg,
  dim,
  children,
  testId,
  align = 'center',
}: {
  bg?: string;
  dim?: boolean;
  children: ComponentChildren;
  testId?: string;
  align?: 'center' | 'start';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    focusFirst(root);
    // The page may still be settling (the screen it replaces gives up focus after this
    // commit): try once more if nothing inside this screen holds the focus.
    const id = setTimeout(() => {
      if (!root.contains(document.activeElement)) focusFirst(root);
    }, 0);
    return () => clearTimeout(id);
  }, []);
  return (
    <div
      ref={ref}
      class={`ffp-screen${dim ? ' ffp-dim' : ''}`}
      data-shell-screen
      data-testid={testId}
      style={{
        backgroundImage: bg ? `url(${bg})` : undefined,
        alignItems: align === 'start' ? 'flex-start' : 'center',
        padding: align === 'start' ? '0 0 0 6%' : undefined,
      }}
    >
      {children}
    </div>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  autofocus,
  mark,
  icon,
  testId,
  detail,
  onFocus,
}: {
  label: ComponentChildren;
  onPress: () => void;
  disabled?: boolean;
  autofocus?: boolean;
  mark?: ComponentChildren;
  icon?: number;
  testId?: string;
  detail?: ComponentChildren;
  onFocus?: () => void;
}) {
  return (
    <button
      type="button"
      class="ffp-btn"
      data-nav
      data-autofocus={autofocus ? '' : undefined}
      data-testid={testId}
      disabled={disabled}
      onClick={() => !disabled && onPress()}
      onFocus={onFocus}
      onMouseMove={hoverFocus}
    >
      {icon !== undefined ? <MenuIcon index={icon} /> : null}
      <span class="ffp-col">
        <span>{label}</span>
        {detail ? <span class="ffp-hint">{detail}</span> : null}
      </span>
      {mark ? <span class="ffp-mark">{mark}</span> : null}
    </button>
  );
}

/** One of the six cells (3 × 2) of a 768 × 512 icon sheet. */
export function MenuIcon({ index, sheet = 'icons-menu' }: { index: number; sheet?: string }) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return (
    <span
      class="ffp-icon"
      aria-hidden="true"
      style={{
        backgroundImage: `url(${ART(sheet)})`,
        backgroundPosition: `${col * 50}% ${row * 100}%`,
      }}
    />
  );
}

/**
 * A setting with a value that changes with left / right (or a click, which steps forward).
 * Shows the scope (Profile, Device, Session, Assisted) beside its name.
 */
export function Choice<T>({
  label,
  value,
  options,
  onChange,
  scope,
  testId,
  onFocus,
  autofocus,
}: {
  label: ComponentChildren;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  scope?: string;
  testId?: string;
  onFocus?: () => void;
  autofocus?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const i = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const step = (d: number) => {
    const n = options.length;
    onChange(options[(i + d + n) % n]!.value);
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = (e: Event) => step((e as CustomEvent<number>).detail);
    el.addEventListener('adjust', h);
    return () => el.removeEventListener('adjust', h);
  });
  return (
    <button
      ref={ref}
      type="button"
      class="ffp-btn ffp-choice"
      data-nav
      data-adjust
      data-autofocus={autofocus ? '' : undefined}
      data-testid={testId}
      data-value={String(value)}
      onClick={() => step(1)}
      onFocus={onFocus}
      onMouseMove={hoverFocus}
    >
      <span>
        {label}
        {scope ? <span class="ffp-scope">{scope}</span> : null}
      </span>
      <span class="ffp-value">
        ‹ <span>{options[i]?.label}</span> ›
      </span>
    </button>
  );
}

export function Panel({
  children,
  style,
  testId,
  scrollLabel,
}: {
  children: ComponentChildren;
  style?: CSSProperties;
  testId?: string;
  /** M23: a panel that scrolls is a named region the keyboard can reach and scroll. */
  scrollLabel?: string;
}) {
  const scroll = scrollLabel
    ? { tabIndex: 0, role: 'region' as const, 'aria-label': scrollLabel }
    : {};
  return (
    <div class="ffp-panel" style={style} data-testid={testId} {...scroll}>
      {children}
    </div>
  );
}

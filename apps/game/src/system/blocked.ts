import { pickLocale, type CapabilityReport } from '@ffp/platform';
import { setLocale, t, type TextId } from '../text/i18n';
import { BROWSER } from './probe';

/** The page a browser sees when it lacks a required capability (no game starts). */
export function showBlocked(report: CapabilityReport): void {
  setLocale(pickLocale(navigator.languages ?? []));
  const root = document.getElementById('lab') ?? document.body;
  const box = document.createElement('main');
  box.setAttribute('data-testid', 'blocked');
  box.setAttribute('role', 'alert');
  box.style.cssText =
    'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;background:#0b0d12;color:#f4efe6;font:20px/1.5 system-ui,sans-serif;text-align:center';
  const h = document.createElement('h1');
  h.textContent = t('system.blocked.title');
  box.append(h);
  for (const id of report.blocking) {
    const p = document.createElement('p');
    p.setAttribute('data-testid', `blocked-${id}`);
    p.textContent = `${t(`system.cap.${id}` as TextId)}: ${t(`system.blocked.${id}` as TextId)}`;
    box.append(p);
  }
  const hint = document.createElement('p');
  hint.textContent = t('system.blocked.hint', { browser: BROWSER });
  box.append(hint);
  root.append(box);
}

import { useEffect, useState } from 'preact/hooks';
import { t, type TextId } from '../../text/i18n';
import type { Shell } from '../shell';
import { BROWSER, capabilities, perf } from '../../system/probe';
import { Button } from '../ui';

/**
 * M14 System check (spec §2 capability gates, §18.3): the browser, each capability with
 * what a missing one switches off, and the performance measurements of the last play.
 */
export function SystemCheckPanel({ shell }: { shell: Shell }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  const storage = shell.storage.value;
  const q = shell.lab.quality.value;
  const p = perf.snapshot();
  const level = (v: string) =>
    t(`settings.quality${v[0]!.toUpperCase()}${v.slice(1)}` as TextId);
  return (
    <div data-testid="system-check">
      <p class="ffp-hint">{t('system.intro')}</p>
      <p data-testid="system-browser">
        {t('system.browser', { browser: BROWSER })} · {t('system.version', { version: __FFP_VERSION__ })}
      </p>
      <table class="ffp-table" data-testid="system-caps">
        <tbody>
          {capabilities.results.map((r) => {
            // Saving is decided by the backend that actually opened.
            const ok = r.id === 'storage' ? storage !== 'memory' : r.ok;
            const via =
              r.id === 'storage'
                ? storage === 'memory'
                  ? null
                  : storage === 'server'
                    ? 'server'
                    : 'indexeddb'
                : r.via;
            const viaText =
              via && ['webgl', 'canvas', 'webm', 'mp4', 'indexeddb', 'server'].includes(via)
                ? t(`system.via.${via}` as TextId)
                : null;
            return (
              <tr data-testid={`system-cap-${r.id}`} data-ok={String(ok)}>
                <th scope="row">{t(`system.cap.${r.id}` as TextId)}</th>
                <td>
                  {ok ? t('system.ok') : t('system.missing')}
                  {viaText ? ` · ${viaText}` : ''}
                  {r.required ? <span class="ffp-scope">{t('system.required')}</span> : null}
                  {!ok && !r.required
                    ? r.affects.map((f) => (
                        <div class="ffp-hint">{t(`system.feature.${f}.off` as TextId)}</div>
                      ))
                    : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3>{t('system.perf.title')}</h3>
      <div data-testid="system-perf">
        <p>{t('system.perf.level', { level: level(q.level), setting: level(q.setting) })}</p>
        {p.frames === 0 ? (
          <p class="ffp-hint">{t('system.perf.none')}</p>
        ) : (
          <>
            <p>{t('system.perf.frame', { mean: p.meanMs, p95: p.p95Ms })}</p>
            <p>{t('system.perf.sim', { hz: Math.round(p.simHz), step: p.stepMs })}</p>
            <p>{t('system.perf.capped', { n: p.capped })}</p>
          </>
        )}
      </div>
      <Button
        label={t('system.perf.reset')}
        onPress={() => perf.reset()}
        testId="system-perf-reset"
      />
    </div>
  );
}

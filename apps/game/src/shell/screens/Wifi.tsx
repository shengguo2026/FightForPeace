import { useLayoutEffect, useState } from 'preact/hooks';
import { DIFFICULTIES } from '@ffp/sim';
import { difficultyName, heroName, locale, stageName, t, type TextId } from '../../text/i18n';
import { PLAYER_COLORS, PromptText } from '../../ui/InputPrompt';
import { DEFAULT_ROOM_PORT } from '../../net/netplay';
import { HERO_ROSTER, type Shell } from '../shell';
import { useNav } from '../hooks';
import { ART, Button, Choice, Panel, Screen } from '../ui';

const INPUT = {
  font: 'inherit',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #888',
  width: '100%',
  boxSizing: 'border-box',
} as const;

function ctxOf(shell: Shell) {
  return shell.lab.players.value[0]!.ctx;
}

function ErrorLine({ shell }: { shell: Shell }) {
  const e = shell.net.error.value;
  if (!e) return null;
  return (
    <p data-testid="wifi-error" style={{ color: '#ff9c7a' }}>
      {t(`wifi.error.${e}` as TextId)}
    </p>
  );
}

/**
 * M12 Wi-Fi co-op: host a room (this computer's LAN address, port and room code, with the
 * firewall hint) or join one (address, port, code). The network lobby follows.
 */
export function WifiScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const net = shell.net;
  const status = net.status.value;
  const room = net.room.value;
  const [joining, setJoining] = useState(false);
  const [address, setAddress] = useState(() => localStorage.getItem('ffp.wifi.address') ?? '');
  const [port, setPort] = useState(String(DEFAULT_ROOM_PORT));
  const [code, setCode] = useState('');
  const back = () => {
    if (status !== 'idle') net.leave();
    else if (joining) setJoining(false);
    else shell.go('mode');
  };
  useNav(back);
  useLayoutEffect(() => {
    if (status === 'lobby') shell.go('netLobby');
  }, [status]);
  const join = () => {
    try {
      localStorage.setItem('ffp.wifi.address', address.trim());
    } catch {
      // private window: nothing remembered
    }
    void net.join(address, Number(port) || DEFAULT_ROOM_PORT, code);
  };
  const hosting = status === 'hosting' || status === 'opening';
  return (
    <Screen bg={ART('menu-bg')} dim align="start" testId="wifi">
      <Panel style={{ width: '720px' }}>
        <h1 class="ffp-title">{t('wifi.title')}</h1>
        {hosting ? (
          <div data-testid="wifi-hosting">
            {status === 'opening' || !room ? (
              <p>{t('wifi.opening')}</p>
            ) : (
              <>
                <p>{t('wifi.hosting')}</p>
                <table style={{ fontSize: '28px', margin: '8px 0 12px' }}>
                  <tr>
                    <td style={{ paddingRight: '18px' }}>{t('wifi.address')}</td>
                    <td data-testid="wifi-host-address">
                      <b>{room.addresses[0] ?? '—'}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>{t('wifi.port')}</td>
                    <td data-testid="wifi-host-port">
                      <b>{room.port}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>{t('wifi.code')}</td>
                    <td data-testid="wifi-host-code">
                      <b style={{ letterSpacing: '0.2em', color: 'var(--ffp-accent)' }}>
                        {room.code}
                      </b>
                    </td>
                  </tr>
                </table>
                {room.addresses.length === 0 ? (
                  <p class="ffp-hint">{t('wifi.noAddress')}</p>
                ) : room.addresses.length > 1 ? (
                  <p class="ffp-hint">
                    {t('wifi.otherAddresses', { list: room.addresses.slice(1).join(', ') })}
                  </p>
                ) : null}
                <p class="ffp-hint" data-testid="wifi-firewall">
                  {t('wifi.firewall')}
                </p>
                <p>{t('wifi.waitingGuest')}</p>
              </>
            )}
            <ErrorLine shell={shell} />
            <Button label={t('wifi.cancel')} onPress={() => net.leave()} testId="wifi-cancel" />
          </div>
        ) : joining || status === 'joining' ? (
          <div data-testid="wifi-join-form">
            <label class="ffp-col" style={{ margin: '6px 0' }}>
              {t('wifi.address')}
              <input
                data-nav
                data-testid="wifi-address"
                value={address}
                placeholder="192.168.1.23"
                onInput={(e) => setAddress((e.currentTarget as HTMLInputElement).value)}
                style={INPUT}
              />
            </label>
            <div class="ffp-row">
              <label class="ffp-col" style={{ margin: '6px 0', flex: 1 }}>
                {t('wifi.port')}
                <input
                  data-nav
                  data-testid="wifi-port"
                  value={port}
                  inputMode="numeric"
                  onInput={(e) => setPort((e.currentTarget as HTMLInputElement).value)}
                  style={INPUT}
                />
              </label>
              <label class="ffp-col" style={{ margin: '6px 0', flex: 1 }}>
                {t('wifi.code')}
                <input
                  data-nav
                  data-testid="wifi-code"
                  value={code}
                  maxLength={8}
                  onInput={(e) =>
                    setCode((e.currentTarget as HTMLInputElement).value.toUpperCase())
                  }
                  style={{ ...INPUT, letterSpacing: '0.2em' }}
                />
              </label>
            </div>
            <p class="ffp-hint">{t('wifi.sameNetwork')}</p>
            <ErrorLine shell={shell} />
            <Button
              label={status === 'joining' ? t('wifi.joining') : t('wifi.connect')}
              disabled={status === 'joining' || !address.trim() || !code.trim()}
              onPress={join}
              testId="wifi-connect"
            />
            <Button label={t('common.back')} onPress={back} />
          </div>
        ) : (
          <>
            <ErrorLine shell={shell} />
            <Button
              label={t('wifi.host')}
              detail={t('wifi.hostDetail')}
              onPress={() => void net.host()}
              autofocus
              testId="wifi-host"
            />
            <Button
              label={t('wifi.join')}
              detail={t('wifi.joinDetail')}
              onPress={() => {
                net.error.value = null;
                setJoining(true);
              }}
              testId="wifi-join"
            />
            <p class="ffp-hint">{t('wifi.sameNetwork')}</p>
            <Button label={t('common.back')} onPress={() => shell.go('mode')} />
          </>
        )}
      </Panel>
    </Screen>
  );
}

/**
 * The network lobby: the host owns the shared rules (difficulty); each player picks a
 * hero of their own (unique) and confirms readiness on their own computer.
 */
export function NetLobbyScreen({ shell }: { shell: Shell }) {
  void locale.value;
  const net = shell.net;
  const lobby = net.lobby.value;
  const status = net.status.value;
  useNav(() => {
    net.leave();
    shell.go('wifi');
  });
  useLayoutEffect(() => {
    if (status !== 'lobby' && status !== 'playing') shell.go('wifi');
  }, [status]);
  if (status !== 'lobby' || !lobby) return null;
  const me = net.localSlot;
  const host = net.role.value === 'host';
  const card = (slot: number) => {
    const p = lobby.players[slot];
    const mine = slot === me;
    const color = PLAYER_COLORS[slot];
    const other = lobby.players[1 - slot];
    return (
      <Panel style={{ width: '420px', minHeight: '240px' }} testId={`net-card-p${slot + 1}`}>
        <h2 style={{ color, margin: '0 0 6px' }}>
          {t('common.player', { n: slot + 1 })} · {slot === 0 ? t('net.host') : t('net.guest')}
          {mine ? ` (${t('net.you')})` : ''}
        </h2>
        {p ? (
          <>
            <p data-testid={`net-name-p${slot + 1}`}>{p.name}</p>
            {mine ? (
              <Choice
                label={t('net.hero')}
                value={p.hero ?? 'mountain'}
                options={HERO_ROSTER.filter((h) => h !== other?.hero).map((h) => ({
                  value: h,
                  label: heroName(h),
                }))}
                onChange={(h) => net.pickHero(h)}
                testId="net-hero"
              />
            ) : (
              <p data-testid={`net-hero-p${slot + 1}`}>
                {t('net.hero')}: <b>{p.hero ? heroName(p.hero) : '—'}</b>
              </p>
            )}
            {mine ? (
              <Button
                label={p.ready ? `✓ ${t('net.ready')}` : t('net.notReady')}
                onPress={() => net.setReady(!p.ready)}
                testId="net-ready"
              />
            ) : (
              <p data-testid={`net-ready-p${slot + 1}`}>
                {p.ready ? `✓ ${t('net.ready')}` : t('net.notReady')}
              </p>
            )}
          </>
        ) : (
          <p>{t('wifi.waitingGuest')}</p>
        )}
      </Panel>
    );
  };
  return (
    <Screen bg={ART('menu-bg')} dim testId="net-lobby">
      <h1 class="ffp-title" style={{ position: 'relative' }}>
        {t('net.lobbyTitle')}
      </h1>
      <div class="ffp-row" style={{ position: 'relative' }}>
        {card(0)}
        {card(1)}
      </div>
      <Panel style={{ width: '860px', marginTop: '14px' }}>
        <p style={{ margin: '0 0 6px' }}>{stageName(lobby.stage)}</p>
        {host ? (
          <Choice
            label={t('play.difficulty')}
            value={lobby.difficulty}
            options={DIFFICULTIES.map((d) => ({ value: d.id, label: difficultyName(d.id) }))}
            onChange={(v) => net.setDifficulty(v)}
            testId="net-difficulty"
          />
        ) : (
          <p data-testid="net-difficulty-guest">
            {t('play.difficulty')}: <b>{difficultyName(lobby.difficulty)}</b> ·{' '}
            <span class="ffp-hint">{t('net.difficultyHost')}</span>
          </p>
        )}
        <p class="ffp-hint">
          {t('net.startHint')} {t('net.noCheats')} · {t('net.rtt', { n: net.rtt.value })}
        </p>
        <ErrorLine shell={shell} />
        <Button
          label={t('net.leave')}
          onPress={() => {
            net.leave();
            shell.go('wifi');
          }}
          testId="net-leave"
        />
      </Panel>
    </Screen>
  );
}

/** Over Wi-Fi play: the connection badge, and the hold, pause, countdown or end panel. */
export function NetOverlay({ shell }: { shell: Shell }) {
  void locale.value;
  const net = shell.net;
  const v = net.view.value;
  const menu = v !== null && v.phase !== 'run';
  useNav(() => {
    if (!menu) return;
    if (v?.phase === 'ended') net.endSession();
    else net.pauseOrReady();
  });
  if (!v || !net.active) return null;
  const me = net.localSlot;
  const badge = (
    <div
      class="ffp-hint"
      data-testid="net-badge"
      style={{
        position: 'absolute',
        top: '62px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10,12,16,0.62)',
        padding: '2px 10px',
        borderRadius: '6px',
      }}
    >
      {v.authority && net.role.value === 'guest'
        ? t('net.badgeHost', { n: v.delay, ms: v.rtt })
        : t('net.badge', { n: v.delay, r: v.rollbacks, ms: v.rtt })}
    </div>
  );
  const other = 1 - me;
  // M15: the partner is missing (guard, then the survival proxy) or the link is down.
  const notice =
    v.partner !== 'here' ? (
      <div class="ffp-caption" data-testid="net-partner" style={NOTICE}>
        <span data-testid={`net-partner-${v.partner}`}>
          {v.partner === 'grace'
            ? t('net.partnerGrace', { n: other + 1 })
            : t('net.partnerProxy', { n: other + 1 })}
        </span>
        {v.standby ? (
          <div class="ffp-hint" data-testid="net-standby">
            {t('net.rejoinHere', {
              address: v.standby.addresses[0] ?? '—',
              port: v.standby.port,
              code: v.standby.code,
            })}
          </div>
        ) : null}
      </div>
    ) : v.takeover !== null ? (
      <div class="ffp-caption" data-testid="net-reconnecting" style={NOTICE}>
        {t('net.reconnecting', { n: other + 1 })}{' '}
        <span data-testid="net-takeover">{t('net.takeover', { s: v.takeover })}</span>
      </div>
    ) : null;
  if (v.phase === 'run')
    return (
      <div class="ffp-shell" style={{ pointerEvents: 'none' }}>
        {badge}
        {notice}
        {v.waiting && v.takeover === null ? (
          <div
            class="ffp-caption"
            data-testid="net-waiting"
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
            }}
          >
            {t('net.waiting')}
          </div>
        ) : null}
      </div>
    );
  let title = '';
  if (v.phase === 'ended') title = t('net.endedTitle');
  else if (v.phase === 'away') title = t('net.awayTitle');
  else if (v.hold?.kind === 'focus')
    title = v.hold.by === me ? t('net.holdYou') : t('net.holdAway', { n: v.hold.by + 1 });
  else if (v.hold) title = t('net.paused', { n: v.hold.by + 1 });
  const endedText =
    v.ended === null
      ? ''
      : v.endedBy === me && v.ended !== 'lost'
        ? t('net.ended.you')
        : t(`net.ended.${v.ended}` as TextId, { n: v.endedBy + 1 });
  return (
    <div class="ffp-shell" style={{ pointerEvents: 'auto' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)',
        }}
      >
        <Panel style={{ width: '640px', textAlign: 'center' }} testId={`net-${v.phase}`}>
          <h1 class="ffp-title" data-testid="net-title">
            {title}
          </h1>
          {v.phase === 'ended' ? (
            <>
              <p data-testid="net-ended-reason">{endedText}</p>
              <p class="ffp-hint">{t('net.endedNote')}</p>
              <Button
                label={t('net.toVillage')}
                onPress={() => net.endSession()}
                autofocus
                testId="net-to-village"
              />
            </>
          ) : v.phase === 'away' ? (
            <>
              <p data-testid="net-away-text">{t('net.awayText')}</p>
              {v.rejoining ? (
                <p data-testid="net-rejoining">{t('net.rejoining')}</p>
              ) : (
                <Button
                  label={t('net.rejoin')}
                  onPress={() => net.pauseOrReady()}
                  autofocus
                  testId="net-rejoin"
                />
              )}
              <Button label={t('net.end')} onPress={() => net.endSession()} testId="net-end" />
            </>
          ) : v.phase === 'countdown' ? (
            <p style={{ fontSize: '40px' }} data-testid="net-countdown">
              {t('net.countdown', { n: v.countdown ?? 0 })}
            </p>
          ) : (
            <>
              {[0, 1].map((slot) => (
                <p
                  style={{ color: PLAYER_COLORS[slot], margin: '4px 0' }}
                  data-testid={`net-ready-state-p${slot + 1}`}
                >
                  {v.ready[slot]
                    ? `✓ ${t('net.isReady', { n: slot + 1 })}`
                    : t('net.notYet', { n: slot + 1 })}
                </p>
              ))}
              {v.grace !== null ? (
                <p data-testid="net-grace">{t('net.grace', { n: other + 1, s: v.grace })}</p>
              ) : null}
              {!v.ready[me] ? (
                <>
                  <Button
                    label={t('net.confirm')}
                    onPress={() => net.pauseOrReady()}
                    autofocus
                    testId="net-confirm"
                  />
                  <p class="ffp-hint">
                    <PromptText text={t('net.confirmHint')} ctx={ctxOf(shell)} />
                  </p>
                </>
              ) : null}
              <Button
                label={t('net.settings')}
                onPress={() => {
                  shell.settingsFrom.value = 'game';
                  shell.settingsCategory.value = 'audio';
                  shell.go('settings');
                }}
                testId="net-settings"
              />
              <Button label={t('net.end')} onPress={() => net.endSession()} testId="net-end" />
            </>
          )}
        </Panel>
      </div>
      {badge}
      {notice}
    </div>
  );
}

const NOTICE = {
  position: 'absolute',
  top: '96px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(0,0,0,0.7)',
  maxWidth: '900px',
  textAlign: 'center',
} as const;

import type { LabState } from '../ui/labState';
import { locale } from '../text/i18n';
import type { Shell } from './shell';
import { HudClusters } from './screens/Hud';
import { PauseMenu } from './screens/Pause';
import {
  BriefingScreen,
  HeroesScreen,
  IntroScreen,
  LobbyScreen,
  ModeScreen,
  ReadyScreen,
  StageScreen,
} from './screens/PlayFlow';
import { RecordsScreen } from './screens/Records';
import {
  AcademyScreen,
  CombosScreen,
  LessonHud,
  PracticeHud,
  PracticeSetupScreen,
} from './screens/Academy';
import { GuideScreen, SecretsScreen } from './screens/Guide';
import { StoreScreen } from './screens/Store';
import { SettingsScreen } from './screens/Settings';
import { SetupScreen } from './screens/Setup';
import { VillageScreen } from './screens/Village';
import { NetLobbyScreen, NetOverlay, WifiScreen } from './screens/Wifi';

/** Whether the pause the player asked for is showing (not a focus or controller pause). */
export function menuPaused(state: LabState): boolean {
  return state.paused.value && !state.focusPaused.value && state.waiting.value.length === 0;
}

/** The open shell screen, or over live play the HUD clusters and the pause menu. */
export function ShellRoot({ shell, state }: { shell: Shell; state: LabState }) {
  void locale.value;
  const screen = shell.screen.value;
  const toast = shell.toast.value ? (
    <div class="ffp-toast" data-testid="toast">
      {shell.toast.value}
    </div>
  ) : null;
  if (screen === 'game' || screen === 'lab' || screen === 'lesson' || screen === 'practice') {
    return (
      <>
        {screen === 'game' && !state.results.value ? <HudClusters /> : null}
        {screen === 'lesson' ? <LessonHud shell={shell} /> : null}
        {screen === 'practice' ? <PracticeHud shell={shell} /> : null}
        {screen === 'game' && shell.net.active ? <NetOverlay shell={shell} /> : null}
        {menuPaused(state) && !state.results.value ? (
          <PauseMenu shell={shell} state={state} />
        ) : null}
        {toast}
      </>
    );
  }
  const page = (() => {
    switch (screen) {
      case 'boot':
        return <div class="ffp-screen" data-testid="boot" />;
      case 'setup':
        return <SetupScreen shell={shell} />;
      case 'village':
        return <VillageScreen shell={shell} />;
      case 'mode':
        return <ModeScreen shell={shell} />;
      case 'lobby':
        return <LobbyScreen shell={shell} />;
      case 'stage':
        return <StageScreen shell={shell} />;
      case 'heroes':
        return <HeroesScreen shell={shell} />;
      case 'intro':
        return <IntroScreen shell={shell} />;
      case 'briefing':
        return <BriefingScreen shell={shell} />;
      case 'ready':
        return <ReadyScreen shell={shell} />;
      case 'settings':
        return <SettingsScreen shell={shell} />;
      case 'records':
        return <RecordsScreen shell={shell} />;
      case 'store':
        return <StoreScreen shell={shell} />;
      case 'guide':
        return <GuideScreen shell={shell} />;
      case 'secrets':
        return <SecretsScreen shell={shell} />;
      case 'academy':
        return <AcademyScreen shell={shell} />;
      case 'practiceSetup':
        return <PracticeSetupScreen shell={shell} />;
      case 'combos':
        return <CombosScreen shell={shell} />;
      case 'wifi':
        return <WifiScreen shell={shell} />;
      case 'netLobby':
        return <NetLobbyScreen shell={shell} />;
    }
  })();
  return (
    <div class="ffp-shell" style={{ pointerEvents: 'auto' }}>
      {page}
      {toast}
    </div>
  );
}

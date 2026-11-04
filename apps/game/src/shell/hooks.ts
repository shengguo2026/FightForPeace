import { useLayoutEffect, useRef } from 'preact/hooks';
import { pushNav, type NavEvent } from './nav';

/** Registers a screen's navigation handlers for as long as it is mounted. */
export function useNav(onBack?: () => void, onEvent?: (e: NavEvent) => boolean): void {
  const ref = useRef({ onBack, onEvent });
  ref.current = { onBack, onEvent };
  useLayoutEffect(
    () =>
      pushNav({
        onBack: () => ref.current.onBack?.(),
        onEvent: (e) => ref.current.onEvent?.(e) ?? false,
      }),
    [],
  );
}

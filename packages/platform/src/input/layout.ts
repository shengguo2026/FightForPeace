/**
 * Keyboard labels (decision D6): bindings are physical codes, the screen shows the
 * character printed on the player's key. Sources, best first:
 * 1. the browser layout map (navigator.keyboard.getLayoutMap, Chrome and Edge);
 * 2. the character of the first real press of that key (any browser);
 * 3. the layout the player picked (QWERTY / QWERTZ / AZERTY);
 * 4. the US-QWERTY character.
 * Keys without a printed character (arrows, Space, numpad, Shift…) always use names.
 */
export type LayoutName = 'qwerty' | 'qwertz' | 'azerty';

const NAMED: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Enter: 'Enter',
  Escape: 'Esc',
  Tab: 'Tab',
  Backspace: 'Backspace',
  ShiftLeft: 'Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Right Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Alt Gr',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num −',
  NumpadMultiply: 'Num ×',
  NumpadDivide: 'Num ÷',
  NumpadDecimal: 'Num .',
  NumpadEnter: 'Num Enter',
};

const US: Readonly<Record<string, string>> = {
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  IntlBackslash: '\\',
};

const PICKED: Readonly<Record<LayoutName, Readonly<Record<string, string>>>> = {
  qwerty: {},
  qwertz: {
    KeyY: 'Z',
    KeyZ: 'Y',
    Semicolon: 'Ö',
    Quote: 'Ä',
    BracketLeft: 'Ü',
    BracketRight: '+',
    Minus: 'ß',
    Equal: '´',
    Slash: '-',
    Backslash: '#',
    Backquote: '^',
    IntlBackslash: '<',
  },
  azerty: {
    KeyQ: 'A',
    KeyA: 'Q',
    KeyW: 'Z',
    KeyZ: 'W',
    Semicolon: 'M',
    KeyM: ',',
    Comma: ';',
    Period: ':',
    Slash: '!',
    Quote: 'Ù',
    BracketLeft: '^',
    BracketRight: '$',
    Backslash: '*',
    Minus: ')',
    Equal: '=',
    Backquote: '²',
    IntlBackslash: '<',
  },
};

/** True for codes whose printed character depends on the layout. */
function isCharacterKey(code: string): boolean {
  return /^(Key[A-Z]|Digit[0-9])$/.test(code) || code in US;
}

export class KeyLabelSource {
  private layoutMap: Map<string, string> | null = null;
  private readonly observed = new Map<string, string>();
  private picked: LayoutName = 'qwerty';
  /** Changes whenever any label may have changed, so prompts can re-resolve. */
  version = 0;

  get pickedLayout(): LayoutName {
    return this.picked;
  }

  setLayoutMap(entries: Iterable<[string, string]>): void {
    this.layoutMap = new Map(entries);
    this.version += 1;
  }

  /** Records the character a real key press produced (`KeyboardEvent.key`). */
  observe(code: string, key: string): void {
    if (!isCharacterKey(code) || [...key].length !== 1 || key === ' ') return;
    const label = key.toUpperCase();
    if (this.observed.get(code) === label) return;
    this.observed.set(code, label);
    this.version += 1;
  }

  setPickedLayout(layout: LayoutName): void {
    if (this.picked === layout) return;
    this.picked = layout;
    this.version += 1;
  }

  label(code: string): string {
    const named = NAMED[code];
    if (named) return named;
    if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
    const fromMap = this.layoutMap?.get(code);
    if (fromMap && isCharacterKey(code)) return fromMap.toUpperCase();
    const seen = this.observed.get(code);
    if (seen) return seen;
    const picked = PICKED[this.picked][code];
    if (picked) return picked;
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    return US[code] ?? code;
  }
}

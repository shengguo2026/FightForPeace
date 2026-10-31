/**
 * Bit values shared by every input device and the simulation. Devices produce these
 * bits; the simulation never sees which key or button was used.
 */
export const ActionBit = {
  Attack: 1,
  Jump: 2,
  Special: 4,
  Guard: 8,
  Ultimate: 16,
  Interact: 32,
  TeamAttack: 64,
  Dash: 128,
  LowAttack: 256,
  Pause: 512,
} as const;

export type ActionName = keyof typeof ActionBit;

/** Direction bits for FrameInput.dirPressed. */
export const DirBit = {
  up: 1,
  down: 2,
  left: 4,
  right: 8,
} as const;

/** Offensive actions: the only ones that use the input buffer. Movement is never buffered. */
export const OFFENSIVE_MASK =
  ActionBit.Attack | ActionBit.Jump | ActionBit.Special | ActionBit.Ultimate;

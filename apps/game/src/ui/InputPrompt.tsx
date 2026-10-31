import type { ActionName, Prompt, PromptContext, PromptInput } from '@ffp/platform';
import { resolvePrompt } from '@ffp/platform';
import { type TextPart, parseText } from '../text/en';

/** Player colours, used for prompts, panels and heroes. */
export const PLAYER_COLORS = ['#4fa3ff', '#ff9a3c'] as const;

const keycap = {
  display: 'inline-block',
  minWidth: '1.6em',
  padding: '0 0.35em',
  margin: '0 0.1em',
  border: '1px solid currentColor',
  borderBottomWidth: '3px',
  borderRadius: '5px',
  textAlign: 'center',
  lineHeight: '1.35',
  fontWeight: 600,
  background: 'rgba(255,255,255,0.08)',
} as const;

const padGlyph = { ...keycap, borderRadius: '999px', borderBottomWidth: '1px' } as const;

/**
 * Draws one resolved prompt: a keycap with the printed label, a gamepad glyph (CSS-drawn
 * placeholder for logical asset `ui.prompt.pad.<family>.<button>`), a chord, a double-tap
 * gesture, or "Not assigned". Always carries accessible text.
 */
export function InputPrompt({ prompt, color }: { prompt: Prompt; color?: string }) {
  const style = { color: color ?? 'inherit' };
  switch (prompt.kind) {
    case 'key':
      return (
        <kbd style={{ ...keycap, ...style }} aria-label={prompt.a11y} data-prompt="key">
          {prompt.label}
        </kbd>
      );
    case 'pad':
      return (
        <span
          style={{ ...padGlyph, ...style }}
          aria-label={prompt.a11y}
          data-prompt="pad"
          data-asset={`ui.prompt.pad.${prompt.family}.${prompt.button}`}
        >
          {prompt.label}
        </span>
      );
    case 'chord':
      return (
        <span aria-label={prompt.a11y} data-prompt="chord">
          {prompt.parts.map((p, i) => (
            <>
              {i > 0 ? '+' : null}
              <InputPrompt prompt={p} color={color} />
            </>
          ))}
        </span>
      );
    case 'gesture':
      return (
        <span aria-label={prompt.a11y} data-prompt="gesture">
          <InputPrompt prompt={prompt.part} color={color} />
          <InputPrompt prompt={prompt.part} color={color} />
        </span>
      );
    case 'unassigned':
      return (
        <span style={{ ...style, fontStyle: 'italic', opacity: 0.8 }} data-prompt="unassigned">
          Not assigned
        </span>
      );
  }
}

function partInput(p: TextPart): PromptInput | null {
  if (p.kind === 'action') return { action: p.name as ActionName };
  if (p.kind === 'dir') return { dir: p.name as 'Forward' };
  return null;
}

/** A tokenized string with each `{action:…}` / `{dir:…}` drawn for this player. */
export function PromptText({
  text,
  ctx,
  color,
  values,
  testId,
}: {
  text: string;
  ctx: PromptContext;
  color?: string;
  values?: Record<string, string | number>;
  testId?: string;
}) {
  return (
    <span data-testid={testId}>
      {parseText(text, values).map((part) => {
        const input = partInput(part);
        return input ? (
          <InputPrompt prompt={resolvePrompt(ctx, input)} color={color} />
        ) : (
          (part as { text: string }).text
        );
      })}
    </span>
  );
}

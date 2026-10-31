import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

test('eslint rejects Math.sin and Math.random in sim', async () => {
  const eslint = new ESLint({ cwd: repoRoot, ignore: false });
  const [result] = await eslint.lintFiles(['packages/sim/test/fixtures/forbidden-math.ts']);
  const restricted = (result?.messages ?? []).filter(
    (m) => m.ruleId === 'no-restricted-properties' && m.severity === 2,
  );
  expect(restricted).toHaveLength(2);
}, 30_000);

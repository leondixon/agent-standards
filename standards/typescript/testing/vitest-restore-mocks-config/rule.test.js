import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';
import rule from './rule.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.afterAll = afterAll;

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

function loadFixtures(kind) {
  const directory = join(fixturesRoot, kind);
  return readdirSync(directory)
    .filter(name => name.endsWith('.ts'))
    .map((name) => {
      const code = readFileSync(join(directory, name), 'utf8');
      return {
        name: name.replace(/\.ts$/, ''),
        filename: join(directory, 'vitest.config.ts'),
        code,
      };
    });
}

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
});

ruleTester.run('vitest-restore-mocks-config', rule, {
  valid: [
    ...loadFixtures('valid'),
    {
      name: 'non-config-file',
      filename: join(fixturesRoot, 'other.ts'),
      code: 'export default { test: {} };\n',
    },
  ],
  invalid: loadFixtures('invalid').map(fixture => ({
    ...fixture,
    errors: [{ messageId: 'missingRestoreMocks' }],
  })),
});

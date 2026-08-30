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
        code,
      };
    });
}

function errorsFor(fixtureName) {
  return [{ messageId: 'missingSignal' }];
}

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
});

ruleTester.run('undici-fetch-without-abort-signal', rule, {
  valid: loadFixtures('valid'),
  invalid: loadFixtures('invalid').map(fixture => ({
    ...fixture,
    errors: errorsFor(fixture.name),
  })),
});

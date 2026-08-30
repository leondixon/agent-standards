import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
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
    .filter(name => name.endsWith('.js') || name.endsWith('.ts'))
    .filter(name => !name.endsWith('.output.ts') && !name.endsWith('.output.js'))
    .map((name) => {
      const code = readFileSync(join(directory, name), 'utf8');
      const fixture = {
        name: name.replace(/\.(js|ts)$/, ''),
        code,
      };
      if (kind === 'invalid') {
        const outputPath = join(directory, name.replace(/(\.(js|ts))$/, '.output$1'));
        try {
          fixture.output = readFileSync(outputPath, 'utf8');
        }
        catch {
          fixture.output = null;
        }
      }
      return fixture;
    });
}

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

ruleTester.run('prisma-enum-value-camelcase-import', rule, {
  valid: loadFixtures('valid'),
  invalid: loadFixtures('invalid').map(fixture => ({
    ...fixture,
    errors: [{ messageId: 'camelCaseAlias' }],
  })),
});

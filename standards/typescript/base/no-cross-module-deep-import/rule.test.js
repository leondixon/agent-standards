import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';
import rule from './rule.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.afterAll = afterAll;

const ruleTester = new RuleTester({
  languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module' },
});

const options = [{ modules: ['payment', 'auth'], sourceRoot: 'src' }];

ruleTester.run('no-cross-module-deep-import', rule, {
  valid: [
    {
      name: 'given a peer module, when imported from its public surface, then it passes',
      filename: 'src/auth/session.ts',
      code: `import { chargeCard } from '../payment'`,
      options,
    },
    {
      name: 'given a peer module index, when imported explicitly, then it passes',
      filename: 'src/auth/session.ts',
      code: `export { refund } from '../payment/index'`,
      options,
    },
    {
      name: 'given no configured modules, when deep-importing, then the rule is inert',
      filename: 'src/auth/session.ts',
      code: `import { x } from '../payment/internal/gateway'`,
      options: [{ modules: [] }],
    },
    {
      name: 'given a file outside a configured module, when deep-importing, then it passes',
      filename: 'src/shared/util.ts',
      code: `import { x } from '../payment/internal/gateway'`,
      options,
    },
  ],
  invalid: [
    {
      name: 'given a peer module, when deep-importing its internals, then it reports',
      filename: 'src/auth/session.ts',
      code: `import { chargeCard } from '../payment/internal/gateway-client'`,
      options,
      errors: [{ messageId: 'deepPeerImport' }],
    },
    {
      name: 'given a re-export, when deep-importing a peer module, then it reports',
      filename: 'src/auth/session.ts',
      code: `export { chargeCard } from '../payment/internal/gateway-client'`,
      options,
      errors: [{ messageId: 'deepPeerImport' }],
    },
    {
      name: 'given a custom source root, when deep-importing a peer, then it reports',
      filename: 'apps/api/lib/auth/session.ts',
      code: `import { chargeCard } from '../payment/internal/gateway-client'`,
      options: [{ modules: ['payment', 'auth'], sourceRoot: 'lib' }],
      errors: [{ messageId: 'deepPeerImport' }],
    },
  ],
});

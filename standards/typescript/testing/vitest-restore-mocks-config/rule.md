---
id: vitest-restore-mocks-config
title: Test config restores mocks
layer: test
presets: [testing]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Test configuration must set `restoreMocks` so spies do not leak between tests and produce order-dependent failures.

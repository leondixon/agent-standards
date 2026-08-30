---
id: vitest-async-error-without-assertions
title: Async error tests assert the error
layer: test
presets: [testing]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A test that awaits a rejection must assert on the error. Without an assertion the test passes whether or not the expected failure occurred.

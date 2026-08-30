---
id: playwright-screenshot-animations-not-disabled
title: Screenshots disable animations
layer: test
presets: [testing]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Visual comparison screenshots must disable animations, or in-flight transitions make the result non-deterministic and the test flaky.

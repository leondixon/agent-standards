---
id: no-to-response-helper
title: No toResponse mapper helpers
layer: backend
presets: [base]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Do not define `to*Response` mapper helpers. Map the response inline at the handler, where the shape you return is visible next to the route that returns it.

---
id: no-internal-comments
title: No comments that explain what
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Do not write leading comment blocks above declarations, or trailing end-of-line comments, that restate what the code does. Make the name carry the meaning instead.

Pragmas (`eslint-*`, `@ts-*`, `biome-ignore`, `prettier-ignore`) are exempt.

Comment only what code cannot say: a business rule, a workaround and its cause, a performance trade-off.

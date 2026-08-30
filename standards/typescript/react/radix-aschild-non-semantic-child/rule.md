---
id: radix-aschild-non-semantic-child
title: asChild needs a semantic child
layer: frontend
presets: [react]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

`asChild` forwards behaviour and accessibility props onto its child. A non-semantic child (`div`, `span`) drops keyboard and screen-reader support that the primitive was providing.

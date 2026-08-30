---
id: radix-icon-trigger-without-aria-label
title: Icon triggers need an accessible name
layer: frontend
presets: [react]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A trigger whose only content is an icon has no accessible name. Screen readers announce it as an unlabelled button. Add `aria-label`.

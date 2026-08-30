---
id: tailwind-dynamic-class-name
title: No dynamically built class names
layer: frontend
presets: [tailwind]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Tailwind's scanner only sees literal class strings, so a partial like `text-${severity}` is purged from the build. Map known keys to complete class names instead.

## Good

```ts
const tone = { ok: 'text-green-600', error: 'text-red-600' }[severity]
```

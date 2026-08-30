---
id: tailwind-arbitrary-hex-value
title: No arbitrary hex values in utilities
layer: frontend
presets: [tailwind]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Do not put a raw hex colour in a Tailwind utility (`bg-[#ee7038]`). Promote it to a named theme token so the design system stays the single source of colour.

## Good

```css
@theme { --color-brand-orange: #ee7038; }
```

```tsx
<div className="bg-brand-orange" />
```

---
id: no-cross-module-deep-import
title: No cross-module deep imports
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
  options: { modules: $modules, sourceRoot: $sourceRoot }
---

Sibling modules import each other through their public surface, not by reaching
into internal paths. A deep import couples you to a neighbour's internal layout,
so moving a file inside one module breaks another.

This rule is inert until `modules` is configured. Sync populates it from the
`modules` and `sourceRoot` entries in the project's `.standards/config.json`.

## Bad

```ts
import { chargeCard } from '../payment/internal/gateway-client'
```

## Good

```ts
import { chargeCard } from '../payment'
```

The neighbour decides what it exports from its index; everything else stays private.

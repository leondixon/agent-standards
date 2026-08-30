---
id: no-nullable-in-schemas
title: Schemas use optional, not nullable
layer: any
presets: [zod]
severity: warn
outputs: [mdc, agents-md, hook]
---

Prefer `.optional()` over `.nullable()` and `.nullish()` in schemas. A codebase that
uses `undefined` for absence should not reintroduce `null` at its parse boundary —
that is where two absent-value sentinels leak back in.

Keep `.nullable()` only where an external contract genuinely sends `null` and you
cannot change it; normalise to `undefined` immediately after parsing.

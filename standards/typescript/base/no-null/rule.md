---
id: no-null
title: No null
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Use `undefined` for absent values, never `null`. One absent-value sentinel means call sites need one check, not two.

## Exceptions

- ORM write payloads where `null` clears a column
- React render types that require `null` for "render nothing"
- Third-party APIs whose signatures demand it

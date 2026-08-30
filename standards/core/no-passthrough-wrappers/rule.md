---
id: no-passthrough-wrappers
title: No pass-through wrappers
layer: any
presets: [base]
severity: warn
outputs: [mdc, agents-md, hook]
---

Do not add a layer that only renames, reorders, or groups calls to the layer beneath
it. Each indirection costs a lookup when reading and earns nothing back.

- Inline code used once, unless extraction names a real domain concept or makes non-trivial logic clearer
- A helper called from exactly one place, whose body is a single call, belongs at that call site
- Grouping several calls into a `process*` or service function hides the sequence — keep it visible in the caller

Extract when there is reuse, an independently meaningful domain operation, or logic
complex enough to deserve isolated tests.

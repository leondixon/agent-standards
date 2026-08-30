---
id: prisma-transaction-on-write
title: Consider a transaction for grouped writes
layer: any
presets: [prisma]
severity: warn
outputs: [mdc, agents-md, hook]
---

When adding a database write, decide whether it needs a transaction — and say why
when it does not. Read-modify-write sequences, multiple dependent writes, and
anything that could interleave under concurrent requests need one.

Use `prisma.$transaction` (or an equivalent lock) when required. Do not wrap every
call in a transaction by default: a transaction around a single independent write
buys nothing and holds a connection longer.

This is a prompt, not a lint error — the hook inspects only newly added lines in
the current diff and asks the question at the point the write appears.

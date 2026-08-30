---
id: single-responsibility-naming
title: Single responsibility in names
layer: any
presets: [base]
severity: warn
outputs: [mdc, agents-md, hook]
---

A name that answers a question must not also imply a side effect. Keep query and
check collaborators separate from mutate and refresh ones, in names and in modules.

- `has*`, `is*`, `get*`, `check*` answer questions and must not mutate
- `store*`, `refresh*`, `update*`, `clear*`, `seed*` perform effects and must not double as queries
- Freshness or cooldown checks belong in one collaborator; performing the refresh belongs in another (`hasRecentX` + `refreshX`), with the due-branch at the call site
- Do not encode a logic branch in the name (`*IfDue`, `*WhenStale`, `*IfNeeded`)
- Do not call `has*` / `is*` / `check*` from inside a `refresh*` / `store*` / `update*` body — compose them at the call site

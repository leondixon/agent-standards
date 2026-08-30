---
id: prefer-get-over-find
title: Prefer get over find for queries
layer: any
presets: [base]
severity: warn
outputs: [mdc, agents-md, hook]
---

Domain query collaborators that load or return data use `get*`, not `find*`. One
verb for one job keeps query names predictable across the codebase.

- Prefer `getFinancialAccounts`, `getSearches`, `getCurrentReport`
- Avoid `findFinancialAccounts`, `findSearches`, and `find-*` modules for the same job
- Keep query collaborators separate from mutate ones (`getX` / `hasRecentX` + `storeX` / `refreshX`)

## Exceptions

- Third-party and ORM client APIs that already use `find` (`findMany`, `findFirst`, `iter().find()`)

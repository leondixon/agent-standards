---
id: no-lookup-qualifiers
title: No lookup qualifiers in names
layer: any
presets: [base]
severity: warn
outputs: [mdc, agents-md, hook]
---

Lookup keys (`customerId`, `userId`, `id`, …) are interface details. Do not bake a
`By*` qualifier into function, handler, test, or route operation names.

- Prefer `getFinancialAccounts`, `getFinancialAccountsHandlers`, `operationId: 'getFinancialAccounts'`
- Avoid `*ByCustomerId*`, `*ByUserId*`, `*ById*`, `find_by_*`, `get-by-*`
- Keep the key on the path parameter, schema, or call arguments where the value is actually used

The name says what you get; the signature says what you look it up by. Encoding the
key in the name means renaming the function every time the lookup changes.

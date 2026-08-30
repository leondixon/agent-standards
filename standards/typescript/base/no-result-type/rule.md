---
id: no-result-type
title: No plain Result types
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Do not create an interface or type alias named `*Result` to describe a return shape, especially `ok: true | false` unions. Model absence and failure directly instead.

## Prefer

- `T | undefined` for not-found or invalid parse
- `throw` for request failures, caught at the boundary
- `z.infer<typeof schema>` only when the schema is used for runtime parse

## Bad

```ts
export type ScoreResult =
  | { ok: true }
  | { ok: false; error: string }
```

## Good

```ts
export async function refreshScore(customerId: string): Promise<void> {
  await storeScore(customerId)
}

if (!(await hasRecentScore(customerId))) {
  await refreshScore(customerId)
}
```

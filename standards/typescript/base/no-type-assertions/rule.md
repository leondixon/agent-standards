---
id: no-type-assertions
title: No type assertions
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  rule: ts/consistent-type-assertions
  requires: '@antfu/eslint-config or typescript-eslint (as `ts`)'
  options: { assertionStyle: never }
---

Do not use TypeScript type assertions (`value as T`, `<T>value`). They hide real
type errors — the compiler stops checking exactly where you assert.

## Prefer

1. **Narrowing** — `status === 201`, `instanceof`, discriminated unions, type predicates
2. **Client response types** — branch on `response.status` before reading the body
3. **`satisfies`** — check a value against a type without widening it
4. **`as const`** — still allowed; const assertions are not type assertions

## Bad

```typescript
const body = await response.json()
onCreated(body as Partner)

analytics.capture(name, props as Record<string, unknown>)
```

## Good

```typescript
if (response.status === 201) {
  const partner = await response.json()
  onCreated(partner)
}

analytics.capture(name, toAnalyticsProperties(props))
```

## Exceptions

- Test files (`*.test.*`, `*.spec.*`), where asserting a fixture shape is not hiding a real error
- Third-party typings that require an assertion to satisfy their own signature — add an inline disable naming the library

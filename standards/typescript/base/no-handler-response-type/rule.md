---
id: no-handler-response-type
title: No plain Response DTO types
layer: backend
presets: [base]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Do not create an interface or object type named `*Response` solely to type a request handler's JSON body. Return the object and let the framework infer the client type.

A named response DTO adds nothing unless a schema is used at runtime for parsing or documentation.

## Bad

```ts
export interface PaymentMethodResponse {
  id: string
  isDefault: boolean
}

return ctx.json({ id, isDefault } satisfies PaymentMethodResponse, 201)
```

## Good

```ts
return ctx.json({ id, isDefault }, 201)
```

## Allowed

- `export type LeadResponse = z.infer<typeof leadResponseSchema>` when that schema is parsed or documented at runtime
- Shared envelope helpers outside handlers

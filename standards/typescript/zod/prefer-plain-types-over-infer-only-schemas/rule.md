---
id: prefer-plain-types-over-infer-only-schemas
title: Plain types over infer-only schemas
layer: any
presets: [zod]
severity: warn
outputs: [mdc, agents-md]
---

A schema must earn its runtime cost. If one exists only to derive a type through
`z.infer`, export a plain TypeScript type instead — you are paying for a runtime
validator that never validates.

## Bad

```ts
export const userSchema = z.object({ id: z.string(), email: z.string() })
export type User = z.infer<typeof userSchema>
```

## Good

```ts
export type User = { id: string, email: string }
```

Keep the schema when something calls `.parse`, `.safeParse`, or embeds it in
another schema. Dead-export tooling such as Knip will flag the unused ones.

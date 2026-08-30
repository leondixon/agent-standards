---
id: no-single-property-params
title: No single- or two-property params objects
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

When a function takes one or two values, pass them as plain parameters. Do not wrap them in a params object.

## Prefer

```ts
export async function getCampaign(code: string) { … }
await getCampaign(lead.campaign)

export async function hasPermission(userId: string, permission: Permission) { … }
await hasPermission(userId, permission)
```

## Avoid

```ts
await getCampaign({ code: lead.campaign })
await hasPermission({ userId, permission })
```

## Object params are for three or more fields

```ts
export async function storeFunnelOutcome(params: {
  campaignId: string
  outcome: FunnelOutcome
  recordedAt: Date
}) { … }
```

## Exceptions

- PascalCase components may keep a single-prop props object (`function Logo({ className }: { className?: string })`)
- Parameters named `options` / `opts` / `config` may be a single-field bag

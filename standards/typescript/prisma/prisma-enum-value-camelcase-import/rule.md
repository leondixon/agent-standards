---
id: prisma-enum-value-camelcase-import
title: Prisma enum value imports are camelCase
layer: any
presets: [prisma]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Prisma generates enum constants as PascalCase. When importing them as values, alias to camelCase; keep PascalCase for type-only imports.

## Bad

```ts
import { OrderStatus } from '../generated/prisma/enums'
const status = OrderStatus.pending
```

## Good

```ts
import {
  OrderStatus as orderStatus,
  type OrderStatus,
} from '../generated/prisma/enums'

const status: OrderStatus = orderStatus.pending
```

`Prisma` and `PrismaClient` stay PascalCase.

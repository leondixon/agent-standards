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
import { CreditReportBureauName } from '../generated/prisma/enums'
const bureau = CreditReportBureauName.transunion
```

## Good

```ts
import {
  CreditReportBureauName as creditReportBureauName,
  type CreditReportBureauName,
} from '../generated/prisma/enums'

const bureau: CreditReportBureauName = creditReportBureauName.transunion
```

`Prisma` and `PrismaClient` stay PascalCase.

---
id: zod-temporal-named-string
title: Temporal fields are not plain strings
layer: any
presets: [zod]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A field whose name reads as a date or time (`createdAt`, `startDate`, `expiresAt`) must not be typed as a plain string. Parse it to a date so invalid values fail at the boundary.

Presentation fields (`displayDate`, `dateLabel`, `dateText`) are exempt — those really are strings.

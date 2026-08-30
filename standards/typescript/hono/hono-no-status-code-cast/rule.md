---
id: hono-no-status-code-cast
title: No status code assertions in Hono
layer: backend
presets: [hono]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Do not assert a status code to satisfy Hono's typed status parameter. Narrow the value or use a literal, so the type reflects the statuses the route can actually return.

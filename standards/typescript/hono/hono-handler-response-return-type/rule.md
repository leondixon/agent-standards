---
id: hono-handler-response-return-type
title: No return annotation on Hono handlers
layer: backend
presets: [hono]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Do not annotate a Hono handler's return type. An explicit annotation erases the response body type from the typed RPC client — let it be inferred from `ctx.json(...)`.

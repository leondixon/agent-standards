---
id: undici-fetch-without-abort-signal
title: Fetch carries an abort signal
layer: backend
presets: [next]
severity: warn
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A server-side `fetch` without an abort signal can hang indefinitely, holding a connection and blocking the request that started it.

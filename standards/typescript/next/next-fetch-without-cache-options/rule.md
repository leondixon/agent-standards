---
id: next-fetch-without-cache-options
title: Fetch declares its caching
layer: frontend
presets: [next]
severity: warn
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A server-side `fetch` must state its caching intent explicitly. Relying on the framework default makes caching behaviour invisible at the call site and prone to change between versions.

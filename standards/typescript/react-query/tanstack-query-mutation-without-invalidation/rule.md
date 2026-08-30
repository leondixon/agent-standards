---
id: tanstack-query-mutation-without-invalidation
title: Mutations invalidate or update the cache
layer: frontend
presets: [react-query]
severity: warn
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A mutation must invalidate or update affected queries in `onSuccess`. Without it the UI keeps showing pre-mutation data until something else refetches.

---
id: tanstack-query-optimistic-without-rollback
title: Optimistic updates need rollback
layer: frontend
presets: [react-query]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

An optimistic update that sets cache data in `onMutate` must snapshot the previous value and restore it in `onError`. Otherwise a failed mutation leaves the optimistic value on screen.

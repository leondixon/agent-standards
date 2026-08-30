---
id: tanstack-query-prefetch-without-staletime
title: Prefetch needs staleTime
layer: frontend
presets: [react-query]
severity: warn
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

`prefetchQuery` without `staleTime` refetches immediately on mount, wasting the prefetch entirely.

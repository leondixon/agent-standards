---
id: tanstack-query-data-into-state
title: No query data copied into state
layer: frontend
presets: [react-query]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Do not copy query data into component state with `useState` plus `useEffect`. The query cache is already the source of truth; copying it creates a second one that goes stale.

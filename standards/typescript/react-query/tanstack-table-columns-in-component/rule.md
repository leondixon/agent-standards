---
id: tanstack-table-columns-in-component
title: Table columns are memoised
layer: frontend
presets: [react-query]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Columns built inline in a component create a fresh array every render, re-initialising the table and wiping sort, pagination, and visibility state. Lift them to module scope or wrap in `useMemo`.

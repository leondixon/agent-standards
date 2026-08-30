---
id: react-multi-use-optimistic
title: One useOptimistic per component
layer: frontend
presets: [react]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Multiple `useOptimistic` hooks in one component reconcile independently and can show contradictory intermediate states. Model the optimistic state as one value.

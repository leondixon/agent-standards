---
id: rhf-watch-at-form-root
title: No watch at the form root
layer: frontend
presets: [react-hook-form]
severity: warn
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Calling `watch()` with no argument at the form root re-renders the whole form on every keystroke. Watch specific fields, or use `useWatch` in the component that needs the value.

---
id: rhf-set-error-without-type
title: setError passes a type
layer: frontend
presets: [react-hook-form]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

`setError` must be given a `type`. Without one the error cannot be distinguished from validation errors and may be cleared unexpectedly.

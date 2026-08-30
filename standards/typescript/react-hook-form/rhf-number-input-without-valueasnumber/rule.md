---
id: rhf-number-input-without-valueasnumber
title: Number inputs register valueAsNumber
layer: frontend
presets: [react-hook-form]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A `type="number"` input must register with `valueAsNumber`, or the form value arrives as a string and numeric validation silently compares strings.

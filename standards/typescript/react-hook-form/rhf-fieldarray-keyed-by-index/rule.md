---
id: rhf-fieldarray-keyed-by-index
title: Field arrays key by field id
layer: frontend
presets: [react-hook-form]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

Key `useFieldArray` items by the generated `field.id`, not the array index. Index keys make React reuse the wrong row when items are inserted or removed.

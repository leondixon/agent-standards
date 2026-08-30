---
id: tanstack-query-missing-enabled
title: Queries with dependent keys need enabled
layer: frontend
presets: [react-query]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A query whose key depends on a possibly-undefined value needs an `enabled` guard, or it fires with `undefined` and caches a result under the wrong key.

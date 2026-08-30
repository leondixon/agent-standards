---
id: zod-schema-in-component
title: Schemas live outside components
layer: frontend
presets: [zod]
severity: error
outputs: [mdc, agents-md, eslint]
eslint:
  own: true
---

A schema defined inside a component body is rebuilt on every render, defeating memoisation in resolvers and validators. Lift it to module scope.

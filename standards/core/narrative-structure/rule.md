---
id: narrative-structure
title: Narrative code structure
layer: any
presets: [base]
severity: warn
outputs: [mdc, agents-md]
---

Keep orchestration at the call site so sequencing, decisions, and side effects read
from top to bottom as a story.

- Keep branches visible in the caller. Do not hide control flow in `ensure*`, `*IfDue`, `*IfNeeded`, or similar helpers.
- Give each collaborator one narrow responsibility. Separate validation, queries, external calls, and persistence instead of combining them in a `process*` or service function.
- Do not add pass-through or middle-layer wrappers that merely rename, reorder, or group calls.
- Inline code used once unless extraction represents a real domain concept or makes non-trivial logic meaningfully clearer.
- Extract collaborators for reuse, independently meaningful domain operations, or complex logic that deserves isolated tests.

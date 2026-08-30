---
id: no-deprecated-apis
title: No deprecated APIs
layer: any
presets: [base]
severity: warn
outputs: [mdc, agents-md, hook]
---

Do not call APIs the compiler reports as deprecated. A deprecation is the author
telling you the call has a replacement and a removal date; adopting it now is
cheaper than a migration later.

The hook reads TypeScript's own deprecation diagnostics for the edited file, so it
flags exactly what the compiler flags — no separate list to maintain.

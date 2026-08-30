---
id: comments-explain-why
title: Comments explain why, never what
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md]
---

Do not write comments that restate what the code does — make names self-documenting
instead. Comment only what the code cannot say: non-obvious business rules,
workarounds and their cause, performance trade-offs, and links to the decision behind them.

- No leading comment blocks above declarations that paraphrase the declaration
- No trailing end-of-line comments restating the expression
- No decorative banner comments (`// ====`, `// ----`, `// ****`, `// ####`)
- No commented-out code — version control has the history
- No `TODO` without a linked issue

Pragmas (`eslint-*`, `@ts-*`, `clippy::*`, formatter directives) are not comments in this sense.

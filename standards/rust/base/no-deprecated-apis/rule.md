---
id: no-deprecated-apis
title: No deprecated APIs
layer: any
presets: [base]
severity: error
outputs: [agents-md, cargo-lints]
lints:
  rust: { deprecated: deny }
---

Do not call APIs the compiler reports as deprecated. A deprecation is the author
telling you the call has a replacement and a removal date; adopting it now is
cheaper than a migration later.

The compiler's own `deprecated` lint is denied, so it flags exactly what the
`#[deprecated]` attributes say — no separate list to maintain.

## Bad

```rust
let name = input.trim_left();
```

## Good

```rust
let name = input.trim_start();
```

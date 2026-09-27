---
id: no-unsafe-code
title: No unsafe code
layer: any
presets: [base]
severity: error
outputs: [agents-md, cargo-lints]
lints:
  rust: { unsafe_code: forbid }
---

Do not write `unsafe` blocks, functions or impls. The lint is `forbid`, so no
attribute can re-enable it inside the crate: memory safety is the compiler's job,
and the libraries you depend on already carry the audited unsafe code.

## Bad

```rust
let health = unsafe { *health_ptr };
```

## Good

```rust
let health = query.get(entity)?.current;
```

## Exceptions

- None inside the crate. Code that truly needs `unsafe` belongs in its own small
  crate, outside this standard, with the invariants documented at each block

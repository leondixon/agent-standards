---
id: private-submodules
title: Private submodules
layer: any
presets: [base]
severity: error
outputs: [agents-md, ast-grep]
---

Declare submodules private and expose a module's surface with `pub use` from its
parent. A `pub mod` publishes the internal file layout, so callers reach into
`combat::damage::armour::reduce` and moving a file inside one module breaks
another.

Only `src/lib.rs` may declare `pub mod`: those are the crate's deliberate
top-level modules.

## Bad

```rust
// src/combat/mod.rs
pub mod damage;
pub mod armour;
```

```rust
use crate::combat::damage::apply_damage;
```

## Good

```rust
// src/combat/mod.rs
mod armour;
mod damage;

pub use damage::apply_damage;
```

```rust
use crate::combat::apply_damage;
```

## Exceptions

- `pub(crate) mod` and `pub(super) mod` are fine when a sibling genuinely needs the
  whole module, though `pub use` of the items is usually clearer

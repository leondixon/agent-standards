---
id: strict-clippy
title: Strict Clippy
layer: any
presets: [base]
severity: warn
outputs: [agents-md, cargo-lints]
lints:
  clippy: { pedantic: { level: warn, priority: -1 } }
---

Write code that passes Clippy's `pedantic` group, not just the default set. Pedantic
catches the quiet mistakes — needless clones, lossy casts, missing `#[must_use]`,
sloppy doc comments — that reviews miss and generated code repeats.

The group sits at priority `-1`, so a single lint set by another standard, or in a
narrower scope, overrides it. Fix the finding rather than reaching for an
exception; when one is justified, use `#[expect(clippy::lint, reason = "…")]`.

## Bad

```rust
fn total(items: &Vec<Item>) -> u64 {
    items.iter().map(|item| item.price).sum()
}
```

## Good

```rust
fn total(items: &[Item]) -> u64 {
    items.iter().map(|item| item.price).sum()
}
```

## Exceptions

- `nursery` is deliberately not enabled: its lints are unstable, noisy, and some
  (such as `redundant_pub_crate`) contradict other lints

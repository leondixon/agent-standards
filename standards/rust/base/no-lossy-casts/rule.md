---
id: no-lossy-casts
title: No lossy casts
layer: any
presets: [base]
severity: error
outputs: [agents-md, cargo-lints]
lints:
  clippy: { cast_possible_truncation: deny, cast_sign_loss: deny, cast_possible_wrap: deny, cast_lossless: deny, cast_precision_loss: allow }
---

Do not use `as` to convert between numeric types when the value can change. An
`as` cast truncates, wraps or drops the sign without a word — the compiler stops
checking exactly where you cast. Use `From` for conversions that cannot fail and
`TryFrom` for the ones that can.

## Bad

```rust
let index = entity_count as u16;
let delta = offset as u32;
let total = small as u64;
```

## Good

```rust
let index = u16::try_from(entity_count)?;
let delta = u32::try_from(offset)?;
let total = u64::from(small);
```

## Exceptions

- Integer to float (`cast_precision_loss`) is allowed. `usize as f32` for counts
  below 2^24 is exact, and it is routine in game maths such as averaging
  positions or scaling by a count
- A cast whose range is bounded by construction may use
  `#[expect(clippy::cast_possible_truncation, reason = "...")]`, with the reason
  naming the bound

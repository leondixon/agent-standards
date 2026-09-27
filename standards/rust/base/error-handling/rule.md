---
id: error-handling
title: Propagate errors, never panic
layer: any
presets: [base]
severity: error
outputs: [agents-md, cargo-lints, clippy-config]
lints:
  clippy: { unwrap_used: deny, expect_used: deny, panic: deny, map_err_ignore: deny, let_underscore_must_use: deny }
clippy:
  allow-unwrap-in-tests: true
  allow-expect-in-tests: true
  allow-panic-in-tests: true
---

Propagate errors with `?` and return `Result`; never `unwrap`, `expect` or
`panic!` outside tests. Keep the cause: an error carries its source up the
stack, so `.map_err(|_| ...)` and `let _ = fallible();` are not allowed.

## Error types

- `?` everywhere. Return the error you were given, or convert it with `From`
- Define a `thiserror` enum only when a caller matches on its variants, the same
  way a custom error class is only worth it when a boundary branches on it
- No `anyhow`. An opaque error hides what can fail; a concrete type documents it
- Model outcomes with `Result` and `Option`. Never a struct such as
  `{ ok: bool, error: String }`; the type system already has both shapes

## Bad

```rust
let config = fs::read_to_string(path).unwrap();

let level = parse(&config).map_err(|_| LoadError::Invalid)?;

let _ = save(&world);

pub struct SaveResult {
    pub ok: bool,
    pub error: String,
}
```

## Good

```rust
let config = fs::read_to_string(path)?;

let level = parse(&config).map_err(LoadError::Invalid)?;

save(&world)?;

#[derive(Debug, thiserror::Error)]
pub enum LoadError {
    #[error("could not read the level file")]
    Io(#[from] io::Error),
    #[error("the level file is malformed")]
    Invalid(#[source] ParseError),
}
```

## Exceptions

- Tests may `unwrap`, `expect` and `panic!`; `clippy.toml` allows them in
  `#[test]` functions and `#[cfg(test)]` modules
- A startup invariant that cannot fail in a correct build may `expect` under
  `#[expect(clippy::expect_used, reason = "...")]`, with the reason naming the
  invariant

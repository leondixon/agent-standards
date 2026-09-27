---
id: no-debug-leftovers
title: No debug leftovers
layer: any
presets: [base]
severity: error
outputs: [claude-rule, agents-md, cargo-lints]
lints:
  clippy: { dbg_macro: deny, todo: deny, unimplemented: deny, print_stdout: warn, print_stderr: warn }
---

Do not leave `dbg!`, `todo!`, `unimplemented!`, `println!` or `eprintln!` in
committed code. Log through `tracing`, or Bevy's `info!`, `warn!` and `error!`,
so output carries a level and a target and can be filtered.

## Bad

```rust
fn spawn_wave(mut commands: Commands, wave: Res<Wave>) {
    println!("spawning wave {}", wave.number);
    dbg!(&wave);
    todo!()
}
```

## Good

```rust
fn spawn_wave(mut commands: Commands, wave: Res<Wave>) {
    info!(wave = wave.number, "spawning wave");
    commands.spawn_batch(wave.enemies());
}
```

## Exceptions

- A binary whose job is to write to stdout, such as a CLI, may print under
  `#[expect(clippy::print_stdout, reason = "...")]`
- Unfinished work is tracked in an issue, not a `todo!()`; a `// TODO` comment
  must link that issue

---
id: bevy-system-params
title: Bevy system parameters
layer: any
presets: [bevy]
severity: warn
outputs: [mdc, agents-md, cargo-lints]
lints:
  clippy: { needless_pass_by_value: allow, too_many_arguments: allow, type_complexity: allow }
---

Write Bevy systems with the parameters they need, taken by value: `Res<T>`,
`ResMut<T>`, `Query<…>`, `Commands`. Bevy builds each argument for every run, so
three Clippy lints that make sense for ordinary functions are allowed crate-wide.

- `needless_pass_by_value`: `Res<T>` and `Query<…>` are cheap handles into the
  world, and a system must take them by value for Bevy to call it
- `too_many_arguments`: a system asks for everything it reads or writes, and
  eight or more parameters is common
- `type_complexity`: query types such as
  `Query<(&mut Transform, &Velocity), (With<Player>, Without<Frozen>)>` are the
  system's contract, and hiding them behind an alias makes that contract harder
  to read

A system is a plain Rust function that Bevy calls; it does not change the rules
for helpers it calls. When a system genuinely grows past a dozen parameters,
group related ones into a `#[derive(SystemParam)]` struct instead.

## Bad

```rust
type PlayerQuery<'w, 's> = Query<'w, 's, (&'static mut Transform, &'static Velocity), With<Player>>;

fn move_player(time: &Res<Time>, players: &mut PlayerQuery) { … }
```

## Good

```rust
fn move_player(time: Res<Time>, mut players: Query<(&mut Transform, &Velocity), With<Player>>) {
    for (mut transform, velocity) in &mut players {
        transform.translation += velocity.0 * time.delta_secs();
    }
}
```

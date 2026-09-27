---
id: bevy-lints
title: Bevy lints
layer: any
presets: [bevy]
severity: warn
outputs: [claude-rule, agents-md, cargo-lints]
lints:
  rust: { unexpected_cfgs: { level: warn, check-cfg: ['cfg(bevy_lint)'] } }
  bevy: { pedantic: warn, missing_reflect: warn }
---

Code passes `bevy lint` with its `pedantic` group and `missing_reflect` on, as
well as the groups it enables by default. `bevy_lint` knows Bevy's API the way
Clippy knows the standard library: it catches systems that take `&mut Commands`
instead of reborrowing, a `main` that drops the `AppExit`, components and
resources that forget `#[derive(Reflect)]`, and more.

- `pedantic` warns on `borrowed_reborrowable` and `main_return_without_appexit`
- `missing_reflect` keeps components, resources and messages inspectable by
  editors, scenes and the remote protocol. Register each type with the `App`
  too

The lint levels live in `[package.metadata.bevy_lint]` (or the workspace
equivalent), because `bevy_lint` has no stable `[lints.bevy]` table.

## Exceptions in code

`rustc` does not know the `bevy::` lint namespace, so name it only when
`bevy_lint` is checking the crate. Register the tool at each crate root:

```rust
#![cfg_attr(bevy_lint, feature(register_tool), register_tool(bevy))]
```

Then write an exception the same way as any other, behind the same `cfg_attr`:

```rust
#[derive(Component)]
#[cfg_attr(bevy_lint, expect(bevy::missing_reflect, reason = "holds a GPU handle that cannot be reflected"))]
struct RenderTarget(Handle<Image>);
```

The `unexpected_cfgs` lint is told about `cfg(bevy_lint)`, so plain `cargo` builds
do not warn about the attribute.

## Bad

```rust
fn main() {
    App::new().add_plugins(DefaultPlugins).run();
}

#[derive(Component)]
struct Health(u32);
```

## Good

```rust
fn main() -> AppExit {
    App::new().add_plugins(DefaultPlugins).run()
}

#[derive(Component, Reflect)]
#[reflect(Component)]
struct Health(u32);
```

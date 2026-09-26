---
id: bevy-fallible-systems
title: Fallible Bevy systems
layer: any
presets: [bevy]
severity: error
outputs: [mdc, agents-md, cargo-lints]
lints:
  bevy: { panicking_methods: deny }
---

A system that can fail returns `Result` and uses `?`; it never calls a Bevy method
that panics when an entity, component or resource is missing. Bevy passes the
returned error to its error handler, so a missing entity is logged instead of
crashing the game.

`bevy_lint`'s `panicking_methods` is denied: it flags calls such as
`World::entity()` and `World::resource()` that have a non-panicking alternative.

## Bad

```rust
fn follow_player(players: Query<&Transform, With<Player>>, mut cameras: Query<&mut Transform, With<Camera>>) {
    let player = players.single().unwrap();
    let mut camera = cameras.single_mut().unwrap();
    camera.translation = player.translation;
}

fn read_score(world: &mut World) {
    let score = world.resource::<Score>();
}
```

## Good

```rust
fn follow_player(
    players: Query<&Transform, (With<Player>, Without<Camera>)>,
    mut cameras: Query<&mut Transform, With<Camera>>,
) -> Result {
    let player = players.single()?;
    let mut camera = cameras.single_mut()?;
    camera.translation = player.translation;
    Ok(())
}

fn read_score(world: &mut World) -> Result {
    let score = world.get_resource::<Score>().ok_or("score resource missing")?;
    Ok(())
}
```

## Exceptions

- A system whose absence case is normal, such as "no player yet", may return
  early with `let Ok(player) = players.single() else { return Ok(()) };`

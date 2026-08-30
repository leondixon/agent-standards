## Bad

```rust
#[derive(Deserialize)]
#[serde(alias = "prospect")]
Lead,
```

## Good

```rust
pub enum UserStatus {
    Lead,
    Member,
    Inactive,
}
```

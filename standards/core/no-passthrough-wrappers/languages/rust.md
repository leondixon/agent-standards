## Bad

```rust
async fn fetch_user_data(db: &Db, id: Uuid) -> Result<User> {
    get_user(db, id).await
}
```

## Good

Call `get_user(db, id)` directly.

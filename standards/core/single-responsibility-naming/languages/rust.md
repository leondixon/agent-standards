## Bad

```rust
pub async fn refresh_score_if_due(db: &Db, customer_id: Uuid) -> Result<()> {
    if has_recent_score(db, customer_id).await? {
        return Ok(());
    }
    store_score(db, customer_id).await
}
```

## Good

```rust
if !has_recent_score(db, customer_id).await? {
    refresh_score(db, customer_id).await?;
}
```

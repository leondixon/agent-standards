## Bad

```rust
ensure_fresh_report(&db, customer_id).await?;
```

## Good

```rust
if !has_recent_report(&db, customer_id).await? {
    refresh_report(&db, customer_id).await?;
}
let report = get_current_report(&db, customer_id).await?;
```

The same rule governs systems that mutate shared state: keep the decision to run
in the caller, not buried behind a helper that silently decides for itself.

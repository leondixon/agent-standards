## Bad

```rust
pub async fn get_accounts_by_customer_id(db: &Db, customer_id: Uuid) -> Result<Vec<Account>> { … }
```

## Good

```rust
pub async fn get_accounts(db: &Db, customer_id: Uuid) -> Result<Vec<Account>> { … }
```

Rust's `find_by_*` convention from some ORM crates is the crate's API — this rule
governs your own collaborators.

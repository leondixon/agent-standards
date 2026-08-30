Doc comments (`///`) on public items are documentation, not internal commentary —
they are expected and this rule does not discourage them. It governs `//` comments
inside function bodies that restate the code.

## Bad

```rust
// increment the counter
counter += 1;
```

## Good

```rust
// Bureau rate-limits to one pull per 24h; a second call returns 429 not fresh data.
if !has_recent_report(db, customer_id).await? { … }
```

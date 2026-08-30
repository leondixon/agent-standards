## Bad

```rust
pub struct CampaignWithPartner {
    pub campaign: Campaign,
    pub partner: Partner,
}
```

## Good

Name the concept, or return a tuple the caller destructures at the boundary:

```rust
pub struct CampaignDetail {
    pub campaign: Campaign,
    pub partner: Partner,
}
```

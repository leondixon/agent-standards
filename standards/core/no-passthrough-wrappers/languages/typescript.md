## Bad

```ts
async function fetchUserData(id: string) {
  return getUser(id)
}
```

## Good

Call `getUser(id)` directly.

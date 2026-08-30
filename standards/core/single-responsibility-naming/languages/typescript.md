## Bad

```ts
export async function refreshScoreIfDue(customerId: string) {
  if (await hasRecentScore(customerId)) return
  await storeScore(customerId)
}
```

## Good

```ts
if (!(await hasRecentScore(customerId))) {
  await refreshScore(customerId)
}
```

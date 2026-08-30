## Bad

```ts
await ensureFreshCreditReport(customerId)
```

## Good

```ts
if (!(await hasRecentCreditReport(customerId))) {
  await refreshCreditReport(customerId)
}
const report = await getCurrentCreditReport(customerId)
```

Avoid a collaborator that loads, validates, calls an integration, and persists.
Prefer a caller that composes thin steps:

```ts
const parsed = paymentMethodSchema.parse(input)
const token = await tokenizeCard(parsed)
await storePaymentMethod({ userId, tokenId: token.id, last4: parsed.last4 })
```

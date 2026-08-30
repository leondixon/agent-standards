## Bad

```ts
// Get the user by id
export async function getUser(id: string) { … }

const total = price * quantity // multiply price by quantity
```

## Good

```ts
export async function getUser(id: string) { … }

// Bureau rejects requests within 24h of the last pull, so we gate on freshness.
if (!(await hasRecentReport(customerId))) { … }
```

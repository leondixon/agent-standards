## Bad

```sql
ALTER TYPE "UserStatus" RENAME VALUE 'prospect' TO 'lead';
```

```ts
status: z.enum(['prospect', 'lead', 'customer', 'member'])
```

## Good

```prisma
enum UserStatus {
  lead
  member
  inactive
}
```

Call sites use `lead` / `member` only. The old values are gone.

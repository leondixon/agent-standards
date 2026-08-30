## Bad

```ts
export type CampaignWithPartner = Campaign & { partner: Partner }

export async function getCampaignWithPartner(id: string) {
  return prisma.campaign.findUnique({ where: { id }, include: { partner: true } })
}
```

## Good

```ts
export async function getCampaign(id: string) {
  return prisma.campaign.findUnique({ where: { id }, include: { partner: true } })
}
```

Callers use the inferred return type. Annotate helpers with
`NonNullable<Awaited<ReturnType<typeof getCampaign>>>` when a name is genuinely needed.

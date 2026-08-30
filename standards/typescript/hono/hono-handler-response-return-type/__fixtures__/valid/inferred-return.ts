export async function submitLeadHandler(ctx: Context<AppEnv>) {
  return ctx.json({ ok: true }, 200);
}

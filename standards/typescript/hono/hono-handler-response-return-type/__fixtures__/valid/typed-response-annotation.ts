export async function handler(ctx: Context<AppEnv>): Promise<TypedResponse<{ ok: boolean }>> {
  return ctx.json({ ok: true }, 200);
}

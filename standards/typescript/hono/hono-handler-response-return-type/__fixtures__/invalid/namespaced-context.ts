export async function handler(ctx: hono.Context<AppEnv>): Promise<Response> {
  return ctx.json({ ok: true }, 200);
}

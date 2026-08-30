export function handler(ctx: Context<AppEnv>): Response {
  return ctx.json({ ok: true }, 200);
}

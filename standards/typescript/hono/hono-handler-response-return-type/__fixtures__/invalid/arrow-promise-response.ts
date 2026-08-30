export const handler = (ctx: Context<AppEnv>): Promise<Response> => ctx.json({ ok: true }, 200);

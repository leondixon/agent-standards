import type { Context } from 'hono';

export async function handler(ctx: Context) {
  return ctx.json({ code: 'UNAUTHORIZED', message: 'Nope' }, 401);
}

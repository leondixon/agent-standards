import type { Context } from 'hono';

export async function handler(
  ctx: Context,
  result: { status: 400 | 401; error: { code: string; message: string } },
) {
  return ctx.json(
    { code: result.error.code, message: result.error.message },
    result.status,
  );
}

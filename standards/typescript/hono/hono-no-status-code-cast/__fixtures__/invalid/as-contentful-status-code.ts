import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Context } from 'hono';

export async function handler(ctx: Context, statusCode: number) {
  return ctx.json(
    { code: 'AUTH_ERROR', message: 'Failed' },
    statusCode as ContentfulStatusCode,
  );
}

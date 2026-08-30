import type { ContentfulStatusCode, SuccessStatusCode } from 'hono/utils/http-status';
import type { Context } from 'hono';

export async function handler(ctx: Context, status: number) {
  return ctx.json(
    { code: 'HTTP_ERROR', message: 'Failed' },
    status as Exclude<ContentfulStatusCode, SuccessStatusCode>,
  );
}

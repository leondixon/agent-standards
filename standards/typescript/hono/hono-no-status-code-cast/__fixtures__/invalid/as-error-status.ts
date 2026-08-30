import type { ContentfulStatusCode, SuccessStatusCode } from 'hono/utils/http-status';
import type { Context } from 'hono';

type ErrorStatus = Exclude<ContentfulStatusCode, SuccessStatusCode>;

export async function handler(ctx: Context, status: number) {
  return ctx.json(
    { code: 'HTTP_ERROR', message: 'Failed' },
    status as ErrorStatus,
  );
}

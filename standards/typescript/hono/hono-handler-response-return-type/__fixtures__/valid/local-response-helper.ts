function tooManyRequests(ctx: Context): Response {
  return ctx.json({ code: 'RATE_LIMIT_EXCEEDED' }, 429);
}

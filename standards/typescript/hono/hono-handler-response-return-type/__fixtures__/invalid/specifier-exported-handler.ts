async function submitLeadHandler(ctx: Context<AppEnv, '/', LeadInput>): Promise<Response> {
  return ctx.json({ ok: true }, 200);
}

export { submitLeadHandler };

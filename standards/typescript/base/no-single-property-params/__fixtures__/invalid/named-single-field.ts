export async function getCampaign(params: {
  code: string;
}): Promise<unknown> {
  return params.code;
}

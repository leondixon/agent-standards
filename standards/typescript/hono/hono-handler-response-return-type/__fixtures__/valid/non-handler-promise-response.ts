export async function proxy(url: string): Promise<Response> {
  return fetch(url);
}

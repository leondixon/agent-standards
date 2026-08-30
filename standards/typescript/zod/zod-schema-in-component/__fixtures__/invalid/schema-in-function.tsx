import { z } from 'zod';

export function Form() {
  const schema = z.object({ name: z.string() });
  return schema;
}

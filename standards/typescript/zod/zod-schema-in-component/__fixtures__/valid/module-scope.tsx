import { z } from 'zod';

const schema = z.object({ name: z.string() });

export function Form() {
  return schema;
}

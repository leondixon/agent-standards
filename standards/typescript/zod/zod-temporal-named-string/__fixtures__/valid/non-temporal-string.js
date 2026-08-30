import { z } from 'zod';

export const schema = z.object({
  email: z.string(),
  firstName: z.string(),
  location: z.string(),
  timeoutMs: z.number(),
});

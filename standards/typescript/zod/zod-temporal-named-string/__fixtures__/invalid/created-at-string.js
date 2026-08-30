import { z } from 'zod';

export const schema = z.object({
  createdAt: z.string().min(1),
});

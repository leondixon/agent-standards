import { z } from 'zod';

export const schema = z.object({
  startTime: z.string().nullable(),
});

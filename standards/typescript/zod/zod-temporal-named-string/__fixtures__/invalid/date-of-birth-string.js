import { z } from 'zod';

export const schema = z.object({
  dateOfBirth: z.string().optional(),
});

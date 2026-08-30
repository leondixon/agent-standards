import { z } from 'zod';

export const schema = z.object({
  dateOfBirthDisplay: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  createdAtLabel: z.string(),
});

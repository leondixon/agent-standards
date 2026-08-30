import { z } from 'zod';

export const schema = z.object({
  dateOfBirth: z.iso.date(),
  createdAt: z.iso.datetime(),
  validFrom: z.iso.date().optional(),
  name: z.string(),
  status: z.string(),
});

import { z } from 'zod';

export const leadResponseSchema = z.object({
  result: z.literal('accepted'),
});

export type LeadResponse = z.infer<typeof leadResponseSchema>;

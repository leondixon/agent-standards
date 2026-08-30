import { z } from 'zod';

export const getScoreResultSchema = z.object({
  score: z.number(),
});

export type GetScoreResult = z.infer<typeof getScoreResultSchema>;

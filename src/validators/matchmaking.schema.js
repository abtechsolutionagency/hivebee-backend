import { z } from 'zod';

const decisionSchema = z.enum(['sweet', 'sting']);

export const workerCandidateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  minAge: z.coerce.number().int().min(18).max(100).optional(),
  maxAge: z.coerce.number().int().min(18).max(100).optional(),
  location: z.string().min(1).max(120).optional(),
  faith: z.string().min(1).max(64).optional(),
  search: z.string().min(1).max(80).optional()
});

export const workerSubmissionSchema = z.object({
  candidateUserId: z.string().min(12).max(64),
  decision: decisionSchema,
  note: z.string().max(500).optional()
});

export const primaryDecisionSchema = z.object({
  decision: decisionSchema
});

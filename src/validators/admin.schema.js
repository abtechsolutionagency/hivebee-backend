import { z } from 'zod';

export const adminListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().min(1).max(80).optional(),
  role: z.enum(['king_bee', 'queen_bee', 'worker_bee', 'admin']).optional(),
  accountStatus: z.enum(['active', 'suspended', 'banned']).optional()
});

export const adminUpdateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned']),
  reason: z.string().max(300).optional()
});

export const adminModerateReportSchema = z.object({
  status: z.enum(['open', 'reviewed', 'resolved']),
  action: z.enum(['none', 'suspend', 'ban']).default('none'),
  note: z.string().max(500).optional()
});

export const adminUpsertTierSchema = z.object({
  displayName: z.string().min(2).max(80),
  monthlyPriceUsd: z.number().min(0),
  workerLimit: z.number().int().min(0),
  suggestionsPerMonth: z.number().int().min(0).nullable().optional(),
  searchPriorityWeight: z.number().int().min(0),
  stripePriceId: z.string().max(120).optional(),
  isActive: z.boolean().optional()
});

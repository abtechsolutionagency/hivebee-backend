import { z } from 'zod';

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(2000)
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  before: z.string().datetime().optional()
});

export const blockUserSchema = z.object({
  targetUserId: z.string().min(12).max(64)
});

export const reportUserSchema = z.object({
  targetUserId: z.string().min(12).max(64),
  reason: z.string().min(3).max(120),
  details: z.string().max(1000).optional()
});

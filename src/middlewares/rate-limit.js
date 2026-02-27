import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiRateLimit = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false
});

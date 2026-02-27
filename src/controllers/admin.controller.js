import { asyncHandler } from '../utils/async-handler.js';
import { ok } from '../utils/http-response.js';
import {
  adminListUsersQuerySchema,
  adminModerateReportSchema,
  adminUpdateUserStatusSchema,
  adminUpsertTierSchema
} from '../validators/admin.schema.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { adminService } from '../services/admin.service.js';

const parse = (schema, payload) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError('Validation failed', 400, ERROR_CODES.VALIDATION_ERROR, result.error.flatten());
  }

  return result.data;
};

export const adminController = {
  listUsers: asyncHandler(async (req, res) => {
    const query = parse(adminListUsersQuerySchema, req.query);
    const data = await adminService.listUsers(query);
    return ok(res, data, 'Users fetched');
  }),

  updateUserStatus: asyncHandler(async (req, res) => {
    const payload = parse(adminUpdateUserStatusSchema, req.body);
    const data = await adminService.updateUserAccountStatus(req.params.userId, payload);
    return ok(res, data, 'User status updated');
  }),

  listReports: asyncHandler(async (_req, res) => {
    const data = await adminService.listReports();
    return ok(res, data, 'Reports fetched');
  }),

  moderateReport: asyncHandler(async (req, res) => {
    const payload = parse(adminModerateReportSchema, req.body);
    const data = await adminService.moderateReport(req.params.reportId, payload);
    return ok(res, data, 'Report moderated');
  }),

  getMatchStats: asyncHandler(async (_req, res) => {
    const data = await adminService.getMatchStats();
    return ok(res, data, 'Match statistics fetched');
  }),

  listSubscriptionTiers: asyncHandler(async (_req, res) => {
    const data = await adminService.listSubscriptionTiers();
    return ok(res, data, 'Subscription tiers fetched');
  }),

  upsertSubscriptionTier: asyncHandler(async (req, res) => {
    const payload = parse(adminUpsertTierSchema, req.body);
    const data = await adminService.upsertSubscriptionTier(req.params.planCode, payload);
    return ok(res, data, 'Subscription tier updated');
  })
};

import { Connection } from '../models/connection.model.js';
import { SubscriptionTier } from '../models/subscription-tier.model.js';
import { User } from '../models/user.model.js';
import { UserReport } from '../models/user-report.model.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { SUBSCRIPTION_PLANS } from '../constants/subscription-plans.js';

const ensureFound = (resource, message) => {
  if (!resource) {
    throw new AppError(message, 404, ERROR_CODES.NOT_FOUND);
  }

  return resource;
};

const defaultTiers = Object.entries(SUBSCRIPTION_PLANS).map(([planCode, config]) => ({
  planCode,
  displayName: config.displayName,
  monthlyPriceUsd: config.monthlyPriceUsd,
  workerLimit: config.workerLimit,
  suggestionsPerMonth: config.suggestionsPerMonth,
  searchPriorityWeight: config.searchPriorityWeight,
  stripePriceId: '',
  isActive: true
}));

const syncDefaultTiers = async () => {
  for (const tier of defaultTiers) {
    await SubscriptionTier.updateOne({ planCode: tier.planCode }, { $setOnInsert: tier }, { upsert: true });
  }
};

export const adminService = {
  async listUsers(query) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filters = {};

    if (query.role) {
      filters.role = query.role;
    }

    if (query.accountStatus) {
      filters.accountStatus = query.accountStatus;
    }

    if (query.search) {
      filters.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { username: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filters)
        .select('name username email role accountStatus isActive emailVerified profileCompleted subscription createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filters)
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items
    };
  },

  async updateUserAccountStatus(userId, payload) {
    const updates = {
      accountStatus: payload.status,
      isActive: payload.status === 'active',
      moderation: {
        reason: payload.reason ?? null,
        updatedAt: new Date()
      }
    };

    if (payload.status === 'banned') {
      updates.bannedAt = new Date();
      updates.suspendedAt = null;
    }

    if (payload.status === 'suspended') {
      updates.suspendedAt = new Date();
      updates.bannedAt = null;
    }

    if (payload.status === 'active') {
      updates.bannedAt = null;
      updates.suspendedAt = null;
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true })
      .select('name username email role accountStatus isActive bannedAt suspendedAt moderation')
      .lean();

    return ensureFound(user, 'User not found');
  },

  async listReports() {
    return UserReport.find()
      .populate('reporterUserId', 'name username email role')
      .populate('reportedUserId', 'name username email role accountStatus isActive')
      .sort({ createdAt: -1 })
      .lean();
  },

  async moderateReport(reportId, payload) {
    const report = await UserReport.findById(reportId).lean();
    ensureFound(report, 'Report not found');

    if (payload.action === 'suspend') {
      await this.updateUserAccountStatus(report.reportedUserId, { status: 'suspended', reason: payload.note });
    }

    if (payload.action === 'ban') {
      await this.updateUserAccountStatus(report.reportedUserId, { status: 'banned', reason: payload.note });
    }

    const updatedReport = await UserReport.findByIdAndUpdate(
      reportId,
      {
        status: payload.status,
        moderatorNote: payload.note ?? null,
        moderatedAt: new Date()
      },
      { new: true }
    )
      .populate('reporterUserId', 'name username email role')
      .populate('reportedUserId', 'name username email role accountStatus isActive')
      .lean();

    return ensureFound(updatedReport, 'Report not found');
  },

  async getMatchStats() {
    const [totalMatchesMade, unlockedConnections, activeUsers, primaryUsers, workerUsers] = await Promise.all([
      Connection.countDocuments({ source: 'mutual_sweet' }),
      Connection.countDocuments({ messagingUnlocked: true }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['king_bee', 'queen_bee'] } }),
      User.countDocuments({ role: 'worker_bee' })
    ]);

    return {
      totalMatchesMade,
      unlockedConnections,
      activeUsers,
      primaryUsers,
      workerUsers
    };
  },

  async listSubscriptionTiers() {
    await syncDefaultTiers();
    return SubscriptionTier.find().sort({ monthlyPriceUsd: 1 }).lean();
  },

  async upsertSubscriptionTier(planCode, payload) {
    await syncDefaultTiers();

    const tier = await SubscriptionTier.findOneAndUpdate(
      { planCode },
      {
        planCode,
        displayName: payload.displayName,
        monthlyPriceUsd: payload.monthlyPriceUsd,
        workerLimit: payload.workerLimit,
        suggestionsPerMonth: payload.suggestionsPerMonth ?? null,
        searchPriorityWeight: payload.searchPriorityWeight,
        stripePriceId: payload.stripePriceId ?? '',
        isActive: payload.isActive ?? true
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return tier;
  }
};

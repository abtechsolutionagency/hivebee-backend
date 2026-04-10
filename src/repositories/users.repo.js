import mongoose from 'mongoose';
import { User } from '../models/user.model.js';

const toObjectId = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id));

export const usersRepository = {
  list: () => User.find().sort({ createdAt: -1 }).lean(),
  countPrimaryUsers: () => User.countDocuments({ role: { $in: ['king_bee', 'queen_bee'] } }),
  findById: (id) => User.findById(id).lean(),
  findByIdWithPassword: (id) => User.findById(id).select('+passwordHash').lean(),
  findByEmail: (email) => User.findOne({ email }).lean(),
  findByEmailWithVerification: (email) =>
    User.findOne({ email }).select('+emailVerification.tokenHash').lean(),
  findByUsername: (username) => User.findOne({ username }).lean(),
  findByEmailWithPassword: (email) => User.findOne({ email }).select('+passwordHash').lean(),
  findByVerificationTokenHash: (tokenHash) =>
    User.findOne({ 'emailVerification.tokenHash': tokenHash }).select('+emailVerification.tokenHash').lean(),
  findByStripeSubscriptionId: (stripeSubscriptionId) =>
    User.findOne({ 'subscription.stripeSubscriptionId': stripeSubscriptionId }).lean(),
  create: (payload) => User.create(payload),
  updateById: (id, payload) => User.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean(),
  deleteById: (id) => User.findByIdAndDelete(id).lean(),
  countWorkersForPrimary: (primaryUserId) => User.countDocuments({
    role: 'worker_bee',
    'workerAccount.primaryUserId': primaryUserId
  }),
  listWorkersForPrimary: (primaryUserId) =>
    User.find({
      role: 'worker_bee',
      'workerAccount.primaryUserId': primaryUserId
    })
      .select('username name email isActive createdAt workerAccount.joinedAt')
      .sort({ createdAt: -1 })
      .lean(),
  findWorkerWithPrimary: (workerUserId) =>
    User.findOne({ _id: workerUserId, role: 'worker_bee' }).select('workerAccount').lean(),
  listCandidateProfilesForWorker: ({ primaryUserId, allowedRoles, filters, skip, limit }) => {
    const query = {
      role: { $in: allowedRoles },
      profileCompleted: true,
      emailVerified: true,
      _id: { $ne: toObjectId(primaryUserId) },
      isActive: { $ne: false }
    };

    if (filters.minAge || filters.maxAge) {
      query['primaryProfile.age'] = {};
      if (filters.minAge) query['primaryProfile.age'].$gte = filters.minAge;
      if (filters.maxAge) query['primaryProfile.age'].$lte = filters.maxAge;
    }

    if (filters.location) {
      query['primaryProfile.location'] = { $regex: filters.location, $options: 'i' };
    }

    if (filters.faith) {
      query['primaryProfile.faithAndValues.christianDenomination'] = {
        $regex: filters.faith,
        $options: 'i'
      };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { username: { $regex: filters.search, $options: 'i' } },
        { 'primaryProfile.displayName': { $regex: filters.search, $options: 'i' } }
      ];
    }

    return User.find(query)
      .select('name username role primaryProfile.displayName primaryProfile.age primaryProfile.location primaryProfile.faithAndValues')
      .sort({ 'subscription.searchPriorityWeight': -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },
  listCandidateProfilesForPrimary: ({ primaryUserId, allowedRoles, filters, skip, limit }) => {
    const query = {
      role: { $in: allowedRoles },
      profileCompleted: true,
      emailVerified: true,
      _id: { $ne: toObjectId(primaryUserId) },
      isActive: { $ne: false }
    };

    if (filters.minAge || filters.maxAge) {
      query['primaryProfile.age'] = {};
      if (filters.minAge) query['primaryProfile.age'].$gte = filters.minAge;
      if (filters.maxAge) query['primaryProfile.age'].$lte = filters.maxAge;
    }

    if (filters.location) {
      query['primaryProfile.location'] = { $regex: filters.location, $options: 'i' };
    }

    if (filters.faith) {
      query['primaryProfile.faithAndValues.christianDenomination'] = {
        $regex: filters.faith,
        $options: 'i'
      };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { username: { $regex: filters.search, $options: 'i' } },
        { 'primaryProfile.displayName': { $regex: filters.search, $options: 'i' } }
      ];
    }

    return User.find(query)
      .select('name username role primaryProfile.displayName primaryProfile.age primaryProfile.location primaryProfile.faithAndValues')
      .sort({ 'subscription.searchPriorityWeight': -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },
  countCandidateProfilesForWorker: ({ primaryUserId, allowedRoles, filters }) => {
    const query = {
      role: { $in: allowedRoles },
      _id: { $ne: toObjectId(primaryUserId) },
      isActive: { $ne: false }
    };

    if (filters.minAge || filters.maxAge) {
      query['primaryProfile.age'] = {};
      if (filters.minAge) query['primaryProfile.age'].$gte = filters.minAge;
      if (filters.maxAge) query['primaryProfile.age'].$lte = filters.maxAge;
    }

    if (filters.location) {
      query['primaryProfile.location'] = { $regex: filters.location, $options: 'i' };
    }

    if (filters.faith) {
      query['primaryProfile.faithAndValues.christianDenomination'] = {
        $regex: filters.faith,
        $options: 'i'
      };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { username: { $regex: filters.search, $options: 'i' } },
        { 'primaryProfile.displayName': { $regex: filters.search, $options: 'i' } }
      ];
    }

    return User.countDocuments(query);
  },
  countCandidateProfilesForPrimary: ({ primaryUserId, allowedRoles, filters }) => {
    const query = {
      role: { $in: allowedRoles },
      profileCompleted: true,
      emailVerified: true,
      _id: { $ne: toObjectId(primaryUserId) },
      isActive: { $ne: false }
    };

    if (filters.minAge || filters.maxAge) {
      query['primaryProfile.age'] = {};
      if (filters.minAge) query['primaryProfile.age'].$gte = filters.minAge;
      if (filters.maxAge) query['primaryProfile.age'].$lte = filters.maxAge;
    }

    if (filters.location) {
      query['primaryProfile.location'] = { $regex: filters.location, $options: 'i' };
    }

    if (filters.faith) {
      query['primaryProfile.faithAndValues.christianDenomination'] = {
        $regex: filters.faith,
        $options: 'i'
      };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { username: { $regex: filters.search, $options: 'i' } },
        { 'primaryProfile.displayName': { $regex: filters.search, $options: 'i' } }
      ];
    }

    return User.countDocuments(query);
  },
  findCandidateProfileByIdForWorker: ({ candidateUserId, allowedRoles }) =>
    User.findOne({
      _id: toObjectId(candidateUserId),
      role: { $in: allowedRoles },
      isActive: { $ne: false }
    })
      .select('name username role primaryProfile')
      .lean()
};

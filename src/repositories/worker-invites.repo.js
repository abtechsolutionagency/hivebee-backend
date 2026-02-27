import { WorkerInvite } from '../models/worker-invite.model.js';

export const workerInvitesRepository = {
  create: (payload) => WorkerInvite.create(payload),
  findByCode: (code) => WorkerInvite.findOne({ code }).lean(),
  countPendingForPrimary: (primaryUserId) =>
    WorkerInvite.countDocuments({
      primaryUserId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }),
  acceptInvite: (id, acceptedByUserId) =>
    WorkerInvite.findByIdAndUpdate(
      id,
      {
        status: 'accepted',
        acceptedByUserId,
        acceptedAt: new Date()
      },
      { new: true }
    ).lean(),
  listForPrimary: (primaryUserId) =>
    WorkerInvite.find({ primaryUserId })
      .populate('acceptedByUserId', 'username name email')
      .sort({ createdAt: -1 })
      .lean()
};

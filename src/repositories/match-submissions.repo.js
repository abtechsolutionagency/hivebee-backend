import { MatchSubmission } from '../models/match-submission.model.js';

export const matchSubmissionsRepository = {
  upsertWorkerSubmission: ({ primaryUserId, workerUserId, candidateUserId, workerDecision, workerNote }) =>
    MatchSubmission.findOneAndUpdate(
      { primaryUserId, workerUserId, candidateUserId },
      {
        primaryUserId,
        workerUserId,
        candidateUserId,
        workerDecision,
        workerNote
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    )
      .populate('candidateUserId', 'name username role primaryProfile')
      .lean(),

  listWorkerSubmissions: (workerUserId) =>
    MatchSubmission.find({ workerUserId })
      .populate('candidateUserId', 'name username role primaryProfile')
      .sort({ updatedAt: -1 })
      .lean(),

  listPrimaryFeed: (primaryUserId) =>
    MatchSubmission.find({ primaryUserId })
      .populate('workerUserId', 'name username email')
      .populate('candidateUserId', 'name username role primaryProfile')
      .sort({ createdAt: -1 })
      .lean(),

  findById: (id) => MatchSubmission.findById(id).lean(),

  updatePrimaryDecision: (id, primaryDecision) =>
    MatchSubmission.findByIdAndUpdate(
      id,
      {
        primaryDecision,
        primaryReviewedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('workerUserId', 'name username email')
      .populate('candidateUserId', 'name username role primaryProfile')
      .lean(),

  findMutualCandidateSubmission: ({ primaryUserId, candidateUserId }) =>
    MatchSubmission.findOne({
      primaryUserId: candidateUserId,
      candidateUserId: primaryUserId,
      primaryDecision: 'sweet'
    })
      .populate('primaryUserId', 'name username primaryProfile')
      .lean(),

  listMutualSweetByPrimary: (primaryUserId) =>
    MatchSubmission.find({
      primaryUserId,
      primaryDecision: 'sweet'
    })
      .populate('candidateUserId', 'name username primaryProfile')
      .sort({ primaryReviewedAt: -1 })
      .lean()
};

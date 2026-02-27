import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { usersRepository } from '../repositories/users.repo.js';
import { matchSubmissionsRepository } from '../repositories/match-submissions.repo.js';
import { env } from '../config/env.js';
import { Connection } from '../models/connection.model.js';
import { notificationsService } from './notifications.service.js';

const ensureFound = (resource, message) => {
  if (!resource) {
    throw new AppError(message, 404, ERROR_CODES.NOT_FOUND);
  }
  return resource;
};

const ensureWorkerBoundToPrimary = async (workerId) => {
  const worker = await usersRepository.findWorkerWithPrimary(workerId);
  ensureFound(worker, 'Worker account not found');

  if (!worker.workerAccount?.primaryUserId) {
    throw new AppError('Worker account is not linked to a primary user', 403, ERROR_CODES.FORBIDDEN);
  }

  return worker.workerAccount.primaryUserId.toString();
};

const resolveWorkerPrimaryContext = async (workerId) => {
  const primaryUserId = await ensureWorkerBoundToPrimary(workerId);
  const primary = await usersRepository.findById(primaryUserId);
  ensureFound(primary, 'Primary account not found');

  if (!['king_bee', 'queen_bee'].includes(primary.role)) {
    throw new AppError(
      'Worker must be linked to a king_bee or queen_bee primary account',
      403,
      ERROR_CODES.FORBIDDEN
    );
  }

  const allowedRoles = primary.role === 'king_bee' ? ['queen_bee'] : ['king_bee'];

  return {
    primaryUserId,
    allowedRoles
  };
};

const makePairKey = (userA, userB) => [String(userA), String(userB)].sort().join(':');

const ensureMutualConnection = async (userAId, userBId) => {
  const pairKey = makePairKey(userAId, userBId);
  const existing = await Connection.findOne({ pairKey }).lean();

  if (existing) {
    return { connection: existing, created: false };
  }

  const connection = await Connection.create({
    users: [userAId, userBId],
    pairKey,
    messagingUnlocked: true,
    unlockedAt: new Date(),
    source: 'mutual_sweet'
  });

  return { connection: connection.toObject(), created: true };
};

export const matchmakingService = {
  async listWorkerCandidates(workerUserId, query) {
    const { primaryUserId, allowedRoles } = await resolveWorkerPrimaryContext(workerUserId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    if (query.minAge && query.maxAge && query.minAge > query.maxAge) {
      throw new AppError('minAge must be less than or equal to maxAge', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const filters = {
      minAge: query.minAge,
      maxAge: query.maxAge,
      location: query.location,
      faith: query.faith,
      search: query.search
    };

    const [items, total] = await Promise.all([
      usersRepository.listCandidateProfilesForWorker({
        primaryUserId,
        allowedRoles,
        filters,
        skip,
        limit
      }),
      usersRepository.countCandidateProfilesForWorker({ primaryUserId, allowedRoles, filters })
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items
    };
  },

  async getWorkerCandidateProfile(workerUserId, candidateUserId) {
    const { primaryUserId, allowedRoles } = await resolveWorkerPrimaryContext(workerUserId);

    if (primaryUserId === candidateUserId) {
      throw new AppError('Cannot review your own primary profile', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    return ensureFound(
      await usersRepository.findCandidateProfileByIdForWorker({
        candidateUserId,
        allowedRoles
      }),
      'Candidate profile not found'
    );
  },

  async submitWorkerDecision(workerUserId, payload) {
    const { primaryUserId, allowedRoles } = await resolveWorkerPrimaryContext(workerUserId);

    if (primaryUserId === payload.candidateUserId) {
      throw new AppError('Cannot review your own primary profile', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const candidate = await usersRepository.findCandidateProfileByIdForWorker({
      candidateUserId: payload.candidateUserId,
      allowedRoles
    });

    ensureFound(candidate, 'Candidate profile not found');

    return matchSubmissionsRepository.upsertWorkerSubmission({
      primaryUserId,
      workerUserId,
      candidateUserId: payload.candidateUserId,
      workerDecision: payload.decision,
      workerNote: payload.note
    });
  },

  async listWorkerReviewedProfiles(workerUserId) {
    const submissions = await matchSubmissionsRepository.listWorkerSubmissions(workerUserId);

    return submissions.map((submission) => ({
      _id: submission._id,
      workerDecision: submission.workerDecision,
      primaryDecision: submission.primaryDecision,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      candidate: submission.candidateUserId
    }));
  },

  async getWorkerPrimaryShareLink(workerUserId) {
    const primaryUserId = await ensureWorkerBoundToPrimary(workerUserId);
    const primary = await usersRepository.findById(primaryUserId);
    ensureFound(primary, 'Primary profile not found');

    return {
      primaryUserId,
      primaryName: primary.name,
      profileShareLink: `${env.appBaseUrl}/profiles/${primaryUserId}?sharedByWorker=${workerUserId}`
    };
  },

  async listPrimaryCuratedFeed(primaryUserId) {
    const feed = await matchSubmissionsRepository.listPrimaryFeed(primaryUserId);
    const sweetFeed = feed.filter((item) => item.workerDecision === 'sweet');

    const recommendationMap = new Map();
    for (const item of sweetFeed) {
      const key = item.candidateUserId?._id?.toString() || '';
      if (!key) {
        continue;
      }
      recommendationMap.set(key, (recommendationMap.get(key) || 0) + 1);
    }

    sweetFeed.sort((a, b) => {
      const aKey = a.candidateUserId?._id?.toString() || '';
      const bKey = b.candidateUserId?._id?.toString() || '';
      const aCount = recommendationMap.get(aKey) || 0;
      const bCount = recommendationMap.get(bKey) || 0;

      if (aCount !== bCount) {
        return bCount - aCount;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sweetFeed.map((item) => ({
      _id: item._id,
      workerDecision: item.workerDecision,
      workerNote: item.workerNote,
      primaryDecision: item.primaryDecision,
      createdAt: item.createdAt,
      recommendationCount: recommendationMap.get(item.candidateUserId?._id?.toString() || '') || 0,
      worker: item.workerUserId,
      candidate: item.candidateUserId
    }));
  },

  async decidePrimarySubmission(primaryUserId, submissionId, decision) {
    const submission = await matchSubmissionsRepository.findById(submissionId);
    ensureFound(submission, 'Submission not found');

    if (submission.primaryUserId.toString() !== primaryUserId) {
      throw new AppError('Cannot decide submission outside your feed', 403, ERROR_CODES.FORBIDDEN);
    }

    const updated = ensureFound(
      await matchSubmissionsRepository.updatePrimaryDecision(submissionId, decision),
      'Submission not found'
    );

    if (decision === 'sweet') {
      const reciprocal = await matchSubmissionsRepository.findMutualCandidateSubmission({
        primaryUserId,
        candidateUserId: submission.candidateUserId.toString()
      });

      if (reciprocal) {
        const { connection, created } = await ensureMutualConnection(
          primaryUserId,
          submission.candidateUserId.toString()
        );

        if (created) {
          await Promise.all([
            notificationsService.createNotification({
              userId: primaryUserId,
              type: 'mutual_sweet',
              title: 'It is a match!',
              body: 'Messaging is now unlocked for your mutual sweet connection.',
              metadata: {
                connectionId: connection._id,
                matchedUserId: submission.candidateUserId
              }
            }),
            notificationsService.createNotification({
              userId: submission.candidateUserId,
              type: 'mutual_sweet',
              title: 'It is a match!',
              body: 'Messaging is now unlocked for your mutual sweet connection.',
              metadata: {
                connectionId: connection._id,
                matchedUserId: primaryUserId
              }
            })
          ]);
        }
      }
    }

    return updated;
  },

  async listPrimaryMutualSweetConnections(primaryUserId) {
    const sweetDecisions = await matchSubmissionsRepository.listMutualSweetByPrimary(primaryUserId);

    const mutual = [];

    for (const decision of sweetDecisions) {
      const reciprocal = await matchSubmissionsRepository.findMutualCandidateSubmission({
        primaryUserId,
        candidateUserId: decision.candidateUserId._id.toString()
      });

      if (reciprocal) {
        const { connection } = await ensureMutualConnection(
          primaryUserId,
          decision.candidateUserId._id.toString()
        );

        mutual.push({
          candidate: decision.candidateUserId,
          matchedAt: decision.primaryReviewedAt ?? decision.updatedAt,
          connectionId: connection._id
        });
      }
    }

    return mutual;
  }
};

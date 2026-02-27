import { asyncHandler } from '../utils/async-handler.js';
import { created, ok } from '../utils/http-response.js';
import {
  primaryDecisionSchema,
  workerCandidateQuerySchema,
  workerSubmissionSchema
} from '../validators/matchmaking.schema.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { matchmakingService } from '../services/matchmaking.service.js';

const parse = (schema, payload) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError('Validation failed', 400, ERROR_CODES.VALIDATION_ERROR, result.error.flatten());
  }

  return result.data;
};

export const matchmakingController = {
  workerListCandidates: asyncHandler(async (req, res) => {
    const query = parse(workerCandidateQuerySchema, req.query);
    const data = await matchmakingService.listWorkerCandidates(req.authUser._id.toString(), query);
    return ok(res, data, 'Candidates fetched');
  }),

  workerGetCandidateProfile: asyncHandler(async (req, res) => {
    const data = await matchmakingService.getWorkerCandidateProfile(
      req.authUser._id.toString(),
      req.params.candidateUserId
    );
    return ok(res, data, 'Candidate profile fetched');
  }),

  workerSubmitDecision: asyncHandler(async (req, res) => {
    const payload = parse(workerSubmissionSchema, req.body);
    const data = await matchmakingService.submitWorkerDecision(req.authUser._id.toString(), payload);
    return created(res, data, 'Submission saved');
  }),

  workerReviewedProfiles: asyncHandler(async (req, res) => {
    const data = await matchmakingService.listWorkerReviewedProfiles(req.authUser._id.toString());
    return ok(res, data, 'Reviewed profiles fetched');
  }),

  workerPrimaryShareLink: asyncHandler(async (req, res) => {
    const data = await matchmakingService.getWorkerPrimaryShareLink(req.authUser._id.toString());
    return ok(res, data, 'Share link fetched');
  }),

  primaryCuratedFeed: asyncHandler(async (req, res) => {
    const data = await matchmakingService.listPrimaryCuratedFeed(req.authUser._id.toString());
    return ok(res, data, 'Curated feed fetched');
  }),

  primaryDecideSubmission: asyncHandler(async (req, res) => {
    const payload = parse(primaryDecisionSchema, req.body);
    const data = await matchmakingService.decidePrimarySubmission(
      req.authUser._id.toString(),
      req.params.submissionId,
      payload.decision
    );
    return ok(res, data, 'Decision saved');
  }),

  primaryMutualConnections: asyncHandler(async (req, res) => {
    const data = await matchmakingService.listPrimaryMutualSweetConnections(req.authUser._id.toString());
    return ok(res, data, 'Mutual sweet connections fetched');
  })
};

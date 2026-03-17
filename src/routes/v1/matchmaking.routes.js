import { Router } from 'express';
import {
  requireActiveSubscription,
  requireAuth,
  requireCompletedProfile,
  requirePrimaryUser,
  requireVerifiedEmail,
  requireWorkerUser
} from '../../middlewares/auth.js';
import { matchmakingController } from '../../controllers/matchmaking.controller.js';

const matchmakingRouter = Router();

matchmakingRouter.get(
  '/worker/dashboard',
  requireAuth,
  requireWorkerUser,
  matchmakingController.workerDashboard
);

matchmakingRouter.get(
  '/primary/search',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  requireCompletedProfile,
  requireActiveSubscription,
  matchmakingController.primarySearchCandidates
);

matchmakingRouter.get(
  '/worker/candidates',
  requireAuth,
  requireWorkerUser,
  matchmakingController.workerListCandidates
);
matchmakingRouter.get(
  '/worker/candidates/:candidateUserId',
  requireAuth,
  requireWorkerUser,
  matchmakingController.workerGetCandidateProfile
);
matchmakingRouter.post(
  '/worker/submissions',
  requireAuth,
  requireWorkerUser,
  matchmakingController.workerSubmitDecision
);
matchmakingRouter.get(
  '/worker/reviewed',
  requireAuth,
  requireWorkerUser,
  matchmakingController.workerReviewedProfiles
);
matchmakingRouter.get(
  '/worker/primary-share-link',
  requireAuth,
  requireWorkerUser,
  matchmakingController.workerPrimaryShareLink
);

matchmakingRouter.get(
  '/primary/feed',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  requireCompletedProfile,
  requireActiveSubscription,
  matchmakingController.primaryCuratedFeed
);
matchmakingRouter.post(
  '/primary/feed/:submissionId/decision',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  requireCompletedProfile,
  requireActiveSubscription,
  matchmakingController.primaryDecideSubmission
);
matchmakingRouter.get(
  '/primary/mutual-connections',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  requireCompletedProfile,
  requireActiveSubscription,
  matchmakingController.primaryMutualConnections
);

export { matchmakingRouter };

import { Router } from 'express';
import {
  requireActiveSubscription,
  requireAuth,
  requireCompletedProfile,
  requirePrimaryUser,
  requireVerifiedEmail
} from '../../middlewares/auth.js';
import { uploadProfilePicture } from '../../middlewares/upload.js';
import { usersController } from '../../controllers/users.controller.js';

const usersRouter = Router();

usersRouter.get('/subscription/plans', usersController.getSubscriptionPlans);
usersRouter.post('/register', usersController.register);
usersRouter.post('/login', usersController.login);
usersRouter.post('/verify-email', usersController.verifyPrimaryEmail);
usersRouter.post('/worker-signup', usersController.signupWorkerWithInvite);
usersRouter.post(
  '/me/verify-email/resend',
  requireAuth,
  requirePrimaryUser,
  usersController.resendPrimaryVerification
);

usersRouter.get('/me', requireAuth, usersController.me);

usersRouter.get(
  '/me/dashboard/primary',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  usersController.primaryDashboard
);

// General picture upload – returns { url }; use this URL in profile, smile picture, or anywhere in the app
usersRouter.post('/me/upload/picture', requireAuth, uploadProfilePicture, usersController.uploadPicture);

usersRouter.patch(
  '/me/primary-profile',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  usersController.updatePrimaryProfile
);
// Upload file and set as primary profile (smile) picture in one step
usersRouter.post(
  '/me/primary-profile/picture',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  uploadProfilePicture,
  usersController.uploadProfilePicture
);
usersRouter.post(
  '/me/subscription/checkout',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  requireCompletedProfile,
  usersController.createSubscriptionCheckout
);
usersRouter.get(
  '/me/subscription',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  usersController.getMySubscription
);
usersRouter.post(
  '/me/subscription/billing-portal',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  usersController.createBillingPortal
);
usersRouter.post(
  '/me/subscription/change-plan',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  usersController.changeMySubscriptionPlan
);
usersRouter.post(
  '/me/subscription/cancel',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  usersController.cancelMySubscription
);
usersRouter.post(
  '/me/subscription/resume',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  usersController.resumeMySubscription
);
usersRouter.post(
  '/me/worker-invites',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  requireCompletedProfile,
  requireActiveSubscription,
  usersController.createWorkerInvite
);
usersRouter.get(
  '/me/worker-invites',
  requireAuth,
  requirePrimaryUser,
  requireVerifiedEmail,
  usersController.listMyWorkerInvites
);
usersRouter.get('/me/workers', requireAuth, requirePrimaryUser, requireVerifiedEmail, usersController.listMyWorkers);

usersRouter.post('/subscription/stripe-webhook', usersController.stripeWebhook);

export { usersRouter };

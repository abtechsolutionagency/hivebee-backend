import { asyncHandler } from '../utils/async-handler.js';
import { created, ok } from '../utils/http-response.js';
import {
  changeSubscriptionPlanSchema,
  createSubscriptionCheckoutSchema,
  createUserSchema,
  createWorkerInviteSchema,
  loginSchema,
  resendVerificationSchema,
  registerUserSchema,
  verifyEmailSchema,
  updatePrimaryProfileSchema,
  updateUserSchema,
  workerSignupSchema
} from '../validators/users.schema.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { usersService } from '../services/users.service.js';

const parseBody = (schema, payload) => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new AppError('Validation failed', 400, ERROR_CODES.VALIDATION_ERROR, result.error.flatten());
  }

  return result.data;
};

export const usersController = {
  getSubscriptionPlans: asyncHandler(async (_req, res) => {
    const data = await usersService.getSubscriptionPlans();
    return ok(res, data, 'Subscription plans fetched');
  }),

  register: asyncHandler(async (req, res) => {
    const payload = parseBody(registerUserSchema, req.body);
    const data = await usersService.registerUser(payload);
    return created(res, data, 'User registered');
  }),

  login: asyncHandler(async (req, res) => {
    const payload = parseBody(loginSchema, req.body);
    const data = await usersService.loginUser(payload);
    return ok(res, data, 'Login successful');
  }),

  verifyPrimaryEmail: asyncHandler(async (req, res) => {
    const payload = parseBody(verifyEmailSchema, req.body);
    const user = await usersService.verifyPrimaryEmailByToken(payload.token);
    return ok(res, user, 'Email verified successfully');
  }),

  resendPrimaryVerification: asyncHandler(async (req, res) => {
    const payload = parseBody(resendVerificationSchema, req.body);
    const data = await usersService.resendPrimaryVerification(req.authUser, payload.email);
    return ok(res, data, 'Verification email sent');
  }),

  me: asyncHandler(async (req, res) => {
    const user = await usersService.getCurrentUser(req.authUser._id);
    return ok(res, user);
  }),

  primaryDashboard: asyncHandler(async (req, res) => {
    const data = await usersService.getPrimaryDashboard(req.authUser);
    return ok(res, data, 'Primary dashboard data fetched');
  }),

  list: asyncHandler(async (_req, res) => {
    const users = await usersService.listUsers();
    return ok(res, users);
  }),

  getById: asyncHandler(async (req, res) => {
    const user = await usersService.getUser(req.params.id);
    return ok(res, user);
  }),

  create: asyncHandler(async (req, res) => {
    const payload = parseBody(createUserSchema, req.body);
    const user = await usersService.createUser(payload);
    return created(res, user, 'User created');
  }),

  updatePrimaryProfile: asyncHandler(async (req, res) => {
    const payload = parseBody(updatePrimaryProfileSchema, req.body);
    const user = await usersService.updatePrimaryProfile(req.authUser._id, payload);
    return ok(res, user, 'Primary profile updated');
  }),

  uploadPicture: asyncHandler(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      throw new AppError('No file uploaded. Send a file with field name "picture".', 400, ERROR_CODES.VALIDATION_ERROR);
    }
    const data = await usersService.uploadPicture(
      req.authUser._id,
      req.file.buffer,
      req.file.mimetype
    );
    return ok(res, data, 'Picture uploaded');
  }),

  uploadProfilePicture: asyncHandler(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      throw new AppError('No file uploaded. Send a file with field name "picture".', 400, ERROR_CODES.VALIDATION_ERROR);
    }
    const user = await usersService.uploadProfilePicture(
      req.authUser._id,
      req.file.buffer,
      req.file.mimetype
    );
    return ok(res, user, 'Profile picture updated');
  }),

  createSubscriptionCheckout: asyncHandler(async (req, res) => {
    const payload = parseBody(createSubscriptionCheckoutSchema, req.body);
    const data = await usersService.createSubscriptionCheckoutSession(req.authUser, payload.plan);
    return ok(res, data, 'Stripe checkout session created');
  }),

  getMySubscription: asyncHandler(async (req, res) => {
    const data = await usersService.getMySubscription(req.authUser);
    return ok(res, data, 'Subscription details fetched');
  }),

  createBillingPortal: asyncHandler(async (req, res) => {
    const data = await usersService.createBillingPortalSession(req.authUser);
    return ok(res, data, 'Billing portal session created');
  }),

  changeMySubscriptionPlan: asyncHandler(async (req, res) => {
    const payload = parseBody(changeSubscriptionPlanSchema, req.body);
    const user = await usersService.changeMySubscriptionPlan(req.authUser, payload.plan);
    return ok(res, user, 'Subscription plan updated');
  }),

  cancelMySubscription: asyncHandler(async (req, res) => {
    const user = await usersService.cancelMySubscription(req.authUser);
    return ok(res, user, 'Subscription will cancel at period end');
  }),

  resumeMySubscription: asyncHandler(async (req, res) => {
    const user = await usersService.resumeMySubscription(req.authUser);
    return ok(res, user, 'Subscription resumed');
  }),

  stripeWebhook: asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      throw new AppError('Missing stripe-signature header', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const data = await usersService.processStripeWebhook(req.body, signature);
    return ok(res, data, 'Webhook processed');
  }),

  createWorkerInvite: asyncHandler(async (req, res) => {
    const payload = parseBody(createWorkerInviteSchema, req.body);
    const invite = await usersService.createWorkerInvite(req.authUser, payload);
    return created(res, invite, 'Worker invite created');
  }),

  listMyWorkerInvites: asyncHandler(async (req, res) => {
    const invites = await usersService.listMyWorkerInvites(req.authUser);
    return ok(res, invites, 'Worker invites fetched');
  }),

  listMyWorkers: asyncHandler(async (req, res) => {
    const workers = await usersService.listMyWorkers(req.authUser);
    return ok(res, workers, 'Worker bees fetched');
  }),

  signupWorkerWithInvite: asyncHandler(async (req, res) => {
    const payload = parseBody(workerSignupSchema, req.body);
    const data = await usersService.signupWorkerWithInvite(payload);
    return created(res, data, 'Worker Bee account created');
  }),

  updateById: asyncHandler(async (req, res) => {
    const payload = parseBody(updateUserSchema, req.body);
    const user = await usersService.updateUser(req.params.id, payload);
    return ok(res, user, 'User updated');
  }),

  deleteById: asyncHandler(async (req, res) => {
    await usersService.deleteUser(req.params.id);
    return res.status(204).send();
  })
};

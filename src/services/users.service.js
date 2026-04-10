import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { usersRepository } from '../repositories/users.repo.js';
import { workerInvitesRepository } from '../repositories/worker-invites.repo.js';
import { env } from '../config/env.js';
import {
  SUBSCRIPTION_PLANS,
  getWorkerLimitForPlan,
  getSearchPriorityWeightForPlan,
  isPrimaryRole
} from '../constants/subscription-plans.js';
import { normalizePlanCode } from '../constants/subscription-plans.js';
import { mailService } from './mail.service.js';
import { notificationsService } from './notifications.service.js';
import { s3Service } from './s3.service.js';
import { aiBioService } from './ai-bio.service.js';
import { matchSubmissionsRepository } from '../repositories/match-submissions.repo.js';
import { Connection } from '../models/connection.model.js';

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

const ensureFound = (resource, message = 'User not found') => {
  if (!resource) {
    throw new AppError(message, 404, ERROR_CODES.NOT_FOUND);
  }
  return resource;
};

const sanitizeUser = (user) => {
  if (!user) {
    return user;
  }

  const safe = { ...user };
  delete safe.passwordHash;
  return safe;
};

const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

const buildEmailVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  return { rawToken, tokenHash };
};

const buildVerificationLink = (rawToken) => `${env.appBaseUrl}/verify-email?token=${rawToken}`;

const getStripePriceIdForPlan = (plan) => {
  const normalizedPlan = normalizePlanCode(plan);

  if (normalizedPlan === 'starter_hive') {
    return env.stripePriceStarterHive || env.stripePriceStarter;
  }

  if (normalizedPlan === 'growth_hive') {
    return env.stripePriceGrowthHive || env.stripePricePremium;
  }

  if (normalizedPlan === 'royal_hive') {
    return env.stripePriceRoyalHive || env.stripePriceElite;
  }

  return '';
};

const getPlanCodeFromStripePriceId = (priceId) => {
  const map = {
    [env.stripePriceStarterHive || env.stripePriceStarter]: 'starter_hive',
    [env.stripePriceGrowthHive || env.stripePricePremium]: 'growth_hive',
    [env.stripePriceRoyalHive || env.stripePriceElite]: 'royal_hive'
  };

  return map[priceId] ?? null;
};

const mapStripeStatus = (status) => {
  if (status === 'active') {
    return 'active';
  }
  if (status === 'past_due') {
    return 'past_due';
  }
  if (status === 'canceled') {
    return 'canceled';
  }
  if (status === 'trialing') {
    return 'trialing';
  }
  return 'inactive';
};

const isPrimaryProfileCompleted = (profile) => {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.displayName &&
      profile.age &&
      profile.gender &&
      profile.location &&
      profile.lifestyle?.wantsChildren &&
      profile.lifestyle?.marriageTimeline &&
      Array.isArray(profile.photos) &&
      profile.photos.length > 0
  );
};

const ensurePrimary = (user) => {
  if (!isPrimaryRole(user.role)) {
    throw new AppError('Primary user access required', 403, ERROR_CODES.FORBIDDEN);
  }
};

const ensureStripeConfigured = () => {
  if (!stripe) {
    throw new AppError('Stripe is not configured', 500, ERROR_CODES.INTERNAL_ERROR);
  }
};

const ensureWorkerLimit = async (primaryUser) => {
  const plan = primaryUser.subscription?.plan;
  const limit = getWorkerLimitForPlan(plan);

  if (!plan || !limit) {
    throw new AppError('Subscription plan does not allow worker bees', 403, ERROR_CODES.SUBSCRIPTION_REQUIRED);
  }

  const [workerCount, pendingInvites] = await Promise.all([
    usersRepository.countWorkersForPrimary(primaryUser._id),
    workerInvitesRepository.countPendingForPrimary(primaryUser._id)
  ]);

  if (workerCount + pendingInvites >= limit) {
    throw new AppError(
      `Worker bee limit reached for ${plan}. Upgrade subscription to invite more workers.`,
      403,
      ERROR_CODES.SUBSCRIPTION_REQUIRED
    );
  }
};

const resolveSearchPriorityWeight = (subscription) => {
  const status = subscription?.status;
  const isRankEligible = status === 'active' || status === 'trialing';
  if (!isRankEligible) {
    return 0;
  }

  return getSearchPriorityWeightForPlan(subscription?.plan);
};

const getInviteStatus = (invite) => {
  if (invite.status !== 'pending') {
    return invite.status;
  }

  return invite.expiresAt < new Date() ? 'expired' : 'pending';
};

export const usersService = {
  async getSubscriptionPlans() {
    return Object.entries(SUBSCRIPTION_PLANS).map(([planCode, plan]) => ({
      planCode,
      displayName: plan.displayName,
      monthlyPriceUsd: plan.monthlyPriceUsd,
      workerLimit: plan.workerLimit,
      suggestionsPerMonth: plan.suggestionsPerMonth,
      searchPriorityWeight: plan.searchPriorityWeight,
      trial: {
        enabled: env.trialEnabled,
        days: env.trialDays,
        primaryUserCap: env.trialPrimaryUserCap
      }
    }));
  },

  async listUsers() {
    return usersRepository.list();
  },

  async getUser(id) {
    return ensureFound(await usersRepository.findById(id));
  },

  async registerUser(payload) {
    const emailInUse = await usersRepository.findByEmail(payload.email);
    if (emailInUse) {
      throw new AppError('Email already exists', 409, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    const usernameInUse = await usersRepository.findByUsername(payload.username);
    if (usernameInUse) {
      throw new AppError('Username already exists', 409, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const { rawToken, tokenHash } = buildEmailVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const primaryUsersCount = await usersRepository.countPrimaryUsers();
    const trialEligible =
      env.trialEnabled &&
      primaryUsersCount < env.trialPrimaryUserCap &&
      isPrimaryRole(payload.role);

    const user = await usersRepository.create({
      username: payload.username,
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role,
      emailVerified: false,
      emailVerification: {
        tokenHash,
        expiresAt: verificationExpiresAt,
        requestedAt: new Date()
      },
      subscription: {
        status: 'inactive',
        trialEligible,
        trialUsed: false,
        searchPriorityWeight: 0
      }
    });

    const userObject = user.toObject();
    void mailService.sendPrimaryVerificationEmail({
      email: userObject.email,
      name: userObject.name ?? userObject.username,
      verificationLink: buildVerificationLink(rawToken),
      code: rawToken.slice(0, 8).toUpperCase()
    });

    return {
      token: signToken(userObject),
      user: sanitizeUser(userObject)
    };
  },

  async loginUser(payload) {
    const user = await usersRepository.findByEmailWithPassword(payload.email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, ERROR_CODES.UNAUTHORIZED);
    }

    if (!user.isActive || user.accountStatus !== 'active') {
      throw new AppError('Account is suspended or banned', 403, ERROR_CODES.FORBIDDEN);
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError('Invalid email or password', 401, ERROR_CODES.UNAUTHORIZED);
    }

    return {
      token: signToken(user),
      user: sanitizeUser(user)
    };
  },

  async updatePrimaryProfile(id, primaryProfile) {
    const existing = ensureFound(await usersRepository.findById(id));
    ensurePrimary(existing);

    const mergedProfile = {
      ...(existing.primaryProfile || {}),
      ...primaryProfile,
      faithAndValues: {
        ...(existing.primaryProfile?.faithAndValues || {}),
        ...(primaryProfile.faithAndValues || {})
      },
      lifestyle: {
        ...(existing.primaryProfile?.lifestyle || {}),
        ...(primaryProfile.lifestyle || {})
      },
      idealMatch: {
        ...(existing.primaryProfile?.idealMatch || {}),
        ...(primaryProfile.idealMatch || {})
      }
    };

    const payload = {
      primaryProfile: mergedProfile,
      profileCompleted: isPrimaryProfileCompleted(mergedProfile)
    };

    if (primaryProfile.displayName) {
      payload.name = primaryProfile.displayName;
    }

    const updated = await usersRepository.updateById(id, payload);
    return ensureFound(updated);
  },

  async generatePrimaryProfileBio(authUser, payload) {
    return aiBioService.writeBio(payload);
  },

  async polishPrimaryProfileBio(authUser, payload) {
    return aiBioService.polishBio(payload);
  },

  async uploadPicture(userId, fileBuffer, mimeType) {
    if (!s3Service.isConfigured()) {
      throw new AppError('Picture upload is not configured', 503, ERROR_CODES.INTERNAL_ERROR);
    }

    const validation = s3Service.validateFile(fileBuffer, mimeType);
    if (!validation.valid) {
      throw new AppError(validation.error, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const url = await s3Service.uploadPicture(userId.toString(), fileBuffer, mimeType, 'uploads');
    return { url };
  },

  async uploadProfilePicture(userId, fileBuffer, mimeType) {
    ensurePrimary(await ensureFound(await usersRepository.findById(userId)));

    if (!s3Service.isConfigured()) {
      throw new AppError('Profile picture upload is not configured', 503, ERROR_CODES.INTERNAL_ERROR);
    }

    const validation = s3Service.validateFile(fileBuffer, mimeType);
    if (!validation.valid) {
      throw new AppError(validation.error, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const pictureUrl = await s3Service.uploadProfilePicture(
      userId.toString(),
      fileBuffer,
      mimeType
    );

    const existing = await usersRepository.findById(userId);
    const mergedProfile = {
      ...(existing.primaryProfile || {}),
      picture: pictureUrl
    };
    const updated = await usersRepository.updateById(userId, {
      primaryProfile: mergedProfile
    });
    return ensureFound(updated);
  },

  async createSubscriptionCheckoutSession(authUser, plan) {
    ensureStripeConfigured();
    ensurePrimary(authUser);

    if (!authUser.profileCompleted) {
      throw new AppError(
        'Complete profile first before starting subscription',
        403,
        ERROR_CODES.PROFILE_INCOMPLETE
      );
    }

    const normalizedPlan = normalizePlanCode(plan);
    const priceId = getStripePriceIdForPlan(normalizedPlan);
    if (!priceId) {
      throw new AppError(
        `Stripe price is not configured for ${normalizedPlan}`,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const customerId = authUser.subscription?.stripeCustomerId;

    const customer = customerId
      ? { id: customerId }
      : await stripe.customers.create({
          email: authUser.email,
          name: authUser.name,
          metadata: { userId: authUser._id.toString() }
        });

    const shouldApplyTrial = Boolean(
      authUser.subscription?.trialEligible &&
        !authUser.subscription?.trialUsed &&
        env.trialEnabled &&
        env.trialDays > 0
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: authUser._id.toString(),
        plan: normalizedPlan
      },
      subscription_data: shouldApplyTrial ? { trial_period_days: env.trialDays } : undefined,
      success_url: `${env.appBaseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appBaseUrl}/subscription/cancel`
    });

    await usersRepository.updateById(authUser._id, {
      subscription: {
        ...(authUser.subscription || {}),
        plan: normalizedPlan,
        status: 'pending',
        stripeCustomerId: customer.id,
        stripeCheckoutSessionId: session.id,
        cancelAtPeriodEnd: false
      }
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id
    };
  },

  async processStripeWebhook(rawBody, signature) {
    ensureStripeConfigured();

    if (!env.stripeWebhookSecret) {
      throw new AppError('Stripe webhook secret is not configured', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = normalizePlanCode(session.metadata?.plan);

      if (userId) {
        let currentPeriodEnd;
        let cancelAtPeriodEnd = false;
        let status = 'active';
        let trialEndsAt;
        let planFromStripe = plan;

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : undefined;
          cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
          status = mapStripeStatus(subscription.status);
          trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined;
          planFromStripe = getPlanCodeFromStripePriceId(subscription.items.data[0]?.price?.id) || plan;
        }

        await usersRepository.updateById(userId, {
          subscription: {
            plan: planFromStripe,
            status,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            stripeCheckoutSessionId: session.id,
            cancelAtPeriodEnd,
            currentPeriodEnd,
            trialUsed: true,
            trialEndsAt,
            searchPriorityWeight: resolveSearchPriorityWeight({
              plan: planFromStripe,
              status
            })
          }
        });

        await notificationsService.createNotification({
          userId,
          type: 'subscription_update',
          title: 'Subscription activated',
          body: `Your ${planFromStripe} subscription is now ${status}.`,
          metadata: { plan: planFromStripe, status }
        });
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object;
      const mappedStatus = mapStripeStatus(subscription.status);
      const target = await usersRepository.findByStripeSubscriptionId(subscription.id);
      const updatedPlan =
        getPlanCodeFromStripePriceId(subscription.items?.data?.[0]?.price?.id) ||
        target?.subscription?.plan;

      if (target) {
        await usersRepository.updateById(target._id, {
          subscription: {
            ...(target.subscription || {}),
            plan: updatedPlan,
            status: mappedStatus,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
            trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : undefined,
            searchPriorityWeight: resolveSearchPriorityWeight({
              plan: updatedPlan,
              status: mappedStatus
            })
          }
        });

        await notificationsService.createNotification({
          userId: target._id,
          type: 'subscription_update',
          title: 'Subscription updated',
          body: `Subscription status is now ${mappedStatus}.`,
          metadata: { plan: updatedPlan, status: mappedStatus }
        });
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const target = await usersRepository.findByStripeSubscriptionId(invoice.subscription);

      if (target) {
        await usersRepository.updateById(target._id, {
          subscription: {
            ...(target.subscription || {}),
            status: 'past_due',
            paymentFailedAt: new Date(),
            paymentFailureReason: invoice.last_finalization_error?.message || 'Payment failed',
            searchPriorityWeight: 0
          }
        });

        await notificationsService.createNotification({
          userId: target._id,
          type: 'subscription_update',
          title: 'Payment failed',
          body: 'Your recent subscription payment failed. Please update billing details.',
          metadata: { status: 'past_due' }
        });
      }
    }

    return { received: true };
  },

  async getMySubscription(authUser) {
    ensurePrimary(authUser);

    const localSubscription = authUser.subscription || { status: 'inactive' };
    const response = {
      plan: localSubscription.plan ?? null,
      status: localSubscription.status ?? 'inactive',
      cancelAtPeriodEnd: Boolean(localSubscription.cancelAtPeriodEnd),
      currentPeriodEnd: localSubscription.currentPeriodEnd ?? null,
      trialEligible: Boolean(localSubscription.trialEligible),
      trialUsed: Boolean(localSubscription.trialUsed),
      trialEndsAt: localSubscription.trialEndsAt ?? null,
      paymentFailedAt: localSubscription.paymentFailedAt ?? null,
      paymentFailureReason: localSubscription.paymentFailureReason ?? null,
      stripeCustomerId: localSubscription.stripeCustomerId ?? null,
      stripeSubscriptionId: localSubscription.stripeSubscriptionId ?? null,
      recentInvoices: []
    };

    if (!stripe || !localSubscription.stripeCustomerId) {
      return response;
    }

    const invoices = await stripe.invoices.list({
      customer: localSubscription.stripeCustomerId,
      limit: 5
    });

    response.recentInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      status: invoice.status,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      createdAt: invoice.created ? new Date(invoice.created * 1000) : null
    }));

    return response;
  },

  async createBillingPortalSession(authUser) {
    ensurePrimary(authUser);
    ensureStripeConfigured();

    const customerId = authUser.subscription?.stripeCustomerId;
    if (!customerId) {
      throw new AppError('No billing profile found for this account', 400, ERROR_CODES.SUBSCRIPTION_REQUIRED);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.appBaseUrl}/subscription/billing`
    });

    return { billingPortalUrl: session.url };
  },

  async changeMySubscriptionPlan(authUser, plan) {
    ensurePrimary(authUser);
    ensureStripeConfigured();

    const normalizedPlan = normalizePlanCode(plan);
    const subscriptionId = authUser.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
      throw new AppError('No active Stripe subscription found', 400, ERROR_CODES.SUBSCRIPTION_REQUIRED);
    }

    const priceId = getStripePriceIdForPlan(normalizedPlan);
    if (!priceId) {
      throw new AppError(
        `Stripe price is not configured for ${normalizedPlan}`,
        500,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    const current = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = current.items?.data?.[0];
    if (!currentItem?.id) {
      throw new AppError('Stripe subscription item not found', 500, ERROR_CODES.INTERNAL_ERROR);
    }

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: currentItem.id, price: priceId }],
      proration_behavior: 'create_prorations'
    });

    const mappedStatus = mapStripeStatus(updatedSubscription.status);

    const updated = await usersRepository.updateById(authUser._id, {
      subscription: {
        ...(authUser.subscription || {}),
        plan: normalizedPlan,
        status: mappedStatus,
        currentPeriodEnd: updatedSubscription.current_period_end
          ? new Date(updatedSubscription.current_period_end * 1000)
          : undefined,
        cancelAtPeriodEnd: Boolean(updatedSubscription.cancel_at_period_end),
        searchPriorityWeight: resolveSearchPriorityWeight({
          plan: normalizedPlan,
          status: mappedStatus
        })
      }
    });

    await notificationsService.createNotification({
      userId: authUser._id,
      type: 'subscription_update',
      title: 'Plan updated',
      body: `Your subscription plan changed to ${normalizedPlan}.`,
      metadata: { plan: normalizedPlan, status: mappedStatus }
    });

    return ensureFound(updated);
  },

  async cancelMySubscription(authUser) {
    ensurePrimary(authUser);
    ensureStripeConfigured();

    const subscriptionId = authUser.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
      throw new AppError('No active Stripe subscription found', 400, ERROR_CODES.SUBSCRIPTION_REQUIRED);
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    const updated = await usersRepository.updateById(authUser._id, {
      subscription: {
        ...(authUser.subscription || {}),
        status: mapStripeStatus(subscription.status),
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : undefined,
        searchPriorityWeight: resolveSearchPriorityWeight({
          plan: authUser.subscription?.plan,
          status: mapStripeStatus(subscription.status)
        })
      }
    });

    await notificationsService.createNotification({
      userId: authUser._id,
      type: 'subscription_update',
      title: 'Cancellation scheduled',
      body: 'Your subscription will cancel at the end of the current period.',
      metadata: { cancelAtPeriodEnd: true }
    });

    return ensureFound(updated);
  },

  async resumeMySubscription(authUser) {
    ensurePrimary(authUser);
    ensureStripeConfigured();

    const subscriptionId = authUser.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
      throw new AppError('No active Stripe subscription found', 400, ERROR_CODES.SUBSCRIPTION_REQUIRED);
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });

    const updated = await usersRepository.updateById(authUser._id, {
      subscription: {
        ...(authUser.subscription || {}),
        status: mapStripeStatus(subscription.status),
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : undefined,
        searchPriorityWeight: resolveSearchPriorityWeight({
          plan: authUser.subscription?.plan,
          status: mapStripeStatus(subscription.status)
        })
      }
    });

    await notificationsService.createNotification({
      userId: authUser._id,
      type: 'subscription_update',
      title: 'Subscription resumed',
      body: 'Your subscription cancellation has been removed.',
      metadata: { cancelAtPeriodEnd: false }
    });

    return ensureFound(updated);
  },

  async createWorkerInvite(authUser, payload) {
    ensurePrimary(authUser);

    if (!['active', 'trialing'].includes(authUser.subscription?.status)) {
      throw new AppError('Active subscription required to invite worker bees', 403, ERROR_CODES.SUBSCRIPTION_REQUIRED);
    }

    await ensureWorkerLimit(authUser);

    const code = crypto.randomBytes(24).toString('hex');
    const expiresInDays = payload.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const invite = await workerInvitesRepository.create({
      code,
      primaryUserId: authUser._id,
      inviteeEmail: payload.inviteeEmail,
      expiresAt
    });

    const inviteObject = invite.toObject();
    const inviteLink = `${env.appBaseUrl}/worker-signup?code=${code}`;

    if (payload.inviteeEmail) {
      void mailService.sendWorkerInviteEmail({
        toEmail: payload.inviteeEmail,
        primaryName: authUser.name ?? authUser.username,
        inviteLink,
        expiresAt
      });
    }

    return {
      ...inviteObject,
      inviteLink
    };
  },

  async verifyPrimaryEmailByToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await usersRepository.findByVerificationTokenHash(tokenHash);
    ensureFound(user, 'Invalid verification token');
    ensurePrimary(user);

    if (user.emailVerified) {
      return sanitizeUser(user);
    }

    if (!user.emailVerification?.expiresAt || user.emailVerification.expiresAt < new Date()) {
      throw new AppError('Verification token expired', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const updated = await usersRepository.updateById(user._id, {
      emailVerified: true,
      emailVerification: {
        ...user.emailVerification,
        tokenHash: null,
        verifiedAt: new Date()
      }
    });

    return ensureFound(updated);
  },

  async resendPrimaryVerification(authUser, optionalEmail) {
    ensurePrimary(authUser);

    const targetEmail = optionalEmail ?? authUser.email;
    const user = await usersRepository.findByEmailWithVerification(targetEmail);
    ensureFound(user);

    if (user._id.toString() !== authUser._id.toString()) {
      throw new AppError('You can only request verification for your own account', 403, ERROR_CODES.FORBIDDEN);
    }

    if (user.emailVerified) {
      return { alreadyVerified: true };
    }

    const { rawToken, tokenHash } = buildEmailVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await usersRepository.updateById(user._id, {
      emailVerification: {
        ...(user.emailVerification || {}),
        tokenHash,
        expiresAt: verificationExpiresAt,
        requestedAt: new Date()
      }
    });

    await mailService.sendPrimaryVerificationEmail({
      email: user.email,
      name: user.name ?? user.username,
      verificationLink: buildVerificationLink(rawToken),
      code: rawToken.slice(0, 8).toUpperCase()
    });

    return { resent: true };
  },

  async listMyWorkerInvites(authUser) {
    ensurePrimary(authUser);

    const invites = await workerInvitesRepository.listForPrimary(authUser._id);

    return invites.map((invite) => ({
      _id: invite._id,
      code: invite.code,
      inviteeEmail: invite.inviteeEmail,
      status: getInviteStatus(invite),
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      acceptedBy: invite.acceptedByUserId
        ? {
            _id: invite.acceptedByUserId._id,
            username: invite.acceptedByUserId.username,
            name: invite.acceptedByUserId.name,
            email: invite.acceptedByUserId.email
          }
        : null,
      inviteLink: `${env.appBaseUrl}/worker-signup?code=${invite.code}`
    }));
  },

  async listMyWorkers(authUser) {
    ensurePrimary(authUser);

    const plan = authUser.subscription?.plan;
    const limit = getWorkerLimitForPlan(plan);
    const workers = await usersRepository.listWorkersForPrimary(authUser._id);

    return {
      plan: plan ?? null,
      workerLimit: limit,
      usedSlots: workers.length,
      remainingSlots: Math.max(0, limit - workers.length),
      workers
    };
  },

  async getPrimaryDashboard(authUser) {
    ensurePrimary(authUser);

    const primaryUserId = authUser._id.toString();

    const [workerCount, pendingInvites, curatedFeed, mutualConnections, notifications] = await Promise.all([
      usersRepository.countWorkersForPrimary(primaryUserId),
      workerInvitesRepository.countPendingForPrimary(primaryUserId),
      matchSubmissionsRepository.listPrimaryFeed(primaryUserId),
      Connection.countDocuments({
        users: primaryUserId,
        messagingUnlocked: true
      }),
      // latest notifications (for small dashboard badge)
      notificationsService.listForUser(primaryUserId)
    ]);

    const subscription = authUser.subscription || {};

    return {
      profile: {
        completed: Boolean(authUser.profileCompleted),
        status: authUser.profileCompleted ? 'done' : 'incomplete'
      },
      subscription: {
        status: subscription.status ?? 'inactive',
        plan: subscription.plan ?? null
      },
      workerBees: {
        activeCount: workerCount
      },
      workerInvites: {
        pendingCount: pendingInvites
      },
      curatedFeed: {
        totalRecommendations: curatedFeed.length
      },
      mutualConnections: {
        total: mutualConnections
      },
      notifications: {
        unreadCount: notifications.filter((n) => !n.isRead).length
      }
    };
  },

  async signupWorkerWithInvite(payload) {
    const invite = await workerInvitesRepository.findByCode(payload.inviteCode);

    if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
      throw new AppError('Invite code is invalid or expired', 400, ERROR_CODES.INVITE_INVALID);
    }

    if (invite.inviteeEmail && invite.inviteeEmail !== payload.email.toLowerCase()) {
      throw new AppError('Invite email does not match', 400, ERROR_CODES.INVITE_INVALID);
    }

    const [emailInUse, usernameInUse] = await Promise.all([
      usersRepository.findByEmail(payload.email),
      usersRepository.findByUsername(payload.username)
    ]);

    if (emailInUse) {
      throw new AppError('Email already exists', 409, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    if (usernameInUse) {
      throw new AppError('Username already exists', 409, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await usersRepository.create({
      username: payload.username,
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: 'worker_bee',
      profileCompleted: true,
      workerAccount: {
        primaryUserId: invite.primaryUserId,
        joinedAt: new Date()
      }
    });

    await workerInvitesRepository.acceptInvite(invite._id, user._id);

    const userObject = user.toObject();

    return {
      token: signToken(userObject),
      user: sanitizeUser(userObject)
    };
  },

  async getCurrentUser(id) {
    return ensureFound(await usersRepository.findById(id));
  },

  async createUser(payload) {
    const existing = await usersRepository.findByEmail(payload.email);
    if (existing) {
      throw new AppError('Email already exists', 409, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    const usernameInUse = await usersRepository.findByUsername(payload.username);
    if (usernameInUse) {
      throw new AppError('Username already exists', 409, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await usersRepository.create({
      ...payload,
      passwordHash
    });

    return sanitizeUser(user.toObject());
  },

  async updateUser(id, payload) {
    if (payload.email) {
      const existing = await usersRepository.findByEmail(payload.email);
      if (existing && existing._id.toString() !== id) {
        throw new AppError('Email already exists', 409, ERROR_CODES.DUPLICATE_RESOURCE);
      }
    }

    return ensureFound(await usersRepository.updateById(id, payload));
  },

  async deleteUser(id) {
    return ensureFound(await usersRepository.deleteById(id));
  }
};

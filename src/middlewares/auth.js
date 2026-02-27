import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { usersRepository } from '../repositories/users.repo.js';
import { isPrimaryRole } from '../constants/subscription-plans.js';

export const requireAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED));
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.jwtSecret);

    const user = await usersRepository.findById(payload.sub);
    if (!user || !user.isActive || user.accountStatus !== 'active') {
      return next(new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED));
    }

    req.authUser = user;
    return next();
  } catch {
    return next(new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED));
  }
};

export const requirePrimaryUser = (req, _res, next) => {
  if (!req.authUser || !isPrimaryRole(req.authUser.role)) {
    return next(new AppError('Primary user access required', 403, ERROR_CODES.FORBIDDEN));
  }

  return next();
};

export const requireAdmin = (req, _res, next) => {
  if (!req.authUser || req.authUser.role !== 'admin') {
    return next(new AppError('Admin access required', 403, ERROR_CODES.FORBIDDEN));
  }

  return next();
};

export const requireWorkerUser = (req, _res, next) => {
  if (!req.authUser || req.authUser.role !== 'worker_bee') {
    return next(new AppError('Worker Bee access required', 403, ERROR_CODES.FORBIDDEN));
  }

  return next();
};

export const requireCompletedProfile = (req, _res, next) => {
  if (!req.authUser?.profileCompleted) {
    return next(
      new AppError(
        'Complete profile first before using this feature',
        403,
        ERROR_CODES.PROFILE_INCOMPLETE
      )
    );
  }

  return next();
};

export const requireVerifiedEmail = (req, _res, next) => {
  if (!req.authUser?.emailVerified) {
    return next(
      new AppError(
        'Verify your email address before using this feature',
        403,
        ERROR_CODES.EMAIL_NOT_VERIFIED
      )
    );
  }

  return next();
};

export const requireActiveSubscription = (req, _res, next) => {
  const status = req.authUser?.subscription?.status;

  if (!status || !['active', 'trialing'].includes(status)) {
    return next(
      new AppError(
        'Active subscription required for this feature',
        403,
        ERROR_CODES.SUBSCRIPTION_REQUIRED
      )
    );
  }

  return next();
};

import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { logger } from '../logging/logger.js';

export const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, ERROR_CODES.NOT_FOUND));
};

export const errorHandler = (error, req, res, _next) => {
  const isOperational = error instanceof AppError;

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: error.message
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid resource id'
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      code: ERROR_CODES.DUPLICATE_RESOURCE,
      message: 'Duplicate resource'
    });
  }

  if (!isOperational) {
    logger.error('Unhandled error', {
      requestId: req.requestId,
      path: req.originalUrl,
      method: req.method,
      error: error?.message,
      stack: error?.stack
    });
  }

  return res.status(isOperational ? error.statusCode : 500).json({
    success: false,
    code: isOperational ? error.code : ERROR_CODES.INTERNAL_ERROR,
    message: isOperational ? error.message : 'Internal Server Error',
    details: isOperational ? error.details : undefined
  });
};

import { asyncHandler } from '../utils/async-handler.js';
import { created, ok } from '../utils/http-response.js';
import {
  blockUserSchema,
  listMessagesQuerySchema,
  reportUserSchema,
  sendMessageSchema
} from '../validators/messaging.schema.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { messagingService } from '../services/messaging.service.js';

const parse = (schema, payload) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError('Validation failed', 400, ERROR_CODES.VALIDATION_ERROR, result.error.flatten());
  }

  return result.data;
};

export const messagingController = {
  listMyConnections: asyncHandler(async (req, res) => {
    const data = await messagingService.listMyConnections(req.authUser._id);
    return ok(res, data, 'Connections fetched');
  }),

  listMessages: asyncHandler(async (req, res) => {
    const query = parse(listMessagesQuerySchema, req.query);
    const data = await messagingService.listMessages(req.authUser._id, req.params.connectionId, query);
    return ok(res, data, 'Messages fetched');
  }),

  sendMessage: asyncHandler(async (req, res) => {
    const payload = parse(sendMessageSchema, req.body);
    const data = await messagingService.sendMessage(req.authUser._id, req.params.connectionId, payload.text);
    return created(res, data, 'Message sent');
  }),

  blockUser: asyncHandler(async (req, res) => {
    const payload = parse(blockUserSchema, req.body);
    const data = await messagingService.blockUser(req.authUser._id, payload.targetUserId);
    return ok(res, data, 'User blocked');
  }),

  reportUser: asyncHandler(async (req, res) => {
    const payload = parse(reportUserSchema, req.body);
    const data = await messagingService.reportUser(req.authUser._id, payload);
    return created(res, data, 'User reported');
  })
};

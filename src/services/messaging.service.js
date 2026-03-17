import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { Connection } from '../models/connection.model.js';
import { Message } from '../models/message.model.js';
import { UserBlock } from '../models/user-block.model.js';
import { UserReport } from '../models/user-report.model.js';
import { notificationsService } from './notifications.service.js';
import { emitToUser } from '../realtime/socket.js';

const ensureFound = (resource, message) => {
  if (!resource) {
    throw new AppError(message, 404, ERROR_CODES.NOT_FOUND);
  }

  return resource;
};

const ensureCanAccessConnection = async (userId, connectionId) => {
  const connection = await Connection.findOne({ _id: connectionId, users: userId }).lean();
  ensureFound(connection, 'Connection not found');

  if (!connection.messagingUnlocked) {
    throw new AppError('Messaging is not unlocked for this connection', 403, ERROR_CODES.FORBIDDEN);
  }

  return connection;
};

const ensureNotBlocked = async (aUserId, bUserId) => {
  const block = await UserBlock.findOne({
    $or: [
      { blockerUserId: aUserId, blockedUserId: bUserId },
      { blockerUserId: bUserId, blockedUserId: aUserId }
    ]
  }).lean();

  if (block) {
    throw new AppError('Messaging is blocked between these users', 403, ERROR_CODES.FORBIDDEN);
  }
};

export const messagingService = {
  async listMyConnections(userId) {
    const connections = await Connection.find({ users: userId })
      .populate('users', 'name username role primaryProfile.displayName')
      .sort({ updatedAt: -1 })
      .lean();

    const result = [];

    for (const connection of connections) {
      const otherUser = connection.users.find((user) => user._id.toString() !== userId.toString());
      const lastMessage = await Message.findOne({ connectionId: connection._id })
        .sort({ createdAt: -1 })
        .select('senderUserId text createdAt')
        .lean();

      result.push({
        ...connection,
        otherUser,
        lastMessage
      });
    }

    return result;
  },

  async listMessages(userId, connectionId, query) {
    const connection = await ensureCanAccessConnection(userId, connectionId);

    const otherUserId = connection.users.find((id) => id.toString() !== userId.toString());

    const limit = query.limit ?? 30;
    const filter = { connectionId };
    if (query.before) {
      filter.createdAt = { $lt: new Date(query.before) };
    }

    const [messages, blockFromMe, blockFromOther] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('senderUserId', 'name username')
        .lean(),
      UserBlock.findOne({ blockerUserId: userId, blockedUserId: otherUserId }).lean(),
      UserBlock.findOne({ blockerUserId: otherUserId, blockedUserId: userId }).lean()
    ]);

    return {
      items: messages.reverse(),
      blockStatus: {
        blockedByMe: Boolean(blockFromMe),
        blockedByOther: Boolean(blockFromOther)
      }
    };
  },

  async sendMessage(userId, connectionId, text) {
    const connection = await ensureCanAccessConnection(userId, connectionId);

    const otherUserId = connection.users.find((id) => id.toString() !== userId.toString());
    await ensureNotBlocked(userId, otherUserId);

    const message = await Message.create({
      connectionId,
      senderUserId: userId,
      text,
      readBy: [userId]
    });

    const payload = await Message.findById(message._id).populate('senderUserId', 'name username').lean();

    emitToUser(String(otherUserId), 'message:new', payload);
    emitToUser(String(userId), 'message:new', payload);

    await notificationsService.createNotification({
      userId: otherUserId,
      type: 'new_message',
      title: 'New message',
      body: text.length > 80 ? `${text.slice(0, 80)}...` : text,
      metadata: { connectionId, senderUserId: userId }
    });

    return payload;
  },

  async blockUser(userId, targetUserId) {
    if (String(userId) === String(targetUserId)) {
      throw new AppError('Cannot block yourself', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const existing = await UserBlock.findOne({
      blockerUserId: userId,
      blockedUserId: targetUserId
    }).lean();

    // If current user has already blocked target, unblock (toggle).
    if (existing) {
      await UserBlock.deleteOne({ _id: existing._id });
      return { blocked: false };
    }

    await UserBlock.updateOne(
      { blockerUserId: userId, blockedUserId: targetUserId },
      { blockerUserId: userId, blockedUserId: targetUserId },
      { upsert: true }
    );

    return { blocked: true };
  },

  async reportUser(userId, payload) {
    if (String(userId) === String(payload.targetUserId)) {
      throw new AppError('Cannot report yourself', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const report = await UserReport.create({
      reporterUserId: userId,
      reportedUserId: payload.targetUserId,
      reason: payload.reason,
      details: payload.details
    });

    return report.toObject();
  }
};

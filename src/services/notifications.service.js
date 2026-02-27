import { Notification } from '../models/notification.model.js';
import { emitToUser } from '../realtime/socket.js';

export const notificationsService = {
  async createNotification({ userId, type, title, body, metadata }) {
    const notification = await Notification.create({
      userId,
      type,
      title,
      body,
      metadata
    });

    const payload = notification.toObject();
    emitToUser(String(userId), 'notification:new', payload);

    return payload;
  },

  async listForUser(userId) {
    return Notification.find({ userId }).sort({ createdAt: -1 }).limit(100).lean();
  },

  async markRead(userId, notificationId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    ).lean();
  },

  async markAllRead(userId) {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
    return { updated: true };
  }
};

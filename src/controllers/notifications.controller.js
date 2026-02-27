import { asyncHandler } from '../utils/async-handler.js';
import { ok } from '../utils/http-response.js';
import { notificationsService } from '../services/notifications.service.js';

export const notificationsController = {
  listMine: asyncHandler(async (req, res) => {
    const data = await notificationsService.listForUser(req.authUser._id);
    return ok(res, data, 'Notifications fetched');
  }),

  markRead: asyncHandler(async (req, res) => {
    const data = await notificationsService.markRead(req.authUser._id, req.params.notificationId);
    return ok(res, data, 'Notification marked as read');
  }),

  markAllRead: asyncHandler(async (req, res) => {
    const data = await notificationsService.markAllRead(req.authUser._id);
    return ok(res, data, 'All notifications marked as read');
  })
};

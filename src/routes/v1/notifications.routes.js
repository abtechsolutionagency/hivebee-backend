import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { notificationsController } from '../../controllers/notifications.controller.js';

const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, notificationsController.listMine);
notificationsRouter.patch('/:notificationId/read', requireAuth, notificationsController.markRead);
notificationsRouter.patch('/read-all', requireAuth, notificationsController.markAllRead);

export { notificationsRouter };

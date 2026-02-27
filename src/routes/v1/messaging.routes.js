import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { messagingController } from '../../controllers/messaging.controller.js';

const messagingRouter = Router();

messagingRouter.get('/connections', requireAuth, messagingController.listMyConnections);
messagingRouter.get('/connections/:connectionId/messages', requireAuth, messagingController.listMessages);
messagingRouter.post('/connections/:connectionId/messages', requireAuth, messagingController.sendMessage);
messagingRouter.post('/block', requireAuth, messagingController.blockUser);
messagingRouter.post('/report', requireAuth, messagingController.reportUser);

export { messagingRouter };

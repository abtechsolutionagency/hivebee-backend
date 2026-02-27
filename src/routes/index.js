import { Router } from 'express';
import { adminRouter } from './v1/admin.routes.js';
import { healthRouter } from './v1/health.routes.js';
import { matchmakingRouter } from './v1/matchmaking.routes.js';
import { messagingRouter } from './v1/messaging.routes.js';
import { notificationsRouter } from './v1/notifications.routes.js';
import { usersRouter } from './v1/users.routes.js';

const router = Router();

router.use('/v1/health', healthRouter);
router.use('/v1/users', usersRouter);
router.use('/v1/admin', adminRouter);
router.use('/v1/matchmaking', matchmakingRouter);
router.use('/v1/messaging', messagingRouter);
router.use('/v1/notifications', notificationsRouter);

export { router };

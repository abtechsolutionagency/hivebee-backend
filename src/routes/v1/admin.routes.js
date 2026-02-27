import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { adminController } from '../../controllers/admin.controller.js';

const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', adminController.listUsers);
adminRouter.patch('/users/:userId/status', adminController.updateUserStatus);

adminRouter.get('/reports', adminController.listReports);
adminRouter.patch('/reports/:reportId/moderate', adminController.moderateReport);

adminRouter.get('/stats/matches', adminController.getMatchStats);

adminRouter.get('/subscription-tiers', adminController.listSubscriptionTiers);
adminRouter.put('/subscription-tiers/:planCode', adminController.upsertSubscriptionTier);

export { adminRouter };

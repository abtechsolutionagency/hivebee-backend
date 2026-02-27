import { Router } from 'express';

const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString()
  });
});

export { healthRouter };

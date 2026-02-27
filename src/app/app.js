import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '../config/env.js';
import { errorHandler, notFoundHandler } from '../middlewares/error-handler.js';
import { requestId } from '../middlewares/request-id.js';
import { apiRateLimit } from '../middlewares/rate-limit.js';
import { router } from '../routes/index.js';

const app = express();
const corsOptions = {
  origin: true,
  credentials: true
};

app.set('trust proxy', 1);

app.use(requestId);
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(`${env.apiPrefix}/v1/users/subscription/stripe-webhook`, express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(':method :url :status :response-time ms :res[content-length]', {
    skip: () => env.nodeEnv === 'test'
  })
);

app.use(apiRateLimit);
app.use(env.apiPrefix, router);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };

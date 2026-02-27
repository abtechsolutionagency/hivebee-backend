import dotenv from 'dotenv';

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toBoolean = (value, fallback = false) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }
  return fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  apiPrefix: process.env.API_PREFIX ?? '/api',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/join_the_hive',
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMaxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  jwtSecret: process.env.JWT_SECRET ?? 'replace-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:4000',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePriceStarter: process.env.STRIPE_PRICE_STARTER ?? '',
  stripePricePremium: process.env.STRIPE_PRICE_PREMIUM ?? '',
  stripePriceElite: process.env.STRIPE_PRICE_ELITE ?? '',
  stripePriceStarterHive: process.env.STRIPE_PRICE_STARTER_HIVE ?? '',
  stripePriceGrowthHive: process.env.STRIPE_PRICE_GROWTH_HIVE ?? '',
  stripePriceRoyalHive: process.env.STRIPE_PRICE_ROYAL_HIVE ?? '',
  trialEnabled: toBoolean(process.env.TRIAL_ENABLED, true),
  trialDays: toNumber(process.env.TRIAL_DAYS, 7),
  trialPrimaryUserCap: toNumber(process.env.TRIAL_PRIMARY_USER_CAP, 500),
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: toNumber(process.env.SMTP_PORT, 587),
  smtpSecure: toBoolean(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'no-reply@jointhehive.local'
};

if (!env.mongodbUri) {
  throw new Error('Missing required env var: MONGODB_URI');
}

if (!env.jwtSecret || env.jwtSecret === 'replace-this-in-production') {
  console.warn('JWT_SECRET is using a development fallback. Set a secure value in .env');
}

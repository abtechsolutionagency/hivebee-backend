export const SUBSCRIPTION_PLANS = {
  starter_hive: {
    displayName: 'Starter',
    workerLimit: 1,
    monthlyPriceUsd: 7,
    suggestionsPerMonth: 10,
    searchPriorityWeight: 1
  },
  growth_hive: {
    displayName: 'Premium',
    workerLimit: 3,
    monthlyPriceUsd: 17,
    suggestionsPerMonth: null,
    searchPriorityWeight: 2
  },
  royal_hive: {
    displayName: 'Elite',
    workerLimit: 5,
    monthlyPriceUsd: 27,
    suggestionsPerMonth: null,
    searchPriorityWeight: 3
  }
};

export const PLAN_ALIASES = {
  starter: 'starter_hive',
  premium: 'growth_hive',
  elite: 'royal_hive'
};

export const SUBSCRIPTION_STATUSES = [
  'inactive',
  'pending',
  'trialing',
  'active',
  'past_due',
  'canceled'
];

export const isPrimaryRole = (role) => role === 'king_bee' || role === 'queen_bee';

export const normalizePlanCode = (plan) => PLAN_ALIASES[plan] ?? plan;

export const getWorkerLimitForPlan = (plan) => SUBSCRIPTION_PLANS[normalizePlanCode(plan)]?.workerLimit ?? 0;

export const getSearchPriorityWeightForPlan = (plan) =>
  SUBSCRIPTION_PLANS[normalizePlanCode(plan)]?.searchPriorityWeight ?? 0;

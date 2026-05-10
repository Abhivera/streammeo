export const PLANS = {
  starter: { price: 99900, minutesLimit: 500, agents: 1 },
  growth: { price: 199900, minutesLimit: 2000, agents: 3 },
  pro: { price: 299900, minutesLimit: 5000, agents: 10 },
} as const;

export type PlanId = keyof typeof PLANS;

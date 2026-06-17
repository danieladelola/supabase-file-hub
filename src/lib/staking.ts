// Deterministic staking reward math.
// Pending reward = dailyReward * fractional days since start, capped at lock end.
// dailyReward = (amount * apy/100) / 365

export type StakeLike = {
  amount: number | string;
  apy: number | string;
  started_at: string;
  ends_at: string;
  status?: string;
};

export function dailyReward(amount: number, apy: number): number {
  return (Number(amount) * (Number(apy) / 100)) / 365;
}

export function totalExpectedReward(s: StakeLike): number {
  const start = new Date(s.started_at).getTime();
  const end = new Date(s.ends_at).getTime();
  const days = Math.max(0, (end - start) / 86_400_000);
  return dailyReward(Number(s.amount), Number(s.apy)) * days;
}

/** Days elapsed since start, capped by ends_at and now. Fractional. */
export function daysAccrued(s: StakeLike, now: Date = new Date()): number {
  const start = new Date(s.started_at).getTime();
  const end = new Date(s.ends_at).getTime();
  const cap = Math.min(now.getTime(), end);
  return Math.max(0, (cap - start) / 86_400_000);
}

/** Live pending reward in the stake's coin. Stops growing after ends_at. */
export function pendingReward(s: StakeLike, now: Date = new Date()): number {
  return dailyReward(Number(s.amount), Number(s.apy)) * daysAccrued(s, now);
}

/** True when lock period has elapsed (regardless of stored status). */
export function isMatured(s: StakeLike, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(s.ends_at).getTime();
}

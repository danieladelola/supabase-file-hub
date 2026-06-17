import { describe, it, expect } from "vitest";
import {
  fmtCoinAmount,
  coinPrecision,
  usdToCoin,
  resolveCoinPrice,
} from "./mining-format";
import {
  miningDailyUsd,
  miningPerSecondUsd,
  miningAccruedUsd,
  miningTotalUsd,
  miningIsMature,
  miningElapsedSeconds,
  type MiningContract,
} from "@/hooks/useMining";

function makeContract(over: Partial<MiningContract> = {}): MiningContract {
  const start = new Date("2026-01-01T00:00:00Z").toISOString();
  const end = new Date("2026-01-31T00:00:00Z").toISOString();
  return {
    id: "c1",
    user_id: "u1",
    project_id: "p1",
    coin: "BTC",
    amount_usd: 1000,
    daily_rate: 1, // 1% / day
    lock_days: 30,
    started_at: start,
    ends_at: end,
    status: "active",
    reward_credited_coin: 0,
    coin_price_at_start: 60000,
    coin_price_at_settle: null,
    settled_at: null,
    created_at: start,
    ...over,
  };
}

describe("mining math", () => {
  it("daily earnings = principal * daily_rate%", () => {
    expect(miningDailyUsd(makeContract())).toBeCloseTo(10, 10); // 1000 * 1%
  });

  it("per-second earnings = daily / 86400", () => {
    const c = makeContract();
    expect(miningPerSecondUsd(c)).toBeCloseTo(10 / 86_400, 12);
  });

  it("total at maturity = daily * lock_days", () => {
    expect(miningTotalUsd(makeContract())).toBeCloseTo(300, 10); // 10 * 30
  });

  it("accrued grows linearly with elapsed time and caps at end", () => {
    const c = makeContract();
    const mid = new Date("2026-01-16T00:00:00Z"); // 15 days
    expect(miningAccruedUsd(c, mid)).toBeCloseTo(150, 6);
    const past = new Date("2026-03-01T00:00:00Z");
    expect(miningAccruedUsd(c, past)).toBeCloseTo(300, 6); // capped
    const before = new Date("2025-12-01T00:00:00Z");
    expect(miningAccruedUsd(c, before)).toBe(0);
  });

  it("elapsed seconds clamps to [0, duration]", () => {
    const c = makeContract();
    expect(miningElapsedSeconds(c, new Date("2025-12-01T00:00:00Z"))).toBe(0);
    expect(miningElapsedSeconds(c, new Date("2026-01-02T00:00:00Z"))).toBe(86_400);
    expect(miningElapsedSeconds(c, new Date("2027-01-01T00:00:00Z"))).toBe(30 * 86_400);
  });

  it("isMature flips at ends_at", () => {
    const c = makeContract();
    expect(miningIsMature(c, new Date("2026-01-30T23:59:59Z"))).toBe(false);
    expect(miningIsMature(c, new Date("2026-01-31T00:00:00Z"))).toBe(true);
  });

  it("progress percentage matches elapsed/total", () => {
    const c = makeContract();
    const mid = new Date("2026-01-16T00:00:00Z");
    const start = new Date(c.started_at).getTime();
    const end = new Date(c.ends_at).getTime();
    const progress = ((Math.min(mid.getTime(), end) - start) / (end - start)) * 100;
    expect(progress).toBeCloseTo(50, 6);
  });
});

describe("price + coin conversion", () => {
  it("usdToCoin returns null for missing/invalid price", () => {
    expect(usdToCoin(100, 0)).toBeNull();
    expect(usdToCoin(100, null)).toBeNull();
    expect(usdToCoin(100, undefined)).toBeNull();
    expect(usdToCoin(100, -5)).toBeNull();
  });

  it("usdToCoin converts using live price", () => {
    expect(usdToCoin(60_000, 60_000)).toBe(1);
    expect(usdToCoin(1, 0.1)!).toBeCloseTo(10, 10); // DOGE-style
  });

  it("resolveCoinPrice prefers live, falls back to start price", () => {
    expect(resolveCoinPrice(70_000, 60_000)).toBe(70_000);
    expect(resolveCoinPrice(undefined, 60_000)).toBe(60_000);
    expect(resolveCoinPrice(null, null)).toBeNull();
    expect(resolveCoinPrice(0, 0)).toBeNull();
  });
});

describe("per-coin precision", () => {
  it("BTC formats with 8 decimals", () => {
    expect(coinPrecision("BTC")).toEqual({ min: 8, max: 8 });
    expect(fmtCoinAmount(0.00012345, "BTC")).toBe("0.00012345");
    // never collapses to 0.00 for nonzero values
    expect(fmtCoinAmount(0.00000017, "BTC")).not.toBe("0.00");
  });

  it("DOGE formats with 4–8 decimals", () => {
    expect(coinPrecision("DOGE")).toEqual({ min: 4, max: 8 });
    expect(fmtCoinAmount(12.5, "DOGE")).toBe("12.5000");
    expect(fmtCoinAmount(0.00012345, "DOGE")).toBe("0.00012345");
    expect(fmtCoinAmount(0.0001, "DOGE")).not.toBe("0.00");
  });

  it("unknown coin defaults to 6–8 decimals", () => {
    expect(coinPrecision("FOOBAR")).toEqual({ min: 6, max: 8 });
    expect(fmtCoinAmount(1, "FOOBAR")).toBe("1.000000");
  });

  it("handles negative / non-finite gracefully", () => {
    expect(fmtCoinAmount(NaN, "BTC")).toBe("0.00000000");
    expect(fmtCoinAmount(-1, "BTC")).toBe("0.00000000");
  });
});

describe("end-to-end mining plan checks", () => {
  const plans = [
    { coin: "BTC", price: 65_000, amount: 5_000, daily_rate: 1.2, lock_days: 30 },
    { coin: "DOGE", price: 0.12, amount: 250, daily_rate: 0.8, lock_days: 14 },
    { coin: "ETH", price: 3_200, amount: 10_000, daily_rate: 0.5, lock_days: 60 },
  ];

  for (const p of plans) {
    it(`${p.coin}: daily, total, accrued, coin display all consistent`, () => {
      const c = makeContract({
        coin: p.coin,
        amount_usd: p.amount,
        daily_rate: p.daily_rate,
        lock_days: p.lock_days,
        started_at: "2026-01-01T00:00:00Z",
        ends_at: new Date(
          new Date("2026-01-01T00:00:00Z").getTime() + p.lock_days * 86_400_000,
        ).toISOString(),
        coin_price_at_start: p.price,
      });
      const dailyUsd = miningDailyUsd(c);
      expect(dailyUsd).toBeCloseTo(p.amount * (p.daily_rate / 100), 8);

      const totalUsd = miningTotalUsd(c);
      expect(totalUsd).toBeCloseTo(dailyUsd * p.lock_days, 8);

      // halfway through
      const half = new Date(
        new Date(c.started_at).getTime() + (p.lock_days / 2) * 86_400_000,
      );
      expect(miningAccruedUsd(c, half)).toBeCloseTo(totalUsd / 2, 6);

      // Coin display uses fallback price, so always non-null
      const eff = resolveCoinPrice(undefined, p.price)!;
      const coinAmt = usdToCoin(totalUsd, eff)!;
      expect(coinAmt).toBeGreaterThan(0);

      // formatted string never equals "0.00" for nonzero amounts
      const formatted = fmtCoinAmount(coinAmt, p.coin);
      expect(formatted).not.toMatch(/^0\.0+$/);
    });
  }
});
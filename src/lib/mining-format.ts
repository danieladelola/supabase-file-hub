// Mining/crypto formatting + math helpers (pure, fully tested).

export const COIN_PRECISION: Record<string, { min: number; max: number }> = {
  BTC: { min: 8, max: 8 },
  ETH: { min: 6, max: 8 },
  DOGE: { min: 4, max: 8 },
  LTC: { min: 6, max: 8 },
  BCH: { min: 6, max: 8 },
  XRP: { min: 4, max: 6 },
  TRX: { min: 4, max: 6 },
  SOL: { min: 4, max: 6 },
  USDT: { min: 2, max: 4 },
  USDC: { min: 2, max: 4 },
};

export function coinPrecision(symbol: string): { min: number; max: number } {
  return COIN_PRECISION[symbol?.toUpperCase()] ?? { min: 6, max: 8 };
}

/** Format coin amount with per-coin precision (BTC 8, DOGE 4–8, etc). */
export function fmtCoinAmount(amount: number, symbol: string): string {
  if (!isFinite(amount) || amount < 0) amount = 0;
  const p = coinPrecision(symbol);
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: p.min,
    maximumFractionDigits: p.max,
  });
}

/** Convert USD value to coin amount using a price; returns null when price <= 0. */
export function usdToCoin(usd: number, price: number | null | undefined): number | null {
  if (!price || price <= 0 || !isFinite(price)) return null;
  return usd / price;
}

/** Pick best available price: live first, fallback to recorded start price. */
export function resolveCoinPrice(
  livePrice: number | null | undefined,
  fallbackStartPrice: number | null | undefined,
): number | null {
  if (livePrice && livePrice > 0) return livePrice;
  if (fallbackStartPrice && fallbackStartPrice > 0) return fallbackStartPrice;
  return null;
}

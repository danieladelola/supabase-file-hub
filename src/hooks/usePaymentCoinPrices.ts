import { useQuery } from "@tanstack/react-query";
import { PAYMENT_COINS } from "@/lib/paymentCoins";

export type PaymentCoinPrice = {
  symbol: string;
  name: string;
  image: string;
  current_price: number; // USD per 1 unit
};

const CACHE_KEY = "payment-coin-prices-v1";

/** Static seed built from PAYMENT_COINS — always available, never empty. */
const STATIC_SEED: PaymentCoinPrice[] = PAYMENT_COINS.map((p) => ({
  symbol: p.symbol,
  name: p.name,
  image: p.image,
  current_price: p.fallbackPrice,
}));

function readCache(): PaymentCoinPrice[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === PAYMENT_COINS.length) return parsed;
  } catch {}
  return null;
}

function writeCache(data: PaymentCoinPrice[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

/**
 * Returns the 7 supported payment coins INSTANTLY using static fallback +
 * localStorage cache, then refreshes live prices from CoinGecko in the
 * background. The selector never renders empty.
 */
export function usePaymentCoinPrices() {
  const initialData = readCache() ?? STATIC_SEED;
  return useQuery({
    queryKey: ["payment-coin-prices"],
    initialData,
    placeholderData: STATIC_SEED,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    queryFn: async (): Promise<PaymentCoinPrice[]> => {
      const ids = PAYMENT_COINS.map((c) => c.coingecko_id).join(",");
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=false`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      let list: any[] = [];
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error("Failed to load payment coin prices");
        list = await res.json();
      } finally {
        clearTimeout(timer);
      }
      const bySym: Record<string, any> = {};
      list.forEach((c: any) => { bySym[c.symbol.toUpperCase()] = c; });
      const merged = PAYMENT_COINS.map((p) => {
        const c = bySym[p.symbol];
        return {
          symbol: p.symbol,
          name: p.name,
          image: c?.image || p.image,
          current_price: c?.current_price ?? p.fallbackPrice,
        };
      });
      writeCache(merged);
      return merged;
    },
  });
}

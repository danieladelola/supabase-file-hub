import { useQuery } from "@tanstack/react-query";

/**
 * Resolve USD prices for arbitrary coin symbols not present in the top-250
 * markets feed (e.g. EOS). Uses CoinGecko /coins/list to map symbol -> id,
 * then /coins/markets to fetch live prices. Cached for 60s.
 */
export function useExtraPrices(symbols: string[]) {
  const wanted = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).sort();
  return useQuery({
    queryKey: ["extra-prices", wanted.join(",")],
    enabled: wanted.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const listRes = await fetch("https://api.coingecko.com/api/v3/coins/list");
      if (!listRes.ok) return {};
      const list: Array<{ id: string; symbol: string }> = await listRes.json();
      // Pick the first id per symbol (usually the canonical one).
      const symToId: Record<string, string> = {};
      for (const c of list) {
        const sym = c.symbol.toUpperCase();
        if (wanted.includes(sym) && !symToId[sym]) symToId[sym] = c.id;
      }
      const ids = Object.values(symToId);
      if (!ids.length) return {};
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(",")}&sparkline=false`
      );
      if (!res.ok) return {};
      const data: Array<{ id: string; symbol: string; current_price: number }> = await res.json();
      const out: Record<string, number> = {};
      for (const c of data) out[c.symbol.toUpperCase()] = c.current_price;
      return out;
    },
  });
}

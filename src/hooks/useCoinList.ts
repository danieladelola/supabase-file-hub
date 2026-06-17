import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CoinListItem {
  id: string;          // coingecko id
  symbol: string;      // upper-case
  name: string;
  image: string;
  current_price: number;
  market_cap_rank: number | null;
  disabled?: boolean;  // disabled by admin
}

/**
 * Fetches top ~250 coins from CoinGecko and merges with admin-controlled
 * market_assets table (so admin can disable specific symbols).
 */
export function useCoinList() {
  return useQuery({
    queryKey: ["coin-list"],
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<CoinListItem[]> => {
      // Coins we always want included even if they fall outside the top-N feed.
      const EXTRA_IDS = ["eos"];
      const [p1, p2, p3, p4, extraRes, assetsRes] = await Promise.all([
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false"),
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false"),
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=3&sparkline=false"),
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=4&sparkline=false"),
        fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${EXTRA_IDS.join(",")}&sparkline=false`),
        supabase.from("market_assets").select("symbol,active"),
      ]);
      const pages = await Promise.all(
        [p1, p2, p3, p4, extraRes].map((r) => (r.ok ? r.json() : Promise.resolve([])))
      );
      const seen = new Set<string>();
      const coins: any[] = [];
      for (const arr of pages) {
        if (!Array.isArray(arr)) continue;
        for (const c of arr) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          coins.push(c);
        }
      }
      const disabledSet = new Set(
        (assetsRes.data ?? []).filter((a: any) => !a.active).map((a: any) => a.symbol.toUpperCase())
      );
      return coins.map((c: any) => ({
        id: c.id,
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        image: c.image,
        current_price: c.current_price,
        market_cap_rank: c.market_cap_rank,
        disabled: disabledSet.has(c.symbol.toUpperCase()),
      }));
    },
  });
}

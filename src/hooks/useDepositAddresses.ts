import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_COINS } from "@/lib/paymentCoins";
import { DEPOSIT_ADDRESS_FALLBACKS } from "@/lib/depositAddressFallbacks";

export type DepositAddressEntry = {
  address: string;
  enabled: boolean;
  network: string;
};

// Map: "<SYMBOL>:<NETWORK>" -> entry, plus legacy "<SYMBOL>" -> entry fallback.
export type DepositAddressMap = Record<string, DepositAddressEntry>;

function buildDefaults(): DepositAddressMap {
  const m: DepositAddressMap = {};
  for (const c of PAYMENT_COINS) {
    for (const n of c.networks) {
      const key = `${c.symbol}:${n}`;
      m[key] = {
        address: DEPOSIT_ADDRESS_FALLBACKS[key] ?? "",
        enabled: true,
        network: n,
      };
    }
  }
  return m;
}

export function addressKey(symbol: string, network: string) {
  return `${symbol}:${network}`;
}

export function useDepositAddresses() {
  return useQuery({
    queryKey: ["deposit-addresses"],
    staleTime: 30_000,
    queryFn: async (): Promise<DepositAddressMap> => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "deposit_addresses")
        .maybeSingle();
      const v = (data?.value ?? {}) as Record<string, Partial<DepositAddressEntry>>;
      const merged = buildDefaults();

      // Apply stored values; supports both new "SYM:NET" keys and legacy "SYM" keys.
      for (const [k, entry] of Object.entries(v)) {
        if (k.includes(":")) {
          merged[k] = { ...(merged[k] ?? { address: "", enabled: true, network: k.split(":")[1] }), ...entry } as DepositAddressEntry;
        } else {
          // Legacy single-network entry — apply to its default network.
          const coin = PAYMENT_COINS.find((c) => c.symbol === k);
          if (coin) {
            const net = (entry as any)?.network || coin.defaultNetwork;
            const newKey = `${coin.symbol}:${net}`;
            merged[newKey] = { ...(merged[newKey] ?? { address: "", enabled: true, network: net }), ...entry, network: net } as DepositAddressEntry;
          }
        }
      }
      return merged;
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MiningProject {
  id: string;
  name: string;
  coin: string;
  coin_logo: string | null;
  description: string | null;
  daily_rate: number;
  lock_days: number;
  min_amount: number;
  max_amount: number | null;
  capacity: number | null;
  status: "active" | "paused" | "disabled";
  sort_order: number;
  created_at: string;
}

export interface MiningContract {
  id: string;
  user_id: string;
  project_id: string | null;
  coin: string;
  amount_usd: number;
  daily_rate: number;
  lock_days: number;
  started_at: string;
  ends_at: string;
  status: "active" | "matured" | "completed" | "cancelled" | "paused";
  reward_credited_coin: number;
  coin_price_at_start: number | null;
  coin_price_at_settle: number | null;
  settled_at: string | null;
  created_at: string;
}

export function useMiningProjects(opts: { adminAll?: boolean } = {}) {
  return useQuery({
    queryKey: ["mining-projects", !!opts.adminAll],
    queryFn: async (): Promise<MiningProject[]> => {
      let q = supabase.from("mining_projects").select("*").order("sort_order");
      if (!opts.adminAll) q = q.eq("status", "active");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        daily_rate: Number(r.daily_rate),
        min_amount: Number(r.min_amount),
        max_amount: r.max_amount != null ? Number(r.max_amount) : null,
        capacity: r.capacity != null ? Number(r.capacity) : null,
      }));
    },
  });
}

export function useMiningContracts(opts: { all?: boolean } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mining-contracts", user?.id, !!opts.all],
    enabled: opts.all || !!user,
    queryFn: async (): Promise<MiningContract[]> => {
      const { data, error } = await supabase
        .from("mining_contracts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        amount_usd: Number(r.amount_usd),
        daily_rate: Number(r.daily_rate),
        reward_credited_coin: Number(r.reward_credited_coin),
        coin_price_at_start: r.coin_price_at_start != null ? Number(r.coin_price_at_start) : null,
        coin_price_at_settle: r.coin_price_at_settle != null ? Number(r.coin_price_at_settle) : null,
      }));
    },
  });
}

// Deterministic reward math (mirrors server formulas)
export function miningDailyUsd(c: Pick<MiningContract, "amount_usd" | "daily_rate">) {
  return c.amount_usd * (c.daily_rate / 100);
}
export function miningPerSecondUsd(c: Pick<MiningContract, "amount_usd" | "daily_rate">) {
  return miningDailyUsd(c) / 86_400;
}
export function miningElapsedSeconds(c: Pick<MiningContract, "started_at" | "ends_at">, now = new Date()) {
  const start = new Date(c.started_at).getTime();
  const end = new Date(c.ends_at).getTime();
  return Math.max(0, (Math.min(now.getTime(), end) - start) / 1000);
}
export function miningAccruedUsd(c: MiningContract, now = new Date()) {
  return miningPerSecondUsd(c) * miningElapsedSeconds(c, now);
}
export function miningTotalUsd(c: MiningContract) {
  return miningDailyUsd(c) * c.lock_days;
}
export function miningIsMature(c: MiningContract, now = new Date()) {
  return now.getTime() >= new Date(c.ends_at).getTime();
}

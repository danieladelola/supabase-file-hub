import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBalances } from "@/hooks/useBalances";
import { useFiatBalance } from "@/hooks/useFiatBalance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Coins, Lock, TrendingUp, DollarSign, Wallet, ChevronRight,
  Sparkles, CheckCircle2, Activity, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, formatDistanceToNowStrict } from "date-fns";
import { pendingReward, isMatured, totalExpectedReward, daysAccrued } from "@/lib/staking";
import { cn } from "@/lib/utils";

function formatAmount(n: number, max = 6) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: max });
}

export default function Stake() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: balances = [] } = useBalances();
  const { data: usdBalance = 0 } = useFiatBalance();

  const { data: plans = [] } = useQuery({
    queryKey: ["staking-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("staking_plans").select("*").eq("active", true).order("apy", { ascending: false });
      return data ?? [];
    },
  });

  const { data: stakes = [] } = useQuery({
    queryKey: ["my-stakes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_stakes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Re-render every second so pending rewards visibly tick.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = stakes.filter((s: any) => s.status === "active");
  const completed = stakes.filter((s: any) => s.status !== "active");

  const pendingByCoin = useMemo(() => {
    return active.reduce((acc: Record<string, number>, s: any) => {
      const key = s.is_usd ? "USD" : s.coin;
      acc[key] = (acc[key] ?? 0) + pendingReward(s, now);
      return acc;
    }, {} as Record<string, number>);
  }, [active, now]);

  const pendingEntries = Object.entries(pendingByCoin);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Staking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lock USD or crypto and earn rewards that accrue every second.
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="hidden sm:inline-flex gap-2">
              <Wallet className="h-4 w-4" />
              My stakes
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary">
                {stakes.length}
              </span>
            </Button>
          </SheetTrigger>
          <MyStakesSheet stakes={stakes} now={now} />
        </Sheet>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatTile
          icon={Activity}
          tone="primary"
          label="Active stakes"
          value={String(active.length)}
          hint={active.length === 0 ? "No stakes yet" : "Earning rewards now"}
        />
        <StatTile
          icon={CheckCircle2}
          tone="success"
          label="Completed"
          value={String(completed.length)}
          hint={completed.length ? "Ready to view" : "—"}
        />
        <Card className="bg-gradient-card border-border/60 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-primary opacity-[0.06] pointer-events-none" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Pending rewards
              </div>
              {pendingEntries.length > 0 && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-success">live</span>
              )}
            </div>
            {pendingEntries.length === 0 ? (
              <div className="text-2xl font-bold mt-2 text-muted-foreground">—</div>
            ) : (
              <div className="mt-2 space-y-1 max-h-24 overflow-y-auto pr-1">
                {pendingEntries.map(([coin, amt]) => (
                  <div key={coin} className="flex items-baseline justify-between gap-3">
                    <span className="text-lg font-bold tabular-nums">
                      {coin === "USD" ? `$${formatAmount(amt)}` : formatAmount(amt)}
                    </span>
                    {coin !== "USD" && (
                      <span className="text-xs font-medium text-muted-foreground">{coin}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile: My stakes trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="sm:hidden w-full rounded-xl border border-border/60 bg-gradient-primary text-primary-foreground p-4 flex items-center justify-between hover:opacity-95 transition shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-background/15 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">My stakes</div>
                <div className="text-xs opacity-80">{stakes.length} total • {active.length} active</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <MyStakesSheet stakes={stakes} now={now} />
      </Sheet>

      {/* Plans */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Available plans</h2>
            <p className="text-xs text-muted-foreground">Choose a plan, lock funds, and start earning.</p>
          </div>
          <span className="text-xs text-muted-foreground">{plans.length} plan{plans.length === 1 ? "" : "s"}</span>
        </div>

        {plans.length === 0 ? (
          <Card className="bg-gradient-card border-border/60 border-dashed">
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No staking plans available right now. Please check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p: any) => {
              const bal = p.is_usd ? usdBalance : (balances.find((b) => b.coin === p.coin)?.available ?? 0);
              return (
                <PlanCard key={p.id} plan={p} balance={bal} onStaked={() => {
                  qc.invalidateQueries({ queryKey: ["my-stakes"] });
                  qc.invalidateQueries({ queryKey: ["balances"] });
                  qc.invalidateQueries({ queryKey: ["fiat-balance"] });
                }} />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* -------- Stat tile -------- */

function StatTile({
  icon: Icon, label, value, hint, tone = "muted",
}: {
  icon: any; label: string; value: string; hint?: string;
  tone?: "primary" | "success" | "muted";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <Card className="bg-gradient-card border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
            {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
          </div>
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", toneClasses)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------- My stakes sheet -------- */

function MyStakesSheet({ stakes, now }: { stakes: any[]; now: Date }) {
  return (
    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle>My stakes</SheetTitle>
      </SheetHeader>
      <div className="mt-4">
        {stakes.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border/60 rounded-lg">
            You haven't staked yet.
          </div>
        ) : (
          <div className="space-y-3">
            {stakes.map((s) => <StakeRow key={s.id} stake={s} now={now} />)}
          </div>
        )}
      </div>
    </SheetContent>
  );
}

function StakeRow({ stake: s, now }: { stake: any; now: Date }) {
  const matured = isMatured(s, now);
  const live = pendingReward(s, now);
  const total = totalExpectedReward(s);
  const unit = s.is_usd ? "USD" : s.coin;
  const start = new Date(s.started_at).getTime();
  const end = new Date(s.ends_at).getTime();
  const progress = Math.min(100, Math.max(0, ((Math.min(now.getTime(), end) - start) / (end - start)) * 100));
  const status = matured && s.status === "active" ? "completed" : s.status;
  const days = daysAccrued(s, now);
  const totalDays = Math.max(1, (end - start) / 86_400_000);

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold tabular-nums truncate">
            {s.is_usd ? `$${Number(s.amount).toFixed(2)}` : `${Number(s.amount).toFixed(6)} ${s.coin}`}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1 text-success font-medium">
              <TrendingUp className="h-3 w-3" />{s.apy}% APY
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(new Date(s.started_at), "MMM d")} – {format(new Date(s.ends_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
          <span>Day {Math.floor(days)} / {Math.round(totalDays)}</span>
          <span>
            {matured ? "Matured" : `${formatDistanceToNowStrict(new Date(s.ends_at))} left`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pending</div>
          <div className="text-sm font-bold tabular-nums text-primary mt-0.5">
            {live.toFixed(6)} <span className="text-[10px] text-muted-foreground font-medium">{unit}</span>
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 border border-border/60 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total expected</div>
          <div className="text-sm font-bold tabular-nums mt-0.5">
            {total.toFixed(6)} <span className="text-[10px] text-muted-foreground font-medium">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- Plan card -------- */

function PlanCard({ plan, balance, onStaked }: { plan: any; balance: number; onStaked: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const unit = plan.is_usd ? "USD" : plan.coin;

  async function stake() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt < Number(plan.min_amount)) return toast.error(`Minimum ${plan.min_amount} ${unit}`);
    if (plan.max_amount && amt > Number(plan.max_amount)) return toast.error(`Maximum ${plan.max_amount} ${unit}`);
    if (amt > balance) return toast.error("Insufficient balance");
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const ends = addDays(new Date(), plan.lock_days);
    const { error } = await supabase.from("user_stakes").insert({
      user_id: user!.id, plan_id: plan.id, coin: plan.coin, amount: amt, apy: plan.apy,
      ends_at: ends.toISOString(), is_usd: !!plan.is_usd,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Stake created!");
    setOpen(false); setAmount("");
    onStaked();
  }

  const dailyRate = (Number(plan.apy) / 100) / 365;
  const sampleAmount = Number(plan.min_amount) || 1;
  const sampleDaily = sampleAmount * dailyRate;

  return (
    <Card className="bg-gradient-card border-border/60 hover:border-primary/40 hover:shadow-md transition group overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{plan.name}</div>
            {plan.description && (
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</div>
            )}
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-1 rounded-md">
            {unit}
          </span>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/15 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">APY</div>
          <div className="text-3xl font-bold text-primary tabular-nums">{plan.apy}%</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            ≈ {(dailyRate * 100).toFixed(4)}% / day
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>{plan.lock_days} day lock</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
            <Wallet className="h-3.5 w-3.5" />
            <span className="tabular-nums truncate">
              {plan.is_usd ? `$${balance.toFixed(2)}` : `${balance.toFixed(4)}`}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-3">
          Min <span className="font-medium text-foreground tabular-nums">{plan.min_amount} {unit}</span>
          {plan.max_amount && <> • Max <span className="font-medium text-foreground tabular-nums">{plan.max_amount} {unit}</span></>}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-primary group-hover:shadow-lg transition-shadow">
              {plan.is_usd ? <DollarSign className="mr-2 h-4 w-4" /> : <Coins className="mr-2 h-4 w-4" />}
              Stake {unit}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{plan.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">APY</div>
                  <div className="font-bold text-primary">{plan.apy}%</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Lock</div>
                  <div className="font-bold">{plan.lock_days}d</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Daily</div>
                  <div className="font-bold tabular-nums">{sampleDaily.toFixed(6)}</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex justify-between">
                <span>Available balance</span>
                <span className="font-medium text-foreground tabular-nums">
                  {plan.is_usd ? `$${balance.toFixed(2)}` : `${balance.toFixed(6)} ${plan.coin}`}
                </span>
              </div>

              <div className="space-y-2">
                <Label>Amount to stake ({unit})</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    placeholder={`Min ${plan.min_amount}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(String(balance))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                  >
                    Max
                  </button>
                </div>
                {amount && parseFloat(amount) > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Earns ≈{" "}
                    <span className="font-semibold text-success tabular-nums">
                      {(parseFloat(amount) * dailyRate).toFixed(6)} {unit}
                    </span>{" "}
                    per day
                  </div>
                )}
              </div>

              <Button onClick={stake} disabled={busy} className="w-full bg-gradient-primary">
                {busy ? "Confirming…" : "Confirm stake"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

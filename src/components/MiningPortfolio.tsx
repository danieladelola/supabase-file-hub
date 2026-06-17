import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { useFiatBalance } from "@/hooks/useFiatBalance";
import { useCoinList } from "@/hooks/useCoinList";
import {
  useMiningContracts,
  miningAccruedUsd, miningDailyUsd, miningTotalUsd,
  type MiningContract,
} from "@/hooks/useMining";
import {
  Wallet, Lock, Sparkles, TrendingUp, Activity, CheckCircle2, Pickaxe,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { fmtCoinAmount } from "@/lib/mining-format";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#14b8a6", "#f97316"];

function fmtUsd(n: number, max = 2) {
  if (!isFinite(n)) n = 0;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: max })}`;
}

export function MiningPortfolio({ now }: { now: Date }) {
  const { data: contracts = [] } = useMiningContracts();
  const { data: usd = 0 } = useFiatBalance();
  const { data: coinList = [] } = useCoinList();
  const coinLogos = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of coinList) {
      m[c.symbol] = c.image;
      m[c.symbol.toLowerCase()] = c.image;
      m[c.id] = c.image;
    }
    return m;
  }, [coinList]);

  const active = contracts.filter((c) => c.status === "active" || c.status === "matured");
  const completed = contracts.filter((c) => c.status === "completed");

  // Locked principal & projected rewards
  const lockedPrincipal = active.reduce((s, c) => s + c.amount_usd, 0);
  const projectedRewardsUsd = active.reduce((s, c) => s + miningTotalUsd(c), 0);
  const accruedRewardsUsd = active.reduce((s, c) => s + miningAccruedUsd(c, now), 0);
  const dailyUsd = active.reduce((s, c) => s + miningDailyUsd(c), 0);
  const monthlyUsd = dailyUsd * 30;

  // Released rewards (in USD at settle time)
  const releasedRewardsUsd = completed.reduce(
    (s, c) => s + c.reward_credited_coin * (c.coin_price_at_settle ?? 0),
    0,
  );
  const totalInvested = contracts.reduce((s, c) => s + c.amount_usd, 0);
  const portfolioValue = usd + lockedPrincipal + accruedRewardsUsd;
  const totalRoi = totalInvested > 0
    ? ((releasedRewardsUsd + accruedRewardsUsd) / totalInvested) * 100
    : 0;

  // Allocation by coin (locked principal)
  const allocation = useMemo(() => {
    const map = new Map<string, number>();
    active.forEach((c) => map.set(c.coin, (map.get(c.coin) ?? 0) + c.amount_usd));
    return Array.from(map.entries()).map(([coin, value]) => ({ coin, value }));
  }, [active]);

  // Earnings trend: cumulative invested vs cumulative rewards (USD)
  const trend = useMemo(() => {
    const sorted = [...contracts].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    let invested = 0;
    let rewards = 0;
    return sorted.map((c) => {
      invested += c.amount_usd;
      if (c.status === "completed") {
        rewards += c.reward_credited_coin * (c.coin_price_at_settle ?? 0);
      } else {
        rewards += miningAccruedUsd(c, now);
      }
      return {
        date: format(new Date(c.created_at), "MMM d"),
        invested: +invested.toFixed(2),
        rewards: +rewards.toFixed(2),
      };
    });
  }, [contracts, now]);

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <KPI icon={Wallet} label="Portfolio value" value={fmtUsd(portfolioValue)} tone="primary" hint="USD + locked + accrued" />
        <KPI icon={Lock} label="Locked capital" value={fmtUsd(lockedPrincipal)} tone="muted" />
        <KPI icon={Sparkles} label="Pending rewards" value={fmtUsd(accruedRewardsUsd, 4)} tone="success" hint="Live, not yet released" />
        <KPI icon={CheckCircle2} label="Rewards released" value={fmtUsd(releasedRewardsUsd)} tone="success" hint="From completed contracts" />
        <KPI icon={Activity} label="Active contracts" value={String(active.length)} tone="primary" />
        <KPI icon={Pickaxe} label="Completed" value={String(completed.length)} tone="muted" />
        <KPI icon={TrendingUp} label="Avg daily" value={fmtUsd(dailyUsd)} tone="primary" hint="Across active contracts" />
        <KPI icon={TrendingUp} label="Est. monthly" value={fmtUsd(monthlyUsd)} tone="success" />
      </div>

      {/* USD wallet breakdown */}
      <Card className="bg-gradient-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> USD Wallet breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <Box label="Available" value={fmtUsd(usd)} sub="Spendable" />
          <Box label="Locked in mining" value={fmtUsd(lockedPrincipal)} sub="Returns at maturity" highlight />
          <Box label="Total balance" value={fmtUsd(usd + lockedPrincipal)} sub="Available + locked" />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Portfolio growth</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {trend.length === 0 ? (
              <EmptyChart text="No contracts yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="invG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="rewG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="invested" stroke="hsl(var(--primary))" fill="url(#invG)" name="Cumulative invested" />
                  <Area type="monotone" dataKey="rewards" stroke="#10b981" fill="url(#rewG)" name="Cumulative rewards" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Asset allocation</CardTitle>
          </CardHeader>
          <CardContent className="h-auto">
            {allocation.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">No active contracts</div>
            ) : (
              <div className="space-y-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocation}
                        dataKey="value"
                        nameKey="coin"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {allocation.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, n) => [fmtUsd(v), n]}
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allocation.map((item, i) => (
                    <div key={item.coin} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                      {coinLogos[item.coin] ? (
                        <img src={coinLogos[item.coin]} alt={item.coin} className="h-5 w-5 rounded-full" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">
                          {item.coin.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{item.coin}</div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">{fmtUsd(item.value)}</div>
                      </div>
                      <div className="ml-auto h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROI strip */}
      <Card className="bg-gradient-card border-border/60">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total ROI</div>
            <div className={cn(
              "text-3xl font-bold tabular-nums",
              totalRoi >= 0 ? "text-success" : "text-destructive",
            )}>
              {totalRoi >= 0 ? "+" : ""}{totalRoi.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Released {fmtUsd(releasedRewardsUsd)} + pending {fmtUsd(accruedRewardsUsd, 4)} / invested {fmtUsd(totalInvested)}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
            <Mini label="Daily" value={fmtUsd(dailyUsd)} />
            <Mini label="Monthly" value={fmtUsd(monthlyUsd)} />
            <Mini label="At maturity (locked)" value={fmtUsd(projectedRewardsUsd)} />
            <Mini label="Total invested" value={fmtUsd(totalInvested)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({
  icon: Icon, label, value, hint, tone = "muted",
}: { icon: any; label: string; value: string; hint?: string; tone?: "primary" | "success" | "muted" }) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <Card className="bg-gradient-card border-border/60">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-bold mt-0.5 tabular-nums truncate">{value}</div>
          {hint && <div className="text-[10px] text-muted-foreground truncate">{hint}</div>}
        </div>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", toneCls)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function Box({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg border p-4",
      highlight ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background/40",
    )}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums mt-1", highlight && "text-primary")}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}

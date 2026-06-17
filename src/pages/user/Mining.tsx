import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFiatBalance } from "@/hooks/useFiatBalance";
import { useExtraPrices } from "@/hooks/useExtraPrices";
import {
  useMiningProjects, useMiningContracts,
  miningAccruedUsd, miningDailyUsd, miningPerSecondUsd, miningTotalUsd, miningIsMature,
  type MiningContract, type MiningProject,
} from "@/hooks/useMining";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Pickaxe, Lock, TrendingUp, Wallet, CalendarDays, Sparkles, AlertTriangle,
  CheckCircle2, Clock, Activity, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { MiningPortfolio } from "@/components/MiningPortfolio";
import { useCoinList } from "@/hooks/useCoinList";
import { fmtCoinAmount, resolveCoinPrice, usdToCoin } from "@/lib/mining-format";

function fmtUsd(n: number, max = 2) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: max })}`;
}

export default function Mining() {
  const qc = useQueryClient();
  const { data: projects = [] } = useMiningProjects();
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

  const symbols = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => s.add(p.coin));
    contracts.forEach((c) => s.add(c.coin));
    return Array.from(s);
  }, [projects, contracts]);
  const { data: prices = {} } = useExtraPrices(symbols);

  // Tick every second for live rewards
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = contracts.filter((c) => c.status === "active");
  const completed = contracts.filter((c) => c.status === "completed");

  const totalLockedUsd = active.reduce((s, c) => s + c.amount_usd, 0);
  const totalAccruedUsd = active.reduce((s, c) => s + miningAccruedUsd(c, now), 0);
  const totalDailyUsd = active.reduce((s, c) => s + miningDailyUsd(c), 0);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["mining-contracts"] });
    qc.invalidateQueries({ queryKey: ["fiat-balance"] });
    qc.invalidateQueries({ queryKey: ["balances"] });
  }

  async function settle(c: MiningContract) {
    const { error } = await supabase.rpc("settle_mining_contract", {
      _contract_id: c.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Contract settled — principal & ${c.coin} credited.`);
    invalidate();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Pickaxe className="h-7 w-7 text-primary" />
            Mining
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lock USD into multi-coin mining contracts and earn rewards in the coin you choose.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">USD Wallet</div>
          <div className="text-xl font-bold tabular-nums">{fmtUsd(usd)}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatTile icon={Activity} label="Active contracts" value={String(active.length)} tone="primary" />
        <StatTile icon={Lock} label="Locked principal" value={fmtUsd(totalLockedUsd)} tone="muted" />
        <Card className="bg-gradient-card border-border/60 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-[0.06]" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Pending rewards
              </div>
              {active.length > 0 && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-success">live</span>
              )}
            </div>
            <div className="text-2xl font-bold tabular-nums text-primary mt-1">
              {fmtUsd(totalAccruedUsd, 4)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              ≈ {fmtUsd(totalDailyUsd)} / day
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="active">
            Active {active.length > 0 && <span className="ml-1 text-[10px] bg-primary/15 text-primary px-1.5 rounded">{active.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-6">
          <MiningPortfolio now={now} />
        </TabsContent>


        {/* Marketplace */}
        <TabsContent value="marketplace" className="mt-6">
          {projects.length === 0 ? (
            <EmptyCard>No mining projects are available right now.</EmptyCard>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  coinPrice={prices[p.coin]}
                  coinLogoFallback={coinLogos[p.coin]}
                  usdBalance={usd}
                  onJoined={invalidate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active */}
        <TabsContent value="active" className="mt-6 space-y-4">
          {active.length === 0 ? (
            <EmptyCard>You have no active mining contracts yet.</EmptyCard>
          ) : (
            active.map((c) => (
              <ContractCard
                key={c.id}
                contract={c}
                coinPrice={prices[c.coin]}
                coinLogo={coinLogos[c.coin]}
                now={now}
                onSettle={() => settle(c)}
              />
            ))
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-6 space-y-4">
          {contracts.length === 0 ? (
            <EmptyCard>No mining history yet.</EmptyCard>
          ) : (
            <>
              {/* Summary */}
              <div className="grid sm:grid-cols-3 gap-4">
                <StatTile icon={Wallet} label="Total invested" value={fmtUsd(contracts.reduce((s, c) => s + c.amount_usd, 0))} tone="muted" />
                <StatTile icon={CheckCircle2} label="Completed" value={String(completed.length)} tone="success" />
                <StatTile
                  icon={Sparkles}
                  label="Rewards paid (coin total in USD@settle)"
                  value={fmtUsd(completed.reduce((s, c) => s + c.reward_credited_coin * (c.coin_price_at_settle ?? 0), 0))}
                  tone="primary"
                />
              </div>

              <div className="space-y-3">
                {contracts.map((c) => (
                  <HistoryRow key={c.id} contract={c} now={now} coinLogo={coinLogos[c.coin]} />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- helpers ---------- */

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="bg-gradient-card border-border/60 border-dashed">
      <CardContent className="p-10 text-center text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function StatTile({
  icon: Icon, label, value, tone = "muted",
}: { icon: any; label: string; value: string; tone?: "primary" | "success" | "muted" }) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <Card className="bg-gradient-card border-border/60">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", toneCls)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- project card ---------- */

function ProjectCard({
  project, coinPrice, coinLogoFallback, usdBalance, onJoined,
}: { project: MiningProject; coinPrice: number | undefined; coinLogoFallback?: string; usdBalance: number; onJoined: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const dailyUsdSample = (project.min_amount || 1) * (project.daily_rate / 100);
  const amt = parseFloat(amount) || 0;
  const dailyUsd = amt * (project.daily_rate / 100);
  const totalUsd = dailyUsd * project.lock_days;
  const totalCoin = coinPrice && coinPrice > 0 ? totalUsd / coinPrice : 0;

  async function join() {
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt < project.min_amount) return toast.error(`Minimum $${project.min_amount}`);
    if (project.max_amount && amt > project.max_amount) return toast.error(`Maximum $${project.max_amount}`);
    if (amt > usdBalance) return toast.error("Insufficient USD balance");
    setBusy(true);
    const { error } = await supabase.rpc("create_mining_contract", {
      _project_id: project.id,
      _amount_usd: amt,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${project.coin} mining contract started!`);
    setOpen(false);
    setAmount("");
    onJoined();
  }

  return (
    <Card className="bg-gradient-card border-border/60 hover:border-primary/40 hover:shadow-md transition group overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {(project.coin_logo || coinLogoFallback) ? (
              <img src={project.coin_logo || coinLogoFallback} alt={project.coin} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                {project.coin.slice(0, 3)}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate">{project.name}</div>
              <div className="text-xs text-muted-foreground">{project.coin} Mining</div>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {project.coin}
          </Badge>
        </div>

        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
        )}

        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/15 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Daily reward</div>
          <div className="text-3xl font-bold text-primary tabular-nums">{project.daily_rate}%</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Earn ≈ {fmtUsd(dailyUsdSample, 2)} / day at minimum stake
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />{project.lock_days} day lock</div>
          <div className="flex items-center gap-1.5 justify-end">
            <DollarSign className="h-3.5 w-3.5" />
            Min ${project.min_amount}
            {project.max_amount && <> · Max ${project.max_amount}</>}
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-primary group-hover:shadow-lg transition-shadow">
              <Pickaxe className="mr-2 h-4 w-4" />
              Start {project.coin} Mining
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{project.name}</DialogTitle>
              <DialogDescription>
                Lock USD and earn {project.coin} rewards over {project.lock_days} days.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Daily</div>
                  <div className="font-bold text-primary">{project.daily_rate}%</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Lock</div>
                  <div className="font-bold">{project.lock_days}d</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Coin</div>
                  <div className="font-bold">{project.coin}</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex justify-between">
                <span>USD wallet</span>
                <span className="font-medium text-foreground tabular-nums">{fmtUsd(usdBalance)}</span>
              </div>

              <div className="space-y-2">
                <Label>Investment amount (USD)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    placeholder={`Min ${project.min_amount}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(String(Math.min(usdBalance, project.max_amount ?? usdBalance)))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80"
                  >
                    Max
                  </button>
                </div>

                {amt > 0 && (
                  <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs space-y-1.5">
                    <Row k="Daily reward" v={fmtUsd(dailyUsd, 4)} />
                    <Row k={`Total at maturity (USD)`} v={fmtUsd(totalUsd, 2)} />
                    {coinPrice ? (
                      <>
                        <Row k={`${project.coin} price`} v={fmtUsd(coinPrice, 6)} />
                        <Row k={`Est. ${project.coin} reward`} v={`${fmtCoinAmount(totalCoin, project.coin)} ${project.coin}`} highlight />
                      </>
                    ) : (
                      <Row k={`${project.coin} price`} v="—" />
                    )}
                  </div>
                )}
              </div>

              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-sm">Locked until maturity</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <div>• Your USD principal stays locked until the contract matures.</div>
                  <div>• Mining rewards in {project.coin} are locked until contract end.</div>
                  <div>• Early withdrawal is not permitted.</div>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={join} disabled={busy} className="bg-gradient-primary">
                {busy ? "Confirming…" : "Confirm contract"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("font-semibold tabular-nums", highlight && "text-primary")}>{v}</span>
    </div>
  );
}

/* ---------- contract card (active) ---------- */

function ContractCard({
  contract: c, coinPrice, coinLogo, now, onSettle,
}: { contract: MiningContract; coinPrice: number | undefined; coinLogo?: string; now: Date; onSettle: () => void }) {
  const accruedUsd = miningAccruedUsd(c, now);
  const perSecUsd = miningPerSecondUsd(c);
  const dailyUsd = miningDailyUsd(c);
  const totalUsd = miningTotalUsd(c);
  const matured = miningIsMature(c, now);
  const start = new Date(c.started_at).getTime();
  const end = new Date(c.ends_at).getTime();
  const progress = end > start
    ? Math.min(100, Math.max(0, ((Math.min(now.getTime(), end) - start) / (end - start)) * 100))
    : 0;
  // Prefer live price; fall back to the recorded start price so coin amounts
  // never collapse to 0 while live prices are still loading.
  const effPrice = resolveCoinPrice(coinPrice, c.coin_price_at_start);
  const accruedCoin = usdToCoin(accruedUsd, effPrice);
  const totalCoin = usdToCoin(totalUsd, effPrice);
  const daysLeft = matured ? "Matured" : formatDistanceToNowStrict(new Date(c.ends_at));

  return (
    <Card className="bg-gradient-card border-border/60 overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {coinLogo ? (
              <img src={coinLogo} alt={c.coin} className="h-12 w-12 rounded-full" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
                {c.coin.slice(0, 3)}
              </div>
            )}
            <div>
              <div className="font-semibold flex items-center gap-2">
                {c.coin} Mining
                <Badge variant="outline" className="text-[10px]">{c.daily_rate}% / day</Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <CalendarDays className="h-3 w-3" />
                {format(new Date(c.started_at), "MMM d, yyyy")} – {format(new Date(c.ends_at), "MMM d, yyyy")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={matured ? "completed" : c.status} />
            {matured && (
              <Button size="sm" onClick={onSettle} className="bg-gradient-primary">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Claim
              </Button>
            )}
          </div>
        </div>

        <div>
          <Progress value={progress} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
            <span>{progress.toFixed(1)}% complete</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{daysLeft}{!matured && " left"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Box label="Locked principal" value={fmtUsd(c.amount_usd)} sub="USD" />
          <Box
            label="Pending rewards"
            value={accruedCoin != null ? `${fmtCoinAmount(accruedCoin, c.coin)} ${c.coin}` : "Calculating…"}
            sub={`≈ ${fmtUsd(accruedUsd, 6)}`}
            highlight
          />
          <Box label="Today's earnings" value={fmtUsd(dailyUsd, 2)} sub={`${c.daily_rate}% daily`} />
          <Box
            label="Est. at maturity"
            value={totalCoin != null ? `${fmtCoinAmount(totalCoin, c.coin)} ${c.coin}` : "Calculating…"}
            sub={`${fmtUsd(c.amount_usd + totalUsd, 2)} total · rewards ${fmtUsd(totalUsd, 2)}`}
          />
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-success" />
          Live: +{fmtUsd(perSecUsd, 8)} / sec
          {effPrice
            ? <> · {c.coin} @ {fmtUsd(effPrice, 6)}{!coinPrice && <span className="opacity-60"> (last known)</span>}</>
            : <> · price unavailable</>}
        </div>
      </CardContent>
    </Card>
  );
}

function Box({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-2.5", highlight ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background/40")}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={cn("text-sm font-bold tabular-nums mt-0.5 truncate", highlight && "text-primary")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground tabular-nums truncate">{sub}</div>}
    </div>
  );
}

/* ---------- history row ---------- */

function HistoryRow({ contract: c, now, coinLogo }: { contract: MiningContract; now: Date; coinLogo?: string }) {
  const isDone = c.status === "completed";
  return (
    <Card className="bg-gradient-card border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {coinLogo ? (
              <img src={coinLogo} alt={c.coin} className="h-9 w-9 rounded-full" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                {c.coin.slice(0, 3)}
              </div>
            )}
            <div>
              <div className="font-semibold text-sm">{c.coin} · {fmtUsd(c.amount_usd)}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(c.started_at), "MMM d, yyyy")} → {format(new Date(c.ends_at), "MMM d, yyyy")}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              {isDone ? `Paid: ${fmtCoinAmount(c.reward_credited_coin, c.coin)} ${c.coin}` : `Accrued: ${fmtUsd(miningAccruedUsd(c, now), 4)}`}
            </div>
            <StatusBadge status={c.status} />
          </div>
        </div>
        {(c.coin_price_at_start || c.coin_price_at_settle) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] border-t border-border/40 pt-2">
            <Box label="Start price" value={c.coin_price_at_start ? fmtUsd(c.coin_price_at_start, 6) : "—"} />
            <Box label="Settle price" value={c.coin_price_at_settle ? fmtUsd(c.coin_price_at_settle, 6) : "—"} />
            <Box label="Coin earned" value={isDone ? `${fmtCoinAmount(c.reward_credited_coin, c.coin)} ${c.coin}` : "—"} />
            <Box label="USD equivalent" value={isDone ? fmtUsd(c.reward_credited_coin * (c.coin_price_at_settle ?? 0)) : "—"} highlight />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

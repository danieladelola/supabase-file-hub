import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMiningProjects, useMiningContracts } from "@/hooks/useMining";
import { useCoinList } from "@/hooks/useCoinList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import {
  Pickaxe, Plus, Pencil, Trash2, AlertTriangle, Users, Wallet, Sparkles, Activity,
} from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  name: "",
  coin: "BTC",
  coin_logo: "",
  description: "",
  daily_rate: "",
  lock_days: "90",
  min_amount: "",
  max_amount: "",
  capacity: "",
  max_locked_capital: "",
  max_active_users: "",
  status: "active" as "active" | "paused" | "disabled",
  settlement_frozen: false,
  sort_order: "0",
};

export default function AdminMining() {
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useMiningProjects({ adminAll: true });
  const { data: contracts = [] } = useMiningContracts({ all: true });
  const { data: coinList = [] } = useCoinList();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const coinOptions = useMemo(
    () => [...coinList].sort((a, b) => (a.market_cap_rank ?? 9999) - (b.market_cap_rank ?? 9999)),
    [coinList]
  );

  const stats = useMemo(() => {
    const active = contracts.filter((c) => c.status === "active");
    return {
      projects: projects.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      contracts: contracts.length,
      activeContracts: active.length,
      lockedUsd: active.reduce((s, c) => s + c.amount_usd, 0),
      uniqueUsers: new Set(contracts.map((c) => c.user_id)).size,
    };
  }, [projects, contracts]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(p: any) {
    setEditing(p);
    setForm({
      name: p.name,
      coin: p.coin,
      coin_logo: p.coin_logo ?? "",
      description: p.description ?? "",
      daily_rate: String(p.daily_rate),
      lock_days: String(p.lock_days),
      min_amount: String(p.min_amount),
      max_amount: p.max_amount != null ? String(p.max_amount) : "",
      capacity: p.capacity != null ? String(p.capacity) : "",
      max_locked_capital: p.max_locked_capital != null ? String(p.max_locked_capital) : "",
      max_active_users: p.max_active_users != null ? String(p.max_active_users) : "",
      status: p.status,
      settlement_frozen: !!p.settlement_frozen,
      sort_order: String(p.sort_order),
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.coin.trim()) return toast.error("Coin is required");
    const dr = parseFloat(form.daily_rate);
    const lock = parseInt(form.lock_days, 10);
    const min = parseFloat(form.min_amount);
    const max = form.max_amount ? parseFloat(form.max_amount) : null;
    if (!dr || dr <= 0) return toast.error("Daily rate must be > 0");
    if (!lock || lock <= 0) return toast.error("Lock days must be > 0");
    if (!min || min <= 0) return toast.error("Minimum must be > 0");
    if (max !== null && max < min) return toast.error("Max can't be less than min");

    setBusy(true);
    const payload = {
      name: form.name.trim(),
      coin: form.coin.trim().toUpperCase(),
      coin_logo: form.coin_logo.trim() || null,
      description: form.description.trim() || null,
      daily_rate: dr,
      lock_days: lock,
      min_amount: min,
      max_amount: max,
      capacity: form.capacity ? parseFloat(form.capacity) : null,
      max_locked_capital: form.max_locked_capital ? parseFloat(form.max_locked_capital) : null,
      max_active_users: form.max_active_users ? parseInt(form.max_active_users, 10) : null,
      status: form.status,
      settlement_frozen: form.settlement_frozen,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };
    const { error } = editing
      ? await supabase.from("mining_projects").update(payload).eq("id", editing.id)
      : await supabase.from("mining_projects").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Project updated" : "Project created");
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["mining-projects"] });
  }

  async function setStatus(p: any, status: "active" | "paused" | "disabled") {
    const { error } = await supabase.from("mining_projects").update({ status }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Project ${status}`);
    qc.invalidateQueries({ queryKey: ["mining-projects"] });
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("mining_projects").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Project deleted");
    qc.invalidateQueries({ queryKey: ["mining-projects"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start md:items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Pickaxe className="h-7 w-7 text-primary" /> Mining Projects
          </h1>
          <p className="text-muted-foreground text-sm">Create and manage mining contracts available to users.</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" /> New project
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <StatCard label="Projects" value={stats.projects} icon={Pickaxe} />
        <StatCard label="Active projects" value={stats.activeProjects} icon={Activity} />
        <StatCard label="Contracts" value={stats.contracts} icon={Sparkles} />
        <StatCard label="Active contracts" value={stats.activeContracts} icon={Activity} />
        <StatCard label="Locked USD" value={`$${stats.lockedUsd.toLocaleString(undefined,{maximumFractionDigits:2})}`} icon={Wallet} />
        <StatCard label="Mining users" value={stats.uniqueUsers} icon={Users} />
      </div>

      <GlobalFreezeCard />


      <Card className="bg-gradient-card border-border/60">
        <CardHeader>
          <CardTitle>All projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Coin</TableHead>
                  <TableHead>Daily %</TableHead>
                  <TableHead>Lock</TableHead>
                  <TableHead className="hidden md:table-cell">Min</TableHead>
                  <TableHead className="hidden md:table-cell">Max</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : projects.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No projects yet.</TableCell></TableRow>
                ) : projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-muted-foreground line-clamp-1 max-w-[260px]">{p.description}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.coin}</Badge></TableCell>
                    <TableCell className="font-semibold text-emerald-500">{p.daily_rate}%</TableCell>
                    <TableCell>{p.lock_days}d</TableCell>
                    <TableCell className="hidden md:table-cell">${p.min_amount}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.max_amount != null ? `$${p.max_amount}` : "—"}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => setStatus(p, v as any)}>
                        <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit mining project" : "New mining project"}</DialogTitle>
            <DialogDescription>Projects with status “active” appear in the user marketplace.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BTC Mining Starter" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Reward coin *</Label>
                <Select
                  value={form.coin}
                  onValueChange={(v) => {
                    const c = coinOptions.find((x) => x.symbol === v);
                    setForm({ ...form, coin: v, coin_logo: c?.image ?? "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a coin from CoinGecko">
                      {form.coin && (
                        <span className="flex items-center gap-2">
                          {form.coin_logo && <img src={form.coin_logo} alt="" className="h-4 w-4 rounded-full" />}
                          {form.coin}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[60] max-h-[300px]">
                    {coinOptions.map((c) => (
                      <SelectItem key={c.id} value={c.symbol}>
                        <span className="flex items-center gap-2">
                          <img src={c.image} alt="" className="h-4 w-4 rounded-full" />
                          {c.symbol} — <span className="text-muted-foreground">{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Logo and price are pulled automatically from CoinGecko.</p>
              </div>
              <div className="space-y-2">
                <Label>Daily reward % *</Label>
                <Input type="number" step="any" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} placeholder="0.5" />
              </div>
              <div className="space-y-2">
                <Label>Lock duration (days) *</Label>
                <Input type="number" value={form.lock_days} onChange={(e) => setForm({ ...form, lock_days: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Minimum investment (USD) *</Label>
                <Input type="number" step="any" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Maximum investment (USD)</Label>
                <Input type="number" step="any" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} placeholder="leave blank for unlimited" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Project capacity (USD)</Label>
                <Input type="number" step="any" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="blank = unlimited" />
              </div>
              <div className="space-y-2">
                <Label>Max locked capital (USD)</Label>
                <Input type="number" step="any" value={form.max_locked_capital} onChange={(e) => setForm({ ...form, max_locked_capital: e.target.value })} placeholder="blank = unlimited" />
              </div>
              <div className="space-y-2">
                <Label>Max active users</Label>
                <Input type="number" value={form.max_active_users} onChange={(e) => setForm({ ...form, max_active_users: e.target.value })} placeholder="blank = unlimited" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
                  <div>
                    <div className="font-medium text-sm">Emergency settlement freeze</div>
                    <div className="text-xs text-muted-foreground">When on, cron + manual claims are blocked for this project.</div>
                  </div>
                  <Switch checked={form.settlement_frozen} onCheckedChange={(v) => setForm({ ...form, settlement_frozen: v })} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short blurb shown to users…" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-gradient-primary">
              {busy ? "Saving…" : editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Delete project?</DialogTitle>
            <DialogDescription>
              Existing user contracts are kept (their project_id will be cleared), but the project will no longer be available to new users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GlobalFreezeCard() {
  const qc = useQueryClient();
  const { data: row } = useQuery({
    queryKey: ["sys-setting", "mining_settlement_freeze"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "mining_settlement_freeze")
        .maybeSingle();
      return data;
    },
  });
  const frozen = (row?.value ?? "false") === "true";

  async function toggle(v: boolean) {
    const value = v ? "true" : "false";
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: "mining_settlement_freeze", value }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success(`Settlement ${v ? "frozen globally" : "resumed"}`);
    qc.invalidateQueries({ queryKey: ["sys-setting", "mining_settlement_freeze"] });
  }

  return (
    <Card className={`border-border/60 ${frozen ? "bg-destructive/10 border-destructive/40" : "bg-gradient-card"}`}>
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${frozen ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Global emergency freeze</div>
            <div className="text-xs text-muted-foreground">
              {frozen
                ? "All mining settlements are paused. Cron will mark matured but not pay out."
                : "When enabled, blocks ALL mining settlements (manual + automatic)."}
            </div>
          </div>
        </div>
        <Switch checked={frozen} onCheckedChange={toggle} />
      </CardContent>
    </Card>
  );
}

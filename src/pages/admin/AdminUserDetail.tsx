import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { pendingReward, totalExpectedReward, isMatured } from "@/lib/staking";
import {
  ArrowLeft, Save, Loader2, ShieldOff, Shield, KeyRound, Plus, Minus,
  History, Bell, Ban, ShoppingBag, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Mail, LogIn
} from "lucide-react";

const KYC_OPTIONS = ["none", "unverified", "pending", "approved", "rejected"];

export default function AdminUserDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["admin-user-bal", id],
    queryFn: async () => (await supabase.from("wallet_balances").select("*").eq("user_id", id)).data ?? [],
    enabled: !!id,
  });

  const { data: fiat } = useQuery({
    queryKey: ["admin-user-fiat", id],
    queryFn: async () => (await supabase.from("fiat_balances").select("*").eq("user_id", id).eq("currency", "USD").maybeSingle()).data,
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-user-stats", id],
    queryFn: async () => {
      const [orders, trades, deps, wds] = await Promise.all([
        supabase.from("exchange_transactions").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("trade_records").select("id", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("deposits").select("usd_credited, usd_amount", { count: "exact" }).eq("user_id", id).eq("status", "approved"),
        supabase.from("withdrawals").select("usd_amount, amount", { count: "exact" }).eq("user_id", id).eq("status", "approved"),
      ]);
      const depTotal = (deps.data ?? []).reduce((s: number, d: any) => s + Number(d.usd_credited ?? d.usd_amount ?? 0), 0);
      const wdTotal = (wds.data ?? []).reduce((s: number, w: any) => s + Number(w.usd_amount ?? 0), 0);
      return {
        orders: orders.count ?? 0,
        trades: trades.count ?? 0,
        depCount: deps.count ?? 0,
        wdCount: wds.count ?? 0,
        depTotal,
        wdTotal,
      };
    },
    enabled: !!id,
  });

  const { data: logins = [] } = useQuery({
    queryKey: ["admin-user-logins", id],
    queryFn: async () => (await supabase.from("login_history").select("*").eq("user_id", id).order("at", { ascending: false }).limit(50)).data ?? [],
    enabled: !!id,
  });

  const { data: notifs = [] } = useQuery({
    queryKey: ["admin-user-notifs", id],
    queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
    enabled: !!id,
  });

  const { data: stakings = [] } = useQuery({
    queryKey: ["admin-user-stakings", id],
    queryFn: async () => (await supabase.from("user_stakes").select(`
      *,
      staking_plans:plan_id (name, coin, apy, lock_days)
    `).eq("user_id", id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!id,
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ["admin-user-deposits", id],
    queryFn: async () => (await supabase.from("deposits").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50)).data ?? [],
    enabled: !!id,
  });

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  // Adjust balance
  const [adjOpen, setAdjOpen] = useState<null | "credit" | "debit">(null);
  const [adjAsset, setAdjAsset] = useState("USD");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);

  // Notification
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifBusy, setNotifBusy] = useState(false);

  // Ban
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banBusy, setBanBusy] = useState(false);

  async function saveProfile() {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: form.first_name ?? null,
      last_name: form.last_name ?? null,
      full_name: form.full_name ?? null,
      username: form.username ?? null,
      phone: form.phone ?? null,
      country_code: form.country_code ?? null,
      country: form.country ?? null,
      city: form.city ?? null,
      state: form.state ?? null,
      address_line1: form.address_line1 ?? null,
      postal_code: form.postal_code ?? null,
      notes: form.notes ?? null,
      email_verified: !!form.email_verified,
      mobile_verified: !!form.mobile_verified,
      two_factor_enabled: !!form.two_factor_enabled,
      kyc_status: form.kyc_status,
    }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["admin-user", id] });
  }

  async function adjustBalance() {
    const sign = adjOpen === "credit" ? 1 : -1;
    const n = Number(adjAmount);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter a positive amount");
    setAdjBusy(true);
    const { error } = await supabase.rpc("admin_adjust_balance", {
      _target: id, _asset: adjAsset.toUpperCase(), _delta: sign * n, _reason: adjReason || undefined,
    });
    setAdjBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Balance ${sign > 0 ? "credited" : "debited"}`);
    setAdjOpen(null); setAdjAmount(""); setAdjReason("");
    qc.invalidateQueries({ queryKey: ["admin-user-bal", id] });
    qc.invalidateQueries({ queryKey: ["admin-user-fiat", id] });
  }

  async function sendNotification() {
    if (!notifTitle.trim()) return toast.error("Title required");
    setNotifBusy(true);
    const { error } = await supabase.rpc("send_notification_segment", {
      _segment: "single", _title: notifTitle, _body: notifBody, _target_user: id,
    });
    setNotifBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Notification sent");
    setNotifOpen(false); setNotifTitle(""); setNotifBody("");
    qc.invalidateQueries({ queryKey: ["admin-user-notifs", id] });
  }

  async function toggleBan(banned: boolean) {
    setBanBusy(true);
    const { error } = await supabase.from("profiles").update({
      banned, banned_reason: banned ? (banReason || null) : null,
    }).eq("id", id);
    setBanBusy(false);
    if (error) return toast.error(error.message);
    toast.success(banned ? "User banned" : "User unbanned");
    setBanOpen(false); setBanReason("");
    qc.invalidateQueries({ queryKey: ["admin-user", id] });
  }

  async function callImpersonateApi(body: any) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin-impersonate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { data, error: res.ok ? null : { message: data?.error || `HTTP ${res.status}` } };
  }

  async function confirmEmailServer() {
    const { data, error } = await callImpersonateApi({ action: "confirm_email", target_user_id: id });
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Failed");
    toast.success("Email confirmed in auth");
    qc.invalidateQueries({ queryKey: ["admin-user", id] });
  }

  async function loginAsUser() {
    setImpersonating(true);
    const dashboardUrl = `${window.location.origin}/app`;
    const adminReturnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const { data, error } = await callImpersonateApi({
      action: "impersonate", target_user_id: id, redirect_to: dashboardUrl,
    });
    if (error || data?.error) {
      setImpersonating(false);
      return toast.error(data?.error ?? error?.message ?? "Could not start impersonation");
    }

    const { error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: data.verification_type ?? "magiclink",
    } as any);
    if (sessionError) {
      setImpersonating(false);
      return toast.error(`Impersonation failed: ${sessionError.message}`);
    }

    sessionStorage.setItem("impersonation", JSON.stringify({
      originalAdminId: data.admin_id,
      impersonatedUserId: data.target_user_id,
      impersonatedEmail: data.email,
      logId: data.log_id,
      returnToken: data.return_token,
      adminReturnPath,
    }));
    sessionStorage.setItem("impersonation_admin_id", data.admin_id);
    sessionStorage.setItem("impersonation_target_email", data.email);
    toast.success("Logged in as selected user");
    window.location.assign(dashboardUrl);
  }

  if (isLoading || !form) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!profile) {
    return <div className="text-center py-20 text-muted-foreground">User not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/admin/users/all"><ArrowLeft className="h-4 w-4 mr-1" />Users</Link></Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{profile.full_name || profile.username || profile.email}</h1>
            <p className="text-muted-foreground text-sm">{profile.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={profile.kyc_status} />
          {profile.banned ? <StatusBadge status="rejected" /> : <StatusBadge status="active" />}
          <Button onClick={saveProfile} disabled={saving} className="bg-gradient-primary">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Total Orders" value={String(stats?.orders ?? 0)} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total Trades" value={String(stats?.trades ?? 0)} />
        <StatCard icon={<ArrowDownToLine className="h-5 w-5" />} label="Total Deposits" value={`$${(stats?.depTotal ?? 0).toFixed(2)}`} sub={`${stats?.depCount ?? 0} approved`} />
        <StatCard icon={<ArrowUpFromLine className="h-5 w-5" />} label="Total Withdrawals" value={`$${(stats?.wdTotal ?? 0).toFixed(2)}`} sub={`${stats?.wdCount ?? 0} approved`} />
      </div>

      {/* Action buttons */}
      <Card className="bg-gradient-card border-border/60">
        <CardContent className="p-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAdjOpen("credit")} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" />Add Balance</Button>
          <Button size="sm" onClick={() => setAdjOpen("debit")} variant="destructive"><Minus className="h-4 w-4 mr-1" />Subtract Balance</Button>
          <Button size="sm" variant="secondary" onClick={() => document.getElementById("tab-logins")?.click()}><History className="h-4 w-4 mr-1" />Logins</Button>
          <Button size="sm" variant="secondary" onClick={() => setNotifOpen(true)}><Bell className="h-4 w-4 mr-1" />Notifications</Button>
          <Button size="sm" variant={profile.banned ? "outline" : "destructive"} onClick={() => setBanOpen(true)}>
            <Ban className="h-4 w-4 mr-1" />{profile.banned ? "Unban User" : "Ban User"}
          </Button>
          <Button size="sm" variant="outline" onClick={loginAsUser} disabled={impersonating}>
            {impersonating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <LogIn className="h-4 w-4 mr-1" />}
            Login as User
          </Button>
          <Button size="sm" variant="outline" onClick={confirmEmailServer}><Mail className="h-4 w-4 mr-1" />Confirm Email (auth)</Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="logins" id="tab-logins">Logins</TabsTrigger>
              <TabsTrigger value="notifs">Notifications</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="stakings">Stakings</TabsTrigger>
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <Card className="bg-gradient-card border-border/60">
                <CardHeader><CardTitle>Profile information</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  <Field label="First name" v={form.first_name} on={(v) => setForm({ ...form, first_name: v })} />
                  <Field label="Last name" v={form.last_name} on={(v) => setForm({ ...form, last_name: v })} />
                  <Field label="Username" v={form.username} on={(v) => setForm({ ...form, username: v })} />
                  <Field label="Email (read-only)" v={profile.email} on={() => {}} disabled />
                  <Field label="Country code" v={form.country_code} on={(v) => setForm({ ...form, country_code: v })} placeholder="+1" />
                  <Field label="Mobile number" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
                  <Field label="Address" v={form.address_line1} on={(v) => setForm({ ...form, address_line1: v })} />
                  <Field label="City" v={form.city} on={(v) => setForm({ ...form, city: v })} />
                  <Field label="State" v={form.state} on={(v) => setForm({ ...form, state: v })} />
                  <Field label="Zip / Postal" v={form.postal_code} on={(v) => setForm({ ...form, postal_code: v })} />
                  <Field label="Country" v={form.country} on={(v) => setForm({ ...form, country: v })} />
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Internal notes</Label>
                    <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logins" className="mt-4">
              <Card className="bg-gradient-card border-border/60">
                <CardHeader><CardTitle>Login history</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {logins.length === 0 && <div className="text-sm text-muted-foreground">No login history.</div>}
                  {logins.map((l: any) => (
                    <div key={l.id} className="text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-1 border-b border-border/40 last:border-0 py-2">
                      <span className="text-muted-foreground">{format(new Date(l.at), "MMM d, yyyy p")}</span>
                      <span className="font-mono">{l.ip || "—"}</span>
                      <span className="truncate max-w-full md:max-w-[50%] text-muted-foreground">{l.user_agent || "—"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifs" className="mt-4">
              <Card className="bg-gradient-card border-border/60">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Notifications</CardTitle>
                  <Button size="sm" onClick={() => setNotifOpen(true)}><Bell className="h-4 w-4 mr-1" />Send</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {notifs.length === 0 && <div className="text-sm text-muted-foreground">No notifications.</div>}
                  {notifs.map((n: any) => (
                    <div key={n.id} className="text-sm border-b border-border/40 last:border-0 py-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{n.title}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d, p")}</span>
                      </div>
                      {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balances" className="mt-4">
              <Card className="bg-gradient-card border-border/60">
                <CardHeader><CardTitle>All balances</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="font-medium">USD</span>
                    <span>${Number(fiat?.available ?? 0).toFixed(2)}</span>
                  </div>
                  {balances.map((b: any) => (
                    <div key={b.id} className="flex justify-between border-b border-border/40 last:border-0 py-1.5">
                      <span className="font-medium">{b.coin}</span>
                      <span className="text-right">
                        <span className="block">{Number(b.available).toFixed(8)}</span>
                        {Number(b.staked) > 0 && <span className="text-xs text-muted-foreground">staked: {Number(b.staked).toFixed(8)}</span>}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stakings" className="mt-4">
              <Card className="bg-gradient-card border-border/60">
                <CardHeader><CardTitle>All stakings</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stakings.length === 0 && <div className="text-sm text-muted-foreground">No stakings.</div>}
                  {stakings.map((s: any) => (
                    <div key={s.id} className="text-sm border-b border-border/40 last:border-0 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">{s.staking_plans?.name || 'Unknown Plan'}</span>
                          <span className="text-xs text-muted-foreground ml-2">({s.coin})</span>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Amount:</span> {Number(s.amount).toFixed(8)} {s.coin}
                        </div>
                        <div>
                          <span className="text-muted-foreground">APY:</span> {s.apy}%
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pending Reward:</span> {pendingReward(s).toFixed(8)} {s.coin}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Expected:</span> {totalExpectedReward(s).toFixed(8)} {s.coin}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Matured:</span> {isMatured(s) ? "Yes" : "No"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lock Days:</span> {s.staking_plans?.lock_days || 'N/A'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started:</span> {format(new Date(s.started_at), "MMM d, yyyy")}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ends:</span> {format(new Date(s.ends_at), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deposits" className="mt-4">
              <Card className="bg-gradient-card border-border/60">
                <CardHeader><CardTitle>Deposit history</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {deposits.length === 0 && <div className="text-sm text-muted-foreground">No deposits.</div>}
                  {deposits.map((d: any) => (
                    <div key={d.id} className="text-sm border-b border-border/40 last:border-0 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">{d.coin} Deposit</span>
                          <span className="text-xs text-muted-foreground ml-2">({d.status})</span>
                        </div>
                        <StatusBadge status={d.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Amount:</span> {Number(d.amount).toFixed(8)} {d.coin}
                        </div>
                        <div>
                          <span className="text-muted-foreground">USD Value:</span> ${Number(d.usd_amount || 0).toFixed(2)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">USD Credited:</span> ${Number(d.usd_credited || 0).toFixed(2)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Payment:</span> {d.pay_amount ? `${Number(d.pay_amount).toFixed(8)} ${d.pay_coin}` : 'N/A'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span> {format(new Date(d.created_at), "MMM d, yyyy p")}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Processed:</span> {d.processed_at ? format(new Date(d.processed_at), "MMM d, yyyy p") : 'Pending'}
                        </div>
                      </div>
                      {d.tx_hash && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">TX Hash:</span> <span className="font-mono break-all">{d.tx_hash}</span>
                        </div>
                      )}
                      {d.admin_note && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Note: {d.admin_note}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: status toggles */}
        <div className="space-y-6">
          <Card className="bg-gradient-card border-border/60">
            <CardHeader><CardTitle>Verification & access</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Toggle label="Email verified" v={!!form.email_verified} on={(v) => setForm({ ...form, email_verified: v })} />
              <Toggle label="Mobile verified" v={!!form.mobile_verified} on={(v) => setForm({ ...form, mobile_verified: v })} />
              <Toggle label="Two-factor (2FA)" icon={<KeyRound className="h-4 w-4" />} v={!!form.two_factor_enabled} on={(v) => setForm({ ...form, two_factor_enabled: v })} />
              <div className="space-y-2">
                <Label>KYC status</Label>
                <Select value={form.kyc_status} onValueChange={(v) => setForm({ ...form, kyc_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KYC_OPTIONS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    {profile.banned ? <ShieldOff className="h-4 w-4 text-destructive" /> : <Shield className="h-4 w-4" />}
                    Account banned
                  </Label>
                  <span className="text-xs text-muted-foreground">{profile.banned ? "Banned" : "Active"}</span>
                </div>
                {profile.banned && profile.banned_reason && (
                  <p className="text-xs text-muted-foreground mt-2">Reason: {profile.banned_reason}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/60">
            <CardHeader><CardTitle>Account meta</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div>ID: <span className="font-mono break-all">{profile.id}</span></div>
              <div>Joined: {format(new Date(profile.created_at), "MMM d, yyyy")}</div>
              <div>Updated: {format(new Date(profile.updated_at), "MMM d, yyyy")}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Adjust balance dialog */}
      <Dialog open={adjOpen !== null} onOpenChange={(o) => !o && setAdjOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{adjOpen === "credit" ? "Add Balance" : "Subtract Balance"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Asset / Wallet</Label>
              <Input value={adjAsset} onChange={(e) => setAdjAsset(e.target.value)} placeholder="USD or BTC" />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.00000001" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea rows={2} value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(null)}>Cancel</Button>
            <Button onClick={adjustBalance} disabled={adjBusy} className={adjOpen === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : ""} variant={adjOpen === "debit" ? "destructive" : "default"}>
              {adjBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {adjOpen === "credit" ? "Add" : "Subtract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification dialog */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send notification to user</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Title</Label><Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea rows={4} value={notifBody} onChange={(e) => setNotifBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifOpen(false)}>Cancel</Button>
            <Button onClick={sendNotification} disabled={notifBusy}>{notifBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban dialog */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{profile.banned ? "Unban user" : "Ban user"}</DialogTitle></DialogHeader>
          {!profile.banned && (
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea rows={3} value={banReason} onChange={(e) => setBanReason(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>Cancel</Button>
            <Button variant={profile.banned ? "default" : "destructive"} disabled={banBusy} onClick={() => toggleBan(!profile.banned)}>
              {banBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {profile.banned ? "Unban" : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="bg-gradient-card border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-primary">{icon}</span>
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Field({ label, v, on, placeholder, disabled }: { label: string; v: any; on: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={v ?? ""} onChange={(e) => on(e.target.value)} placeholder={placeholder} disabled={disabled} />
    </div>
  );
}

function Toggle({ label, v, on, icon }: { label: string; v: boolean; on: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="flex items-center gap-2">{icon}{label}</Label>
      <Switch checked={v} onCheckedChange={on} />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, Image as ImageIcon, SlidersHorizontal, Coins, LineChart, Bell,
  CreditCard, Banknote, Search, ShieldCheck, LogIn, Languages, Puzzle, Clock, Code2, Wallet, Loader2, Plus, Trash2, ArrowRight, Mail,
} from "lucide-react";
import { PAYMENT_COINS } from "@/lib/paymentCoins";
import { useDepositAddresses, DepositAddressMap } from "@/hooks/useDepositAddresses";

/* ---------- helpers ---------- */
async function loadSetting<T = any>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
  if (!data) return fallback;
  const v: any = data.value;
  if (v && typeof v === "object" && !Array.isArray(v)) return { ...(fallback as any), ...v } as T;
  return (v ?? fallback) as T;
}
async function saveSetting(key: string, value: any) {
  const { error } = await supabase.from("system_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/* ---------- module catalog ---------- */
type ModuleId =
  | "general" | "logo" | "system_config" | "currency" | "chart" | "notifications"
  | "payment_gateways" | "withdrawal_methods" | "seo" | "kyc_fields" | "social_login"
  | "language" | "extensions" | "cron" | "custom_css" | "deposit_addresses" | "smtp_email";

const MODULES: { id: ModuleId; label: string; description: string; icon: any }[] = [
  { id: "general",            label: "General Setting",      description: "Site name, timezone, support contact.",        icon: SettingsIcon },
  { id: "logo",               label: "Logo and Favicon",     description: "Branding assets used across the platform.",    icon: ImageIcon },
  { id: "system_config",      label: "System Configuration", description: "Toggle core modules and site controls.",       icon: SlidersHorizontal },
  { id: "currency",           label: "Manage Currency",      description: "Default currency, symbol and decimals.",       icon: Coins },
  { id: "chart",              label: "Chart Setting",        description: "Trading & dashboard chart preferences.",       icon: LineChart },
  { id: "notifications",      label: "Notification Setting", description: "Email, SMS, push and in-app channels.",        icon: Bell },
  { id: "smtp_email",         label: "SMTP & Email Settings", description: "SMTP credentials, templates and email logs.", icon: Mail },
  { id: "payment_gateways",   label: "Payment Gateways",     description: "Manual & automatic payment providers.",        icon: CreditCard },
  { id: "withdrawal_methods", label: "Withdrawal Methods",   description: "Methods, fees, limits & required fields.",     icon: Banknote },
  { id: "deposit_addresses",  label: "Deposit Addresses",    description: "Wallet addresses for each payment coin.",      icon: Wallet },
  { id: "seo",                label: "SEO Configuration",    description: "Meta tags, Open Graph, Twitter cards.",        icon: Search },
  { id: "kyc_fields",         label: "KYC Setting",          description: "Dynamic KYC fields shown to users.",           icon: ShieldCheck },
  { id: "social_login",       label: "Social Login Setting", description: "Google, Facebook, Apple OAuth providers.",     icon: LogIn },
  { id: "language",           label: "Language",             description: "Site languages and default language.",         icon: Languages },
  { id: "extensions",         label: "Extensions",           description: "Analytics, chat widget, captcha, pixels.",     icon: Puzzle },
  { id: "cron",               label: "Cron Job Setting",     description: "Scheduled task URLs and run status.",          icon: Clock },
  { id: "custom_css",         label: "Custom CSS",           description: "Inject custom styles into the frontend.",      icon: Code2 },
];

/* ---------- defaults per module ---------- */
const DEFAULTS: Record<ModuleId, any> = {
  general: { site_name: "Haratrading", site_title: "Haratrading — Crypto Exchange", timezone: "UTC", date_format: "YYYY-MM-DD", support_email: "support@haratrading.pro", support_phone: "", address: "" },
  logo: { logo_url: "", admin_logo_url: "", favicon_url: "", login_banner_url: "" },
  system_config: { registration_enabled: true, email_verification_required: true, mobile_verification_required: false, kyc_required: true, maintenance_mode: false, referral_enabled: false, deposits_enabled: true, withdrawals_enabled: true, exchange_enabled: true, staking_enabled: true },
  currency: { default_currency: "USD", symbol: "$", decimal_places: 2, show_exchange_rates: true, supported_currencies: "USD,EUR,GBP" },
  chart: { provider: "tradingview", theme: "dark", default_pair: "BTCUSDT", show_volume: true, candle_interval: "1h", market_chart_enabled: true },
  notifications: { email_enabled: true, sms_enabled: false, push_enabled: false, inapp_enabled: true, sender_name: "Haratrading", sender_email: "no-reply@haratrading.pro", smtp_host: "", smtp_port: 587, smtp_user: "", smtp_pass: "" },
  payment_gateways: { gateways: [
    { id: "manual_bank", name: "Bank Transfer", type: "manual", enabled: true, charge_pct: 0, min: 10, max: 100000, currencies: "USD", instructions: "" },
  ] },
  withdrawal_methods: { methods: [
    { id: "crypto", name: "Crypto Withdrawal", currency: "USD", min: 20, max: 50000, charge_pct: 1, processing_time: "1-24h", required_fields: "wallet_address,network", enabled: true },
  ] },
  deposit_addresses: {}, // handled by dedicated hook
  seo: { meta_title: "Haratrading — Crypto Exchange", meta_description: "Trade, stake and grow your crypto.", meta_keywords: "crypto, exchange, trading, staking", og_image_url: "", twitter_card: "summary_large_image", twitter_handle: "", robots: "index, follow", canonical_url: "" },
  kyc_fields: { fields: [
    { id: "full_name", label: "Full Name",   type: "text",  required: true,  enabled: true },
    { id: "dob",       label: "Date of Birth", type: "date", required: true, enabled: true },
    { id: "id_front",  label: "ID Front",   type: "file",  required: true,  enabled: true },
    { id: "id_back",   label: "ID Back",    type: "file",  required: false, enabled: true },
    { id: "selfie",    label: "Selfie",     type: "file",  required: true,  enabled: true },
  ] },
  social_login: { providers: [
    { id: "google",   name: "Google",   enabled: false, client_id: "", client_secret: "", redirect_url: "" },
    { id: "facebook", name: "Facebook", enabled: false, client_id: "", client_secret: "", redirect_url: "" },
    { id: "apple",    name: "Apple",    enabled: false, client_id: "", client_secret: "", redirect_url: "" },
  ] },
  language: { default_language: "en", supported_languages: "en,es,fr,de,ar", allow_user_switch: true },
  extensions: { google_analytics_id: "", facebook_pixel_id: "", recaptcha_site_key: "", recaptcha_secret_key: "", tawk_to_id: "", custom_chat_script: "" },
  cron: { enabled: true, last_run_at: "", price_sync_url: "", stake_payout_url: "", instructions: "Schedule via Supabase pg_cron or external cron hitting these URLs." },
  custom_css: { css: "" },
  smtp_email: {},
};

/* ---------- field config for generic editor ---------- */
type Field = { key: string; label: string; type?: "text" | "number" | "textarea" | "switch" | "password" };
const FIELDS: Partial<Record<ModuleId, Field[]>> = {
  general: [
    { key: "site_name", label: "Site Name" },
    { key: "site_title", label: "Site Title" },
    { key: "timezone", label: "Timezone" },
    { key: "date_format", label: "Date Format" },
    { key: "support_email", label: "Support Email" },
    { key: "support_phone", label: "Support Phone" },
    { key: "address", label: "Address", type: "textarea" },
  ],
  logo: [
    { key: "logo_url", label: "Site Logo URL" },
    { key: "admin_logo_url", label: "Admin Logo URL" },
    { key: "favicon_url", label: "Favicon URL" },
    { key: "login_banner_url", label: "Login Banner URL" },
  ],
  system_config: [
    { key: "registration_enabled", label: "User Registration", type: "switch" },
    { key: "email_verification_required", label: "Email Verification Required", type: "switch" },
    { key: "mobile_verification_required", label: "Mobile Verification Required", type: "switch" },
    { key: "kyc_required", label: "KYC Required", type: "switch" },
    { key: "maintenance_mode", label: "Maintenance Mode", type: "switch" },
    { key: "referral_enabled", label: "Referral System", type: "switch" },
    { key: "deposits_enabled", label: "Deposits Enabled", type: "switch" },
    { key: "withdrawals_enabled", label: "Withdrawals Enabled", type: "switch" },
    { key: "exchange_enabled", label: "Exchange Enabled", type: "switch" },
    { key: "staking_enabled", label: "Staking Enabled", type: "switch" },
  ],
  currency: [
    { key: "default_currency", label: "Default Currency" },
    { key: "symbol", label: "Currency Symbol" },
    { key: "decimal_places", label: "Decimal Places", type: "number" },
    { key: "show_exchange_rates", label: "Show Exchange Rates", type: "switch" },
    { key: "supported_currencies", label: "Supported Currencies (comma separated)" },
  ],
  chart: [
    { key: "provider", label: "Chart Provider" },
    { key: "theme", label: "Theme (dark/light)" },
    { key: "default_pair", label: "Default Pair" },
    { key: "candle_interval", label: "Default Interval" },
    { key: "show_volume", label: "Show Volume", type: "switch" },
    { key: "market_chart_enabled", label: "Market Chart Enabled", type: "switch" },
  ],
  notifications: [
    { key: "email_enabled", label: "Email Notifications", type: "switch" },
    { key: "sms_enabled", label: "SMS Notifications", type: "switch" },
    { key: "push_enabled", label: "Push Notifications", type: "switch" },
    { key: "inapp_enabled", label: "In-App Notifications", type: "switch" },
    { key: "sender_name", label: "Sender Name" },
    { key: "sender_email", label: "Sender Email" },
    { key: "smtp_host", label: "SMTP Host" },
    { key: "smtp_port", label: "SMTP Port", type: "number" },
    { key: "smtp_user", label: "SMTP User" },
    { key: "smtp_pass", label: "SMTP Password", type: "password" },
  ],
  seo: [
    { key: "meta_title", label: "Meta Title" },
    { key: "meta_description", label: "Meta Description", type: "textarea" },
    { key: "meta_keywords", label: "Meta Keywords" },
    { key: "og_image_url", label: "Open Graph Image URL" },
    { key: "twitter_card", label: "Twitter Card Type" },
    { key: "twitter_handle", label: "Twitter Handle" },
    { key: "robots", label: "Robots Directive" },
    { key: "canonical_url", label: "Canonical URL" },
  ],
  language: [
    { key: "default_language", label: "Default Language Code" },
    { key: "supported_languages", label: "Supported Languages (comma separated)" },
    { key: "allow_user_switch", label: "Allow User Language Switch", type: "switch" },
  ],
  extensions: [
    { key: "google_analytics_id", label: "Google Analytics ID" },
    { key: "facebook_pixel_id", label: "Facebook Pixel ID" },
    { key: "recaptcha_site_key", label: "reCAPTCHA Site Key" },
    { key: "recaptcha_secret_key", label: "reCAPTCHA Secret Key", type: "password" },
    { key: "tawk_to_id", label: "Tawk.to Property ID" },
    { key: "custom_chat_script", label: "Custom Chat Script", type: "textarea" },
  ],
  cron: [
    { key: "enabled", label: "Cron Enabled", type: "switch" },
    { key: "price_sync_url", label: "Price Sync URL" },
    { key: "stake_payout_url", label: "Stake Payout URL" },
    { key: "last_run_at", label: "Last Run At" },
    { key: "instructions", label: "Instructions", type: "textarea" },
  ],
};

/* ---------- main page ---------- */
export default function AdminSettings() {
  const [open, setOpen] = useState<ModuleId | null>(null);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground text-sm">Configure every module of the platform. Changes are saved to the database and take effect immediately.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => m.id === "smtp_email" ? navigate("/admin/settings/email") : setOpen(m.id)}
              className="text-left group"
            >
              <Card className="bg-gradient-card border-border/60 h-full transition-all hover:border-primary/60 hover:shadow-elegant">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-base mt-3">{m.label}</CardTitle>
                  <CardDescription className="text-xs">{m.description}</CardDescription>
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>

      <SettingDialog moduleId={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* ---------- dialog router ---------- */
function SettingDialog({ moduleId, onClose }: { moduleId: ModuleId | null; onClose: () => void }) {
  const mod = MODULES.find((m) => m.id === moduleId);
  return (
    <Dialog open={!!moduleId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {mod && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><mod.icon className="h-5 w-5 text-primary" />{mod.label}</DialogTitle>
              <DialogDescription>{mod.description}</DialogDescription>
            </DialogHeader>
            {moduleId === "deposit_addresses" ? <DepositAddressesEditor onClose={onClose} />
              : moduleId === "payment_gateways" ? <PaymentGatewaysEditor onClose={onClose} />
              : moduleId === "withdrawal_methods" ? <WithdrawalMethodsEditor onClose={onClose} />
              : moduleId === "kyc_fields" ? <KycFieldsEditor onClose={onClose} />
              : moduleId === "social_login" ? <SocialLoginEditor onClose={onClose} />
              : moduleId === "custom_css" ? <CustomCssEditor onClose={onClose} />
              : <GenericEditor moduleId={moduleId!} onClose={onClose} />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- generic editor ---------- */
function GenericEditor({ moduleId, onClose }: { moduleId: ModuleId; onClose: () => void }) {
  const fields = FIELDS[moduleId] ?? [];
  const defaults = DEFAULTS[moduleId];
  const [vals, setVals] = useState<Record<string, any>>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSetting(moduleId, defaults).then((v) => { if (alive) { setVals(v); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  // Mirror legacy keys for general module so existing code keeps working
  async function persist() {
    setSaving(true);
    try {
      await saveSetting(moduleId, vals);
      if (moduleId === "general") {
        await saveSetting("platform_name", vals.site_name);
        await saveSetting("support_email", vals.support_email);
      }
      toast.success("Saved");
      onClose();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>;

  return (
    <div className="space-y-4 py-2">
      {fields.map((f) => (
        <div key={f.key} className={f.type === "switch" ? "flex items-center justify-between rounded-md border border-border/60 px-3 py-2" : "space-y-2"}>
          <Label className={f.type === "switch" ? "text-sm" : ""}>{f.label}</Label>
          {f.type === "switch" ? (
            <Switch checked={!!vals[f.key]} onCheckedChange={(v) => setVals({ ...vals, [f.key]: v })} />
          ) : f.type === "textarea" ? (
            <Textarea value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} rows={3} />
          ) : (
            <Input
              type={f.type === "password" ? "password" : f.type === "number" ? "number" : "text"}
              value={vals[f.key] ?? ""}
              onChange={(e) => setVals({ ...vals, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
            />
          )}
        </div>
      ))}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={persist} disabled={saving} className="bg-gradient-primary">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ---------- deposit addresses (existing data preserved) ---------- */
function DepositAddressesEditor({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: addrs } = useDepositAddresses();
  const [form, setForm] = useState<DepositAddressMap | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (addrs && !form) setForm(addrs); }, [addrs, form]);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await saveSetting("deposit_addresses", form);
      toast.success("Deposit addresses updated");
      qc.invalidateQueries({ queryKey: ["deposit-addresses"] });
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  if (!form) return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3 py-2">
      {PAYMENT_COINS.flatMap((c) =>
        c.networks.map((net) => {
          const key = `${c.symbol}:${net}`;
          const e = form[key] ?? { address: "", enabled: true, network: net };
          return (
            <div key={key} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">
                  {c.symbol} <span className="text-xs text-muted-foreground font-normal">— {c.name} ({net})</span>
                </div>
                <Switch checked={e.enabled} onCheckedChange={(v) => setForm({ ...form, [key]: { ...e, enabled: v, network: net } })} />
              </div>
              <Input
                className="font-mono text-xs"
                placeholder="Wallet address"
                value={e.address}
                onChange={(ev) => setForm({ ...form, [key]: { ...e, address: ev.target.value, network: net } })}
              />
            </div>
          );
        })
      )}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save addresses
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ---------- payment gateways ---------- */
function PaymentGatewaysEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ gateways: any[] }>({ gateways: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { loadSetting("payment_gateways", DEFAULTS.payment_gateways).then((v) => { setData(v); setLoading(false); }); }, []);

  function update(i: number, patch: any) { const g = [...data.gateways]; g[i] = { ...g[i], ...patch }; setData({ gateways: g }); }
  function add() { setData({ gateways: [...data.gateways, { id: `gw_${Date.now()}`, name: "New Gateway", type: "manual", enabled: false, charge_pct: 0, min: 0, max: 0, currencies: "USD", api_key: "", secret_key: "", webhook_url: "", instructions: "" }] }); }
  function remove(i: number) { setData({ gateways: data.gateways.filter((_, idx) => idx !== i) }); }
  async function save() { setSaving(true); try { await saveSetting("payment_gateways", data); toast.success("Saved"); onClose(); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  return (
    <div className="space-y-3 py-2">
      {data.gateways.map((g, i) => (
        <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2 bg-background/40">
          <div className="flex items-center justify-between gap-2">
            <Input value={g.name} onChange={(e) => update(i, { name: e.target.value })} className="font-semibold" />
            <Switch checked={g.enabled} onCheckedChange={(v) => update(i, { enabled: v })} />
            <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Type (manual/auto)</Label><Input value={g.type} onChange={(e) => update(i, { type: e.target.value })} /></div>
            <div><Label className="text-xs">Currencies</Label><Input value={g.currencies} onChange={(e) => update(i, { currencies: e.target.value })} /></div>
            <div><Label className="text-xs">Charge %</Label><Input type="number" value={g.charge_pct} onChange={(e) => update(i, { charge_pct: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Min</Label><Input type="number" value={g.min} onChange={(e) => update(i, { min: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Max</Label><Input type="number" value={g.max} onChange={(e) => update(i, { max: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Webhook URL</Label><Input value={g.webhook_url ?? ""} onChange={(e) => update(i, { webhook_url: e.target.value })} /></div>
            <div><Label className="text-xs">API Key</Label><Input value={g.api_key ?? ""} onChange={(e) => update(i, { api_key: e.target.value })} /></div>
            <div><Label className="text-xs">Secret Key</Label><Input type="password" value={g.secret_key ?? ""} onChange={(e) => update(i, { secret_key: e.target.value })} /></div>
          </div>
          <div><Label className="text-xs">Instructions</Label><Textarea rows={2} value={g.instructions ?? ""} onChange={(e) => update(i, { instructions: e.target.value })} /></div>
        </div>
      ))}
      <Button variant="outline" onClick={add} className="w-full"><Plus className="h-4 w-4 mr-2" />Add gateway</Button>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
      </DialogFooter>
    </div>
  );
}

/* ---------- withdrawal methods ---------- */
function WithdrawalMethodsEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ methods: any[] }>({ methods: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { loadSetting("withdrawal_methods", DEFAULTS.withdrawal_methods).then((v) => { setData(v); setLoading(false); }); }, []);

  function update(i: number, patch: any) { const m = [...data.methods]; m[i] = { ...m[i], ...patch }; setData({ methods: m }); }
  function add() { setData({ methods: [...data.methods, { id: `wm_${Date.now()}`, name: "New Method", currency: "USD", min: 10, max: 10000, charge_pct: 0, processing_time: "1-24h", required_fields: "wallet_address", enabled: true }] }); }
  function remove(i: number) { setData({ methods: data.methods.filter((_, idx) => idx !== i) }); }
  async function save() { setSaving(true); try { await saveSetting("withdrawal_methods", data); toast.success("Saved"); onClose(); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  return (
    <div className="space-y-3 py-2">
      {data.methods.map((m, i) => (
        <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2 bg-background/40">
          <div className="flex items-center gap-2">
            <Input value={m.name} onChange={(e) => update(i, { name: e.target.value })} className="font-semibold" />
            <Switch checked={m.enabled} onCheckedChange={(v) => update(i, { enabled: v })} />
            <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Currency</Label><Input value={m.currency} onChange={(e) => update(i, { currency: e.target.value })} /></div>
            <div><Label className="text-xs">Processing Time</Label><Input value={m.processing_time} onChange={(e) => update(i, { processing_time: e.target.value })} /></div>
            <div><Label className="text-xs">Min</Label><Input type="number" value={m.min} onChange={(e) => update(i, { min: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Max</Label><Input type="number" value={m.max} onChange={(e) => update(i, { max: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Charge %</Label><Input type="number" value={m.charge_pct} onChange={(e) => update(i, { charge_pct: Number(e.target.value) })} /></div>
            <div><Label className="text-xs">Required Fields (csv)</Label><Input value={m.required_fields} onChange={(e) => update(i, { required_fields: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <Button variant="outline" onClick={add} className="w-full"><Plus className="h-4 w-4 mr-2" />Add method</Button>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
      </DialogFooter>
    </div>
  );
}

/* ---------- KYC dynamic fields ---------- */
function KycFieldsEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ fields: any[] }>({ fields: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { loadSetting("kyc_fields", DEFAULTS.kyc_fields).then((v) => { setData(v); setLoading(false); }); }, []);

  function update(i: number, patch: any) { const f = [...data.fields]; f[i] = { ...f[i], ...patch }; setData({ fields: f }); }
  function add() { setData({ fields: [...data.fields, { id: `f_${Date.now()}`, label: "New Field", type: "text", required: false, enabled: true, options: "" }] }); }
  function remove(i: number) { setData({ fields: data.fields.filter((_, idx) => idx !== i) }); }
  async function save() { setSaving(true); try { await saveSetting("kyc_fields", data); toast.success("Saved"); onClose(); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  return (
    <div className="space-y-3 py-2">
      {data.fields.map((f, i) => (
        <div key={i} className="rounded-lg border border-border/60 p-3 bg-background/40 grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4"><Label className="text-xs">Label</Label><Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} /></div>
          <div className="col-span-3"><Label className="text-xs">Type</Label><Input value={f.type} onChange={(e) => update(i, { type: e.target.value })} placeholder="text/file/date/select" /></div>
          <div className="col-span-2 flex flex-col items-center"><Label className="text-xs">Required</Label><Switch checked={f.required} onCheckedChange={(v) => update(i, { required: v })} /></div>
          <div className="col-span-2 flex flex-col items-center"><Label className="text-xs">Enabled</Label><Switch checked={f.enabled} onCheckedChange={(v) => update(i, { enabled: v })} /></div>
          <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button></div>
          {f.type === "select" && (
            <div className="col-span-12"><Label className="text-xs">Options (csv)</Label><Input value={f.options ?? ""} onChange={(e) => update(i, { options: e.target.value })} /></div>
          )}
        </div>
      ))}
      <Button variant="outline" onClick={add} className="w-full"><Plus className="h-4 w-4 mr-2" />Add field</Button>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
      </DialogFooter>
    </div>
  );
}

/* ---------- social login providers ---------- */
function SocialLoginEditor({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ providers: any[] }>({ providers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { loadSetting("social_login", DEFAULTS.social_login).then((v) => { setData(v); setLoading(false); }); }, []);

  function update(i: number, patch: any) { const p = [...data.providers]; p[i] = { ...p[i], ...patch }; setData({ providers: p }); }
  async function save() { setSaving(true); try { await saveSetting("social_login", data); toast.success("Saved"); onClose(); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  return (
    <div className="space-y-3 py-2">
      {data.providers.map((p, i) => (
        <div key={i} className="rounded-lg border border-border/60 p-3 bg-background/40 space-y-2">
          <div className="flex items-center justify-between"><div className="font-semibold">{p.name}</div><Switch checked={p.enabled} onCheckedChange={(v) => update(i, { enabled: v })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Client ID</Label><Input value={p.client_id} onChange={(e) => update(i, { client_id: e.target.value })} /></div>
            <div><Label className="text-xs">Client Secret</Label><Input type="password" value={p.client_secret} onChange={(e) => update(i, { client_secret: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Redirect URL</Label><Input value={p.redirect_url} onChange={(e) => update(i, { redirect_url: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
      </DialogFooter>
    </div>
  );
}

/* ---------- custom CSS injector ---------- */
function CustomCssEditor({ onClose }: { onClose: () => void }) {
  const [css, setCss] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { loadSetting("custom_css", DEFAULTS.custom_css).then((v) => { setCss(v.css ?? ""); setLoading(false); }); }, []);
  async function save() {
    setSaving(true);
    try {
      await saveSetting("custom_css", { css });
      // live-inject
      let tag = document.getElementById("admin-custom-css") as HTMLStyleElement | null;
      if (!tag) { tag = document.createElement("style"); tag.id = "admin-custom-css"; document.head.appendChild(tag); }
      tag.innerHTML = css;
      toast.success("Saved");
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  return (
    <div className="space-y-3 py-2">
      <Label className="text-xs">Custom CSS (applied globally)</Label>
      <Textarea rows={14} className="font-mono text-xs" value={css} onChange={(e) => setCss(e.target.value)} placeholder="/* your CSS here */" />
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
      </DialogFooter>
    </div>
  );
}

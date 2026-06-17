import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Mail, Loader2, Send, Edit2, RefreshCw } from "lucide-react";

const ENCRYPTIONS = [
  { v: "none", l: "None" },
  { v: "ssl",  l: "SSL"  },
  { v: "tls",  l: "TLS"  },
];
const DRIVERS = [
  { v: "smtp",     l: "SMTP" },
  { v: "sendmail", l: "Sendmail" },
  { v: "mailgun",  l: "Mailgun" },
  { v: "default",  l: "Default" },
];
const TEMPLATE_VARS = [
  "{{site_name}}", "{{user_name}}", "{{username}}", "{{email}}", "{{amount}}",
  "{{currency}}", "{{transaction_id}}", "{{status}}", "{{support_email}}",
  "{{login_url}}", "{{verification_link}}", "{{reset_link}}", "{{date}}",
];

export default function AdminEmailSettings() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/settings")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Mail className="h-6 w-6 text-primary" />SMTP & Email Settings</h1>
          <p className="text-muted-foreground text-sm">Configure SMTP, manage email templates and review email logs.</p>
        </div>
      </div>

      <Tabs defaultValue="smtp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="smtp"><SmtpTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- SMTP ---------------- */
function SmtpTab() {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editPass, setEditPass] = useState(false);
  const [pass, setPass] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("email_settings").select("*").eq("id", 1).maybeSingle();
    setS(data ?? { id: 1, enabled: false, mail_driver: "smtp", smtp_port: 587, smtp_encryption: "tls" });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      const payload: any = { ...s, updated_at: new Date().toISOString() };
      if (!editPass) delete payload.smtp_pass;
      else payload.smtp_pass = pass;
      const { error } = await supabase.from("email_settings").upsert(payload);
      if (error) throw error;
      toast.success("SMTP settings saved");
      setEditPass(false); setPass("");
      load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }

  async function sendTest() {
    if (!testEmail) return toast.error("Enter a recipient email");
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { action: "test", to: testEmail },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error ?? "Test failed");
      toast.success("Test email sent");
    } catch (e: any) { toast.error("SMTP test failed: " + (e.message ?? e)); }
    finally { setTesting(false); }
  }

  if (loading || !s) return <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  const masked = s.smtp_pass ? "•".repeat(10) : "(not set)";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2 bg-gradient-card border-border/60">
        <CardHeader><CardTitle>SMTP Configuration</CardTitle><CardDescription>Sender credentials used by the platform.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <div><Label>SMTP Status</Label><p className="text-xs text-muted-foreground">Enable to allow the platform to send emails.</p></div>
            <Switch checked={!!s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Mail Driver</Label>
              <Select value={s.mail_driver ?? "smtp"} onValueChange={(v) => setS({ ...s, mail_driver: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DRIVERS.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Encryption</Label>
              <Select value={s.smtp_encryption ?? "tls"} onValueChange={(v) => setS({ ...s, smtp_encryption: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENCRYPTIONS.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>SMTP Host</Label><Input value={s.smtp_host ?? ""} onChange={(e) => setS({ ...s, smtp_host: e.target.value })} placeholder="smtp.example.com" /></div>
            <div className="space-y-2"><Label>SMTP Port</Label><Input type="number" value={s.smtp_port ?? 587} onChange={(e) => setS({ ...s, smtp_port: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>SMTP Username</Label><Input value={s.smtp_user ?? ""} onChange={(e) => setS({ ...s, smtp_user: e.target.value })} /></div>
            <div className="space-y-2"><Label>SMTP Password</Label>
              {editPass ? (
                <div className="flex gap-2">
                  <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="New password" />
                  <Button variant="ghost" size="sm" onClick={() => { setEditPass(false); setPass(""); }}>Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Input value={masked} readOnly className="font-mono" />
                  <Button variant="outline" size="sm" onClick={() => setEditPass(true)}><Edit2 className="h-4 w-4 mr-1" />Replace</Button>
                </div>
              )}
            </div>
            <div className="space-y-2"><Label>From Email</Label><Input type="email" value={s.from_email ?? ""} onChange={(e) => setS({ ...s, from_email: e.target.value })} placeholder="no-reply@haratrading.pro" /></div>
            <div className="space-y-2"><Label>From Name</Label><Input value={s.from_name ?? ""} onChange={(e) => setS({ ...s, from_name: e.target.value })} placeholder="Haratrading" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Reply-To Email</Label><Input type="email" value={s.reply_to ?? ""} onChange={(e) => setS({ ...s, reply_to: e.target.value })} placeholder="support@haratrading.pro" /></div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-gradient-primary">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save SMTP Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border/60 h-fit">
        <CardHeader><CardTitle>Send Test Email</CardTitle><CardDescription>Verify your SMTP settings deliver successfully.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Label>Recipient</Label>
          <Input type="email" placeholder="you@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          <Button onClick={sendTest} disabled={testing} className="w-full bg-gradient-primary">
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Send Test
          </Button>
          <p className="text-xs text-muted-foreground">Save SMTP settings before testing. Errors are returned safely without crashing the app.</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Templates ---------------- */
function TemplatesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("email_templates").select("*").order("name");
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(t: any, v: boolean) {
    const { error } = await supabase.from("email_templates").update({ active: v }).eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  }

  return (
    <Card className="bg-gradient-card border-border/60">
      <CardHeader><CardTitle>Email Templates</CardTitle><CardDescription>Click a template to edit subject and body. Use variables like {`{{user_name}}`} and {`{{site_name}}`}.</CardDescription></CardHeader>
      <CardContent>
        {loading ? <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div> : (
          <div className="rounded-md border border-border/60 overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Key</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.key}</TableCell>
                    <TableCell className="max-w-xs truncate">{t.subject}</TableCell>
                    <TableCell><Switch checked={t.active} onCheckedChange={(v) => toggleActive(t, v)} /></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setEditing(t)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <TemplateEditor t={editing} onClose={() => setEditing(null)} onSaved={load} />
      </CardContent>
    </Card>
  );
}

function TemplateEditor({ t, onClose, onSaved }: { t: any | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setV(t ? { ...t } : null); }, [t]);
  if (!v) return null;

  function insertVar(field: "subject" | "body", k: string) {
    setV({ ...v, [field]: (v[field] ?? "") + " " + k });
  }
  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("email_templates")
        .update({ name: v.name, subject: v.subject, body: v.body, active: v.active })
        .eq("id", v.id);
      if (error) throw error;
      toast.success("Template saved"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit: {v.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Template Name</Label><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Subject</Label><Input value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} rows={12} className="font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Insert variable</Label>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARS.map((k) => (
                <Badge key={k} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => insertVar("body", k)}>{k}</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <Label>Active</Label>
            <Switch checked={v.active} onCheckedChange={(b) => setV({ ...v, active: b })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-gradient-primary">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Logs ---------------- */
function LogsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  return (
    <Card className="bg-gradient-card border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Email Logs</CardTitle><CardDescription>Latest 200 sent or failed email attempts.</CardDescription></div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </CardHeader>
      <CardContent>
        {loading ? <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div> : (
          <div className="rounded-md border border-border/60 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Recipient</TableHead><TableHead>Subject</TableHead><TableHead>Template</TableHead><TableHead>Status</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No emails sent yet</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{r.recipient}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.subject}</TableCell>
                    <TableCell className="text-xs font-mono">{r.template_key ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "sent" ? "default" : "destructive"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[260px] truncate">{r.error ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

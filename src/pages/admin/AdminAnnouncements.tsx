import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { broadcast } from "@/lib/mail";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Megaphone, Loader2, Send, RefreshCw,
  Bold, Italic, Underline, List, ListOrdered, Link2, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Image as ImageIcon,
  Quote, Minus, Undo2, Redo2, Eraser, Strikethrough, Palette, Highlighter,
} from "lucide-react";

export default function AdminAnnouncements() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" /> Announcements
        </h1>
        <p className="text-muted-foreground text-sm">
          Send branded email announcements to all users. Uses the centralized SMTP configuration.
        </p>
      </div>

      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="compose"><Compose /></TabsContent>
        <TabsContent value="history"><History /></TabsContent>
        <TabsContent value="logs"><Logs /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Compose ---------------- */
function Compose() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState<"idle" | "test" | "all">("idle");
  const editorRef = useRef<HTMLDivElement>(null);

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }

  function getHtml(): string {
    return editorRef.current?.innerHTML.trim() ?? "";
  }

  async function persistAnnouncement(status: "draft" | "sent" | "partial"): Promise<string | null> {
    const html = getHtml();
    if (!subject || !html) { toast.error("Subject and body are required"); return null; }
    const { data, error } = await supabase
      .from("announcements")
      .insert({ subject, body_html: html, sent_by: user?.id ?? null, status })
      .select("id").single();
    if (error) { toast.error(error.message); return null; }
    return data.id as string;
  }

  async function sendTest() {
    if (!testTo) return toast.error("Enter a test recipient");
    const html = getHtml();
    if (!subject || !html) return toast.error("Subject and body are required");
    setBusy("test");
    const r = await broadcast({ subject, html, test_to: testTo });
    setBusy("idle");
    if (!r.ok) toast.error(r.error ?? "Failed"); else toast.success("Test email sent");
  }

  async function sendAll() {
    const html = getHtml();
    if (!subject || !html) return toast.error("Subject and body are required");
    if (!confirm("Send this announcement to ALL users?")) return;
    setBusy("all");
    const id = await persistAnnouncement("draft");
    if (!id) { setBusy("idle"); return; }
    const r = await broadcast({ subject, html, announcement_id: id });
    setBusy("idle");
    if (!r.ok) return toast.error(r.error ?? "Failed");
    toast.success(`Sent to ${r.sent}/${r.total} users (${r.failed ?? 0} failed)`);
    setSubject(""); if (editorRef.current) editorRef.current.innerHTML = "";
  }

  return (
    <Card className="bg-gradient-card border-border/60">
      <CardHeader>
        <CardTitle>New Announcement</CardTitle>
        <CardDescription>Write your message. It will be wrapped in the branded email template automatically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Important update from Haratrading" />
        </div>

        <div className="space-y-2">
          <Label>Body</Label>
          <div className="flex flex-wrap gap-1 rounded-md border border-border/60 bg-muted/30 p-1">
            <ToolBtn onClick={() => exec("bold")}        icon={<Bold className="h-4 w-4" />} />
            <ToolBtn onClick={() => exec("italic")}      icon={<Italic className="h-4 w-4" />} />
            <ToolBtn onClick={() => exec("underline")}   icon={<Underline className="h-4 w-4" />} />
            <div className="w-px bg-border mx-1" />
            <ToolBtn onClick={() => exec("formatBlock", "<h2>")} icon={<Heading2 className="h-4 w-4" />} />
            <ToolBtn onClick={() => exec("formatBlock", "<h3>")} icon={<Heading3 className="h-4 w-4" />} />
            <ToolBtn onClick={() => exec("formatBlock", "<p>")}  icon={<span className="text-xs px-1">P</span>} />
            <div className="w-px bg-border mx-1" />
            <ToolBtn onClick={() => exec("insertUnorderedList")} icon={<List className="h-4 w-4" />} />
            <ToolBtn onClick={() => exec("insertOrderedList")}   icon={<ListOrdered className="h-4 w-4" />} />
            <div className="w-px bg-border mx-1" />
            <ToolBtn onClick={() => { const url = prompt("Link URL"); if (url) exec("createLink", url); }} icon={<Link2 className="h-4 w-4" />} />
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[260px] rounded-md border border-border/60 bg-background p-4 text-sm focus:outline-none prose prose-sm dark:prose-invert max-w-none"
          />
          <p className="text-xs text-muted-foreground">Tip: paste plain text for cleanest formatting.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
          <div className="space-y-2">
            <Label>Send test to</Label>
            <div className="flex gap-2">
              <Input type="email" placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <Button variant="outline" onClick={sendTest} disabled={busy !== "idle"}>
                {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button onClick={sendAll} disabled={busy !== "idle"} className="w-full bg-gradient-primary">
              {busy === "all" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
              Send to all users
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolBtn({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-accent text-foreground/80">
      {icon}
    </button>
  );
}

/* ---------------- History ---------------- */
function History() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  return (
    <Card className="bg-gradient-card border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Past announcements</CardTitle><CardDescription>Latest 100 announcements</CardDescription></div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </CardHeader>
      <CardContent>
        {loading ? <Center><Loader2 className="h-5 w-5 animate-spin" /></Center> : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead><TableHead>Failed</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No announcements yet</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{r.subject}</TableCell>
                  <TableCell><Badge variant={r.status === "sent" ? "default" : r.status === "partial" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-sm">{r.recipients_count ?? 0}</TableCell>
                  <TableCell className="text-sm text-destructive">{r.failed_count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Logs ---------------- */
function Logs() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("email_logs").select("*")
      .eq("template_key", "announcement").order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  return (
    <Card className="bg-gradient-card border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Announcement email logs</CardTitle><CardDescription>Latest 200 announcement-related sends</CardDescription></div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </CardHeader>
      <CardContent>
        {loading ? <Center><Loader2 className="h-5 w-5 animate-spin" /></Center> : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Recipient</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No logs</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.recipient}</TableCell>
                  <TableCell className="text-xs max-w-[260px] truncate">{r.subject}</TableCell>
                  <TableCell><Badge variant={r.status === "sent" ? "default" : "destructive"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-destructive max-w-[260px] truncate">{r.error ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center">{children}</div>;
}
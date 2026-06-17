import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Send } from "lucide-react";

const SEGMENTS: { value: string; label: string; description: string }[] = [
  { value: "all", label: "All users", description: "Every registered user" },
  { value: "active", label: "Active users", description: "Not banned" },
  { value: "banned", label: "Banned users", description: "Currently banned" },
  { value: "email_unverified", label: "Email unverified", description: "Have not verified email" },
  { value: "mobile_unverified", label: "Mobile unverified", description: "Have not verified phone" },
  { value: "kyc_unverified", label: "KYC unverified", description: "KYC none / unverified" },
  { value: "kyc_pending", label: "KYC pending", description: "Awaiting KYC review" },
  { value: "with_balance", label: "Users with balance", description: "Have funds in wallet or USD" },
  { value: "single", label: "Single user", description: "Send to one specific user" },
];

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [segment, setSegment] = useState("all");
  const [targetUser, setTargetUser] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,email,full_name,username")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["notif-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  async function send() {
    if (!title.trim()) return toast.error("Title required");
    if (segment === "single" && !targetUser) return toast.error("Select a user");
    setBusy(true);
    const { data, error } = await supabase.rpc("send_notification_segment", {
      _segment: segment,
      _title: title,
      _body: body || (undefined as any),
      _target_user: segment === "single" ? targetUser : (undefined as any),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Notification sent to ${data ?? 0} user${data === 1 ? "" : "s"}`);
    setTitle("");
    setBody("");
    qc.invalidateQueries({ queryKey: ["notif-history"] });
  }

  const segmentMeta = SEGMENTS.find((s) => s.value === segment);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Send Notification</h1>
        <p className="text-muted-foreground">Target a specific audience segment or a single user.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-border/60">
          <CardHeader><CardTitle>New notification</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {segmentMeta && <p className="text-xs text-muted-foreground">{segmentMeta.description}</p>}
            </div>
            {segment === "single" && (
              <div className="space-y-2">
                <Label>Target user</Label>
                <Select value={targetUser} onValueChange={setTargetUser}>
                  <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.username || "—"} · {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={1000} />
            </div>
            <Button onClick={send} disabled={busy} className="w-full bg-gradient-primary">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-gradient-card border-border/60">
          <CardHeader><CardTitle>Recent notifications</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {history.map((n: any) => (
              <div key={n.id} className="p-3 rounded-lg border border-border/60 bg-background/40">
                <div className="font-medium text-sm flex items-center gap-2">
                  {n.title}
                  {n.segment && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">{n.segment.replace("_", " ")}</span>}
                </div>
                {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, p")}</div>
              </div>
            ))}
            {history.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">None yet.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

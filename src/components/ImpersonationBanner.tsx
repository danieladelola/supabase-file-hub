import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return setActive(false);
    const state = readImpersonationState();
    setActive(state?.impersonatedUserId === user.id || state?.impersonatedEmail === user.email || sessionStorage.getItem("impersonation_target_email") === user.email);
  }, [user]);

  if (!active) return null;

  async function exit() {
    const raw = sessionStorage.getItem("impersonation");
    if (!raw) {
      sessionStorage.removeItem("impersonation_target_email");
      sessionStorage.removeItem("impersonation_admin_id");
      await supabase.auth.signOut();
      nav("/admin/login", { replace: true });
      return;
    }

    setBusy(true);
    const state = readImpersonationState();
    if (!state) {
      setBusy(false);
      return toast.error("Impersonation return state is invalid. Please sign in as admin again.");
    }
    const returnPath = state.adminReturnPath || "/admin";
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin-impersonate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({
        action: "end_impersonation",
        log_id: state.logId,
        return_token: state.returnToken,
        redirect_to: `${window.location.origin}${returnPath}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const error = res.ok ? null : { message: data?.error || `HTTP ${res.status}` };
    if (error || data?.error) {
      setBusy(false);
      return toast.error(data?.error ?? error?.message ?? "Could not return to admin session");
    }

    await supabase.auth.signOut();
    const { error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: data.verification_type ?? "magiclink",
    } as any);
    setBusy(false);
    if (sessionError) return toast.error(`Could not restore admin session: ${sessionError.message}`);

    sessionStorage.removeItem("impersonation");
    sessionStorage.removeItem("impersonation_target_email");
    sessionStorage.removeItem("impersonation_admin_id");
    nav(returnPath, { replace: true });
  }

  return (
    <div className="bg-warning text-warning-foreground px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm font-medium sticky top-0 z-50">
      <span>⚠️ You are viewing this account as admin (impersonating {user?.email}).</span>
      <Button size="sm" variant="outline" className="bg-background/20 border-foreground/30 hover:bg-background/30" onClick={exit} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowLeft className="h-4 w-4 mr-1" />}
        Return to admin panel
      </Button>
    </div>
  );
}

function readImpersonationState(): any | null {
  try {
    const raw = sessionStorage.getItem("impersonation");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

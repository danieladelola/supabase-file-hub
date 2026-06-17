import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSafeNextPath, resendSignupConfirmation } from "@/lib/auth-email";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export default function AuthConfirm() {
  const nav = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(true);
  const [resending, setResending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("We’re confirming your email and restoring your session.");
  const nextPath = useMemo(() => getSafeNextPath(location.search), [location.search]);

  useEffect(() => {
    let cancelled = false;

    async function completeConfirmation() {
      try {
        const search = new URLSearchParams(location.search);
        const code = search.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: sessionRes, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const currentUser = sessionRes.session?.user ?? null;
        if (cancelled) return;

        setEmail(currentUser?.email ?? null);

        if (currentUser?.email_confirmed_at) {
          setConfirmed(true);
          setMessage("Email confirmed. Redirecting you back to your account.");
          setBusy(false);
          nav(nextPath, { replace: true });
          return;
        }

        setConfirmed(false);
        setMessage("Your confirmation link did not finish signing you in. You can request a fresh confirmation email below.");
      } catch (error: any) {
        if (cancelled) return;
        setConfirmed(false);
        setMessage(error?.message || "We could not complete email confirmation from this link.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void completeConfirmation();
    return () => {
      cancelled = true;
    };
  }, [location.search, nav, nextPath]);

  async function resend() {
    if (!email) return toast.error("Sign in again to resend the confirmation email.");
    setResending(true);
    const { error } = await resendSignupConfirmation(email, nextPath);
    setResending(false);
    if (error) return toast.error(error.message);
    toast.success("A new confirmation email has been sent.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <Card className="w-full max-w-xl bg-card/95 backdrop-blur border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="h-5 w-5 text-primary" /> Confirm your email
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {busy ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Finalizing your verification
            </div>
          ) : confirmed ? (
            <Alert>
              <AlertTitle>Email confirmed</AlertTitle>
              <AlertDescription>You’re being redirected to your profile now.</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Email not confirmed</AlertTitle>
              <AlertDescription>
                {email ? `We still need to verify ${email}. Request a fresh confirmation email and open the newest link.` : "We could not verify this email from the current link."}
              </AlertDescription>
            </Alert>
          )}

          {!busy && !confirmed && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={resend} disabled={!email || resending} className="bg-gradient-primary">
                {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Resend confirmation
              </Button>
              <Button asChild variant="outline">
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
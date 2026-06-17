import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildAuthConfirmUrl } from "@/lib/auth-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Rocket, Coins, BarChart3, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import authHero from "@/assets/auth-hero.jpg";
import { Logo } from "@/components/Logo";

const schema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(40),
  last_name: z.string().trim().min(1, "Last name required").max(40),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 chars")
    .max(30, "Username too long")
    .regex(/^[A-Za-z0-9_.]+$/, "Only letters, numbers, _ and ."),
  email: z.string().trim().email().max(255),
  country_code: z.string().trim().max(4).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Min 8 characters").max(72),
});

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    country_code: "+1",
    phone: "",
    password: "",
  });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    const fullName = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: buildAuthConfirmUrl(),
        data: {
          full_name: fullName,
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          username: parsed.data.username,
        },
      },
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    // Persist extra profile fields + claim username (best-effort, only if session exists)
    if (signUpData.session) {
      await supabase.from("profiles").update({
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        full_name: fullName,
        country_code: parsed.data.country_code || null,
        phone: parsed.data.phone || null,
      }).eq("id", signUpData.user!.id);
      const { data: claimed, error: uErr } = await supabase.rpc("set_username", {
        _username: parsed.data.username,
      });
      if (uErr) toast.error(uErr.message);
      else if (claimed === false) toast.error("Username already taken — pick another in Profile");
    }

    setBusy(false);
    if (signUpData.session) {
      toast.success("Account created! Please complete KYC to start trading.");
      setTimeout(() => nav("/app/profile?kyc=required"), 800);
      return;
    }

    toast.success("Account created. Check your inbox to confirm your email before signing in.");
    setTimeout(() => nav(`/login?pendingConfirmation=1&email=${encodeURIComponent(parsed.data.email)}`), 800);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-hero p-10">
        <img src={authHero} alt="Join Haratrading crypto platform" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/50 to-primary/30" />
        <Link to="/" className="relative inline-flex items-center gap-2 text-foreground">
          <Logo className="h-10 w-auto" />
        </Link>
        <div className="relative space-y-6 text-foreground">
          <h2 className="text-4xl font-bold leading-tight max-w-md">Start your crypto journey in minutes.</h2>
          <p className="text-foreground/70 max-w-md">
            Buy, sell, stake and grow your portfolio with a platform engineered for clarity and speed.
          </p>
          <ul className="space-y-3 text-sm text-foreground/80">
            <li className="flex items-center gap-3"><Rocket className="h-4 w-4 text-primary" /> Instant onboarding & deposits</li>
            <li className="flex items-center gap-3"><Coins className="h-4 w-4 text-primary" /> Stake top assets with competitive APY</li>
            <li className="flex items-center gap-3"><BarChart3 className="h-4 w-4 text-primary" /> Pro-grade charts and live markets</li>
          </ul>
        </div>
        <p className="relative text-xs text-foreground/50">© {new Date().getFullYear()} Haratrading. All rights reserved.</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex justify-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <Logo className="h-9 w-auto" />
            </Link>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground">Start trading and staking in minutes.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" required placeholder="yourname" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <p className="text-xs text-muted-foreground">3–30 chars. Letters, numbers, _ and . only.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-[90px_1fr] gap-3">
              <div className="space-y-2">
                <Label htmlFor="cc">Code</Label>
                <Input id="cc" placeholder="+1" value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary shadow-elegant">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already a member?{" "}
              <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

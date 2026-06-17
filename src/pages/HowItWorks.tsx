import { PublicShell } from "@/components/PublicShell";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const steps = [
  { n: "01", title: "Create your account", desc: "Sign up in 30 seconds and verify your email." },
  { n: "02", title: "Complete KYC", desc: "Verify your identity to unlock deposits, withdrawals, and trading limits." },
  { n: "03", title: "Fund your wallet", desc: "Deposit your favorite crypto with a unique on-platform address." },
  { n: "04", title: "Trade, stake, grow", desc: "Buy, sell, or stake and watch your portfolio in real time." },
];

export default function HowItWorks() {
  return (
    <PublicShell>
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">How Haratrading works</h1>
          <p className="mt-4 text-lg text-muted-foreground">From sign-up to your first trade in minutes — here's what your journey looks like.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-border/60 bg-card p-6">
              <div className="text-3xl font-bold text-primary">{s.n}</div>
              <div className="mt-3 font-semibold text-lg">{s.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 text-center">
          <Button size="lg" asChild className="bg-gradient-primary text-primary-foreground h-12 px-8">
            <Link to="/signup">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
import { PublicShell } from "@/components/PublicShell";
import { Wallet, TrendingUp, Lock, BarChart3, Zap, ShieldCheck, Globe, Sparkles, CheckCircle2 } from "lucide-react";

const features = [
  { icon: Wallet, title: "Multi-Coin Wallet", desc: "Track BTC, ETH, USDT, SOL and more — all in one secure wallet." },
  { icon: TrendingUp, title: "Buy & Sell", desc: "Trade leading cryptocurrencies with transparent pricing and tight spreads." },
  { icon: Lock, title: "Earn by Staking", desc: "Put your assets to work with flexible staking plans up to 9% APY." },
  { icon: BarChart3, title: "Pro Market Charts", desc: "Live TradingView charts and 24h analytics inside your dashboard." },
  { icon: Zap, title: "Smart Signals", desc: "Curated trade ideas from experienced analysts, delivered in real time." },
  { icon: ShieldCheck, title: "Bank-Grade Security", desc: "Encrypted balances, role-based access, and admin-approved withdrawals." },
  { icon: Globe, title: "Global Access", desc: "Available across regions with multi-currency support." },
  { icon: Sparkles, title: "Polished UX", desc: "A premium dashboard built for both beginners and pros." },
];

export default function Features() {
  return (
    <PublicShell>
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Everything you need to trade with confidence</h1>
          <p className="mt-4 text-lg text-muted-foreground">A complete toolkit for buying, selling, staking, and tracking crypto — engineered for clarity and speed.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border/60 bg-card p-6 hover:border-primary/40 transition">
              <f.icon className="h-8 w-8 text-primary" />
              <div className="mt-4 font-semibold">{f.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-2xl border border-border/60 bg-gradient-hero/30 p-8">
          <h2 className="text-2xl font-semibold">Built for serious investors</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            {["Real-time portfolio tracking", "Verified deposit & withdrawal flow", "KYC and identity protection", "Dedicated admin oversight"].map((x) => (
              <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {x}</li>
            ))}
          </ul>
        </div>
      </section>
    </PublicShell>
  );
}
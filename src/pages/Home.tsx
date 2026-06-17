import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMarkets, SUPPORTED_GECKO_IDS } from "@/hooks/useMarkets";
import {
  ArrowRight, Wallet, TrendingUp, Lock, BarChart3, Zap, ShieldCheck,
  CheckCircle2, Globe, Sparkles
} from "lucide-react";
import { Logo } from "@/components/Logo";

const features = [
  { icon: Wallet, title: "Multi-Coin Wallet", desc: "Track BTC, ETH, USDT, SOL and more — all in one secure wallet." },
  { icon: TrendingUp, title: "Buy & Sell", desc: "Trade leading cryptocurrencies with transparent pricing and tight spreads." },
  { icon: Lock, title: "Earn by Staking", desc: "Put your assets to work with flexible staking plans up to 9% APY." },
  { icon: BarChart3, title: "Pro Market Charts", desc: "Live TradingView charts and 24h analytics inside your dashboard." },
  { icon: Zap, title: "Smart Signals", desc: "Curated trade ideas from experienced analysts, delivered in real time." },
  { icon: ShieldCheck, title: "Bank-Grade Security", desc: "Encrypted balances, role-based access, and admin-approved withdrawals." },
];

const steps = [
  { n: "01", title: "Create your account", desc: "Sign up in 30 seconds and verify your email." },
  { n: "02", title: "Fund your wallet", desc: "Deposit your favorite crypto with a unique on-platform address." },
  { n: "03", title: "Trade, stake, grow", desc: "Buy, sell, or stake — and watch your portfolio in real time." },
];

export default function Home() {
  const { user } = useAuth();
  const { data: markets } = useMarkets(SUPPORTED_GECKO_IDS);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border/40 bg-background/70 backdrop-blur sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#markets" className="hover:text-foreground transition">Markets</a>
            <a href="#security" className="hover:text-foreground transition">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild><Link to="/app">Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link to="/login">Login</Link></Button>
                <Button asChild><Link to="/signup">Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="container relative py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              <Sparkles className="h-3 w-3" /> Trusted by 50,000+ crypto investors
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Buy, Sell, Stake, and{" "}
              <span className="text-gradient-primary">Grow Your Crypto</span>{" "}
              With Confidence
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              A secure crypto platform for trading, staking, wallet tracking, and market insights — all in one premium dashboard.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-95 h-12 px-8">
                <Link to="/signup">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8">
                <a href="#markets">View Markets</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> No hidden fees</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> 256-bit encryption</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Instant signup</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Everything you need, in one place</h2>
          <p className="mt-4 text-muted-foreground">Wallet, markets, staking, and signals — designed to work together.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 hover:border-primary/40 transition group">
              <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4 group-hover:scale-110 transition">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container py-24 border-t border-border/40">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Get started in 3 minutes</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="relative bg-gradient-card border border-border/60 rounded-2xl p-8 shadow-card">
              <div className="text-5xl font-bold text-gradient-primary opacity-90">{s.n}</div>
              <h3 className="font-semibold text-xl mt-4">{s.title}</h3>
              <p className="text-muted-foreground mt-2">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Markets preview */}
      <section id="markets" className="container py-24 border-t border-border/40">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Live markets</h2>
            <p className="mt-2 text-muted-foreground">Real-time prices powered by global exchanges.</p>
          </div>
          <Button variant="outline" asChild><Link to="/signup">Trade now <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
        <div className="rounded-2xl border border-border/60 overflow-hidden bg-gradient-card">
          <div className="grid grid-cols-12 px-4 sm:px-6 py-3 text-xs font-medium text-muted-foreground uppercase border-b border-border/60">
            <div className="col-span-5 md:col-span-5">Asset</div>
            <div className="col-span-4 md:col-span-3 text-right">Price</div>
            <div className="col-span-3 md:col-span-2 text-right">24h</div>
            <div className="hidden md:block md:col-span-2 text-right">Market Cap</div>
          </div>
          {(markets ?? []).slice(0, 6).map((c) => (
            <div key={c.id} className="grid grid-cols-12 px-4 sm:px-6 py-4 items-center border-b border-border/40 last:border-0 hover:bg-muted/40 transition">
              <div className="col-span-5 md:col-span-5 flex items-center gap-3 min-w-0">
                <img src={c.image} alt={c.name} className="h-8 w-8 rounded-full shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground uppercase">{c.symbol}</div>
                </div>
              </div>
              <div className="col-span-4 md:col-span-3 text-right font-medium tabular-nums">${c.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <div className={`col-span-3 md:col-span-2 text-right text-sm tabular-nums ${c.price_change_percentage_24h >= 0 ? "text-success" : "text-destructive"}`}>
                {c.price_change_percentage_24h >= 0 ? "+" : ""}{c.price_change_percentage_24h?.toFixed(2)}%
              </div>
              <div className="hidden md:block md:col-span-2 text-right text-sm text-muted-foreground tabular-nums">${(c.market_cap / 1e9).toFixed(1)}B</div>
            </div>
          ))}
          {!markets && <div className="p-8 text-center text-muted-foreground text-sm">Loading live prices…</div>}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="container py-24 border-t border-border/40">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Built for trust, designed for security</h2>
            <p className="mt-4 text-muted-foreground">Your assets are protected by enterprise-grade infrastructure, role-based access controls, and admin-reviewed withdrawals.</p>
            <div className="mt-8 space-y-4">
              {[
                { icon: ShieldCheck, t: "End-to-end encryption", d: "All sensitive data is encrypted at rest and in transit." },
                { icon: Lock, t: "Row-level security", d: "Every record is scoped to its owner. No cross-account leaks." },
                { icon: Globe, t: "Global compliance ready", d: "KYC pipeline and audit logs built into the platform." },
              ].map((x) => (
                <div key={x.t} className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                    <x.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{x.t}</div>
                    <div className="text-sm text-muted-foreground">{x.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
            <div className="relative glass rounded-3xl p-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Built for serious investors</div>
                  <div className="text-3xl font-bold mt-1">Bank-grade security</div>
                  <div className="text-success text-sm mt-1">Trusted by traders worldwide</div>
                </div>
                <ShieldCheck className="h-12 w-12 text-primary" />
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { t: "256-bit", d: "Encryption" },
                  { t: "2FA", d: "Account safety" },
                  { t: "24/7", d: "Monitoring" },
                ].map((x) => (
                  <div key={x.t} className="bg-muted/40 rounded-xl p-3 border border-border/40">
                    <div className="font-semibold">{x.t}</div>
                    <div className="text-xs text-muted-foreground mt-1">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 border-t border-border/40">
        <div className="bg-gradient-hero rounded-3xl p-12 md:p-16 text-center shadow-elegant border border-primary/20">
          <h2 className="text-3xl md:text-5xl font-bold">Start growing your crypto today</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Join thousands of investors building wealth with Haratrading.</p>
          <Button size="lg" asChild className="mt-8 bg-gradient-primary h-12 px-10 shadow-elegant">
            <Link to="/signup">Create free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-12">
        <div className="container py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="mb-3">
              <Logo className="h-7 w-auto" />
            </div>
            <p className="text-muted-foreground">The premium home for your crypto.</p>
          </div>
          <div>
            <div className="font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
              <li><Link to="/markets" className="hover:text-foreground">Markets</Link></li>
              <li><Link to="/signup" className="hover:text-foreground">Sign up</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Company</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/security" className="hover:text-foreground">Security</Link></li>
              <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Legal</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Haratrading. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

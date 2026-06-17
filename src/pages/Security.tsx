import { PublicShell } from "@/components/PublicShell";
import { ShieldCheck, Lock, KeyRound, Eye, Server, FileCheck } from "lucide-react";

const items = [
  { icon: ShieldCheck, title: "Bank-grade encryption", desc: "All sensitive data is encrypted at rest and in transit using industry-standard ciphers." },
  { icon: Lock, title: "Admin-approved withdrawals", desc: "Every withdrawal request is reviewed before funds leave the platform." },
  { icon: KeyRound, title: "Role-based access", desc: "Strict permissions separate user, admin, and support accounts." },
  { icon: Eye, title: "KYC & identity checks", desc: "Verified accounts protect the integrity of our trading community." },
  { icon: Server, title: "Hardened infrastructure", desc: "Hosted on resilient, monitored infrastructure with redundancy and backups." },
  { icon: FileCheck, title: "Audit logs", desc: "Every login, transaction, and admin action is logged and traceable." },
];

export default function Security() {
  return (
    <PublicShell>
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Security you can trust</h1>
          <p className="mt-4 text-lg text-muted-foreground">Your assets and identity are protected by layered security controls designed by a team that takes custody seriously.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((i) => (
            <div key={i.title} className="rounded-xl border border-border/60 bg-card p-6">
              <i.icon className="h-8 w-8 text-primary" />
              <div className="mt-4 font-semibold">{i.title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{i.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
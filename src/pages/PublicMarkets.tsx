import { PublicShell } from "@/components/PublicShell";
import { useMarkets, SUPPORTED_GECKO_IDS } from "@/hooks/useMarkets";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function PublicMarkets() {
  const { data: markets, isLoading } = useMarkets(SUPPORTED_GECKO_IDS);
  return (
    <PublicShell>
      <section className="container py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Live Markets</h1>
            <p className="mt-4 text-lg text-muted-foreground">Real-time prices for the most traded cryptocurrencies on Haratrading.</p>
          </div>
          <Button asChild className="bg-gradient-primary text-primary-foreground">
            <Link to="/signup">Start Trading <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="mt-10 overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-4">Asset</th>
                <th className="text-right p-4">Price</th>
                <th className="text-right p-4 hidden md:table-cell">24h Change</th>
                <th className="text-right p-4 hidden lg:table-cell">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading markets…</td></tr>
              )}
              {markets?.map((m) => {
                const change = m.price_change_percentage_24h ?? 0;
                return (
                  <tr key={m.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {m.image && <img src={m.image} alt={m.name} className="h-7 w-7 rounded-full" />}
                        <div>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs uppercase text-muted-foreground">{m.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium">${m.current_price?.toLocaleString()}</td>
                    <td className={`p-4 text-right hidden md:table-cell ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                    </td>
                    <td className="p-4 text-right hidden lg:table-cell text-muted-foreground">${m.market_cap?.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </PublicShell>
  );
}
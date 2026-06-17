import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

export function PublicShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/40 bg-background/70 backdrop-blur sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/features" className="hover:text-foreground transition">Features</Link>
            <Link to="/how-it-works" className="hover:text-foreground transition">How it works</Link>
            <Link to="/markets" className="hover:text-foreground transition">Markets</Link>
            <Link to="/security" className="hover:text-foreground transition">Security</Link>
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

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/40 mt-12">
        <div className="container py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="mb-3"><Logo className="h-7 w-auto" /></div>
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
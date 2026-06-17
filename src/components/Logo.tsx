import logoUrl from "@/assets/haratrading-logo.png";

export function Logo({ className = "h-8 w-auto", alt = "Haratrading" }: { className?: string; alt?: string }) {
  return <img src={logoUrl} alt={alt} className={className} />;
}

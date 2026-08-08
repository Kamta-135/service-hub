import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrustStamp } from "@/components/ui/trust-stamp";
import { Siren } from "lucide-react";

const links = [
  { label: "Find Services", href: "/services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "For Providers", href: "/login" },
  { label: "Help", href: "/login" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="/" className="flex items-center gap-2">
          <TrustStamp size="sm" animate={false} />
          <span className="font-display text-lg font-bold tracking-tight text-brand">
            Service<span className="text-brand">.</span>Hub
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-ink/70 transition-colors hover:text-brand"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 sm:inline-flex"
          >
            <Siren className="h-4 w-4" />
            Emergency
          </Link>
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-lg px-3.5 text-sm font-semibold text-brand hover:bg-brand/10 sm:inline-flex"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-lg bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}

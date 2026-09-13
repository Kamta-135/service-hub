import Link from "next/link";
import { TrustStamp } from "@/components/ui/trust-stamp";
import { AIFinderDemo } from "@/components/landing/ai-finder-demo";
import { Siren, MapPin } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-ledger opacity-[0.35]" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
        <div>
          <div
            className="inline-flex animate-fade-slide-up items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink/60"
            style={{ animationDelay: "0ms" }}
          >
            <MapPin className="h-3.5 w-3.5 text-brand" />
            Serving villages, blocks &amp; small towns across India
          </div>

          <h1
            className="mt-5 animate-fade-slide-up text-balance font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Trusted local help,
            <br />
            <span className="text-brand">when you need it.</span>
          </h1>

          <p
            className="mt-5 max-w-lg animate-fade-slide-up text-lg text-ink/60"
            style={{ animationDelay: "160ms" }}
          >
            Tell Service.Hub what&apos;s wrong — a fan, a bike, a leaking pipe —
            and get matched with a verified electrician, mechanic, plumber, or
            doctor nearby. No middlemen, no guesswork.
          </p>

          <div
            className="mt-8 flex animate-fade-slide-up flex-wrap items-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-brand px-7 text-lg font-semibold text-white transition-all duration-200 hover:bg-brand-light active:scale-[0.98]"
            >
              Find Help Near Me
            </Link>
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-red-600 px-7 text-lg font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:bg-red-700 active:scale-[0.98]"
            >
              <Siren className="h-5 w-5" />
              Emergency Help
            </Link>
          </div>

          <div
            className="mt-10 flex animate-fade-slide-up flex-wrap items-center gap-6 border-t border-line pt-6"
            style={{ animationDelay: "320ms" }}
          >
            <div className="flex items-center gap-3">
              <TrustStamp size="sm" />
              <div className="text-sm">
                <p className="font-display font-bold text-ink">12,400+</p>
                <p className="text-ink/50">ID-verified providers</p>
              </div>
            </div>
            <div className="text-sm">
              <p className="font-display font-bold text-ink">2,300+</p>
              <p className="text-ink/50">villages &amp; towns covered</p>
            </div>
            <div className="text-sm">
              <p className="font-display font-bold text-ink">4.7 / 5</p>
              <p className="text-ink/50">average customer rating</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <AIFinderDemo />
        </div>
      </div>
    </section>
  );
}

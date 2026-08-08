import { TrustStamp } from "@/components/ui/trust-stamp";
import { AvailabilityBadge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";

export function TrustSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-dark">
            Trust, built in
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Every provider carries a seal, not just a rating
          </h2>
          <p className="mt-4 max-w-md text-ink/60">
            Before anyone appears on Service.Hub, we verify their ID, confirm
            their skill, and track how they perform. The stamp is earned, not
            assumed.
          </p>

          <ul className="mt-7 space-y-4">
            {[
              ["ID Verified", "Government ID checked before listing"],
              ["Top Rated", "Consistently rated 4.5+ by real customers"],
              ["Emergency Provider", "Available for urgent, same-hour help"],
            ].map(([title, desc]) => (
              <li key={title} className="flex items-start gap-3">
                <TrustStamp size="sm" animate={false} />
                <div>
                  <p className="font-display text-sm font-bold text-ink">
                    {title}
                  </p>
                  <p className="text-sm text-ink/50">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-xl shadow-brand/5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 rounded-full bg-brand/10 bg-[url('https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&q=80')] bg-cover bg-center" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-ink">Ramesh Kushwaha</h3>
                <TrustStamp size="sm" animate={false} />
              </div>
              <p className="text-sm text-ink/50">Electrician · 9 yrs experience</p>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-ink/50">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-brand text-brand" />
                  4.8 (312 reviews)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  1.2 km away
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <AvailabilityBadge status="available" />
            <span className="font-mono text-xs text-ink/40">640 services completed</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="h-11 rounded-xl border-2 border-brand text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white">
              Call Now
            </button>
            <button className="h-11 rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-light">
              Request Service
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

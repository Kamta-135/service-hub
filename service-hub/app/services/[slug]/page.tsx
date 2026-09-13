import Link from "next/link";
import { notFound } from "next/navigation";

const serviceNames: Record<string, string> = {
  electrician: "Electrician",
  plumber: "Plumber",
  "vehicle-mechanic": "Vehicle Mechanic",
  doctor: "Doctor / Clinic",
  "mobile-repair": "Mobile Repair",
  "computer-repair": "Computer Repair",
  mason: "Construction / Mason",
  tractor: "Tractor & Agri",
  "ac-repair": "AC / Fridge Repair",
  cleaning: "Cleaning Services",
};

const sampleProviders = [
  { name: "Ramesh Kushwaha", years: 9, rating: 4.8, reviews: 312, dist: "1.2 km", status: "available" as const },
  { name: "Suresh Yadav", years: 5, rating: 4.6, reviews: 148, dist: "2.4 km", status: "busy" as const },
  { name: "Anil Verma", years: 12, rating: 4.9, reviews: 501, dist: "0.8 km", status: "available" as const },
];

export default async function ServiceCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = serviceNames[slug];
  if (!name) notFound();

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/services" className="text-sm font-semibold text-black/50">← All services</Link>
        <h1 className="mt-3 font-display text-3xl text-ink">{name}</h1>
        <p className="mt-2 text-sm text-black/50">
          Sample providers shown below — log in to see live availability and request a service.
        </p>

        <div className="mt-8 space-y-3">
          {sampleProviders.map((p) => (
            <div key={p.name} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-brand/30 to-brand-light/20" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base text-ink">{p.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        p.status === "available" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.status === "available" ? "Available now" : "Busy"}
                    </span>
                  </div>
                  <p className="text-sm text-black/50">{name} · {p.years} yrs experience</p>
                  <p className="mt-1 text-xs text-black/40">
                    ⭐ {p.rating} ({p.reviews} reviews) · 📍 {p.dist} away
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  className="flex h-11 items-center justify-center rounded-xl border-2 border-brand text-sm font-semibold text-brand hover:bg-brand hover:text-white"
                >
                  Call Now
                </Link>
                <Link
                  href={`/requests/new?service=${encodeURIComponent(name)}`}
                  className="flex h-11 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Request Service
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

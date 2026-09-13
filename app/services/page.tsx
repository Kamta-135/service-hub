import Link from "next/link";

const services = [
  { slug: "electrician", icon: "⚡", name: "Electrician", count: "1,840 providers" },
  { slug: "plumber", icon: "🔧", name: "Plumber", count: "1,210 providers" },
  { slug: "vehicle-mechanic", icon: "🚗", name: "Vehicle Mechanic", count: "980 providers" },
  { slug: "doctor", icon: "🩺", name: "Doctor / Clinic", count: "640 providers" },
  { slug: "mobile-repair", icon: "📱", name: "Mobile Repair", count: "1,050 providers" },
  { slug: "computer-repair", icon: "💻", name: "Computer Repair", count: "520 providers" },
  { slug: "mason", icon: "🏗️", name: "Construction / Mason", count: "760 providers" },
  { slug: "tractor", icon: "🚜", name: "Tractor & Agri", count: "430 providers" },
  { slug: "ac-repair", icon: "❄️", name: "AC / Fridge Repair", count: "690 providers" },
  { slug: "cleaning", icon: "🧹", name: "Cleaning Services", count: "310 providers" },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-black/50">← Back home</Link>
        <h1 className="mt-3 font-display text-3xl text-ink">Every local service, in one place</h1>
        <p className="mt-2 text-sm text-black/50">
          Pick a category to see providers nearby, or log in to describe your problem to the AI Finder.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-2xl">
                {s.icon}
              </div>
              <div>
                <p className="font-display text-sm text-ink">{s.name}</p>
                <p className="mt-0.5 text-xs text-black/40">{s.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

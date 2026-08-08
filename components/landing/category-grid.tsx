import {
  Zap,
  Wrench,
  Car,
  Stethoscope,
  Smartphone,
  Laptop,
  HardHat,
  Tractor,
  Snowflake,
  SprayCan,
} from "lucide-react";

const categories = [
  { name: "Electrician", slug: "electrician", icon: Zap, count: "1,840 providers" },
  { name: "Plumber", slug: "plumber", icon: Wrench, count: "1,210 providers" },
  { name: "Vehicle Mechanic", slug: "vehicle-mechanic", icon: Car, count: "980 providers" },
  { name: "Doctor / Clinic", slug: "doctor", icon: Stethoscope, count: "640 providers" },
  { name: "Mobile Repair", slug: "mobile-repair", icon: Smartphone, count: "1,050 providers" },
  { name: "Computer Repair", slug: "computer-repair", icon: Laptop, count: "520 providers" },
  { name: "Construction / Mason", slug: "mason", icon: HardHat, count: "760 providers" },
  { name: "Tractor & Agri", slug: "tractor", icon: Tractor, count: "430 providers" },
  { name: "AC / Fridge Repair", slug: "ac-repair", icon: Snowflake, count: "690 providers" },
  { name: "Cleaning Services", slug: "cleaning", icon: SprayCan, count: "310 providers" },
];

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-dark">
            What you need, sorted
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Every local service, in one signboard
          </h2>
        </div>
        <a
          href="/services"
          className="text-sm font-semibold text-brand hover:underline"
        >
          View all services →
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {categories.map((cat, i) => (
          <a
            key={cat.name}
            href={`/services/${cat.slug}`}
            className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-lg hover:shadow-brand/10 sm:p-5"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
              <cat.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-ink sm:text-base">
                {cat.name}
              </h3>
              <p className="mt-0.5 text-xs text-ink/45">{cat.count}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

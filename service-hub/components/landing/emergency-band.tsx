import Link from "next/link";
import { Siren, Zap, Wrench, Car, Droplets } from "lucide-react";

const emergencyTypes = [
  { name: "Medical Assistance", icon: Siren },
  { name: "Electrical Emergency", icon: Zap },
  { name: "Vehicle Breakdown", icon: Car },
  { name: "Water / Plumbing Emergency", icon: Droplets },
];

export function EmergencyBand() {
  return (
    <section className="relative overflow-hidden bg-alert py-14 text-white sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Siren className="h-3.5 w-3.5" />
              Emergency mode
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Urgent problem? Reach the nearest available provider in seconds.
            </h2>
            <p className="mt-3 text-white/75">
              Service.Hub is not a replacement for official emergency services
              like ambulances or the police. For life-threatening emergencies,
              always call your local emergency number first.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-14 items-center justify-center rounded-xl bg-white px-7 text-lg font-semibold text-alert transition-all duration-200 hover:bg-white/90 active:scale-[0.98]"
            >
              Open Emergency Help
            </Link>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:gap-4">
            {emergencyTypes.map((t) => (
              <div
                key={t.name}
                className="flex w-full flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:w-52"
              >
                <t.icon className="h-6 w-6" />
                <p className="font-display text-sm font-bold leading-snug">
                  {t.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { MessageSquareText, UserCheck, CheckCircle2 } from "lucide-react";

const steps = [
  {
    n: "01",
    title: "Describe the problem",
    desc: "Type or speak what's wrong — in Hindi or English. Service.Hub matches you to the right kind of provider instantly.",
    icon: MessageSquareText,
  },
  {
    n: "02",
    title: "Get matched nearby",
    desc: "See verified, available providers close to you — with ratings, experience, and real-time availability.",
    icon: UserCheck,
  },
  {
    n: "03",
    title: "Track it to completion",
    desc: "Follow your request from accepted to on-the-way to done, and rate the service when it's finished.",
    icon: CheckCircle2,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-line bg-white/60 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 max-w-xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-dark">
            The request flow
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Three steps between a problem and a fix
          </h2>
        </div>

        <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
          <div className="absolute left-0 right-0 top-9 hidden h-px bg-line sm:block" />
          {steps.map((step) => (
            <div key={step.n} className="relative flex flex-col gap-4">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-brand bg-canvas font-display text-xl font-bold text-brand">
                {step.n}
              </div>
              <div className="flex items-center gap-2 text-brand">
                <step.icon className="h-5 w-5" />
                <h3 className="font-display text-lg font-bold text-ink">
                  {step.title}
                </h3>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-ink/60">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

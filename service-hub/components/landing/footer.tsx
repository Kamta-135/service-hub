import { TrustStamp } from "@/components/ui/trust-stamp";

const columns = [
  {
    title: "Customers",
    links: ["Find Services", "How It Works", "Emergency Help", "Track a Request"],
  },
  {
    title: "Providers",
    links: ["Join as a Provider", "Verification Process", "Earnings", "Provider Support"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Help Center", "Trust & Safety"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-white/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <TrustStamp size="sm" animate={false} />
              <span className="font-display text-lg font-bold text-brand">
                Service<span className="text-brand">.</span>Hub
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink/50">
              Trusted local help, when you need it. Built for villages, blocks,
              and small towns across India.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-bold text-ink">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-ink/55 hover:text-brand"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Service.Hub. All rights reserved.</p>
          <p>
            Service.Hub does not replace official emergency services. In a
            life-threatening emergency, contact local emergency numbers first.
          </p>
        </div>
      </div>
    </footer>
  );
}

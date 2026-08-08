const notes = [
  {
    quote:
      "Raat ko fridge kharab hua tha. Twenty minute mein hi ek verified technician mil gaya.",
    name: "Sunita Devi",
    place: "Bhelma, Madhya Pradesh",
  },
  {
    quote:
      "I found a mechanic for my tractor within the hour — during sowing season, that mattered a lot.",
    name: "Harpreet Singh",
    place: "Bathinda, Punjab",
  },
  {
    quote:
      "Emergency mode helped me reach an electrician after a short-circuit at 11pm. Genuinely felt safer.",
    name: "Anita Kujur",
    place: "Ranchi, Jharkhand",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-dark">
        From the ledger
      </p>
      <h2 className="mt-2 max-w-xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        People who found help when it mattered
      </h2>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {notes.map((n) => (
          <figure
            key={n.name}
            className="flex flex-col justify-between rounded-2xl border border-line bg-white p-6"
          >
            <blockquote className="font-display text-lg leading-snug text-ink">
              &ldquo;{n.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 border-t border-dashed border-line pt-4 text-sm">
              <p className="font-semibold text-ink">{n.name}</p>
              <p className="text-ink/45">{n.place}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

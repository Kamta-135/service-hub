"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { findNearbyProviders, type NearbyProvider } from "@/lib/api/catalogApi";

export default function NearbyProvidersPage() {
  const [status, setStatus] = useState<"asking" | "loading" | "done" | "denied" | "error">("asking");
  const [providers, setProviders] = useState<NearbyProvider[]>([]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await findNearbyProviders(pos.coords.latitude, pos.coords.longitude);
          setProviders(results);
          setStatus("done");
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("denied"),
      { timeout: 10000 }
    );
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-black/5 bg-white px-5 py-4">
        <Link href="/dashboard" className="text-sm font-semibold text-black/50">← Back</Link>
        <h1 className="mt-1 font-display text-xl text-ink">Providers near you</h1>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        {status === "asking" || status === "loading" ? (
          <p className="text-center text-sm text-black/40">Finding your location...</p>
        ) : status === "denied" ? (
          <p className="text-center text-sm text-black/50">
            Location access was denied. Enable location for this site in your browser settings to see nearby providers.
          </p>
        ) : status === "error" ? (
          <p className="text-center text-sm text-black/50">
            Couldn't determine your location or reach the server. Please try again.
          </p>
        ) : providers.length === 0 ? (
          <p className="text-center text-sm text-black/50">
            No verified providers found near you yet. As more providers join and get verified, they'll show up here.
          </p>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.provider_id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">{p.name || "Provider"}</p>
                    {p.experience_years != null && (
                      <p className="text-xs text-black/50">{p.experience_years} years experience</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-brand">{p.distance_km} km away</span>
                </div>
                {p.bio && <p className="mt-2 text-xs text-black/60">{p.bio}</p>}
                <div className="mt-2 flex items-center gap-3 text-xs text-black/45">
                  <span className="flex items-center gap-1 font-semibold text-green-700">✓ Verified</span>
                  {p.average_rating != null && (
                    <span>⭐ {p.average_rating} ({p.review_count} review{p.review_count === 1 ? "" : "s"})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

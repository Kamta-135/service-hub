"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getAdminStats, type AdminStats } from "@/lib/api/adminApi";

const STATUS_LABELS: Record<string, string> = {
  request_sent: "New / unassigned",
  provider_reviewing: "Reviewing",
  accepted: "Accepted",
  on_the_way: "On the way",
  service_started: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setStats(await getAdminStats(accessToken));
    } catch {
      setError("Couldn't load stats.");
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    load();
  }, [accessToken, router, load]);

  if (!accessToken || !user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-light font-display text-sm text-white">
            S
          </span>
          <span className="font-display text-lg text-ink">
            Service<span className="text-brand">.</span>Hub <span className="text-black/30">Admin</span>
          </span>
        </div>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="text-sm font-semibold text-black/50 hover:text-ink"
        >
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl text-ink">Overview</h1>
        <p className="mt-1 text-sm text-black/50">
          Live counts from the database — no mock numbers.
        </p>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        {!stats ? (
          <p className="mt-6 text-sm text-black/40">Loading...</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Total users", value: stats.total_users },
                { label: "Customers", value: stats.total_customers },
                { label: "Providers", value: stats.total_providers },
                { label: "Total requests", value: stats.total_requests },
                { label: "Active now", value: stats.active_requests },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                  <p className="font-display text-2xl text-ink">{card.value}</p>
                  <p className="mt-1 text-xs font-semibold text-black/45">{card.label}</p>
                </div>
              ))}
            </div>

            {stats.emergency_requests > 0 && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                🚨 {stats.emergency_requests} emergency-priority request
                {stats.emergency_requests > 1 ? "s" : ""} in the system
              </div>
            )}

            <h2 className="mt-8 font-display text-base text-ink">Requests by status</h2>
            <div className="mt-3 space-y-2">
              {Object.entries(stats.requests_by_status).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-xl border border-black/5 bg-white px-4 py-3"
                >
                  <span className="text-sm font-medium text-ink">{STATUS_LABELS[status] || status}</span>
                  <span className="font-mono text-sm font-bold text-black/60">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

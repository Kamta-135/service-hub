"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { listRequests, type ServiceRequest, type RequestStatus } from "@/lib/api/requestsApi";

const categories = [
  { icon: "⚡", name: "Electric", full: "Electrician" },
  { icon: "🔧", name: "Plumber", full: "Plumber" },
  { icon: "🚗", name: "Mechanic", full: "Vehicle Mechanic" },
  { icon: "🩺", name: "Doctor", full: "Doctor / Clinic" },
  { icon: "📱", name: "Mobile", full: "Mobile Repair" },
  { icon: "💻", name: "Computer", full: "Computer Repair" },
  { icon: "🏗️", name: "Mason", full: "Mason" },
  { icon: "🚜", name: "Tractor", full: "Tractor & Agri" },
];

const STATUS_LABEL: Record<RequestStatus, string> = {
  request_sent: "Finding a provider",
  provider_reviewing: "Finding a provider",
  accepted: "Accepted",
  on_the_way: "On the way",
  service_started: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  request_sent: "text-brand-dark",
  provider_reviewing: "text-brand-dark",
  accepted: "text-blue-600",
  on_the_way: "text-amber-600",
  service_started: "text-purple-600",
  completed: "text-emerald-600",
  cancelled: "text-red-600",
};

const navItems = [
  { label: "Dashboard", icon: "🏠", active: true, href: "/dashboard" },
  { label: "Find Services", icon: "🔍", href: "/services" },
  { label: "My Requests", icon: "📋", href: "#your-requests" },
  { label: "Messages", icon: "💬", comingSoon: true },
  { label: "Saved Providers", icon: "⭐", comingSoon: true },
  { label: "Notifications", icon: "🔔", comingSoon: true },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthStore();
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const loadRequests = useCallback(async () => {
    if (!accessToken || !user) return;
    try {
      const r = await listRequests(accessToken, { customer_id: user.id });
      setMyRequests(r.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5));
    } catch {
      // Non-fatal — dashboard still works, section just stays empty.
    } finally {
      setLoadingRequests(false);
    }
  }, [accessToken, user]);

  // Route guard: bounce to login if there's no session. This runs client-side
  // since the store is persisted to localStorage (not available during SSR).
  useEffect(() => {
    if (!accessToken) router.replace("/login");
    else if (user?.role === "provider") router.replace("/provider/dashboard");
    else loadRequests();
  }, [accessToken, user, router, loadRequests]);

  if (!accessToken || !user) return null;

  const firstName = user.name?.split(" ")[0] || "there";

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[1400px] bg-canvas">
      {/* DESKTOP SIDEBAR */}
      <aside className="sticky top-0 z-10 hidden h-screen w-64 shrink-0 flex-col border-r border-black/5 bg-white px-5 py-6 md:flex">
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-light font-display text-sm text-white">
            S
          </span>
          <span className="font-display text-lg text-ink">
            Service<span className="text-brand">.</span>Hub
          </span>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map((item) =>
            item.comingSoon ? (
              <span
                key={item.label}
                className="flex cursor-not-allowed items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-black/30"
              >
                <span className="flex items-center gap-3">
                  <span>{item.icon}</span>
                  {item.label}
                </span>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  Soon
                </span>
              </span>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  item.active
                    ? "bg-gradient-to-r from-brand to-brand-light text-white"
                    : "text-black/50 hover:bg-black/[0.03] hover:text-ink"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </a>
            )
          )}
          <div className="my-3 h-px bg-black/5" />
          <span className="flex cursor-not-allowed items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-black/30">
            <span className="flex items-center gap-3">👤 Profile</span>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Soon</span>
          </span>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="mt-auto flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-black/50 hover:bg-black/[0.03] hover:text-ink"
          >
            ↩ Log out
          </button>
        </nav>

        <Link
          href="/requests/new?priority=emergency"
          className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
        >
          🚨 Emergency Help
        </Link>
      </aside>

      {/* MAIN */}
      <main className="min-h-screen w-full flex-1 pb-24 md:pb-8">
        <header className="flex items-center justify-between px-5 pb-3 pt-7 sm:px-8 md:px-10">
          <div>
            <p className="text-sm font-medium text-black/45">Good evening</p>
            <p className="mt-0.5 font-display text-lg text-ink md:text-xl">Hi, {firstName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden h-11 w-11 items-center justify-center rounded-full border border-black/5 bg-white shadow-sm sm:flex">
              🔔
            </button>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-light font-display text-sm text-white ring-2 ring-white shadow-sm">
              {firstName[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="px-5 sm:px-8 md:px-10">
          {/* SEARCH */}
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-black/10 bg-white px-4 py-3.5 shadow-sm">
              <span className="text-black/35">🔍</span>
              <input
                className="w-full bg-transparent text-sm font-medium text-ink placeholder:text-black/35 focus:outline-none"
                placeholder="Search a service... e.g. electrician"
              />
            </div>
            <Link
              href="/requests/new?priority=emergency"
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-xl text-white shadow-lg shadow-red-500/25 md:hidden"
            >
              🚨
            </Link>
          </div>

          {/* PROMO */}
          <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-brand to-brand-light p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-black/60">Limited time</p>
            <p className="font-display text-xl text-black">Get 25% off your first service</p>
            <button className="mt-3 rounded-full bg-black px-4 py-2 text-xs font-bold text-white">
              Book now
            </button>
          </div>

          {/* CATEGORIES */}
          <section className="mt-7">
            <h2 className="font-display text-base text-ink">Browse services</h2>
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
              {categories.map((c) => (
                <Link
                  key={c.name}
                  href={`/requests/new?service=${encodeURIComponent(c.full)}`}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-2xl">
                    {c.icon}
                  </div>
                  <p className="text-[11px] font-semibold text-black/60">{c.name}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* MY REQUESTS */}
          <section id="your-requests" className="mt-8 scroll-mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base text-ink">Your requests</h2>
              <Link href="/requests/new" className="text-xs font-bold text-brand">
                + New request
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {loadingRequests ? (
                <p className="text-sm text-black/40">Loading...</p>
              ) : myRequests.length === 0 ? (
                <Link
                  href="/requests/new"
                  className="block rounded-2xl border border-dashed border-black/10 bg-white/50 p-4 text-center text-sm text-black/40"
                >
                  No requests yet — tap a service above to create one.
                </Link>
              ) : (
                myRequests.map((r) => (
                  <Link
                    key={r.id}
                    href={`/requests/${r.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm"
                  >
                    <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-brand/30 to-brand-light/20" />
                    <div className="flex-1">
                      <p className="text-sm font-bold capitalize text-ink">{r.service_type}</p>
                      <p className={`text-xs font-semibold ${STATUS_COLOR[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </p>
                    </div>
                    <span className="text-black/20">→</span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-black/5 bg-white/95 py-2.5 backdrop-blur-md md:hidden">
        <button className="flex flex-col items-center gap-1 px-3 text-brand">
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-3 text-black/35">
          <span className="text-lg">🔍</span>
          <span className="text-[10px] font-semibold">Search</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-3 text-black/35">
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-semibold">Requests</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-3 text-black/35">
          <span className="text-lg">💬</span>
          <span className="text-[10px] font-semibold">Messages</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-3 text-black/35">
          <span className="text-lg">👤</span>
          <span className="text-[10px] font-semibold">Profile</span>
        </button>
      </nav>
    </div>
  );
}

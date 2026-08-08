"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  listRequests,
  acceptRequest,
  rejectRequest,
  updateRequestStatus,
  type ServiceRequest,
  type RequestStatus,
} from "@/lib/api/requestsApi";
import { ApiError } from "@/lib/api/client";

// What the assigned provider can move a request to next, and the label to show.
const NEXT_STATUS: Partial<Record<RequestStatus, { next: RequestStatus; label: string }>> = {
  accepted: { next: "on_the_way", label: "Start heading over" },
  on_the_way: { next: "service_started", label: "Mark service started" },
  service_started: { next: "completed", label: "Mark completed" },
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  request_sent: "New",
  provider_reviewing: "Reviewing",
  accepted: "Accepted",
  on_the_way: "On the way",
  service_started: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  request_sent: "bg-brand/10 text-brand-dark",
  provider_reviewing: "bg-brand/10 text-brand-dark",
  accepted: "bg-blue-50 text-blue-700",
  on_the_way: "bg-amber-50 text-amber-700",
  service_started: "bg-purple-50 text-purple-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

const PRIORITY_COLOR: Record<string, string> = {
  normal: "text-black/40",
  urgent: "text-amber-600",
  emergency: "text-red-600",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function ProviderDashboardPage() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthStore();

  const [newRequests, setNewRequests] = useState<ServiceRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !user) return;
    setError(null);
    try {
      const [pending, mine] = await Promise.all([
        listRequests(accessToken, { status: "request_sent" }),
        listRequests(accessToken, { provider_id: user.id }),
      ]);
      setNewRequests(pending);
      setMyRequests(mine.filter((r) => r.status !== "completed" && r.status !== "cancelled"));
    } catch {
      setError("Couldn't load requests. Pull to refresh or try again.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "provider") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [accessToken, user, router, load]);

  async function handleAccept(id: string) {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await acceptRequest(accessToken, id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? "Someone else already accepted this one." : "Couldn't accept — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await rejectRequest(accessToken, id);
      await load();
    } catch {
      setError("Couldn't reject — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdvance(id: string, next: RequestStatus) {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await updateRequestStatus(accessToken, id, next);
      await load();
    } catch {
      setError("Couldn't update status — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await updateRequestStatus(accessToken, id, "cancelled");
      await load();
    } catch {
      setError("Couldn't cancel — try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!accessToken || !user) return null;

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[1400px] bg-canvas">
      {/* SIDEBAR */}
      <aside className="sticky top-0 z-10 hidden h-screen w-64 shrink-0 flex-col border-r border-black/5 bg-white px-5 py-6 md:flex">
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-light font-display text-sm text-white">
            S
          </span>
          <span className="font-display text-lg text-ink">
            Service<span className="text-brand">.</span>Hub
          </span>
        </div>
        <p className="mt-1 px-1 text-xs font-semibold uppercase tracking-wide text-black/35">Provider</p>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          <a
            href="/provider/dashboard"
            className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-brand to-brand-light px-3.5 py-2.5 text-sm font-semibold text-white"
          >
            📋 Requests
          </a>
          {[
            { label: "History", icon: "📜" },
            { label: "Reviews", icon: "⭐" },
            { label: "Earnings", icon: "💰" },
          ].map((item) => (
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
          ))}
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
      </aside>

      {/* MAIN */}
      <main className="min-h-screen w-full flex-1 pb-10">
        <header className="flex items-center justify-between px-5 pb-3 pt-7 sm:px-8 md:px-10">
          <div>
            <p className="text-sm font-medium text-black/45">Good evening</p>
            <p className="mt-0.5 font-display text-lg text-ink md:text-xl">
              Hi, {user.name?.split(" ")[0] || "there"}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-light font-display text-sm text-white ring-2 ring-white shadow-sm">
            {(user.name?.[0] || "P").toUpperCase()}
          </div>
        </header>

        <div className="px-5 sm:px-8 md:px-10">
          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* NEW REQUESTS */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base text-ink">New requests</h2>
              <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand-dark">
                {newRequests.length}
              </span>
            </div>

            {loading ? (
              <p className="mt-3 text-sm text-black/40">Loading...</p>
            ) : newRequests.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-black/10 bg-white/50 p-4 text-sm text-black/40">
                No new requests right now — nice and quiet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {newRequests.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm text-ink capitalize">{r.service_type}</p>
                        <p className="mt-0.5 text-sm text-black/60">{r.description}</p>
                        <p className="mt-1.5 flex items-center gap-2 text-xs text-black/40">
                          📍 {r.location_text} · {timeAgo(r.created_at)}
                          {r.priority !== "normal" && (
                            <span className={`font-bold uppercase ${PRIORITY_COLOR[r.priority]}`}>
                              {r.priority}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={busyId === r.id}
                        className="h-10 rounded-xl border border-black/10 text-sm font-semibold text-black/60 disabled:opacity-40"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(r.id)}
                        disabled={busyId === r.id}
                        className="h-10 rounded-xl bg-gradient-to-r from-brand to-brand-light text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {busyId === r.id ? "..." : "Accept"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ACTIVE REQUESTS */}
          <section className="mt-8">
            <h2 className="font-display text-base text-ink">Your active jobs</h2>

            {loading ? (
              <p className="mt-3 text-sm text-black/40">Loading...</p>
            ) : myRequests.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-black/10 bg-white/50 p-4 text-sm text-black/40">
                Nothing active — accept a request above to get started.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {myRequests.map((r) => {
                  const next = NEXT_STATUS[r.status];
                  return (
                    <div key={r.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-sm text-ink capitalize">{r.service_type}</p>
                          <p className="mt-0.5 text-sm text-black/60">{r.description}</p>
                          <p className="mt-1.5 text-xs text-black/40">📍 {r.location_text}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {next && (
                          <button
                            onClick={() => handleAdvance(r.id, next.next)}
                            disabled={busyId === r.id}
                            className="h-10 flex-1 rounded-xl bg-gradient-to-r from-brand to-brand-light text-sm font-semibold text-white disabled:opacity-40"
                          >
                            {busyId === r.id ? "..." : next.label}
                          </button>
                        )}
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={busyId === r.id}
                          className="h-10 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/50 disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

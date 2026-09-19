"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getAdminStats, listAdminProviders, updateProviderVerification, listAdminComplaints, resolveComplaint, type AdminStats, type ProviderProfile, type AdminComplaint } from "@/lib/api/adminApi";

const STATUS_LABELS: Record<string, string> = {
  request_sent: "New / unassigned",
  provider_reviewing: "Reviewing",
  accepted: "Accepted",
  on_the_way: "On the way",
  service_started: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const VERIFICATION_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  suspended: "bg-black/5 text-black/50 border-black/10",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthStore();
  const [tab, setTab] = useState<"overview" | "providers" | "complaints">("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [complaintFilter, setComplaintFilter] = useState<string>("open");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setStats(await getAdminStats(accessToken));
    } catch {
      setError("Couldn't load stats.");
    }
  }, [accessToken]);

  const loadProviders = useCallback(async () => {
    if (!accessToken) return;
    try {
      setProviders(await listAdminProviders(accessToken, providerFilter || undefined));
    } catch {
      setError("Couldn't load providers.");
    }
  }, [accessToken, providerFilter]);

  const loadComplaints = useCallback(async () => {
    if (!accessToken) return;
    try {
      setComplaints(await listAdminComplaints(accessToken, complaintFilter || undefined));
    } catch {
      setError("Couldn't load complaints.");
    }
  }, [accessToken, complaintFilter]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    load();
  }, [accessToken, router, load]);

  useEffect(() => {
    if (tab === "providers") loadProviders();
    if (tab === "complaints") loadComplaints();
  }, [tab, loadProviders, loadComplaints]);

  async function handleVerify(userId: string, status: string) {
    if (!accessToken) return;
    const note = status === "rejected" ? window.prompt("Reason for rejecting (shown to the provider):") || undefined : undefined;
    try {
      await updateProviderVerification(accessToken, userId, status, note);
      loadProviders();
    } catch {
      setError("Couldn't update verification status.");
    }
  }

  async function handleResolveComplaint(complaintId: string, status: string) {
    if (!accessToken) return;
    const note = window.prompt("Note for this update (visible in the record):") || undefined;
    try {
      await resolveComplaint(accessToken, complaintId, status, note);
      loadComplaints();
    } catch {
      setError("Couldn't update complaint.");
    }
  }

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
        <div className="flex gap-2 border-b border-black/5">
          {(["overview", "providers", "complaints"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-semibold capitalize ${
                tab === t ? "border-b-2 border-brand text-ink" : "text-black/40"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        {tab === "overview" && (
          <>
            <h1 className="mt-6 font-display text-2xl text-ink">Overview</h1>
            <p className="mt-1 text-sm text-black/50">
              Live counts from the database — no mock numbers.
            </p>

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
          </>
        )}

        {tab === "providers" && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <h1 className="font-display text-2xl text-ink">Provider Verification</h1>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="h-9 rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold text-ink"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="mt-4 space-y-3">
              {providers.length === 0 && (
                <p className="text-sm text-black/40">No providers match this filter.</p>
              )}
              {providers.map((p) => (
                <div key={p.user_id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink">{p.name || "Unnamed provider"}</p>
                      <p className="text-xs text-black/45">{p.phone}</p>
                      {p.experience_years != null && (
                        <p className="mt-1 text-xs text-black/50">{p.experience_years} years experience</p>
                      )}
                      {p.bio && <p className="mt-1 text-xs text-black/60">{p.bio}</p>}
                      {p.verification_note && (
                        <p className="mt-1 text-xs italic text-black/40">Note: {p.verification_note}</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${VERIFICATION_STYLES[p.verification_status]}`}
                    >
                      {p.verification_status}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {p.verification_status !== "verified" && (
                      <button
                        onClick={() => handleVerify(p.user_id, "verified")}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Verify
                      </button>
                    )}
                    {p.verification_status !== "rejected" && (
                      <button
                        onClick={() => handleVerify(p.user_id, "rejected")}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Reject
                      </button>
                    )}
                    {p.verification_status !== "suspended" && p.verification_status === "verified" && (
                      <button
                        onClick={() => handleVerify(p.user_id, "suspended")}
                        className="rounded-lg bg-black/10 px-3 py-1.5 text-xs font-bold text-ink"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "complaints" && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <h1 className="font-display text-2xl text-ink">Complaints</h1>
              <select
                value={complaintFilter}
                onChange={(e) => setComplaintFilter(e.target.value)}
                className="h-9 rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold text-ink"
              >
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="under_review">Under review</option>
                <option value="waiting_for_customer">Waiting for customer</option>
                <option value="waiting_for_provider">Waiting for provider</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>

            <div className="mt-4 space-y-3">
              {complaints.length === 0 && (
                <p className="text-sm text-black/40">No complaints match this filter.</p>
              )}
              {complaints.map((c) => (
                <div key={c.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold capitalize text-ink">{c.category.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-xs text-black/60">{c.description}</p>
                      {c.admin_note && (
                        <p className="mt-1 text-xs italic text-black/40">Note: {c.admin_note}</p>
                      )}
                    </div>
                    <span className="rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 text-[11px] font-bold capitalize text-black/60">
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => handleResolveComplaint(c.id, "under_review")} className="rounded-lg bg-black/10 px-3 py-1.5 text-xs font-bold text-ink">
                      Mark reviewing
                    </button>
                    <button onClick={() => handleResolveComplaint(c.id, "resolved")} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">
                      Resolve
                    </button>
                    <button onClick={() => handleResolveComplaint(c.id, "rejected")} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
                      Reject
                    </button>
                    <button onClick={() => handleResolveComplaint(c.id, "escalated")} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">
                      Escalate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

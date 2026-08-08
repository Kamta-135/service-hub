"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getRequest, type ServiceRequestDetail, type RequestStatus } from "@/lib/api/requestsApi";

const STEPS: { status: RequestStatus; label: string }[] = [
  { status: "request_sent", label: "Request sent" },
  { status: "accepted", label: "Provider accepted" },
  { status: "on_the_way", label: "On the way" },
  { status: "service_started", label: "Service started" },
  { status: "completed", label: "Completed" },
];

export default function RequestTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [detail, setDetail] = useState<ServiceRequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const d = await getRequest(accessToken, id);
      setDetail(d);
    } catch {
      setError("Couldn't load this request.");
    }
  }, [accessToken, id]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    load();
    const interval = setInterval(load, 8000); // poll for live-ish updates
    return () => clearInterval(interval);
  }, [accessToken, router, load]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="text-sm text-black/50">{error}</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="text-sm text-black/40">Loading...</p>
      </main>
    );
  }

  const isCancelled = detail.status === "cancelled";
  const currentIndex = STEPS.findIndex((s) => s.status === detail.status);

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-lg">
        <button onClick={() => router.push("/dashboard")} className="mb-4 text-sm font-semibold text-black/50">
          ← Back to dashboard
        </button>

        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="font-display text-lg capitalize text-ink">{detail.service_type}</p>
          <p className="mt-1 text-sm text-black/60">{detail.description}</p>
          <p className="mt-2 text-xs text-black/40">📍 {detail.location_text}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          {isCancelled ? (
            <p className="text-sm font-bold text-red-600">This request was cancelled.</p>
          ) : (
            <ol className="space-y-0">
              {STEPS.map((step, i) => {
                const done = i <= currentIndex;
                const isLast = i === STEPS.length - 1;
                return (
                  <li key={step.status} className="relative flex gap-3 pb-6 last:pb-0">
                    {!isLast && (
                      <span
                        className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${
                          i < currentIndex ? "bg-brand" : "bg-black/10"
                        }`}
                      />
                    )}
                    <span
                      className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-brand text-white" : "bg-black/10 text-black/30"
                      }`}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${done ? "text-ink" : "text-black/35"}`}>
                        {step.label}
                      </p>
                      {done && i === currentIndex && (
                        <p className="text-xs text-black/40">
                          {new Date(detail.updated_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {detail.status === "request_sent" && (
          <p className="mt-4 text-center text-xs text-black/40">
            This page refreshes automatically as a provider accepts your request.
          </p>
        )}
      </div>
    </main>
  );
}

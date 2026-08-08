"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { createRequest, type Priority } from "@/lib/api/requestsApi";
import { ApiError } from "@/lib/api/client";

const services = [
  "Electrician", "Plumber", "Vehicle Mechanic", "Doctor / Clinic",
  "Mobile Repair", "Computer Repair", "Mason", "Tractor & Agri",
  "AC / Fridge Repair", "Cleaning",
];

const priorities: { value: Priority; label: string; hint: string }[] = [
  { value: "normal", label: "Normal", hint: "Whenever a provider is free" },
  { value: "urgent", label: "Urgent", hint: "Today, as soon as possible" },
  { value: "emergency", label: "Emergency", hint: "Right now — safety issue" },
];

function NewRequestForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, accessToken } = useAuthStore();

  const [serviceType, setServiceType] = useState(params.get("service") || services[0]);
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!accessToken || !user) {
    router.replace("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !locationText.trim()) {
      setError("Please describe the problem and add your location.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await createRequest(accessToken!, {
        service_type: serviceType,
        description: description.trim(),
        location_text: locationText.trim(),
        priority,
      });
      router.push(`/requests/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only customer accounts can submit a request.");
      } else {
        setError("Couldn't submit your request. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-lg">
        <button onClick={() => router.back()} className="mb-4 text-sm font-semibold text-black/50">
          ← Back
        </button>

        <h1 className="font-display text-2xl text-ink">What do you need help with?</h1>
        <p className="mt-1 text-sm text-black/50">
          Tell us what's wrong — we'll match you with a verified provider nearby.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-black/50">Service</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            >
              {services.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-black/50">
              Describe the problem
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. Fan stopped working yesterday, makes a clicking sound"
              className="w-full rounded-xl border border-black/10 bg-white p-4 text-sm text-ink placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-black/50">Your location</label>
            <input
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Village / area, district, state"
              className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-ink placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-black/50">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    priority === p.value
                      ? "border-brand bg-brand/10"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <p className={`text-sm font-bold ${priority === p.value ? "text-brand-dark" : "text-ink"}`}>
                    {p.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-black/45">{p.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="h-14 w-full rounded-xl bg-gradient-to-r from-brand to-brand-light text-base font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={null}>
      <NewRequestForm />
    </Suspense>
  );
}

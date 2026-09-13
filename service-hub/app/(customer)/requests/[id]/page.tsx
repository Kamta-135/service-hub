"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getRequest, submitReview, fileComplaint, listQuotes, acceptQuote, type ServiceRequestDetail, type RequestStatus, type ComplaintCategory, type Quote } from "@/lib/api/requestsApi";
import { ApiError } from "@/lib/api/client";
import { getJobCard, confirmJobCard, raiseWarrantyClaim, type JobCard } from "@/lib/api/jobCardApi";
import ChatBox from "@/components/ChatBox";

function QuotesList({ requestId, accessToken, onAccepted }: { requestId: string; accessToken: string; onAccepted: () => void }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listQuotes(accessToken, requestId)
      .then(setQuotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, requestId]);

  async function handleAccept(quoteId: string) {
    setAccepting(quoteId);
    setError(null);
    try {
      await acceptQuote(accessToken, requestId, quoteId);
      onAccepted();
    } catch {
      setError("Couldn't accept this quote — it may no longer be available.");
      setAccepting(null);
    }
  }

  if (loading) return null;
  const pending = quotes.filter((q) => q.status === "pending");
  if (pending.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold text-ink">
        {pending.length} provider{pending.length > 1 ? "s have" : " has"} quoted — compare and choose
      </p>
      <div className="mt-3 space-y-3">
        {pending
          .slice()
          .sort((a, b) => a.amount - b.amount)
          .map((q) => (
            <div key={q.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-xl text-ink">₹{q.amount}</span>
                {q.eta_minutes != null && (
                  <span className="text-xs font-medium text-black/45">Arrives in ~{q.eta_minutes} min</span>
                )}
              </div>
              {q.notes && <p className="mt-1 text-xs text-black/55">{q.notes}</p>}
              {q.warranty_days ? (
                <p className="mt-1 text-xs font-semibold text-brand">{q.warranty_days}-day warranty</p>
              ) : null}
              {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
              <button
                onClick={() => handleAccept(q.id)}
                disabled={accepting === q.id}
                className="mt-3 h-10 w-full rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-50"
              >
                {accepting === q.id ? "Accepting..." : "Accept this quote"}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: "no_show", label: "Provider never showed up" },
  { value: "late_arrival", label: "Arrived very late" },
  { value: "poor_service", label: "Poor quality of work" },
  { value: "wrong_price", label: "Charged more than agreed" },
  { value: "payment_issue", label: "Payment problem" },
  { value: "damage", label: "Something got damaged" },
  { value: "fraud_concern", label: "Fraud / safety concern" },
  { value: "other", label: "Something else" },
];

function ComplaintBox({ requestId, accessToken }: { requestId: string; accessToken: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ComplaintCategory>("other");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tokenNumber, setTokenNumber] = useState<string | null>(null);
  const [alreadyOpen, setAlreadyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!description.trim()) {
      setError("Please describe what went wrong.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const complaint = await fileComplaint(accessToken, requestId, category, description.trim());
      setTokenNumber(complaint.id.slice(0, 8).toUpperCase());
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyOpen(true);
      } else {
        setError("Couldn't submit your complaint. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted || alreadyOpen) {
    return (
      <div className="mt-4 text-center">
        <p className="text-xs font-medium text-black/50">
          {submitted ? "Your complaint has been filed — our team will review it." : "You already have an open complaint for this booking."}
        </p>
        {tokenNumber && (
          <p className="mt-1 text-xs font-bold text-ink">
            Reference / Token No: <span className="font-mono">{tokenNumber}</span>
          </p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full text-center text-xs font-semibold text-red-600 underline"
      >
        Report an issue with this booking
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-ink">Report an issue</p>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
        className="mt-3 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-ink"
      >
        {COMPLAINT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="What happened?"
        className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 text-sm text-ink placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
      />
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit complaint"}
        </button>
        <button onClick={() => setOpen(false)} className="h-10 px-4 text-sm font-semibold text-black/50">
          Cancel
        </button>
      </div>
    </div>
  );
}

const STEPS: { status: RequestStatus; label: string }[] = [
  { status: "request_sent", label: "Request sent" },
  { status: "accepted", label: "Provider accepted" },
  { status: "on_the_way", label: "On the way" },
  { status: "service_started", label: "Service started" },
  { status: "completed", label: "Completed" },
];

function JobCardBox({ requestId, accessToken }: { requestId: string; accessToken: string }) {
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimText, setClaimText] = useState("");
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  useEffect(() => {
    getJobCard(accessToken, requestId)
      .then(setJobCard)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, requestId]);

  async function handleConfirm() {
    setConfirming(true);
    try {
      const updated = await confirmJobCard(accessToken, requestId);
      setJobCard(updated);
    } finally {
      setConfirming(false);
    }
  }

  async function handleClaim() {
    if (!claimText.trim()) return;
    try {
      await raiseWarrantyClaim(accessToken, requestId, claimText.trim());
      setClaimSubmitted(true);
      setClaimOpen(false);
    } catch {
      // stays open for retry
    }
  }

  if (loading || !jobCard) return null;

  return (
    <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-ink">Job Card</p>
      <p className="mt-2 text-xs text-black/60">{jobCard.work_performed}</p>
      {jobCard.materials_used && <p className="mt-1 text-xs text-black/45">Materials: {jobCard.materials_used}</p>}
      {jobCard.final_amount != null && (
        <p className="mt-1 text-sm font-bold text-ink">₹{jobCard.final_amount}</p>
      )}
      {jobCard.warranty_days ? (
        <p className={`mt-1 text-xs font-semibold ${jobCard.warranty_active ? "text-green-700" : "text-black/40"}`}>
          {jobCard.warranty_active ? `${jobCard.warranty_days}-day warranty active` : "Warranty expired"}
        </p>
      ) : null}

      {!jobCard.customer_confirmed_at ? (
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="mt-3 h-10 w-full rounded-xl bg-ink text-sm font-bold text-white disabled:opacity-50"
        >
          {confirming ? "Confirming..." : "Confirm work was completed"}
        </button>
      ) : (
        <p className="mt-3 text-xs font-medium text-green-700">✓ You confirmed this job</p>
      )}

      {jobCard.warranty_active && (
        claimSubmitted ? (
          <p className="mt-2 text-xs font-medium text-black/50">Warranty claim submitted — we'll follow up.</p>
        ) : claimOpen ? (
          <div className="mt-2">
            <textarea
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              rows={2}
              placeholder="What went wrong?"
              className="w-full rounded-xl border border-black/10 bg-white p-3 text-sm text-ink placeholder:text-black/35"
            />
            <button onClick={handleClaim} className="mt-2 h-9 w-full rounded-lg bg-amber-500 text-xs font-bold text-white">
              Submit warranty claim
            </button>
          </div>
        ) : (
          <button onClick={() => setClaimOpen(true)} className="mt-2 w-full text-center text-xs font-semibold text-amber-600 underline">
            Raise a warranty claim
          </button>
        )
      )}
    </div>
  );
}

function ReviewBox({ requestId, accessToken }: { requestId: string; accessToken: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating < 1) {
      setError("Please pick a star rating.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitReview(accessToken, requestId, rating, comment.trim() || undefined);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyReviewed(true);
      } else {
        setError("Couldn't submit your rating. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted || alreadyReviewed) {
    return (
      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-ink">
          {submitted ? "Thanks for your feedback! 🙌" : "You've already rated this service."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-ink">Rate this service</p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={`text-3xl leading-none transition-colors ${n <= rating ? "text-amber-400" : "text-black/15"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="How was your experience? (optional)"
        className="mt-3 w-full rounded-xl border border-black/10 bg-white p-3 text-sm text-ink placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
      />
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-3 h-11 w-full rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit rating"}
      </button>
    </div>
  );
}

export default function RequestTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

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

        {detail.status === "request_sent" && accessToken && (
          <QuotesList requestId={detail.id} accessToken={accessToken} onAccepted={load} />
        )}

        {detail.status === "completed" && accessToken && (
          <JobCardBox requestId={detail.id} accessToken={accessToken} />
        )}

        {detail.status === "completed" && accessToken && (
          <ReviewBox requestId={detail.id} accessToken={accessToken} />
        )}

        {!isCancelled && detail.status !== "request_sent" && accessToken && user && (
          <ChatBox requestId={detail.id} accessToken={accessToken} myUserId={user.id} />
        )}

        {!isCancelled && detail.status !== "request_sent" && accessToken && (
          <ComplaintBox requestId={detail.id} accessToken={accessToken} />
        )}
      </div>
    </main>
  );
}

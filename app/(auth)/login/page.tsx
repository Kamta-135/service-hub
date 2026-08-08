"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestOtp } from "@/lib/api/authApi";
import { ApiError } from "@/lib/api/client";
import type { UserRole } from "@/lib/api/authApi";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("customer");
  const [phone, setPhone] = useState("+91");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleaned = phone.replace(/\s+/g, "");
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      setError("Enter a valid phone number, e.g. +919876543210");
      return;
    }

    setLoading(true);
    try {
      const res = await requestOtp(cleaned);
      const devParam = res.dev_otp ? `&dev_otp=${res.dev_otp}` : "";
      router.push(`/verify-otp?phone=${encodeURIComponent(cleaned)}&role=${role}${devParam}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setError("Couldn't send the code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-light font-display text-lg text-white">
            S
          </span>
          <h1 className="mt-4 font-display text-2xl text-ink">Welcome to Service.Hub</h1>
          <p className="mt-1.5 text-sm text-black/50">
            Trusted local help, when you need it.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-black/5 p-1">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              role === "customer" ? "bg-white text-ink shadow-sm" : "text-black/50"
            }`}
          >
            I need help
          </button>
          <button
            type="button"
            onClick={() => setRole("provider")}
            className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              role === "provider" ? "bg-white text-ink shadow-sm" : "text-black/50"
            }`}
          >
            I provide services
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-black/50">Phone number</span>
            <Input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              autoFocus
            />
          </label>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <Button type="submit" size="lg" className="w-full bg-brand hover:bg-brand-dark" disabled={loading}>
            {loading ? "Sending code..." : "Continue"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-black/40">
          We'll text you a one-time code — no password needed.
        </p>
      </div>
    </main>
  );
}

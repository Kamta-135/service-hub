"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestOtp, verifyOtp } from "@/lib/api/authApi";
import { ApiError } from "@/lib/api/client";
import type { UserRole } from "@/lib/api/authApi";
import { useAuthStore } from "@/store/authStore";

function VerifyOtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const phone = params.get("phone") || "";
  const role = (params.get("role") as UserRole) || "customer";
  const initialDevOtp = params.get("dev_otp");

  const [digits, setDigits] = useState(() =>
    initialDevOtp ? initialDevOtp.split("").slice(0, 6) : ["", "", "", "", "", ""]
  );
  const [devOtp, setDevOtp] = useState(initialDevOtp);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtp({ phone, code, role });
      setAuth(res);
      router.push(res.user.role === "provider" ? "/provider/dashboard" : "/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many incorrect attempts. Request a new code.");
      } else {
        setError("That code didn't match. Please try again.");
      }
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      const res = await requestOtp(phone);
      setResendCooldown(30);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        setDigits(res.dev_otp.split("").slice(0, 6));
      }
    } catch {
      setError("Couldn't resend the code. Please try again shortly.");
    }
  }

  if (!phone) {
    return (
      <div className="text-center">
        <p className="text-sm text-black/50">Missing phone number.</p>
        <Button className="mt-4 bg-brand hover:bg-brand-dark" onClick={() => router.push("/login")}>
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl text-ink">Enter the code</h1>
        <p className="mt-1.5 text-sm text-black/50">
          We sent a 6-digit code to <span className="font-semibold text-ink">{phone}</span>
        </p>
        {devOtp && (
          <p className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            DEV MODE — code auto-filled: {devOtp}
          </p>
        )}
      </div>

      <form onSubmit={handleVerify}>
        <div className="flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className="h-14 w-11 rounded-xl border border-black/10 bg-white text-center font-display text-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          ))}
        </div>

        {error && <p className="mt-4 text-center text-sm font-medium text-red-600">{error}</p>}

        <Button
          type="submit"
          size="lg"
          className="mt-6 w-full bg-brand hover:bg-brand-dark"
          disabled={loading}
        >
          {loading ? "Verifying..." : "Verify & Continue"}
        </Button>
      </form>

      <button
        onClick={handleResend}
        disabled={resendCooldown > 0}
        className="mx-auto mt-5 block text-sm font-semibold text-brand disabled:text-black/30"
      >
        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
      </button>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Suspense fallback={null}>
        <VerifyOtpForm />
      </Suspense>
    </main>
  );
}

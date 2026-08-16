"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { guestLogin } from "@/lib/api/authApi";

/**
 * TEMPORARY: no visible login step while real SMS delivery isn't wired up.
 * Anyone landing here is silently signed in as a fresh guest account and
 * sent straight to their dashboard. To bring back the real OTP screen
 * later, this is the one file to revert.
 */
export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { accessToken, user, setAuth } = useAuthStore();
  const role = params.get("role") === "provider" ? "provider" : "customer";

  useEffect(() => {
    if (accessToken && user) {
      router.replace(user.role === "provider" ? "/provider/dashboard" : "/dashboard");
      return;
    }
    guestLogin(role)
      .then((res) => {
        setAuth(res);
        router.replace(res.user.role === "provider" ? "/provider/dashboard" : "/dashboard");
      })
      .catch(() => {
        // Backend unreachable — nothing more we can do here silently.
      });
  }, [accessToken, user, role, router, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <p className="text-sm text-black/40">Loading...</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { guestLogin, type UserRole } from "@/lib/api/authApi";

/**
 * TEMPORARY: while real SMS delivery isn't wired up, this signs people in
 * as a fresh guest account automatically — no visible login screen. Once
 * a guest token exists it's persisted (see authStore), so this only fires
 * once per browser. To bring back the real OTP login screen, delete this
 * hook's usage and point routes at /login again — nothing else changes.
 */
export function useGuestAuth(requiredRole: UserRole) {
  const { user, accessToken, setAuth } = useAuthStore();
  const [ready, setReady] = useState(!!accessToken);

  useEffect(() => {
    if (accessToken) {
      setReady(true);
      return;
    }
    guestLogin(requiredRole)
      .then((res) => {
        setAuth(res);
        setReady(true);
      })
      .catch(() => {
        // If guest login is disabled or the backend is unreachable, we
        // simply stay on a loading state rather than looping forever.
      });
  }, [accessToken, requiredRole, setAuth]);

  return { user, accessToken, ready };
}

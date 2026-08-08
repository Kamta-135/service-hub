import { apiFetch } from "./client";

export type UserRole = "customer" | "provider";

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface OtpRequestResponse {
  message: string;
  expires_in_seconds: number;
  dev_otp?: string; // only present when the backend is running outside production
}

export function requestOtp(phone: string) {
  return apiFetch<OtpRequestResponse>("/auth/otp/request", {
    method: "POST",
    body: { phone },
  });
}

export function verifyOtp(params: { phone: string; code: string; role: UserRole; name?: string }) {
  return apiFetch<TokenResponse>("/auth/otp/verify", {
    method: "POST",
    body: params,
  });
}

export function refreshToken(refresh_token: string) {
  return apiFetch<TokenResponse>("/auth/refresh", {
    method: "POST",
    body: { refresh_token },
  });
}

export function getMe(token: string) {
  return apiFetch<User>("/auth/me", { token });
}

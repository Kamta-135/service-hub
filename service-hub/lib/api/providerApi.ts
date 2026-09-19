import { apiFetch } from "./client";

export interface MyProviderProfile {
  user_id: string;
  name: string | null;
  phone: string;
  bio: string | null;
  experience_years: number | null;
  service_radius_km: number | null;
  has_location: boolean;
  verification_status: string;
  verification_note: string | null;
  created_at: string;
}

export function getMyProviderProfile(token: string) {
  return apiFetch<MyProviderProfile>("/providers/me", { token });
}

export function updateMyProviderProfile(token: string, data: {
  bio?: string; experience_years?: number; lat?: number; lng?: number; service_radius_km?: number;
}) {
  return apiFetch<MyProviderProfile>("/providers/me", { method: "PATCH", token, body: data });
}

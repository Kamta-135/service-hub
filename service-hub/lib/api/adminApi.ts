import { apiFetch } from "./client";

export interface AdminStats {
  total_users: number;
  total_customers: number;
  total_providers: number;
  total_requests: number;
  requests_by_status: Record<string, number>;
  active_requests: number;
  emergency_requests: number;
}

export function getAdminStats(token: string) {
  return apiFetch<AdminStats>("/admin/stats", { token });
}

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

export interface ProviderProfile {
  user_id: string;
  name: string | null;
  phone: string;
  bio: string | null;
  experience_years: number | null;
  verification_status: "pending" | "verified" | "rejected" | "suspended";
  verification_note: string | null;
  created_at: string;
}

export function listAdminProviders(token: string, statusFilter?: string) {
  const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
  return apiFetch<ProviderProfile[]>(`/admin/providers${qs}`, { token });
}

export function updateProviderVerification(token: string, userId: string, status: string, note?: string) {
  return apiFetch<ProviderProfile>(`/admin/providers/${userId}/verification`, {
    method: "PATCH",
    token,
    body: { status, note: note || undefined },
  });
}

export interface AdminComplaint {
  id: string;
  request_id: string;
  customer_id: string;
  provider_id: string | null;
  category: string;
  description: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

export function listAdminComplaints(token: string, statusFilter?: string) {
  const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
  return apiFetch<AdminComplaint[]>(`/admin/complaints${qs}`, { token });
}

export function resolveComplaint(token: string, complaintId: string, status: string, adminNote?: string) {
  return apiFetch<AdminComplaint>(`/admin/complaints/${complaintId}`, {
    method: "PATCH",
    token,
    body: { status, admin_note: adminNote || undefined },
  });
}

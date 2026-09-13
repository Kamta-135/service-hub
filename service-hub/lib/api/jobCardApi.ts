import { apiFetch } from "./client";

export interface JobCard {
  id: string;
  request_id: string;
  provider_id: string;
  customer_id: string;
  work_performed: string;
  materials_used: string | null;
  final_amount: number | null;
  warranty_days: number | null;
  warranty_terms: string | null;
  customer_confirmed_at: string | null;
  created_at: string;
  warranty_active: boolean;
}

export function getJobCard(token: string, requestId: string) {
  return apiFetch<JobCard>(`/requests/${requestId}/job-card`, { token });
}

export function createJobCard(token: string, requestId: string, data: {
  work_performed: string; materials_used?: string; final_amount?: number;
  warranty_days?: number; warranty_terms?: string;
}) {
  return apiFetch<JobCard>(`/requests/${requestId}/job-card`, { method: "POST", token, body: data });
}

export function confirmJobCard(token: string, requestId: string) {
  return apiFetch<JobCard>(`/requests/${requestId}/job-card/confirm`, { method: "POST", token });
}

export function raiseWarrantyClaim(token: string, requestId: string, description: string) {
  return apiFetch(`/requests/${requestId}/warranty-claim`, { method: "POST", token, body: { description } });
}

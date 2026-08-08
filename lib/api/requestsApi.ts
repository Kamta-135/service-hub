import { apiFetch } from "./client";

export type RequestStatus =
  | "request_sent"
  | "provider_reviewing"
  | "accepted"
  | "on_the_way"
  | "service_started"
  | "completed"
  | "cancelled";

export type Priority = "normal" | "urgent" | "emergency";

export interface ServiceRequest {
  id: string;
  customer_id: string;
  provider_id: string | null;
  service_type: string;
  description: string;
  image_url: string | null;
  location_text: string;
  lat: number | null;
  lng: number | null;
  priority: Priority;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface StatusEvent {
  status: RequestStatus;
  note: string | null;
  created_at: string;
}

export interface ServiceRequestDetail extends ServiceRequest {
  status_events: StatusEvent[];
}

export function createRequest(
  token: string,
  payload: {
    service_type: string;
    description: string;
    image_url?: string;
    location_text: string;
    lat?: number;
    lng?: number;
    priority?: Priority;
  }
) {
  return apiFetch<ServiceRequest>("/requests", { method: "POST", token, body: payload });
}

export function listRequests(
  token: string,
  filters: { customer_id?: string; provider_id?: string; status?: RequestStatus } = {}
) {
  const qs = new URLSearchParams(filters as Record<string, string>).toString();
  return apiFetch<ServiceRequest[]>(`/requests${qs ? `?${qs}` : ""}`, { token });
}

export function getRequest(token: string, id: string) {
  return apiFetch<ServiceRequestDetail>(`/requests/${id}`, { token });
}

export function acceptRequest(token: string, id: string) {
  return apiFetch<ServiceRequest>(`/requests/${id}/accept`, { method: "POST", token });
}

export function rejectRequest(token: string, id: string) {
  return apiFetch<ServiceRequest>(`/requests/${id}/reject`, { method: "POST", token });
}

export function updateRequestStatus(token: string, id: string, status: RequestStatus, note?: string) {
  return apiFetch<ServiceRequest>(`/requests/${id}/status`, {
    method: "PATCH",
    token,
    body: { status, note },
  });
}

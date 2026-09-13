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

export interface Review {
  id: string;
  request_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export function submitReview(token: string, requestId: string, rating: number, comment?: string) {
  return apiFetch<Review>(`/requests/${requestId}/review`, {
    method: "POST",
    token,
    body: { rating, comment: comment || undefined },
  });
}

export type ComplaintCategory =
  | "poor_service" | "wrong_price" | "no_show" | "late_arrival"
  | "payment_issue" | "damage" | "fraud_concern" | "other";

export interface Complaint {
  id: string;
  request_id: string;
  status: string;
  category: ComplaintCategory;
  description: string;
  admin_note: string | null;
  created_at: string;
}

export function fileComplaint(token: string, requestId: string, category: ComplaintCategory, description: string) {
  return apiFetch<Complaint>(`/requests/${requestId}/complaints`, {
    method: "POST",
    token,
    body: { category, description },
  });
}

export interface Quote {
  id: string;
  request_id: string;
  provider_id: string;
  amount: number;
  eta_minutes: number | null;
  duration_minutes: number | null;
  notes: string | null;
  included_work: string | null;
  excluded_work: string | null;
  warranty_days: number | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export function listQuotes(token: string, requestId: string) {
  return apiFetch<Quote[]>(`/requests/${requestId}/quotes`, { token });
}

export function submitQuote(token: string, requestId: string, data: {
  amount: number; eta_minutes?: number; duration_minutes?: number;
  notes?: string; warranty_days?: number;
}) {
  return apiFetch<Quote>(`/requests/${requestId}/quotes`, { method: "POST", token, body: data });
}

export function acceptQuote(token: string, requestId: string, quoteId: string) {
  return apiFetch<ServiceRequest>(`/requests/${requestId}/quotes/${quoteId}/accept`, {
    method: "POST",
    token,
  });
}

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function listMessages(token: string, requestId: string) {
  return apiFetch<Message[]>(`/requests/${requestId}/messages`, { token });
}

export function sendMessage(token: string, requestId: string, body: string) {
  return apiFetch<Message>(`/requests/${requestId}/messages`, { method: "POST", token, body: { body } });
}

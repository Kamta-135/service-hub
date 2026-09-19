import { apiFetch } from "./client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  request_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function listNotifications(token: string) {
  return apiFetch<Notification[]>("/notifications/me", { token });
}

export function getUnreadCount(token: string) {
  return apiFetch<{ unread_count: number }>("/notifications/unread-count", { token });
}

export function markAllNotificationsRead(token: string) {
  return apiFetch<{ ok: boolean }>("/notifications/read-all", { method: "POST", token });
}

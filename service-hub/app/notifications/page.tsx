"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { listNotifications, markAllNotificationsRead, type Notification } from "@/lib/api/notificationsApi";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    listNotifications(accessToken)
      .then((n) => {
        setNotifications(n);
        return markAllNotificationsRead(accessToken);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken, router]);

  const backHref = user?.role === "provider" ? "/provider/dashboard" : "/dashboard";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-black/5 bg-white px-5 py-4">
        <Link href={backHref} className="text-sm font-semibold text-black/50">← Back</Link>
        <h1 className="mt-1 font-display text-xl text-ink">Notifications</h1>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        {loading ? (
          <p className="text-center text-sm text-black/40">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center text-sm text-black/40">Nothing yet — updates on your bookings will show up here.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const card = (
                <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    <span className="shrink-0 text-xs text-black/35">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="mt-1 text-xs text-black/55">{n.body}</p>}
                </div>
              );
              return n.request_id ? (
                <Link key={n.id} href={`/requests/${n.request_id}`}>{card}</Link>
              ) : (
                <div key={n.id}>{card}</div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

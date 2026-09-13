"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUnreadCount } from "@/lib/api/notificationsApi";

export default function NotificationBell({ accessToken }: { accessToken: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function poll() {
      getUnreadCount(accessToken).then((r) => setCount(r.unread_count)).catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [accessToken]);

  return (
    <Link href="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5">
      <span className="text-lg">🔔</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

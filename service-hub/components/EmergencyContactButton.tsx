"use client";

import { useEffect, useState } from "react";
import { getSupportInfo } from "@/lib/api/catalogApi";

export default function EmergencyContactButton() {
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    getSupportInfo().then((r) => setPhone(r.support_phone)).catch(() => {});
  }, []);

  if (!phone) return null;

  return (
    <a
      href={`tel:${phone}`}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/30"
    >
      🚨 Emergency / Help: {phone}
    </a>
  );
}

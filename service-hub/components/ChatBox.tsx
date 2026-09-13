"use client";

import { useState, useEffect, useCallback } from "react";
import { listMessages, sendMessage, type Message } from "@/lib/api/requestsApi";

export default function ChatBox({
  requestId, accessToken, myUserId,
}: { requestId: string; accessToken: string; myUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    listMessages(accessToken, requestId).then(setMessages).catch(() => {});
  }, [accessToken, requestId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(accessToken, requestId, text.trim());
      setText("");
      load();
    } catch {
      // silently retryable — the input just stays filled
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-ink">Chat</p>
      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-xs text-black/35">No messages yet — say hello.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === myUserId ? "justify-end" : "justify-start"}`}>
            <span
              className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-xs ${
                m.sender_id === myUserId ? "bg-brand text-white" : "bg-black/5 text-ink"
              }`}
            >
              {m.body}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm text-ink placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
        <button
          onClick={handleSend}
          disabled={sending}
          className="h-10 rounded-xl bg-ink px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

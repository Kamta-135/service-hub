"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      className="flex h-9 items-center gap-1 rounded-full border border-black/10 bg-white px-3 text-xs font-bold text-ink"
    >
      🌐 {lang === "en" ? "हिंदी" : "English"}
    </button>
  );
}

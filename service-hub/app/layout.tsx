import type { Metadata } from "next";
import { Sora, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import EmergencyContactButton from "@/components/EmergencyContactButton";

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Service.Hub — Trusted Local Help. When You Need It.",
  description:
    "Service.Hub connects you with verified electricians, plumbers, mechanics, doctors, and more — in your village or town, ready when you need them.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${sora.variable} ${inter.variable} ${plexMono.variable} font-body`}
      >
        <LanguageProvider>
          {children}
          <EmergencyContactButton />
        </LanguageProvider>
      </body>
    </html>
  );
}

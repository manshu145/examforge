import type { Metadata, Viewport } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * We rely on the platform's system UI font stack defined in globals.css
 * (`--font-sans`). This avoids a build-time network call to Google Fonts
 * and gives near-identical typography on every modern OS. To swap in a
 * branded font later, drop a self-hosted file in `public/fonts/` and
 * register it via `next/font/local` here.
 */

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "ExamForge — Your AI Mentor for UPSC, NEET, JEE & State PSCs",
    template: "%s · ExamForge",
  },
  description:
    "Personalized AI study planner, descriptive answer evaluation, adaptive mocks, and doubt solver for UPSC, NEET, JEE, and State PSC aspirants.",
  applicationName: "ExamForge",
  keywords: [
    "UPSC",
    "NEET",
    "JEE",
    "State PSC",
    "AI mentor",
    "exam preparation",
    "study planner",
    "answer evaluator",
    "mock test",
  ],
  authors: [{ name: "ExamForge" }],
  creator: "ExamForge",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "ExamForge",
    title: "ExamForge — AI Mentor for India's toughest exams",
    description:
      "Plan smarter, write better answers, and master mocks with an AI mentor built for UPSC, NEET, JEE, and State PSCs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExamForge",
    description:
      "AI mentor for UPSC, NEET, JEE, and State PSC preparation.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}

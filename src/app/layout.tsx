import type { Metadata } from "next";

import { BackgroundSliderWrapper } from "@/components/background-slider-wrapper";
import { ErrorBoundary } from "@/components/error-boundary";
import { FloatingQuickPanel } from "@/components/floating-quick-panel";
import { ToastContainer } from "@/components/toast-container";
import { VersionSwitcher } from "@/components/version-switcher";
import { ForumAuthProvider } from "@/lib/forum-auth";
import { ToastProvider } from "@/lib/toast-context";

import "./globals.css";

const siteOrigin = "https://www.1bex.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Timix观察站 — AI 中转站榜单与社区",
  description:
    "社区共建的 AI 中转站观察站，持续整理价格、倍率、稳定性、模型覆盖和真实使用反馈。",
  keywords: ["AI中转站", "API中转", "GPT", "Claude", "倍率对比", "模型价格"],
  openGraph: {
    title: "Timix观察站 — AI 中转站榜单与社区",
    description:
      "社区共建的 AI 中转站观察站，持续整理价格、倍率、稳定性、模型覆盖和真实使用反馈。",
    type: "website",
    locale: "zh_CN",
    siteName: "Timix观察站",
  },
  twitter: {
    card: "summary_large_image",
    title: "Timix观察站 — AI 中转站榜单与社区",
    description:
      "社区共建的 AI 中转站观察站，持续整理价格、倍率、稳定性、模型覆盖和真实使用反馈。",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="preconnect" href="https://api.github.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full">
        <BackgroundSliderWrapper />
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-black"
          href="#main-content"
        >
          跳到主内容
        </a>
        <ForumAuthProvider>
          <ToastProvider>
            <main id="main-content" className="relative z-10 flex min-h-full flex-col">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <ToastContainer />
          </ToastProvider>
        </ForumAuthProvider>
        <FloatingQuickPanel />
        <VersionSwitcher />
      </body>
    </html>
  );
}

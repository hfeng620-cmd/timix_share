import type { Metadata, Viewport } from "next";

import { AnnouncementModal } from "@/components/announcement-modal";
import { BackgroundSliderWrapper } from "@/components/background-slider-wrapper";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageTransition } from "@/components/page-transition";
import { MobileDock } from "@/components/mobile-dock";
import { RegisterCounter } from "@/components/register-counter";
import { FloatingQuickPanel } from "@/components/floating-quick-panel";
import { ToastContainer } from "@/components/toast-container";
import { VpsFallbackBanner } from "@/components/vps-fallback-banner";
import { ForumAuthProvider } from "@/lib/forum-auth";
import { SystemMonitorProvider } from "@/lib/system-monitor-context";
import { ToastProvider } from "@/lib/toast-context";

import "./globals.css";

const siteOrigin = "https://www.1bex.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Timix观察站 \u2014 AI \u4e2d\u8f6c\u7ad9\u699c\u5355\u4e0e\u793e\u533a",
  description:
    "\u793e\u533a\u5171\u5efa\u7684 AI \u4e2d\u8f6c\u7ad9\u89c2\u5bdf\u7ad9\uff0c\u6301\u7eed\u6574\u7406\u4ef7\u683c\u3001\u500d\u7387\u3001\u7a33\u5b9a\u6027\u3001\u6a21\u578b\u8986\u76d6\u548c\u771f\u5b9e\u4f7f\u7528\u53cd\u9988\u3002",
  keywords: ["AI\u4e2d\u8f6c\u7ad9", "API\u4e2d\u8f6c", "GPT", "Claude", "\u500d\u7387\u5bf9\u6bd4", "\u6a21\u578b\u4ef7\u683c"],
  manifest: "/manifest.json",
  openGraph: {
    title: "Timix\u89c2\u5bdf\u7ad9 \u2014 AI \u4e2d\u8f6c\u7ad9\u699c\u5355\u4e0e\u793e\u533a",
    description:
      "\u793e\u533a\u5171\u5efa\u7684 AI \u4e2d\u8f6c\u7ad9\u89c2\u5bdf\u7ad9\uff0c\u6301\u7eed\u6574\u7406\u4ef7\u683c\u3001\u500d\u7387\u3001\u7a33\u5b9a\u6027\u3001\u6a21\u578b\u8986\u76d6\u548c\u771f\u5b9e\u4f7f\u7528\u53cd\u9988\u3002",
    type: "website",
    locale: "zh_CN",
    siteName: "Timix\u89c2\u5bdf\u7ad9",
  },
  twitter: {
    card: "summary_large_image",
    title: "Timix\u89c2\u5bdf\u7ad9 \u2014 AI \u4e2d\u8f6c\u7ad9\u699c\u5355\u4e0e\u793e\u533a",
    description:
      "\u793e\u533a\u5171\u5efa\u7684 AI \u4e2d\u8f6c\u7ad9\u89c2\u5bdf\u7ad9\uff0c\u6301\u7eed\u6574\u7406\u4ef7\u683c\u3001\u500d\u7387\u3001\u7a33\u5b9a\u6027\u3001\u6a21\u578b\u8986\u76d6\u548c\u771f\u5b9e\u4f7f\u7528\u53cd\u9988\u3002",
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Timix\u89c2\u5bdf\u7ad9",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="antialiased">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="preconnect" href="https://api.github.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-[100dvh] overflow-x-hidden">
        <BackgroundSliderWrapper />
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-zinc-950"
          href="#main-content"
        >
          跳到主内容
        </a>
        <ForumAuthProvider>
          <SystemMonitorProvider>
            <ToastProvider>
              <main id="main-content" className="relative z-10 flex min-h-[100dvh] flex-col overflow-x-hidden">
                <ErrorBoundary><PageTransition>{children}</PageTransition></ErrorBoundary>
              </main>
              <ToastContainer />
            </ToastProvider>
            <FloatingQuickPanel />
            <MobileDock />
          </SystemMonitorProvider>
        </ForumAuthProvider>
        <AnnouncementModal />
        <RegisterCounter />
        <VpsFallbackBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

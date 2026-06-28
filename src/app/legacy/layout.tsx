import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legacy | Timix观察站",
  description: "经典 Timix 观察站原始界面 — 老版 UI 入口",
  alternates: { canonical: "/legacy" },
  openGraph: {
    title: "Legacy | Timix观察站",
    description: "经典 Timix 观察站原始界面 — 老版 UI 入口",
    url: "/legacy",
  },
};

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

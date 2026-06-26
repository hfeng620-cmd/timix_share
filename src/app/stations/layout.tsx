import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "中转站榜单 | Timix观察站",
  description: "集中查看 AI 中转站的价格、倍率、入口、模型覆盖与社区反馈。",
  alternates: {
    canonical: "/stations",
  },
  openGraph: {
    title: "中转站榜单 | Timix观察站",
    description: "集中查看 AI 中转站的价格、倍率、入口、模型覆盖与社区反馈。",
    url: "/stations",
  },
};

export default function StationsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

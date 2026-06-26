import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "常见问题与指南 | Timix观察站",
  description: "快速了解 Timix观察站 的使用方法、试用入口、共建方式与常见问题。",
  alternates: {
    canonical: "/guides",
  },
  openGraph: {
    title: "常见问题与指南 | Timix观察站",
    description: "快速了解 Timix观察站 的使用方法、试用入口、共建方式与常见问题。",
    url: "/guides",
  },
};

export default function GuidesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

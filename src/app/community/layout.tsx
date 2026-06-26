import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "社区讨论区 | Timix观察站",
  description: "查看 Timix观察站 社区里的价格反馈、试用线索、站点口碑和共建讨论。",
  alternates: {
    canonical: "/community",
  },
  openGraph: {
    title: "社区讨论区 | Timix观察站",
    description: "查看 Timix观察站 社区里的价格反馈、试用线索、站点口碑和共建讨论。",
    url: "/community",
  },
};

export default function CommunityLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

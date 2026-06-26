import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "模型择优 | Timix观察站",
  description: "按任务场景比较模型能力，再回到中转站榜单比价格、倍率和入口。",
  alternates: {
    canonical: "/models",
  },
  openGraph: {
    title: "模型择优 | Timix观察站",
    description: "按任务场景比较模型能力，再回到中转站榜单比价格、倍率和入口。",
    url: "/models",
  },
};

export default function ModelsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

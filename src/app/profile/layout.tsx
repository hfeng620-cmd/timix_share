import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "个人主页 | Timix观察站",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

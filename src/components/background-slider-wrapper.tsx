"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BackgroundSlider } from "@/components/background-slider";

const GlassBackground = dynamic(
  () => import("@/components/glass-background").then((mod) => mod.GlassBackground),
  { ssr: false },
);

export function BackgroundSliderWrapper() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.getAttribute("data-theme") ?? "cyber");
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  if (theme === "apple-light") {
    return <GlassBackground />;
  }

  // Home page keeps its own video backgrounds — skip the slider
  if (pathname === "/") return null;

  return <BackgroundSlider />;
}

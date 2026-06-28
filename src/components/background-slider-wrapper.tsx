"use client";

import { usePathname } from "next/navigation";
import { BackgroundSlider } from "@/components/background-slider";

export function BackgroundSliderWrapper() {
  const pathname = usePathname();

  // Home page keeps its own video backgrounds — skip the slider
  if (pathname === "/") return null;

  return <BackgroundSlider />;
}

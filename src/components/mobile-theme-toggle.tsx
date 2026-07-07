"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium } from "lucide-react";

type MobileTheme = "mint" | "cyber";

const MOBILE_THEME_KEY = "timix-mobile-theme-v1";

function readStoredTheme(): MobileTheme {
  if (typeof window === "undefined") return "mint";
  const stored = window.localStorage.getItem(MOBILE_THEME_KEY);
  return stored === "cyber" ? "cyber" : "mint";
}

function applyMobileTheme(theme: MobileTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.mobileTheme = theme;
}

export function MobileThemeToggle() {
  const [theme, setTheme] = useState<MobileTheme>("mint");
  const isCyber = theme === "cyber";

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);
    applyMobileTheme(stored);
  }, []);

  function toggleTheme() {
    const next = isCyber ? "mint" : "cyber";
    setTheme(next);
    applyMobileTheme(next);
    window.localStorage.setItem(MOBILE_THEME_KEY, next);
  }

  return (
    <button
      aria-label={isCyber ? "切换白绿主题" : "切换黑曜主题"}
      className="mobile-theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
      onClick={toggleTheme}
      type="button"
    >
      {isCyber ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

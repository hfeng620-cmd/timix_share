"use client";

import { useEffect, useState } from "react";

const SPLASH_KEY = "timix-mobile-splash-seen:v2";

export function MobileAppSplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    const seen = window.sessionStorage.getItem(SPLASH_KEY);
    if (seen === "1") return;

    window.sessionStorage.setItem(SPLASH_KEY, "1");
    setVisible(true);

    const leaveTimer = window.setTimeout(() => setLeaving(true), 1180);
    const hideTimer = window.setTimeout(() => setVisible(false), 1560);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex flex-col bg-[#fbfffd] text-[#25343a] transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
    >
      <div className="absolute right-[11vw] top-[max(36px,env(safe-area-inset-top,0px)+18px)] h-6 w-6 animate-spin rounded-full border-[3px] border-[#27b4a8]/20 border-t-[#20a99f]" />

      <div className="flex flex-1 items-center justify-center px-8 pb-20">
        <div className="-rotate-2 text-center font-black tracking-normal text-[#656b70]">
          <p className="text-[34px] leading-[1.2]">来TiMix</p>
          <p className="mt-2 text-[30px] leading-[1.18]">发现性价比中转站</p>
          <p className="mt-2 text-[30px] leading-[1.18]">交流AI技术</p>
        </div>
      </div>

      <div className="pb-[max(54px,env(safe-area-inset-bottom,0px)+42px)] text-center">
        <div className="inline-flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#21b2a8] text-xl font-black text-white shadow-[0_12px_28px_rgba(33,178,168,0.24)]">T</span>
          <span className="text-[30px] font-black tracking-tight text-[#111b20]">TiMix</span>
        </div>
      </div>
    </div>
  );
}

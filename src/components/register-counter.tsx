"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

export function RegisterCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    const run = async () => {
      const { count: c } = await supabase
        .from("forum_profiles")
        .select("*", { count: "exact", head: true });
      if (c !== null) setCount(c);
    };
    run().catch(() => {});
  }, []);

  if (count === null) return null;

  const now = new Date();
  const month = MONTH_NAMES[now.getMonth()];
  const day = now.getDate();

  return (
    <div className="pointer-events-none fixed bottom-[calc(74px+env(safe-area-inset-bottom,0px))] right-3 z-[35] max-w-[54vw] select-none lg:bottom-4 lg:right-4 lg:z-[60] lg:max-w-none">
      <div className="truncate rounded-full border border-[var(--mobile-app-line,rgba(255,255,255,0.10))] bg-[var(--mobile-app-panel,rgba(255,255,255,0.05))] px-3 py-1.5 text-[10px] text-[var(--mobile-app-muted,rgba(255,255,255,0.40))] shadow-lg backdrop-blur-md lg:px-4 lg:py-2 lg:text-xs">
        截止{month}{day}日 · 注册 <span className="font-bold text-[var(--mobile-app-ink,#fff)]">{count}</span> 人
      </div>
    </div>
  );
}

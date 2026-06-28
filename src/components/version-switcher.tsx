"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, Settings, Sparkles, X } from "lucide-react";
import { usePreferenceStore } from "@/lib/preference-store";

type UiVersion = "new" | "legacy";

const VERSION_OPTIONS = [
  { key: "new" as UiVersion, label: "TiMix 新 UI", icon: Sparkles, href: "/", desc: "默认界面，持续更新" },
  { key: "legacy" as UiVersion, label: "Legacy 老 UI", icon: Archive, href: "/legacy", desc: "经典布局，稳定可靠" },
];

export function VersionSwitcher() {
  const [open, setOpen] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const uiVersion = usePreferenceStore((s) => s.uiVersion);
  const setUiVersion = usePreferenceStore((s) => s.setUiVersion);

  useEffect(() => { setHintDismissed(localStorage.getItem("vs-hint") === "1"); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (modalRef.current && !modalRef.current.contains(t) && triggerRef.current && !triggerRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleSelect = useCallback((v: UiVersion, href: string) => {
    setUiVersion(v); setOpen(false); router.push(href);
  }, [router, setUiVersion]);

  const handleTrigger = () => {
    if (!hintDismissed) { localStorage.setItem("vs-hint", "1"); setHintDismissed(true); }
    setOpen((p) => !p);
  };

  return (
    <>
      <button
        ref={triggerRef}
        aria-label="切换 UI 版本"
        className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 shadow-lg backdrop-blur transition hover:bg-white/20 hover:text-white ${!hintDismissed ? "animate-pulse" : ""}`}
        onClick={handleTrigger}
        type="button"
      >
        <Settings className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xl p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div ref={modalRef} className="w-full max-w-sm rounded-[28px] border border-white/15 bg-white/8 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label="选择 UI 版本">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-heading italic text-white">切换界面版本</h2>
              <p className="mt-1.5 text-sm text-white/50 font-body">在新 UI 与传统界面之间随时切换</p>
            </div>
            <div className="flex flex-col gap-4">
              {VERSION_OPTIONS.map((opt) => {
                const isActive = uiVersion === opt.key;
                const Icon = opt.icon;
                return (
                  <button key={opt.key}
                    className={`flex items-center gap-4 rounded-[18px] border p-4 text-left transition-all duration-300 ${isActive ? "border-white/40 bg-white/15" : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"}`}
                    onClick={() => handleSelect(opt.key, opt.href)} type="button"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-white/20 text-white" : "bg-white/8 text-white/60"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">{opt.label}</span>
                      <span className="mt-0.5 block text-xs text-white/45 font-body">{opt.desc}</span>
                    </span>
                    {isActive && <span className="ml-auto shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">当前</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setOpen(false)} className="mt-6 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white transition mx-auto" type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Archive, Sparkles, X } from "lucide-react";
import { usePreferenceStore } from "@/lib/preference-store";

type UiVersion = "new" | "legacy";

const VERSION_OPTIONS = [
  { key: "new" as UiVersion, label: "TiMix 新 UI", icon: Sparkles, href: "/", desc: "默认界面，持续更新" },
  { key: "legacy" as UiVersion, label: "Legacy 老 UI", icon: Archive, href: "/legacy", desc: "经典布局，稳定可靠" },
];

type Props = { open: boolean; onClose: () => void };

export function VersionSwitcherModal({ open, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const uiVersion = usePreferenceStore((s) => s.uiVersion);
  const setUiVersion = usePreferenceStore((s) => s.setUiVersion);

  // First-time visitors always see new UI
  useEffect(() => {
    const raw = localStorage.getItem("timix-preferences-v1");
    if (!raw) {
      setUiVersion("new");
      if (pathname === "/legacy") router.replace("/");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const unlock = lockBodyScroll();
    return () => { document.removeEventListener("keydown", onKey); unlock(); };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  const handleSelect = useCallback((v: UiVersion, href: string) => {
    setUiVersion(v); onClose();
    if (v === "legacy") window.location.href = "/legacy";
    else router.push(href);
  }, [router, setUiVersion, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#09090b]/50 backdrop-blur-xl p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
        <button onClick={onClose} className="mt-6 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white transition mx-auto" type="button">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

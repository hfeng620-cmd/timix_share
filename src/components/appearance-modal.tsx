"use client";

import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";

type ThemeId = "cyber" | "industrial" | "zen" | "apple-light";

interface ThemeDef {
  id: ThemeId;
  name: string;
  enName: string;
  desc: string;
  colors: string[];
  gradient: string;
}

const THEMES: ThemeDef[] = [
  {
    id: "cyber",
    name: "极光赛博",
    enName: "Cyber Aurora",
    desc: "高能、极客、年轻 — 青紫渐变碰撞出赛博空间的数字活力。",
    colors: ["#22d3ee", "#06b6d4", "#d946ef"],
    gradient: "linear-gradient(135deg, #22d3ee, #06b6d4, #d946ef)",
  },
  {
    id: "industrial",
    name: "永恒工业",
    enName: "Eternal Industrial",
    desc: "沉稳、权威、精密 — 琥珀金为暗色基底注入温暖的机械质感。",
    colors: ["#fbbf24", "#f59e0b", "#d97706"],
    gradient: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
  },
  {
    id: "zen",
    name: "静谧科技",
    enName: "Zen Tech",
    desc: "克制、留白、通透 — 薄荷蓝绿传递理性思考的从容节奏。",
    colors: ["#5eead4", "#2dd4bf", "#14b8a6"],
    gradient: "linear-gradient(135deg, #5eead4, #2dd4bf, #14b8a6)",
  },
  {
    id: "apple-light",
    name: "Apple Light & 3D",
    enName: "Apple Light",
    desc: "Frosted glass refraction & deep clarity.",
    colors: ["#ffffff", "#f5f5f7", "#0066cc"],
    gradient: "linear-gradient(135deg, #ffffff, #f5f5f7, #d2d2d7)",
  },
];

type Props = { open: boolean; onClose: () => void };

export function AppearanceModal({ open, onClose }: Props) {
  const [active, setActive] = useState<ThemeId>("cyber");
  const [mounted, setMounted] = useState(false);

  /* 挂载时从 localStorage 恢复主题 */
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("timix-theme-v2") as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setActive(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  /* Esc 关闭 + body scroll lock */
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    const unlock = lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", h);
      unlock();
    };
  }, [open, onClose]);

  function handleSelect(id: ThemeId) {
    setActive(id);
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem("timix-theme-v2", id);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 sm:p-6"
      onClick={onClose}
    >
      {/* 主容器 — 宽屏 Apple 风格 */}
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
          type="button"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 标题区 */}
        <div className="mb-8 pr-10">
          <h2 className="text-2xl font-heading italic text-[var(--color-ink)]">
            外观与主题 <span className="font-body text-base font-light not-italic text-[var(--color-muted)]">(Appearance)</span>
          </h2>
          <p className="mt-2 text-sm tracking-wide text-[var(--color-muted)] font-body">
            选择符合你当前心流的工作空间氛围。
          </p>
        </div>

        {/* 主题卡片 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((theme) => {
            const isActive = active === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`group relative text-left rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.02] ${
                  isActive
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[0_8px_32px_var(--dt-primary-glow)] ring-2 ring-[var(--color-brand)]"
                    : "border-[var(--color-line)] bg-[var(--color-panel)] hover:bg-[var(--color-soft)]"
                }`}
                type="button"
              >
                {/* 颜色条 — 三色渐变 */}
                <div
                  className="h-2.5 rounded-full mb-4 opacity-90 group-hover:opacity-100 transition-opacity"
                  style={{ background: theme.gradient }}
                />

                {/* 色块预览 */}
                <div className="flex gap-1 mb-4">
                  {theme.colors.map((c) => (
                    <span
                      key={c}
                      className="h-1.5 flex-1 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* 选中标记 */}
                {isActive ? (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand-soft)] ring-1 ring-[var(--color-brand)]">
                    <Check className="h-3.5 w-3.5 text-[var(--color-brand-deep)]" />
                  </span>
                ) : (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-[10px] text-[var(--color-muted)]">✓</span>
                  </span>
                )}

                {/* 标题 */}
                <h3 className="text-base font-heading italic text-[var(--color-ink)]">
                  {theme.name}
                </h3>
                <p className="mt-0.5 text-[11px] tracking-wide text-[var(--color-muted)] font-body">
                  {theme.enName}
                </p>

                {/* 描述 */}
                <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)] font-body">
                  {theme.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* 底部提示 */}
        <p className="mt-6 text-center text-[10px] tracking-wide text-[var(--color-muted)] font-body">
          主题偏好自动保存 · 随时切换 · 即时生效
        </p>
      </div>
    </div>
  );
}

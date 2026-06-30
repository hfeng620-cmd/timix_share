"use client";

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
    name: "极简白 & 3D 几何",
    enName: "Apple Light",
    desc: "通透、克制、空间折射 — 极简白底搭配悬浮玻璃几何背景。",
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", h);
      document.body.style.overflow = "";
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
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950/90 p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-colors"
          type="button"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 标题区 */}
        <div className="mb-8 pr-10">
          <h2 className="text-2xl font-heading italic text-text-main">
            外观与主题 <span className="text-text-sub font-body text-base not-italic font-light">(Appearance)</span>
          </h2>
          <p className="mt-2 text-sm text-text-sub font-body tracking-wide">
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
                    ? "ring-2 ring-primary border-primary/30 bg-bg-card shadow-[0_8px_32px_var(--dt-primary-glow)]"
                    : "border-white/10 bg-white/[0.03]"
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
                  <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/30">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </span>
                ) : (
                  <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white/20">✓</span>
                  </span>
                )}

                {/* 标题 */}
                <h3 className="text-base font-heading italic text-text-main">
                  {theme.name}
                </h3>
                <p className="text-[11px] text-text-sub font-body mt-0.5 tracking-wide">
                  {theme.enName}
                </p>

                {/* 描述 */}
                <p className="text-xs text-text-sub/70 font-body mt-3 leading-relaxed">
                  {theme.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* 底部提示 */}
        <p className="mt-6 text-center text-[10px] text-white/12 font-body tracking-wide">
          主题偏好自动保存 · 随时切换 · 即时生效
        </p>
      </div>
    </div>
  );
}

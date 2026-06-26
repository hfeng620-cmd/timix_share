"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggleInline } from "@/components/theme-toggle";
import { siteLinks } from "@/lib/site-links";

const HINT_DISMISSED_KEY = "relay-theme-hint-seen";

const primaryRoutes = [
  {
    label: "榜单",
    href: "/stations",
    title: "先锁定候选站点",
    description: "先从榜单圈定候选。",
  },
  {
    label: "模型",
    href: "/models",
    title: "再把站点和模型放一起比",
    description: "把能力、稳定性和场景放到一起看。",
  },
  {
    label: "指南",
    href: "/guides",
    title: "有疑问时回指南校准",
    description: "有分歧时先回这里统一口径。",
  },
  {
    label: "社区",
    href: "/community",
    title: "把结论带回社区",
    description: "把体验和提醒沉淀回讨论区。",
  },
] as const;

const utilityRoutes = [
  {
    label: "首页",
    href: "/",
    description: "回到总览入口",
  },
  {
    label: "我的",
    href: "/profile",
    description: "查看个人记录与收藏",
  },
] as const;

function isRouteActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function getCurrentPageLabel(pathname: string) {
  if (pathname === "/") return "首页";
  if (pathname.startsWith("/stations")) return "榜单";
  if (pathname.startsWith("/models")) return "模型";
  if (pathname.startsWith("/guides")) return "指南";
  if (pathname.startsWith("/community")) return "社区";
  if (pathname.startsWith("/profile")) return "个人主页";
  if (pathname.startsWith("/admin")) return "管理员面板";
  return "站内页面";
}

export function FloatingQuickPanel() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const activePrimaryIndex = primaryRoutes.findIndex((item) =>
    isRouteActive(pathname, item.href),
  );
  const nextPrimaryRoute =
    activePrimaryIndex >= 0 ? primaryRoutes[activePrimaryIndex + 1] : primaryRoutes[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(HINT_DISMISSED_KEY)) return;
    setShowHint(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function dismissHint() {
    setShowHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HINT_DISMISSED_KEY, "1");
    }
  }

  return (
    <div className="fixed bottom-20 left-4 z-[70] lg:bottom-4" data-selection-comments="off" ref={wrapperRef}>
      {open ? (
        <div className="surface-in mb-3 w-[328px] overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="border-b border-[var(--color-line)] pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--color-ink)]">观察站导航台</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                  推荐路径、协作入口和外观中心都收在这里。
                </p>
              </div>
              <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-deep)]">
                UI
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_76%,white)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  主路径
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">4 步完成</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_76%,white)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  协作
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">3 个入口</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_76%,white)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  外观
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">主题 + 配色</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="rounded-[18px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-brand-soft)_54%,white)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                    外观速调
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                    先选整套气质，再细调主题和配色。
                  </p>
                </div>
                <span className="rounded-full border border-[var(--color-line)] bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-deep)]">
                  New
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-[14px] border border-[var(--color-line)] bg-white/70 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    主题
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">管背景氛围</p>
                </div>
                <div className="rounded-[14px] border border-[var(--color-line)] bg-white/70 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    配色
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">管主色强调</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              外观中心
            </p>
            <ThemeToggleInline />
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              推荐路径
            </p>
            <div className="mt-2 rounded-[16px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_78%,white)] px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    当前定位
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                    {getCurrentPageLabel(pathname)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    下一步
                  </p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-brand-deep)]">
                    {nextPrimaryRoute?.label ?? "已到终点"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2 grid gap-2">
              {primaryRoutes.map((item, index) => {
                const active = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-[16px] border px-3 py-3 transition-all duration-300 ${
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] shadow-[0_10px_26px_rgba(37,99,235,0.12)]"
                        : "border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-ink)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                    }`}
                    href={item.href}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          {String(index + 1).padStart(2, "0")} · {item.label}
                        </p>
                        <p className="mt-1 text-sm font-bold">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                          {item.description}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                        {active ? "当前" : "进入"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              辅助入口
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {utilityRoutes.map((item) => {
                const active = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-[14px] border px-3 py-3 text-left transition-all duration-300 ${
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]"
                        : "border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-ink)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                    }`}
                    href={item.href}
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              协作入口
            </p>
            <div className="mt-2 grid gap-2">
              <a
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href={siteLinks.pages}
                rel="noopener noreferrer"
                target="_blank"
              >
                打开线上站点
              </a>
              <a
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href={siteLinks.discussions}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub Discussions
              </a>
              <a
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href={siteLinks.repo}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub 仓库
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <button
        aria-label="打开导航与外观面板"
        className={`relative flex h-11 min-w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-bold text-[var(--color-brand-deep)] shadow-[0_12px_34px_rgba(15,23,42,0.14)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] ${showHint ? "theme-hint-pulse" : ""}`}
        onClick={() => {
          setOpen((current) => !current);
          dismissHint();
        }}
        type="button"
      >
        <span className="mr-1.5 text-base leading-none" aria-hidden="true">✦</span>
        导航 / 外观
      </button>
    </div>
  );
}

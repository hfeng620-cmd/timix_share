"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppearanceModal } from "@/components/appearance-modal";
import { VersionSwitcherModal } from "@/components/version-switcher";
import { useForumAuth } from "@/lib/forum-auth";
import { siteLinks } from "@/lib/site-links";
import { useSystemMonitor } from "@/lib/system-monitor-context";

const HINT_DISMISSED_KEY = "relay-theme-hint-seen";

const navigationRoutes = [
  {
    label: "榜单",
    href: "/stations",
  },
  {
    label: "模型",
    href: "/models",
  },
  {
    label: "指南",
    href: "/guides",
  },
  {
    label: "社区",
    href: "/community",
  },
] as const;

const utilityRoutes = [
  {
    label: "首页",
    href: "/",
  },
  {
    label: "我的",
    href: "/profile",
  },
] as const;

function isRouteActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}


export function FloatingQuickPanel() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [vsOpen, setVsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { isAdmin, isOwner } = useForumAuth();
  const { openMonitor } = useSystemMonitor();
  const canOpenAdmin = isAdmin || isOwner;

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
    <>
    <div className="fixed bottom-20 left-3 z-[70] max-w-[calc(100vw-1.5rem)] sm:left-4 lg:bottom-4 hidden lg:block" data-selection-comments="off" ref={wrapperRef}>
      {open ? (
        <div
          aria-label="导航与快捷操作"
          className="surface-in mb-2.5 w-[calc(100vw-1.5rem)] max-w-[272px] overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-3 shadow-[0_18px_54px_rgba(15,23,42,0.12)] backdrop-blur"
          id="quick-panel-menu"
          role="navigation"
        >
          <div className="border-b border-[var(--color-line)] pb-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-[var(--color-ink)]">快捷启动</p>
              <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-deep)]">
                Timix
              </span>
            </div>
            <div className="mt-2">
              <button
                className="group flex w-full items-center justify-between gap-3 rounded-[16px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2.5 text-left transition active:[border-color:var(--color-brand)] active:[background-color:var(--color-brand-soft)] active:scale-[0.98] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)]"
                onClick={() => { setAppearanceOpen(true); setOpen(false); }}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-[var(--color-ink)] group-active:[color:var(--color-brand-deep)] md:group-hover:[color:var(--color-brand-deep)]">
                    外观
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-[var(--color-muted)]">
                    主题背景板与配色色彩系统
                  </span>
                </span>
                <span className="rounded-full bg-[var(--color-panel)] px-2 py-1 text-[10px] font-bold text-[var(--color-brand-deep)]">
                  打开
                </span>
              </button>

              <button
                className="group mt-2 flex w-full items-center justify-between gap-3 rounded-[16px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2.5 text-left transition active:[border-color:var(--color-brand)] active:[background-color:var(--color-brand-soft)] active:scale-[0.98] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)]"
                onClick={() => { setVsOpen(true); setOpen(false); }}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-[var(--color-ink)] group-active:[color:var(--color-brand-deep)] md:group-hover:[color:var(--color-brand-deep)]">切换UI</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-[var(--color-muted)]">新UI / Legacy 经典版</span>
                </span>
                <span className="rounded-full bg-[var(--color-panel)] px-2 py-1 text-[10px] font-bold text-[var(--color-brand-deep)]">切换</span>
              </button>

              <button
                className="group mt-2 flex w-full items-center justify-between gap-3 rounded-[16px] border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-left transition active:border-emerald-300/40 active:bg-emerald-400/15 active:scale-[0.98] md:hover:border-emerald-300/40 md:hover:bg-emerald-400/15"
                onClick={() => { openMonitor(); setOpen(false); }}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/20 bg-[#09090b]/10 text-emerald-200">
                    <Activity className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-[var(--color-ink)] group-active:text-emerald-100 md:group-hover:text-emerald-100">
                      系统状态监控
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-[var(--color-muted)]">
                      VPS / Supabase 运行容量
                    </span>
                  </span>
                </span>
                <span className="rounded-full bg-[#09090b]/10 px-2 py-1 font-mono text-[10px] font-bold text-emerald-200">
                  LIVE
                </span>
              </button>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              主导航
            </p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {navigationRoutes.map((item) => {
                const active = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-[14px] border px-2 py-2 text-center text-sm font-bold transition-all duration-300 ${
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] shadow-[0_8px_20px_rgba(37,99,235,0.1)]"
                        : "border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-ink)] active:[border-color:var(--color-brand)] active:[background-color:var(--color-brand-soft)] active:[color:var(--color-brand-deep)] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)] md:hover:[color:var(--color-brand-deep)]"
                    }`}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                辅助入口
              </p>
              <div className="mt-2 grid gap-1.5">
                {utilityRoutes.map((item) => {
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`rounded-[14px] border px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                        active
                          ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]"
                          : "border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-ink)] active:[border-color:var(--color-brand)] active:[background-color:var(--color-brand-soft)] active:[color:var(--color-brand-deep)] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)] md:hover:[color:var(--color-brand-deep)]"
                      }`}
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {canOpenAdmin ? (
                  <Link
                    aria-current={isRouteActive(pathname, "/admin") ? "page" : undefined}
                    className={`rounded-[14px] border px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                      isRouteActive(pathname, "/admin")
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]"
                        : "border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-ink)] active:[border-color:var(--color-brand)] active:[background-color:var(--color-brand-soft)] active:[color:var(--color-brand-deep)] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)] md:hover:[color:var(--color-brand-deep)]"
                    }`}
                    href="/admin"
                  >
                    管理面板
                  </Link>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                协作入口
              </p>
              <div className="mt-2 grid gap-1.5">
                <a
                  className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 active:[border-color:var(--color-brand)] active:[background-color:var(--color-brand-soft)] active:[color:var(--color-brand-deep)] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)] md:hover:[color:var(--color-brand-deep)]"
                  href={siteLinks.discussions}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  讨论
                </a>
                <a
                  className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 active:[border-color:var(--color-brand)] active:[background-color:var(--color-brand-soft)] active:[color:var(--color-brand-deep)] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)] md:hover:[color:var(--color-brand-deep)]"
                  href={siteLinks.repo}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  仓库
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        aria-label="打开快捷菜单"
        aria-controls="quick-panel-menu"
        aria-expanded={open}
        className={`relative flex h-11 min-w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-bold text-[var(--color-brand-deep)] shadow-[0_12px_34px_rgba(15,23,42,0.14)] transition active:[border-color:var(--color-brand)] active:[background-color:var(--color-brand-soft)] active:scale-[0.98] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)] ${showHint ? "theme-hint-pulse" : ""}`}
        onClick={() => {
          setOpen((current) => !current);
          dismissHint();
        }}
        type="button"
      >
        <span className="mr-1.5 text-base leading-none" aria-hidden="true">✦</span>
        快捷菜单
      </button>
    </div>
    <AppearanceModal open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    <VersionSwitcherModal open={vsOpen} onClose={() => setVsOpen(false)} />
    </>
  );
}


"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, Share2, BarChart3, MessageSquareText, User } from "lucide-react";

const navItems = [
  { label: "分享", href: "/", icon: Share2 },
  { label: "榜单", href: "/stations", icon: BarChart3 },
  { label: "社区", href: "/community", icon: MessageSquareText },
  { label: "福利", href: "/drops", icon: Gift },
  { label: "我的", href: "/profile", icon: User },
] as const;

import { haptic } from "@/lib/haptic";

export function MobileDock() {
  const pathname = usePathname();

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/guides") : pathname.startsWith(href)),
    [pathname],
  );

  return (
    <>
      <nav aria-label="站内主导航" className="fixed inset-x-0 bottom-0 z-40 overflow-x-hidden lg:hidden">
        {/* Top hairline border */}
        <div
          className="relative mx-auto grid grid-cols-5"
          style={{
            background: "var(--mobile-dock-bg, rgba(18,18,22,0.88))",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            borderTop: "0.5px solid var(--mobile-app-line, rgba(255,255,255,0.08))",
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={`${item.label}${active ? "，当前页面" : ""}`}
                className="touch-press relative flex min-h-[58px] flex-col items-center justify-center py-2 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                href={item.href}
                onClick={() => haptic("light")}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <motion.div
                  className="relative flex flex-col items-center gap-0.5"
                  animate={{
                    scale: active ? 1.05 : 1,
                    y: active ? -1 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={active ? 2.2 : 1.5}
                    style={{
                      color: active ? "var(--mobile-app-primary, var(--dt-primary))" : "var(--mobile-nav-muted, rgba(255,255,255,0.4))",
                      filter: active ? "drop-shadow(0 0 6px color-mix(in srgb, var(--mobile-app-primary, var(--dt-primary)) 48%, transparent))" : "none",
                      transition: "color 0.2s, filter 0.2s",
                    }}
                  />
                  <span
                    className="text-[10px] font-medium leading-none"
                    style={{
                      color: active ? "var(--mobile-app-primary, var(--dt-primary))" : "var(--mobile-nav-muted, rgba(255,255,255,0.4))",
                      transition: "color 0.2s",
                    }}
                  >
                    {item.label}
                  </span>
                </motion.div>

                {/* Active bottom dot */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      className="absolute bottom-1 h-[3px] w-[3px] rounded-full"
                      style={{ background: "var(--mobile-app-primary, var(--dt-primary))" }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    />
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

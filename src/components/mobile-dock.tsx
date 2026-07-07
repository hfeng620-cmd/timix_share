"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Home, BarChart3, MessageSquareText, Layers, User, Settings } from "lucide-react";

import { AppearanceModal } from "@/components/appearance-modal";
import { VersionSwitcherModal } from "@/components/version-switcher";

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "榜单", href: "/stations", icon: BarChart3 },
  { label: "社区", href: "/community", icon: MessageSquareText },
  { label: "模型", href: "/models", icon: Layers },
  { label: "我的", href: "/profile", icon: User },
] as const;

import { haptic } from "@/lib/haptic";

export function MobileDock() {
  const pathname = usePathname();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [vsOpen, setVsOpen] = useState(false);

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname],
  );

  return (
    <>
      <nav
        aria-label="站内主导航"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Top hairline border */}
        <div
          className="relative mx-auto flex items-center justify-around"
          style={{
            background: "rgba(18,18,22,0.88)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            borderTop: "0.5px solid rgba(255,255,255,0.08)",
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
                className="relative flex flex-1 flex-col items-center justify-center py-1.5"
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
                      color: active ? "var(--dt-primary)" : "rgba(255,255,255,0.4)",
                      filter: active ? "drop-shadow(0 0 6px var(--dt-primary-glow))" : "none",
                      transition: "color 0.2s, filter 0.2s",
                    }}
                  />
                  <span
                    className="text-[10px] font-medium leading-none"
                    style={{
                      color: active ? "var(--dt-primary)" : "rgba(255,255,255,0.4)",
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
                      className="absolute bottom-0.5 h-[3px] w-[3px] rounded-full"
                      style={{ background: "var(--dt-primary)" }}
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

          {/* Settings gear - smaller, not a full tab */}
          <button
            aria-label="外观设置"
            className="relative flex flex-col items-center justify-center px-3 py-1.5"
            onClick={() => { haptic("light"); setAppearanceOpen(true); }}
            style={{ WebkitTapHighlightColor: "transparent" }}
            type="button"
          >
            <Settings
              className="h-[18px] w-[18px]"
              strokeWidth={1.4}
              style={{ color: "rgba(255,255,255,0.28)" }}
            />
          </button>
        </div>
      </nav>

      <AppearanceModal open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
      <VersionSwitcherModal open={vsOpen} onClose={() => setVsOpen(false)} />
    </>
  );
}

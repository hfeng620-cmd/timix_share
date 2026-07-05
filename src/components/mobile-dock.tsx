"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, BarChart3, MessageSquareText, Layers, User, Settings } from "lucide-react";

import { AppearanceModal } from "@/components/appearance-modal";
import { VersionSwitcherModal } from "@/components/version-switcher";

const navItems = [
  { label: "\u9996\u9875", href: "/", icon: Home },
  { label: "\u699c\u5355", href: "/stations", icon: BarChart3 },
  { label: "\u793e\u533a", href: "/community", icon: MessageSquareText },
  { label: "\u6a21\u578b", href: "/models", icon: Layers },
  { label: "\u6211\u7684", href: "/profile", icon: User },
] as const;

export function MobileDock() {
  const pathname = usePathname();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [vsOpen, setVsOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="\u7ad9\u5185\u4e3b\u5bfc\u822a"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        data-selection-comments="off"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div
          className="relative mx-auto grid grid-cols-6"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={`${item.label}${active ? "\uff0c\u5f53\u524d\u9875\u9762" : ""}`}
                className="touch-press relative flex flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-200"
                href={item.href}
                style={{
                  color: active ? "var(--dt-primary)" : "rgba(255,255,255,0.4)",
                }}
              >
                <Icon
                  className="h-[22px] w-[22px] transition-transform duration-200"
                  strokeWidth={active ? 2.2 : 1.5}
                  style={{
                    transform: active ? "scale(1.08)" : "scale(1)",
                    filter: active ? "drop-shadow(0 0 4px var(--dt-primary-glow))" : "none",
                  }}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{
                    color: active ? "var(--dt-primary)" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {item.label}
                </span>
                {active && (
                  <span
                    className="absolute top-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full"
                    style={{
                      background: "var(--dt-primary)",
                      boxShadow: "0 0 6px var(--dt-primary-glow)",
                    }}
                  />
                )}
              </Link>
            );
          })}

          {/* Settings gear - opens theme/appearance modal */}
          <button
            aria-label="\u5916\u89c2\u8bbe\u7f6e"
            className="touch-press flex flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-200"
            onClick={() => setAppearanceOpen(true)}
            style={{ color: "rgba(255,255,255,0.35)" }}
            type="button"
          >
            <Settings className="h-[22px] w-[22px]" strokeWidth={1.5} />
            <span className="text-[10px] font-medium leading-none">\u8bbe\u7f6e</span>
          </button>
        </div>
      </nav>

      <AppearanceModal open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
      <VersionSwitcherModal open={vsOpen} onClose={() => setVsOpen(false)} />
    </>
  );
}

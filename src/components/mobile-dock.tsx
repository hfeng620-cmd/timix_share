"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, MessageSquareText, Layers, User } from "lucide-react";

import { NotificationBell } from "@/components/notification-bell";

const navItems = [
  { label: "\u9996\u9875", href: "/", icon: Home },
  { label: "\u699c\u5355", href: "/stations", icon: BarChart3 },
  { label: "\u793e\u533a", href: "/community", icon: MessageSquareText },
  { label: "\u6a21\u578b", href: "/models", icon: Layers },
  { label: "\u6211\u7684", href: "/profile", icon: User },
] as const;

export function MobileDock() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="\u7ad9\u5185\u4e3b\u5bfc\u822a"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        data-selection-comments="off"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          className="mx-auto grid grid-cols-5"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
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
                className="touch-press relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors duration-200"
                href={item.href}
                style={{
                  color: active
                    ? "var(--dt-primary)"
                    : "rgba(255,255,255,0.45)",
                }}
              >
                <Icon
                  className="h-5 w-5 transition-transform duration-200"
                  strokeWidth={active ? 2.5 : 1.5}
                  style={{
                    transform: active ? "scale(1.1)" : "scale(1)",
                    filter: active
                      ? "drop-shadow(0 0 6px var(--dt-primary-glow))"
                      : "none",
                  }}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{
                    color: active
                      ? "var(--dt-primary)"
                      : "rgba(255,255,255,0.45)",
                  }}
                >
                  {item.label}
                </span>
                {active && (
                  <span
                    className="absolute top-0 h-0.5 w-8 rounded-full"
                    style={{
                      background: "var(--dt-primary)",
                      boxShadow: "0 0 8px var(--dt-primary-glow)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile notification bell - top right */}
      <div
        className="fixed right-3 z-[90] lg:hidden"
        style={{ top: "calc(var(--safe-top, 0px) + 8px)" }}
        data-selection-comments="off"
      >
        <NotificationBell />
      </div>
    </>
  );
}

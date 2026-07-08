"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Home, ListChecks, MessageSquare, UserRound } from "lucide-react";

const tabs = [
  { label: "首页", href: "/", icon: Home },
  { label: "榜单", href: "/stations", icon: ListChecks },
  { label: "社区", href: "/community", icon: MessageSquare },
  { label: "我的", href: "/profile", icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[90] border-t border-[var(--color-line)] bg-[var(--color-header)] px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 shadow-[0_-12px_36px_rgba(15,23,42,0.16)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-bold transition active:scale-[0.98] ${
                active
                  ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                  : "text-[var(--color-muted)] active:bg-[var(--color-soft)]"
              }`}
              href={tab.href}
            >
              <Icon className="mb-0.5 h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
        <a
          className="flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-bold text-emerald-300 transition active:scale-[0.98] active:bg-emerald-400/10"
          download
          href="/release/TiMix-debug-latest.apk"
        >
          <Download className="mb-0.5 h-4 w-4" />
          App
        </a>
      </div>
    </nav>
  );
}
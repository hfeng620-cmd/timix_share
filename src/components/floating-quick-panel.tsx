"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ThemeToggleInline } from "@/components/theme-toggle";
import { siteLinks } from "@/lib/site-links";

const HINT_DISMISSED_KEY = "relay-theme-hint-seen";

export function FloatingQuickPanel() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHint(true);
  }, []);

  function dismissHint() {
    setShowHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HINT_DISMISSED_KEY, "1");
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60]" data-selection-comments="off" ref={wrapperRef}>
      {open ? (
        <div className="surface-in mb-3 w-[272px] overflow-hidden rounded-[20px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="border-b border-[var(--color-line)] pb-3">
            <p className="text-sm font-bold text-[var(--color-ink)]">站点快捷入口</p>
          </div>
          <div className="mt-4 grid gap-2">
            <a className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]" href={siteLinks.pages} rel="noreferrer" target="_blank">打开线上站点</a>
            <a className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]" href={siteLinks.discussions} rel="noreferrer" target="_blank">打开 GitHub Discussions</a>
            <a className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]" href={siteLinks.repo} rel="noreferrer" target="_blank">打开 GitHub 仓库</a>
            <Link className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]" href="/community">打开站内讨论区</Link>
          </div>
        </div>
      ) : null}

      {/* Always-visible theme switcher */}
      <div className="flex items-center gap-2 rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-2 shadow-[0_12px_34px_rgba(15,23,42,0.10)] backdrop-blur">
        <ThemeToggleInline />
        <button
          aria-label="快捷入口"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] text-sm transition hover:bg-[var(--color-brand-soft)]"
          onClick={() => { setOpen((current) => !current); dismissHint(); }}
          type="button"
        >
          {open ? "✕" : "+"}
        </button>
      </div>
    </div>
  );
}

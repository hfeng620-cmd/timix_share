"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function hasDialog() {
  return Boolean(document.querySelector('[aria-modal="true"], [role="dialog"]'));
}

function clearStaleScrollLock() {
  const { documentElement, body } = document;
  if (!documentElement.dataset.scrollLocked || hasDialog()) return;

  const top = body.style.top;
  const lockedY = top.startsWith("-") ? Math.max(0, Number.parseInt(top.slice(1), 10) || 0) : 0;

  delete documentElement.dataset.scrollLocked;
  documentElement.style.overflow = "";
  body.style.overflow = "";
  body.style.position = "";
  body.style.top = "";
  body.style.width = "";

  if (lockedY > 0) {
    window.scrollTo(0, lockedY);
  }
}

export function ScrollLockJanitor() {
  const pathname = usePathname();

  useEffect(() => {
    clearStaleScrollLock();
    const frame = window.requestAnimationFrame(clearStaleScrollLock);
    const timer = window.setTimeout(clearStaleScrollLock, 350);
    const interval = window.setInterval(clearStaleScrollLock, 1200);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [pathname]);

  return null;
}

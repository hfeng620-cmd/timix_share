"use client";

let lockCount = 0;
let previousBodyOverflow = "";
let previousBodyPosition = "";
let previousBodyTop = "";
let previousBodyWidth = "";
let previousHtmlOverflow = "";
let lockedScrollY = 0;
let staleLockTimer: number | null = null;

function hasActiveDialog() {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[aria-modal="true"], [role="dialog"]'));
}

function restoreBodyScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const { documentElement, body } = document;
  delete documentElement.dataset.scrollLocked;
  documentElement.style.overflow = previousHtmlOverflow;
  body.style.overflow = previousBodyOverflow;
  body.style.position = previousBodyPosition;
  body.style.top = previousBodyTop;
  body.style.width = previousBodyWidth;
  window.scrollTo(0, lockedScrollY);

  previousHtmlOverflow = "";
  previousBodyOverflow = "";
  previousBodyPosition = "";
  previousBodyTop = "";
  previousBodyWidth = "";
  lockedScrollY = 0;
}

function scheduleStaleLockCleanup() {
  if (typeof window === "undefined") return;
  if (staleLockTimer !== null) {
    window.clearTimeout(staleLockTimer);
  }

  staleLockTimer = window.setTimeout(() => {
    staleLockTimer = null;
    if (lockCount > 0 && !hasActiveDialog()) {
      lockCount = 0;
      restoreBodyScroll();
    }
  }, 250);
}

export function lockBodyScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  if (lockCount === 0) {
    const { documentElement, body } = document;
    lockedScrollY = window.scrollY;
    previousHtmlOverflow = documentElement.style.overflow;
    previousBodyOverflow = body.style.overflow;
    previousBodyPosition = body.style.position;
    previousBodyTop = body.style.top;
    previousBodyWidth = body.style.width;

    documentElement.dataset.scrollLocked = "true";
    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY}px`;
    body.style.width = "100%";
  }

  lockCount += 1;
  scheduleStaleLockCleanup();
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(lockCount - 1, 0);

    if (lockCount === 0) {
      restoreBodyScroll();
    } else {
      scheduleStaleLockCleanup();
    }
  };
}

"use client";

let lockCount = 0;

function getScrollbarWidth() {
  if (typeof window === "undefined") return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function applyBodyLock() {
  const scrollbarWidth = getScrollbarWidth();
  document.body.style.setProperty("--scrollbar-compensation", `${scrollbarWidth}px`);
  document.body.classList.add("modal-open-lock");
}

function releaseBodyLock() {
  document.body.classList.remove("modal-open-lock");
  document.body.style.removeProperty("--scrollbar-compensation");
}

export function lockBodyScroll() {
  if (typeof document === "undefined") {
    return () => {};
  }

  if (lockCount === 0) {
    applyBodyLock();
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(lockCount - 1, 0);

    if (lockCount === 0) {
      releaseBodyLock();
    }
  };
}
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [mounted, setMounted] = useState(false);
  const installedHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    function beforeInstallHandler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    }

    function onInstalled() {
      setInstalled(true);
      setCanInstall(false);
    }
    installedHandlerRef.current = onInstalled;

    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS() && !isStandalone()) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
      if (installedHandlerRef.current) {
        window.removeEventListener("appinstalled", installedHandlerRef.current);
      }
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS()) {
      setShowIosGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (installed || !canInstall) return null;

  const icon = isIOS() ? (
    <Smartphone className="h-4 w-4" />
  ) : (
    <Download className="h-4 w-4" />
  );

  const iosGuide = mounted && showIosGuide
    ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full rounded-t-[20px] px-6 py-6"
            style={{
              background: "rgba(30,30,35,0.95)",
              backdropFilter: "blur(24px)",
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">添加到主屏幕</h3>
              <button
                className="rounded-full p-1 text-white/50 transition hover:text-white"
                onClick={() => setShowIosGuide(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-white/70">
              <p className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">1</span>
                点击 Safari 底部的{" "}
                <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  分享
                </span>{" "}
                按钮
              </p>
              <p className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">2</span>
                向下滚动，点击{" "}
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">“添加到主屏幕”</span>
              </p>
              <p className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">3</span>
                点击右上角{" "}
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">“添加”</span>{" "}
                即可
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        aria-label={isIOS() ? "添加到主屏幕" : "安装App"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)] transition hover:border-[var(--dt-primary)]/40 hover:bg-[var(--dt-primary)]/10 hover:text-[var(--dt-primary)]"
        onClick={handleInstall}
        title={isIOS() ? "添加到主屏幕" : "安装App"}
        type="button"
      >
        {icon}
      </button>
      {iosGuide}
    </>
  );
}

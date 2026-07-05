"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const installedHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // Chromium: beforeinstallprompt
    function beforeInstallHandler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    }

    // Listen for appinstalled
    function onInstalled() {
      setInstalled(true);
      setCanInstall(false);
    }
    installedHandlerRef.current = onInstalled;

    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    window.addEventListener("appinstalled", onInstalled);

    // iOS: show guide button instead
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
    // iOS: show guide instead of direct install
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

  if (installed) return null;

  return (
    <>
      {canInstall && (
        <button
          className="touch-press flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--dt-primary)",
          }}
          onClick={handleInstall}
          type="button"
        >
          {isIOS() ? (
            <Smartphone className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isIOS() ? "\u6dfb\u52a0\u5230\u4e3b\u5c4f\u5e55" : "\u5b89\u88c5App"}
        </button>
      )}

      {/* iOS guide overlay */}
      {showIosGuide && (
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
              <h3 className="text-base font-bold text-white">\u6dfb\u52a0\u5230\u4e3b\u5c4f\u5e55</h3>
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
                \u70b9\u51fb Safari \u5e95\u90e8\u7684 <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  \u5206\u4eab
                </span> \u6309\u94ae
              </p>
              <p className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">2</span>
                \u5411\u4e0b\u6eda\u52a8\uff0c\u70b9\u51fb <span className="rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">"\u6dfb\u52a0\u5230\u4e3b\u5c4f\u5e55"</span>
              </p>
              <p className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">3</span>
                \u70b9\u51fb\u53f3\u4e0a\u89d2 <span className="rounded bg-white/10 px-1.5 py-0.5 text-white font-medium">"\u6dfb\u52a0"</span> \u5373\u53ef
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

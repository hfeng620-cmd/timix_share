"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Plus, Share2, Smartphone, X } from "lucide-react";

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
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-[#09090b]/60 backdrop-blur-sm">
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
                className="rounded-full p-1 text-white/50 transition active:scale-95 active:bg-white/10 hover:text-white"
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition active:scale-95 active:bg-white/10 hover:border-white/20 hover:bg-white/[0.08] hover:text-zinc-100"
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

export function PwaInstallCallout() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
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
    }

    function onInstalled() {
      setInstalled(true);
    }
    installedHandlerRef.current = onInstalled;

    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
      if (installedHandlerRef.current) {
        window.removeEventListener("appinstalled", installedHandlerRef.current);
      }
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }

    setShowGuide(true);
  }, [deferredPrompt]);

  if (!mounted || installed) return null;

  const platformIsIOS = isIOS();
  const guide = showGuide
    ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-[#09090b]/65 backdrop-blur-md">
          <div
            className="w-full rounded-t-[28px] border border-white/10 border-b-0 bg-zinc-950 px-5 py-5 shadow-[0_-24px_80px_rgba(0,0,0,0.45)]"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 22px)" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-bold text-white">安装 Timix 到手机桌面</p>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  {platformIsIOS
                    ? "iPhone 需要从 Safari 分享菜单添加。"
                    : "如果没有弹出安装窗口，请用浏览器菜单添加到主屏幕。"}
                </p>
              </div>
              <button
                aria-label="关闭安装说明"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/55 transition active:scale-95 active:bg-white/10"
                onClick={() => setShowGuide(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {(platformIsIOS
                ? [
                    ["1", "用 Safari 打开本站，不要用微信/QQ 内置浏览器。"],
                    ["2", "点底部分享按钮，然后选择“添加到主屏幕”。"],
                    ["3", "点右上角“添加”，以后就像 App 一样打开。"],
                  ]
                : [
                    ["1", "用 Chrome、Edge 或系统浏览器打开本站。"],
                    ["2", "点浏览器菜单，选择“安装应用”或“添加到主屏幕”。"],
                    ["3", "安装后从桌面图标进入，体验更接近原生 App。"],
                  ]).map(([step, text]) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-black text-zinc-950">
                    {step}
                  </span>
                  <p className="text-sm leading-6 text-white/72">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="rounded-[22px] border border-[var(--mobile-app-line,rgba(255,255,255,0.10))] bg-[var(--mobile-app-panel,rgba(255,255,255,0.06))] p-4 shadow-[var(--mobile-app-shadow,0_18px_60px_rgba(0,0,0,0.28))] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--mobile-app-primary,#f4f4f5),var(--mobile-app-accent,#d4d4d8))] text-[var(--mobile-app-button-ink,#09090b)] shadow-[0_12px_30px_rgba(255,255,255,0.08)]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--mobile-app-ink,#fff)]">下载手机 App 版</p>
            <p className="mt-1 text-xs leading-5 text-[var(--mobile-app-muted,rgba(255,255,255,0.58))]">
              安装到桌面后全屏打开，保留登录状态、通知入口和底部导航。
            </p>
          </div>
        </div>
        <button
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--mobile-app-primary,#f4f4f5),var(--mobile-app-accent,#d4d4d8))] text-sm font-bold text-[var(--mobile-app-button-ink,#09090b)] shadow-[0_14px_34px_rgba(255,255,255,0.08)] active:scale-[0.98] active:opacity-90"
          onClick={handleInstall}
          type="button"
        >
          {deferredPrompt ? <Download className="h-4 w-4" /> : platformIsIOS ? <Share2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {deferredPrompt ? "立即安装" : platformIsIOS ? "查看 iPhone 安装方法" : "查看安装方法"}
        </button>
      </div>
      {guide}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    }

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || !canInstall) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setCanInstall(false);
  }

  return (
    <button
      className="touch-press flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
      style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "var(--dt-primary)",
      }}
      onClick={handleInstall}
      type="button"
    >
      <Download className="h-4 w-4" />
      安装到手机
    </button>
  );
}

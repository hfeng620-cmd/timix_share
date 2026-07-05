"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Megaphone, X } from "lucide-react";

import type { NotificationItem } from "@/lib/notification-storage";
import { lockBodyScroll } from "@/lib/body-scroll-lock";

type Props = {
  notice: NotificationItem | null;
  onClose: () => void;
};

function formatNoticeTime(timestamp: number) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("zh-CN");
}

export function AnnouncementDetailModal({ notice, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unlock = lockBodyScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      unlock();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted || !notice) return null;

  const content = notice.content || notice.message;
  const title = notice.title || "管理员公告";

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#09090b]/80 p-4 backdrop-blur-md transition-all sm:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-zinc-900/50 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2 text-red-400">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-white">{title}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">{formatNoticeTime(notice.createdAt)}</p>
            </div>
          </div>
          <button
            aria-label="关闭公告"
            className="rounded-full bg-zinc-900 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6 text-zinc-300 md:p-8">
          <div className="whitespace-pre-wrap text-sm leading-7">{content}</div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-white/5 bg-zinc-950 p-4">
          <button
            className="rounded-lg bg-zinc-800 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            onClick={onClose}
            type="button"
          >
            我已了解
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

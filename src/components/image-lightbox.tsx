"use client";

import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type ImageLightboxProps = {
  src?: string;
  imageUrl?: string;
  alt?: string;
  onClose: () => void;
};

export function ImageLightbox({ src, imageUrl, alt = "全屏大图", onClose }: ImageLightboxProps) {
  const resolvedSrc = imageUrl ?? src;

  useEffect(() => {
    const unlock = lockBodyScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      unlock();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!resolvedSrc) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex min-h-[100dvh] w-full items-center justify-center overscroll-none bg-[#09090b]/85 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute right-6 top-6 z-[100000] rounded-full px-3 py-2 text-sm font-medium text-white/50 transition hover:bg-white/10 hover:text-white"
        onClick={onClose}
        type="button"
      >
        关闭
      </button>

      <img
        alt={alt}
        className="max-h-[calc(100dvh_-_2rem_-_var(--safe-bottom))] max-w-[calc(100vw-2rem)] rounded-md object-contain shadow-2xl"
        src={resolvedSrc}
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

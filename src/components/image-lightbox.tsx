"use client";

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
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!resolvedSrc) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex h-screen w-screen items-center justify-center overscroll-none bg-black/85 backdrop-blur-md"
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
        className="max-h-[90vh] max-w-[90vw] rounded-md object-contain shadow-2xl"
        src={resolvedSrc}
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

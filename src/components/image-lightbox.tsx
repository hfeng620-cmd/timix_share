"use client";

import { useEffect } from "react";

type ImageLightboxProps = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export function ImageLightbox({ src, alt = "预览图片", onClose }: ImageLightboxProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <img
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-300"
        src={src}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

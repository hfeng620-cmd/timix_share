"use client";

import type { ReactNode } from "react";
import { getSafeImageSrc } from "@/lib/url-safety";

type MarkdownContentProps = {
  text: string;
  highlightAuthor?: string;
  imageClassName?: string;
  imageAlt?: string;
  onImageClick?: (src: string) => void;
};

const TOKEN_PATTERN = /(!\[[^\]]*]\([^)]+\)|@[\w一-鿿]+)/g;

export function MarkdownContent({
  text,
  highlightAuthor,
  imageClassName = "my-3 max-h-96 w-auto max-w-full cursor-zoom-in rounded-lg border border-white/5 object-cover shadow-sm transition-opacity hover:opacity-90",
  imageAlt = "帖子图片",
  onImageClick,
}: MarkdownContentProps) {
  const parts = text.split(TOKEN_PATTERN);

  return (
    <>
      {parts.map((part, index) => renderMarkdownPart(part, index, {
        highlightAuthor,
        imageClassName,
        imageAlt,
        onImageClick,
      }))}
    </>
  );
}

function renderMarkdownPart(
  part: string,
  index: number,
  options: Required<Pick<MarkdownContentProps, "imageClassName" | "imageAlt">> &
    Pick<MarkdownContentProps, "highlightAuthor" | "onImageClick">,
): ReactNode {
  const imageMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imageMatch) {
    const [, alt, rawSrc] = imageMatch;
    const safeSrc = getSafeImageSrc(rawSrc);
    if (!safeSrc) return part;

    return (
      <img
        key={index}
        alt={alt || options.imageAlt}
        className={options.imageClassName}
        loading="lazy"
        referrerPolicy="no-referrer"
        src={safeSrc}
        onClick={(event) => {
          event.stopPropagation();
          options.onImageClick?.(safeSrc);
        }}
      />
    );
  }

  if (/^@[\w一-鿿]+$/.test(part)) {
    const name = part.slice(1);
    const isTarget = options.highlightAuthor && name === options.highlightAuthor;
    return (
      <span
        key={index}
        className={`font-semibold ${isTarget ? "rounded bg-[var(--color-brand-soft)] px-0.5 text-[var(--color-brand-deep)]" : "text-[var(--color-brand)]"}`}
      >
        {part}
      </span>
    );
  }

  return part;
}

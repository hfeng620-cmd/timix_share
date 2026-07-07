"use client";

import type { ReactNode } from "react";

import { HOT_EMOJI_MAP, HOT_EMOJI_SPLIT_PATTERN, HOT_EMOJI_TOKEN_PATTERN } from "@/lib/hot-emojis";
import { getSafeImageSrc } from "@/lib/url-safety";

type MarkdownContentProps = {
  text: string;
  highlightAuthor?: string;
  imageClassName?: string;
  imageAlt?: string;
  onImageClick?: (src: string) => void;
};

export function MarkdownContent({
  text,
  highlightAuthor,
  imageClassName = "my-3 max-h-96 w-auto max-w-full cursor-zoom-in rounded-lg border border-white/5 object-cover shadow-sm transition-opacity hover:opacity-90",
  imageAlt = "帖子图片",
  onImageClick,
}: MarkdownContentProps) {
  const parts = text.split(HOT_EMOJI_SPLIT_PATTERN);

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

  if (HOT_EMOJI_TOKEN_PATTERN.test(part)) {
    const item = HOT_EMOJI_MAP.get(part);
    if (!item) {
      return part;
    }

    const isDoge = item.insertText === "[狗头]";

    return (
      <span
        key={index}
        className={`mx-0.5 inline-flex items-center gap-1.5 align-middle font-medium ${
          isDoge
            ? "rounded-2xl border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[12px] text-amber-50 shadow-[0_6px_18px_rgba(251,191,36,0.12)]"
            : "rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[12px] text-zinc-200"
        }`}
      >
        <span aria-hidden="true" className={`${isDoge ? "text-[14px]" : "text-[13px]"} leading-none`}>
          {item.preview}
        </span>
        <span>{item.label}</span>
      </span>
    );
  }

  return part;
}

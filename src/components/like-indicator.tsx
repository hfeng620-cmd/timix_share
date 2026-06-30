"use client";

import type { Liker } from "@/lib/share-storage";

function formatLikeText(likers: Liker[]): string {
  const n = likers.length;

  if (n === 1) {
    return `${likers[0].displayName} 赞过`;
  }

  if (n === 2) {
    return `${likers[0].displayName}、${likers[1].displayName} 赞过`;
  }

  // n >= 3
  return `${likers[0].displayName}、${likers[1].displayName} 等 ${n} 人赞过`;
}

export function LikeIndicator({ likers }: { likers: Liker[] }) {
  if (!likers || likers.length === 0) return null;

  const text = formatLikeText(likers);

  return (
    <span className="ml-2 inline-flex items-center gap-1 text-xs text-zinc-500 font-body">
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{text}</span>
    </span>
  );
}

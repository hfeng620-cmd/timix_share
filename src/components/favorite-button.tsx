"use client";

import { useCallback, useEffect, useState } from "react";
import { loadFavorites, toggleFavorite } from "@/lib/favorites-storage";
import { useForumAuth } from "@/lib/forum-auth";

export function FavoriteButton({ stationName }: { stationName: string }) {
  const { isConnected } = useForumAuth();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    let cancelled = false;
    loadFavorites().then((favs) => {
      if (!cancelled) setFavorited(favs.includes(stationName));
    });
    return () => { cancelled = true; };
  }, [isConnected, stationName]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (loading) return;
      setLoading(true);
      try {
        const result = await toggleFavorite(stationName);
        setFavorited(result);
      } catch {
        // ignore
      }
      setLoading(false);
    },
    [loading, stationName],
  );

  if (!isConnected) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-11 w-11 items-center justify-center rounded-full transition hover:[background-color:var(--color-soft)]"
      title={favorited ? "取消收藏" : "收藏站点"}
      aria-label={favorited ? "取消收藏" : "收藏站点"}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5 transition-colors"
        fill={favorited ? "var(--color-brand)" : "none"}
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
    </button>
  );
}


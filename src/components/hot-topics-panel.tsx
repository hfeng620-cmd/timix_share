"use client";

import { useCallback, useEffect, useState } from "react";

import { getHotTopics, type HotTopic } from "@/lib/discussion-storage";

type HotTopicsPanelProps = {
  onTopicClick?: (postId: string) => void;
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-xs font-black text-[var(--color-on-brand)] shadow-[0_2px_8px_var(--color-panel-glow)]">
        {rank}
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft)] text-xs font-bold text-[var(--color-muted)]">
      {rank}
    </span>
  );
}

export default function HotTopicsPanel({ onTopicClick }: HotTopicsPanelProps) {
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    try {
      const data = await getHotTopics();
      setTopics(data.slice(0, 8));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTopics();
    const interval = setInterval(() => { loadTopics(); }, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        热门讨论
      </p>

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl bg-[var(--color-soft)]"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          加载失败，请稍后再试
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && topics.length === 0 && (
        <p className="mt-4 text-sm text-[var(--color-muted)]">还没有热门讨论。去讨论区发帖或参与回复，热度高的帖子会出现在这里。</p>
      )}

      {/* Topic list */}
      {!loading && !error && topics.length > 0 && (
        <div className="mt-3">
          {topics.map((topic, i) => {
            const truncatedTitle =
              topic.title.length > 40
                ? topic.title.slice(0, 40) + "..."
                : topic.title;

            return (
              <button
                key={topic.id}
                type="button"
                className="flex w-full items-center gap-3 border-b border-[var(--color-line)] py-2.5 text-left transition hover:bg-[var(--color-hover)] last:border-b-0"
                style={{ minHeight: 48 }}
                onClick={() => onTopicClick?.(topic.id)}
              >
                <RankBadge rank={i + 1} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--color-ink)]">
                    {truncatedTitle}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {topic.author_name}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 text-xs text-[var(--color-muted)]">
                  <span>{formatCount(topic.reply_count)} 回复</span>
                  <span>{formatCount(topic.like_count)} 赞</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

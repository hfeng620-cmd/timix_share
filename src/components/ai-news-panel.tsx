"use client";

import { useCallback, useEffect, useState } from "react";

import { AiNewsSubmit } from "@/components/ai-news-submit";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

interface NewsItem {
  title: string;
  summary: string;
  source: string;
  time: string;
  url?: string;
  source_type?: "user" | "seed";
}

const staticNewsItems: NewsItem[] = [
  {
    title: "百度智能云发布千帆Token Plan企业版，提供GLM-5.2等模型",
    summary: "百度智能云正式推出千帆Token Plan企业版，为企业客户提供GLM-5.2等主流模型的统一API接入和计费方案。",
    source: "量子位",
    time: "6月24日",
  },
  {
    title: "EcoFlow发布新一代智慧能源生态系统OASIS 3.0",
    summary: "正浩创新在慕尼黑发布2026欧洲新品，核心是智慧能源管理系统OASIS 3.0，整合发电、储能、用电全链路。",
    source: "爱范儿",
    time: "6月24日",
  },
  {
    title: "阿里QoderWork推出峰谷Token，夜间使用Qwen3.7低至2折",
    summary: "阿里推出峰谷定价模式，夜间时段使用Qwen3.7等模型可享2折优惠，涵盖QoderWork、Qoder Desktop等产品。",
    source: "量子位",
    time: "6月24日",
  },
  {
    title: "Meta发布自有品牌AI智能眼镜，售价299美元起",
    summary: "Meta发布Adventurer、Fury及Kylie Jenner联名款Starfire三款AI眼镜，内置AI助手功能。",
    source: "爱范儿",
    time: "6月24日",
  },
  {
    title: "1小时真机RL微调成功率破95%，HIL-ResRL即插即用",
    summary: "HIL-ResRL框架实现1小时内真机强化学习微调成功率超95%，为VLA模型部署提供新方案。",
    source: "量子位",
    time: "6月24日",
  },
];

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

function SkeletonBar() {
  return (
    <div className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-[var(--color-line)]" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-[var(--color-line)]" />
        <div className="h-3 w-2/3 rounded bg-[var(--color-line)]" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-3 w-16 rounded bg-[var(--color-line)]" />
        <div className="h-3 w-12 rounded bg-[var(--color-line)]" />
      </div>
    </div>
  );
}

export function AiNewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setNews(staticNewsItems);
          setIsFallback(true);
          setLoading(false);
        }
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error: queryError } = await supabase
          .from("ai_news_public")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (queryError) throw queryError;

        if (!cancelled) {
          const mapped: NewsItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
            title: String(row.title ?? ""),
            summary: String(row.summary ?? ""),
            source: String(row.source ?? ""),
            time: row.created_at ? formatRelativeTime(String(row.created_at)) : "",
            url: row.url ? String(row.url) : undefined,
            source_type: "seed",
          }));

          setNews(mapped);
          setIsFallback(false);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载新闻失败");
          setNews(staticNewsItems);
          setIsFallback(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchNews();

    return () => {
      cancelled = true;
    };
  }, []);

  const openSubmit = useCallback(() => setSubmitOpen(true), []);
  const closeSubmit = useCallback(() => setSubmitOpen(false), []);

  return (
    <>
      <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            AI 新闻
          </p>
          <span className="text-xs text-[var(--color-muted)]">最近值得看的 AI 动态</span>
        </div>

        <div className="mt-3 space-y-3">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => <SkeletonBar key={i} />)}

          {!loading && error && !isFallback && (
            <p className="py-4 text-center text-sm text-[var(--color-muted)]">
              新闻加载失败，已显示缓存数据
            </p>
          )}

          {!loading &&
            !error &&
            news.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--color-muted)]">
                暂无新闻
              </p>
            )}

          {!loading && news.length > 0 &&
            news.map((item, i) => (
              <article
                key={`${item.title}-${i}`}
                className="group rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4 transition-all duration-300 active:[border-color:var(--color-brand)] active:scale-[0.98] active:[background-color:var(--color-brand-soft)] md:hover:[border-color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold leading-6 text-[var(--color-ink)] active:[color:var(--color-brand-deep)] md:group-hover:[color:var(--color-brand-deep)]">
                    {item.title}
                  </h3>
                  {item.source_type === "user" && (
                    <span className="shrink-0 rounded-full border border-[var(--color-brand)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-brand)] opacity-70">
                      社区投稿
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-6 text-[var(--color-muted)] line-clamp-2">
                  {item.summary}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span className="font-semibold">{item.source}</span>
                  <span>·</span>
                  <span>{item.time}</span>
                </div>
              </article>
            ))}
        </div>

        <div className="mt-4 border-t border-[var(--color-line)] pt-3">
          <button
            type="button"
            onClick={openSubmit}
            className="flex w-full items-center justify-center gap-1 rounded-xl bg-[var(--color-soft)] py-2.5 text-xs font-semibold text-[var(--color-muted)] transition-all duration-300 active:[background-color:var(--color-brand-soft)] active:scale-[0.98] active:[color:var(--color-brand)] md:hover:[background-color:var(--color-brand-soft)] md:hover:[color:var(--color-brand)]"
          >
            投稿AI新闻
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>

      <AiNewsSubmit open={submitOpen} onClose={closeSubmit} />
    </>
  );
}


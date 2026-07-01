"use client";

import { Activity, Clock3, Signal, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { DiscussionFeed } from "@/components/discussion-feed";
import {
  loadLatestStationMetrics,
  type MonitorStatus,
  type StationMonitorMetric,
} from "@/lib/station-monitor-storage";
import { type Station } from "@/lib/station-storage";

type RelayStationDetailModalProps = {
  station: Station | null;
  open: boolean;
  onClose: () => void;
};

function statusLabel(status: MonitorStatus | string | undefined, fallback: string) {
  if (status === "normal") return "正常";
  if (status === "degraded") return "波动";
  if (status === "offline") return "异常";
  if (fallback) return fallback;
  return "待检测";
}

function normalizeStatus(status: MonitorStatus | undefined, fallback: string): MonitorStatus {
  if (status) return status;
  if (/正常|可用|在线/.test(fallback)) return "normal";
  if (/维护|限|排队|波动|测试/.test(fallback)) return "degraded";
  if (/关|停|不可|失效|异常/.test(fallback)) return "offline";
  return "unknown";
}

function formatLatency(metric?: StationMonitorMetric, station?: Station | null) {
  if (metric?.latencyMs && metric.latencyMs > 0) {
    if (metric.latencyMs >= 1000) return `${(metric.latencyMs / 1000).toFixed(1)}s`;
    return `${Math.round(metric.latencyMs)}ms`;
  }
  return station?.latency || "--";
}

function formatUptime(metric?: StationMonitorMetric, station?: Station | null) {
  if (metric?.onlineRate !== undefined) return `${metric.onlineRate}%`;
  return station?.uptime || "--";
}

function MetricSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-7 w-24 animate-pulse rounded-full bg-white/15" />
      <div className="mt-3 h-3 w-16 animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  accent = "text-white",
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-zinc-500">
        <span>{label}</span>
        <span className="text-zinc-600">{icon}</span>
      </div>
      <p className={`mt-3 truncate text-xl font-black ${accent}`}>{value}</p>
      <p className="mt-2 line-clamp-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

export function RelayStationDetailModal({ station, open, onClose }: RelayStationDetailModalProps) {
  const [metrics, setMetrics] = useState<StationMonitorMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !station) return;
    let cancelled = false;
    setMetricsLoading(true);

    loadLatestStationMetrics()
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, station]);

  const liveMetric = useMemo(() => {
    if (!station) return undefined;
    return metrics.find((metric) => metric.stationId === station.id) ?? metrics.find((metric) => metric.stationName === station.name);
  }, [metrics, station]);

  if (!open || !station) return null;

  const status = normalizeStatus(liveMetric?.status, station.status);
  const priceValue = liveMetric?.priceLabel || station.price || "--";
  const multiplierValue = liveMetric?.multiplierLabel || station.multiplier || "--";
  const uptimeValue = formatUptime(liveMetric, station);
  const latencyValue = formatLatency(liveMetric, station);
  const statusValue = statusLabel(status, liveMetric?.statusMessage || station.status);
  const tags = [station.badge, liveMetric?.providerLabel, liveMetric?.stationGroup].filter(Boolean);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm overscroll-none p-4 md:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `}
      </style>

      <div
        className="relative w-full max-w-5xl h-[90vh] md:h-[85vh] bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="关闭"
          className="absolute top-4 right-4 z-50 rounded-full bg-zinc-900/50 p-2 text-zinc-400 transition hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <section className="shrink-0 p-6 md:p-8 border-b border-white/10 bg-zinc-900/20">
          <div className="pr-12">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-white">{station.name}</h2>
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-bold text-zinc-300">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
              {station.note || station.verdict || station.entry || "实时指标来自 Supabase 监测快照，评论区保留站内用户反馈。"}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {metricsLoading ? (
              <>
                <MetricSkeleton />
                <MetricSkeleton />
                <MetricSkeleton />
                <MetricSkeleton />
              </>
            ) : (
              <>
                <MetricCard
                  accent="text-emerald-300"
                  hint={multiplierValue}
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="价格趋势"
                  value={priceValue}
                />
                <MetricCard
                  accent="text-emerald-300"
                  hint={liveMetric?.source ? `来源 ${liveMetric.source}` : "最新在线样本"}
                  icon={<Signal className="h-4 w-4" />}
                  label="在线率"
                  value={uptimeValue}
                />
                <MetricCard
                  hint="请求往返延迟"
                  icon={<Clock3 className="h-4 w-4" />}
                  label="延迟"
                  value={latencyValue}
                />
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-between gap-3 text-xs font-medium text-zinc-500">
                    <span>运行状态</span>
                    <Activity className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        status === "normal"
                          ? "animate-pulse bg-emerald-400"
                          : status === "degraded"
                            ? "bg-amber-400"
                            : status === "offline"
                              ? "bg-rose-400"
                              : "bg-zinc-500"
                      }`}
                    />
                    <p className="truncate text-xl font-black text-white">{statusValue}</p>
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs text-zinc-500">{liveMetric?.checkedAt ? "最近检测已同步" : "等待检测快照"}</p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain bg-zinc-950">
          <div className="border-b border-white/5 px-6 py-3 text-sm font-medium tracking-widest text-zinc-400 md:px-8">
            用户评价与反馈
          </div>
          <div className="p-6 md:p-8">
            <DiscussionFeed
              hideHeader
              showSyncButton
              stationFilter={station.name}
              title={`${station.name} 用户评价与反馈`}
            />
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}

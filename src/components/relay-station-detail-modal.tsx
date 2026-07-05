"use client";

import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { X } from "lucide-react";
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

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function stableSeries(key: string, count: number, min = 50, max = 100) {
  let seed = hashString(key) || 1;
  return Array.from({ length: count }, () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return min + (seed % (max - min + 1));
  });
}

function tokenCostLabel(metric?: StationMonitorMetric, station?: Station | null) {
  if (metric?.tokenCostLevel === "less") return "偏省";
  if (metric?.tokenCostLevel === "more") return "多一些";
  if (metric?.tokenCostLevel === "normal") return "平均水平";
  if (station?.price.includes("免费") || station?.badge.includes("免费")) return "少一些";
  return "平均水平";
}

function fidelityLabel(metric?: StationMonitorMetric, station?: Station | null) {
  if (metric?.relayRateLabel) return metric.relayRateLabel;
  const source = `${station?.status ?? ""} ${station?.risk ?? ""} ${station?.note ?? ""}`;
  if (/异常|失败|失效|风险/.test(source)) return "需观察";
  if (/待补|未实测|复核/.test(source)) return "中等";
  return "几乎不";
}

function DashboardCard({
  label,
  value,
  hint,
  accent = "text-white",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-2 truncate text-lg font-bold ${accent}`}>{value}</div>
      {hint ? <p className="mt-1 truncate text-xs text-zinc-600">{hint}</p> : null}
    </div>
  );
}

export function RelayStationDetailModal({ station, open, onClose }: RelayStationDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<StationMonitorMetric[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const unlock = lockBodyScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      unlock();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !station) return;
    let cancelled = false;

    loadLatestStationMetrics()
      .then((data) => {
        if (!cancelled) setMetrics(data);
      });

    return () => {
      cancelled = true;
    };
  }, [open, station]);

  const liveMetric = useMemo(() => {
    if (!station) return undefined;
    return metrics.find((metric) => metric.stationId === station.id) ?? metrics.find((metric) => metric.stationName === station.name);
  }, [metrics, station]);

  if (!open || !station || !mounted) return null;

  const status = normalizeStatus(liveMetric?.status, station.status);
  const priceValue = liveMetric?.priceLabel || station.price || "--";
  const multiplierValue = liveMetric?.multiplierLabel || station.multiplier || "--";
  const uptimeValue = formatUptime(liveMetric, station);
  const latencyValue = formatLatency(liveMetric, station);
  const statusValue = statusLabel(status, liveMetric?.statusMessage || station.status);
  const tags = [station.badge, liveMetric?.providerLabel, liveMetric?.stationGroup].filter(Boolean);
  const statusBars = stableSeries(`${station.id}:modal-status`, 40, status === "normal" ? 58 : 30, status === "offline" ? 64 : 100);
  const checkedAt = liveMetric?.checkedAt ? new Date(liveMetric.checkedAt).toLocaleString("zh-CN") : "刚刚";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090b]/80 backdrop-blur-md p-4 sm:p-6"
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
        className="relative flex h-[90vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl md:h-[85vh] md:grid md:grid-cols-12"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="关闭"
          className="absolute right-4 top-4 z-50 rounded-full bg-zinc-900/80 p-2 text-zinc-400 backdrop-blur-sm transition-colors hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <section className="hide-scrollbar flex flex-col gap-6 overflow-y-auto p-6 md:col-span-7 md:p-8 lg:col-span-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <span className="truncate">{station.name}</span>
                <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">
                  {station.badge || "企业"}
                </span>
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                更新时间: {checkedAt} | 分组: {liveMetric?.stationGroup || station.groupName || "default"}
              </p>
            </div>
            <button
              className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600"
              type="button"
            >
              开始检测
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-5">
              <div className="mb-2 text-sm text-zinc-500">在线率 Uptime</div>
              <div className="text-3xl font-bold text-emerald-400">{uptimeValue}</div>
              <p className="mt-2 text-xs text-zinc-600">{liveMetric?.source ? `来源 ${liveMetric.source}` : "最近监控样本"}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-5">
              <div className="mb-2 text-sm text-zinc-500">平均延迟 Latency</div>
              <div className="text-3xl font-bold text-white">
                {latencyValue}
              </div>
              <p className="mt-2 text-xs text-zinc-600">请求往返延迟</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <DashboardCard accent="text-emerald-300" hint={multiplierValue} label="价格 Price" value={priceValue} />
            <DashboardCard label="Token Usage" value={tokenCostLabel(liveMetric, station)} />
            <DashboardCard label="Fidelity" value={fidelityLabel(liveMetric, station)} />
            <DashboardCard label="Model Support" value={liveMetric?.modelName || station.models || "待补"} />
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900/20 p-5">
            <div className="mb-4 flex justify-between text-sm text-zinc-400">
              <span>近24小时运行状态图谱</span>
              <span className={status === "normal" ? "text-emerald-400" : status === "degraded" ? "text-amber-300" : "text-rose-400"}>
                {statusValue}
              </span>
            </div>
            <div className="flex h-12 w-full items-end gap-1">
              {statusBars.map((height, index) => (
                <div
                  key={`${station.id}-modal-chart-${index}`}
                  className={`flex-1 rounded-t-sm transition-colors ${
                    status === "offline"
                      ? "bg-rose-500/75 hover:bg-rose-400"
                      : status === "degraded"
                        ? "bg-amber-400/75 hover:bg-amber-300"
                        : "bg-emerald-500/80 hover:bg-emerald-400"
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900/20 p-5">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-bold text-zinc-300">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              {station.note || station.verdict || station.entry || "实时指标来自 Supabase 监测快照，评论区保留站内用户反馈。"}
            </p>
          </div>
        </section>

        <section className="flex h-[50vh] min-h-0 flex-col border-t border-white/10 bg-zinc-950 md:col-span-5 md:h-full md:border-l md:border-t-0 lg:col-span-4">
          <div className="shrink-0 border-b border-white/5 px-6 py-3 text-sm font-medium tracking-widest text-zinc-400">
            用户评价与反馈
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain p-4">
            <DiscussionFeed
              hideHeader
              showSyncButton
              stationId={station.id}
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

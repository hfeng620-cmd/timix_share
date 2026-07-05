"use client";

import { Activity, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  groupMonitorMetrics,
  loadLatestStationMetrics,
  type MonitorStatus,
  type StationMonitorMetric,
  type TokenCostLevel,
} from "@/lib/station-monitor-storage";
import { getSafeExternalHref } from "@/lib/url-safety";

const POLL_INTERVAL_MS = 30_000;

function formatCheckedAt(iso: string | undefined, nowMs: number) {
  if (!iso) return "等待首轮检测";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "时间待确认";
  const seconds = Math.max(0, Math.floor((nowMs - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds || 1} 秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function formatLatency(ms?: number) {
  if (!ms || ms <= 0) return "--";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function tokenCostLabel(level: TokenCostLevel) {
  if (level === "less") return "少一些";
  if (level === "normal") return "平均水平";
  if (level === "more") return "多一些";
  return "待检测";
}

function statusLabel(status: MonitorStatus, message: string) {
  if (message) return message;
  if (status === "normal") return "正常";
  if (status === "degraded") return "波动";
  if (status === "offline") return "异常";
  return "待检测";
}

function statusColor(status: MonitorStatus) {
  if (status === "normal") return "bg-emerald-400";
  if (status === "degraded") return "bg-amber-400";
  if (status === "offline") return "bg-rose-400";
  return "bg-white/25";
}

function trendColor(change?: number) {
  if (change === undefined) return "text-[var(--color-muted)]";
  if (change < 0) return "text-emerald-500";
  if (change > 0) return "text-rose-500";
  return "text-teal-500";
}

function TrendSpark({ change }: { change?: number }) {
  const isDown = typeof change === "number" && change < 0;
  const isUp = typeof change === "number" && change > 0;
  const points = isDown ? "2,14 8,18 15,11 23,9 30,16" : isUp ? "2,16 9,11 16,13 23,7 30,8" : "2,12 30,12";
  const color = isUp ? "#f43f5e" : "#059669";

  return (
    <svg className="h-6 w-12" viewBox="0 0 32 24" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusBars({ status }: { status: MonitorStatus }) {
  const activeCount = status === "normal" ? 14 : status === "degraded" ? 10 : status === "offline" ? 4 : 7;
  return (
    <div className="flex items-end gap-0.5" aria-label={statusLabel(status, "")}>
      {Array.from({ length: 14 }).map((_, index) => (
        <span
          key={index}
          className={`block w-1 rounded-full ${index < activeCount ? statusColor(status) : "bg-white/15"}`}
          style={{ height: `${10 + (index % 4) * 3}px` }}
        />
      ))}
    </div>
  );
}

function MonitorRow({ metric, nowMs }: { metric: StationMonitorMetric; nowMs: number }) {
  const href = getSafeExternalHref(metric.targetUrl);
  const trend = metric.priceChangePercent;

  return (
    <tr className="border-b border-[var(--color-line)] bg-[var(--color-panel)]/70 transition hover:bg-[var(--color-soft)]">
      <td className="min-w-[160px] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <a className="font-mono text-sm font-bold text-[var(--color-ink)] transition hover:text-[var(--color-brand-deep)]" href={href} target="_blank" rel="noreferrer">
              {metric.stationName}
            </a>
          ) : (
            <span className="font-mono text-sm font-bold text-[var(--color-ink)]">{metric.stationName}</span>
          )}
          {metric.providerLabel ? (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
              {metric.providerLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{formatCheckedAt(metric.checkedAt, nowMs)}</p>
      </td>
      <td className="px-3 py-3 font-mono text-sm text-[var(--color-ink)]">{metric.stationGroup || "default"}</td>
      <td className="px-3 py-3 text-right font-mono text-sm font-bold text-[var(--color-ink)]">
        {metric.priceLabel || (metric.price !== undefined ? `¥${metric.price}` : "--")}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <TrendSpark change={trend} />
          <span className={`font-mono text-xs font-bold ${trendColor(trend)}`}>
            {trend === undefined ? "-" : `${trend > 0 ? "+" : ""}${trend}%`}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-center text-sm font-semibold text-[var(--color-ink)]">{tokenCostLabel(metric.tokenCostLevel)}</td>
      <td className="px-3 py-3 text-center font-mono text-sm text-[var(--color-ink)]">
        {metric.onlineRate === undefined ? "--" : `${metric.onlineRate}%`}
      </td>
      <td className="px-3 py-3 text-center text-sm font-semibold text-[var(--color-ink)]">
        {metric.relayRateLabel || "待检测"}
      </td>
      <td className="px-3 py-3 text-center font-mono text-sm text-[var(--color-muted)]">{formatLatency(metric.latencyMs)}</td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-2">
          <StatusBars status={metric.status} />
          <span className="text-xs font-bold text-[var(--color-muted)]">{statusLabel(metric.status, metric.statusMessage)}</span>
        </div>
      </td>
    </tr>
  );
}


function MonitorCard({ metric, nowMs }: { metric: StationMonitorMetric; nowMs: number }) {
  const href = getSafeExternalHref(metric.targetUrl);
  const trend = metric.priceChangePercent;

  return (
    <div className="rounded-[16px] border border-[var(--color-line)] bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {href ? (
            <a className="block truncate text-sm font-black text-[var(--color-ink)]" href={href} target="_blank" rel="noreferrer">
              {metric.stationName}
            </a>
          ) : (
            <p className="truncate text-sm font-black text-[var(--color-ink)]">{metric.stationName}</p>
          )}
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">{formatCheckedAt(metric.checkedAt, nowMs)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${statusColor(metric.status)}`} />
          <span className="text-[11px] font-bold text-[var(--color-muted)]">{statusLabel(metric.status, metric.statusMessage)}</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 text-xs">
        <div className="rounded-[12px] bg-[var(--color-soft)] px-2 py-1.5">
          <p className="text-[10px] text-[var(--color-muted)]">价格</p>
          <p className="mt-0.5 truncate font-bold text-[var(--color-ink)]">{metric.priceLabel || (metric.price !== undefined ? `¥${metric.price}` : "--")}</p>
        </div>
        <div className="rounded-[12px] bg-[var(--color-soft)] px-2 py-1.5">
          <p className="text-[10px] text-[var(--color-muted)]">趋势</p>
          <p className={`mt-0.5 truncate font-bold ${trendColor(trend)}`}>{trend === undefined ? "-" : `${trend > 0 ? "+" : ""}${trend}%`}</p>
        </div>
        <div className="rounded-[12px] bg-[var(--color-soft)] px-2 py-1.5">
          <p className="text-[10px] text-[var(--color-muted)]">在线</p>
          <p className="mt-0.5 truncate font-bold text-[var(--color-ink)]">{metric.onlineRate === undefined ? "--" : `${metric.onlineRate}%`}</p>
        </div>
        <div className="rounded-[12px] bg-[var(--color-soft)] px-2 py-1.5">
          <p className="text-[10px] text-[var(--color-muted)]">延迟</p>
          <p className="mt-0.5 truncate font-bold text-[var(--color-ink)]">{formatLatency(metric.latencyMs)}</p>
        </div>
      </div>
    </div>
  );
}
export function StationMonitorPanel() {
  const [metrics, setMetrics] = useState<StationMonitorMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"stations" | "news">("stations");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const groups = useMemo(() => groupMonitorMetrics(metrics), [metrics]);
  const latestCheckedAt = useMemo(() => {
    const timestamps = metrics
      .map((metric) => (metric.checkedAt ? new Date(metric.checkedAt).getTime() : 0))
      .filter((time) => Number.isFinite(time) && time > 0);
    if (timestamps.length === 0) return undefined;
    return new Date(Math.max(...timestamps)).toISOString();
  }, [metrics]);

  const normalCount = metrics.filter((metric) => metric.status === "normal").length;
  const avgOnlineRate =
    metrics.filter((metric) => metric.onlineRate !== undefined).length > 0
      ? metrics.reduce((sum, metric) => sum + (metric.onlineRate ?? 0), 0) / metrics.filter((metric) => metric.onlineRate !== undefined).length
      : 0;

  const refreshMetrics = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await loadLatestStationMetrics();
      setMetrics(data);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshMetrics();
    const timer = window.setInterval(() => {
      refreshMetrics();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshMetrics]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="surface-in rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] p-3 shadow-[var(--shadow-card)] sm:p-5 lg:rounded-[28px]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-line)] pb-4 lg:flex-row lg:items-start lg:justify-between lg:gap-5 lg:pb-5">
        <div className="max-w-3xl">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold leading-none text-[var(--color-muted)] lg:text-xs">
            <Activity className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            <span className="truncate">实时倍率监测 · Supabase 最新快照</span>
          </div>
          <h2 className="mt-2 text-base font-black leading-none text-[var(--color-ink)] lg:mt-3 lg:text-2xl xl:text-3xl">实时检测</h2>
          <p className="mt-2 hidden text-sm leading-7 text-[var(--color-muted)] lg:block">
            当前面板读取 `station_monitor_latest` 最新结果；VPS worker 接入后会持续写入检测快照，前端每 30 秒自动刷新。
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand)] px-3 py-2 text-xs font-black text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:cursor-wait disabled:opacity-70 lg:gap-2 lg:px-6 lg:py-3 lg:text-sm"
          disabled={refreshing}
          onClick={() => refreshMetrics(true)}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "刷新中" : "开始检测"}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:mt-5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="inline-grid w-full grid-cols-2 rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] p-1 lg:max-w-md">
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-black transition lg:px-4 lg:py-2 lg:text-sm ${
              activeTab === "stations" ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
            onClick={() => setActiveTab("stations")}
            type="button"
          >
            中转站
          </button>
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-black transition lg:px-4 lg:py-2 lg:text-sm ${
              activeTab === "news" ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
            onClick={() => setActiveTab("news")}
            type="button"
          >
            AI 新闻
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
          <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1.5">
            已检测 {metrics.length} 项
          </span>
          <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1.5">
            正常 {normalCount} 项
          </span>
          <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1.5">
            最新 {formatCheckedAt(latestCheckedAt, nowMs)}
          </span>
          {Number.isFinite(avgOnlineRate) && avgOnlineRate > 0 ? (
            <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1.5">
              平均在线率 {avgOnlineRate.toFixed(0)}%
            </span>
          ) : null}
        </div>
      </div>

      {activeTab === "news" ? (
        <div className="mt-8 rounded-[22px] border border-dashed border-[var(--color-line)] bg-[var(--color-soft)] px-5 py-8 text-center">
          <p className="text-sm font-bold text-[var(--color-ink)]">AI 新闻监测稍后接入</p>
          <p className="mt-2 hidden text-sm leading-7 text-[var(--color-muted)] lg:block">这块可以复用同一套快照结构，但数据源会是 RSS / API / 人工审核。</p>
        </div>
      ) : loading ? (
        <div className="mt-6 grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-[18px] bg-[var(--color-soft)]" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-8 rounded-[22px] border border-dashed border-[var(--color-line)] bg-[var(--color-soft)] px-5 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--color-ink)]">还没有监测数据</p>
              <p className="mt-2 hidden text-sm leading-7 text-[var(--color-muted)] lg:block">
                先在 Supabase SQL Editor 运行 `supabase/station-monitoring-schema.sql`，面板就会显示示例检测项。
              </p>
            </div>
            <ShieldCheck className="h-8 w-8 text-[var(--color-brand)]" />
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-5 lg:mt-7 lg:space-y-8">
          {groups.map((group) => (
            <div key={group.modelName}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-black text-[var(--color-ink)] lg:text-lg">{group.modelName}</h3>
                  <a
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                    href="#station-monitor-all"
                  >
                    查看全部
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="hidden flex-wrap items-center gap-2 text-xs text-[var(--color-muted)] sm:flex">
                  <span className="rounded-full border border-[var(--color-line)] px-3 py-1.5">认证筛选：全部站点</span>
                  <span className="rounded-full border border-[var(--color-line)] px-3 py-1.5">排序方式：精选</span>
                </div>
              </div>

              <div id="station-monitor-all" className="grid gap-2 lg:hidden">
                {group.metrics.map((metric) => (
                  <MonitorCard key={metric.monitorId} metric={metric} nowMs={nowMs} />
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-[22px] border border-[var(--color-line)] lg:block">
                <table className="min-w-[1080px] w-full border-collapse bg-[var(--color-panel)] text-left">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] bg-[var(--color-soft)] text-xs font-black text-[var(--color-muted)]">
                      <th className="px-3 py-3">站点</th>
                      <th className="px-3 py-3">站点分组</th>
                      <th className="px-3 py-3 text-right">价格</th>
                      <th className="px-3 py-3">价格趋势</th>
                      <th className="px-3 py-3 text-center">Token消耗</th>
                      <th className="px-3 py-3 text-center">在线率</th>
                      <th className="px-3 py-3 text-center">接水率</th>
                      <th className="px-3 py-3 text-center">延迟</th>
                      <th className="px-3 py-3 text-right">运行状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.metrics.map((metric) => (
                      <MonitorRow key={metric.monitorId} metric={metric} nowMs={nowMs} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

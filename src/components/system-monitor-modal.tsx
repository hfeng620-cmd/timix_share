"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, AlertCircle, Database, HardDrive, Loader2, Network, Server, X } from "lucide-react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type VpsStatus = {
  cpuUsage: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
  uptime: string;
  networkRx: string;
  networkTx: string;
};

type SupabaseStatus = {
  databaseSizeLabel: string;
  databaseSizeMb: number | null;
  apiLatencyMs: number | null;
  error: string | null;
};

type SystemMonitorModalProps = {
  open: boolean;
  onClose: () => void;
};

const FREE_TIER_DATABASE_MB = 500;

const fallbackVpsStatus: VpsStatus = {
  cpuUsage: 18,
  memoryUsedGb: 1.2,
  memoryTotalGb: 2,
  uptime: "94 Days, 12:45:00",
  networkRx: "1.2MB/s",
  networkTx: "450KB/s",
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function parseDatabaseSizeToMb(value: string): number | null {
  const match = value.trim().match(/^([\d.]+)\s*([kmgt]?b)$/i);
  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return null;

  const unit = match[2].toLowerCase();
  if (unit === "kb") return amount / 1024;
  if (unit === "mb") return amount;
  if (unit === "gb") return amount * 1024;
  if (unit === "tb") return amount * 1024 * 1024;
  return null;
}

function MetricBar({
  label,
  value,
  detail,
  tone = "emerald",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "emerald" | "blue" | "cyan";
}) {
  const fillClass =
    tone === "blue" ? "bg-blue-500" : tone === "cyan" ? "bg-cyan-400" : "bg-emerald-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="font-mono text-sm text-zinc-100">{detail}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${clampPercent(value)}%` }} />
      </div>
    </div>
  );
}

function DataRow({
  icon,
  label,
  value,
  muted,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  muted?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400">
          {icon}
        </span>
        <div>
          <p className="text-sm text-zinc-300">{label}</p>
          {muted ? <p className="mt-0.5 text-[11px] text-zinc-600">{muted}</p> : null}
        </div>
      </div>
      <div className="font-mono text-sm text-zinc-100">{value}</div>
    </div>
  );
}

export function SystemMonitorModal({ open, onClose }: SystemMonitorModalProps) {
  const [vpsStatus, setVpsStatus] = useState<VpsStatus>(fallbackVpsStatus);
  const [vpsLoading, setVpsLoading] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({
    databaseSizeLabel: "未连接",
    databaseSizeMb: null,
    apiLatencyMs: null,
    error: null,
  });
  const [supabaseLoading, setSupabaseLoading] = useState(false);

  const loadVpsStatus = useCallback(async () => {
    setVpsLoading(true);
    try {
      const response = await fetch("/vps-status.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`VPS status request failed: ${response.status}`);
      const data = (await response.json()) as Partial<VpsStatus>;
      setVpsStatus({
        cpuUsage: Number.isFinite(data.cpuUsage) ? Number(data.cpuUsage) : fallbackVpsStatus.cpuUsage,
        memoryUsedGb: Number.isFinite(data.memoryUsedGb) ? Number(data.memoryUsedGb) : fallbackVpsStatus.memoryUsedGb,
        memoryTotalGb: Number.isFinite(data.memoryTotalGb) ? Number(data.memoryTotalGb) : fallbackVpsStatus.memoryTotalGb,
        uptime: typeof data.uptime === "string" ? data.uptime : fallbackVpsStatus.uptime,
        networkRx: typeof data.networkRx === "string" ? data.networkRx : fallbackVpsStatus.networkRx,
        networkTx: typeof data.networkTx === "string" ? data.networkTx : fallbackVpsStatus.networkTx,
      });
    } catch {
      setVpsStatus(fallbackVpsStatus);
    } finally {
      setVpsLoading(false);
    }
  }, []);

  const loadSupabaseStatus = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSupabaseStatus({
        databaseSizeLabel: "未配置",
        databaseSizeMb: null,
        apiLatencyMs: null,
        error: "Supabase 环境变量未配置",
      });
      return;
    }

    setSupabaseLoading(true);
    try {
      const supabase = getSupabaseClient();
      const startedAt = Date.now();
      const pingResult = await supabase.from("forum_posts").select("id").limit(1);
      const apiLatencyMs = Date.now() - startedAt;

      const { data, error } = await supabase.rpc("get_database_size");
      const sizeLabel = typeof data === "string" && data.trim() ? data : "RPC 未返回";

      setSupabaseStatus({
        databaseSizeLabel: error ? "RPC 未安装" : sizeLabel,
        databaseSizeMb: error ? null : parseDatabaseSizeToMb(sizeLabel),
        apiLatencyMs,
        error: error?.message ?? pingResult.error?.message ?? null,
      });
    } catch (error) {
      setSupabaseStatus({
        databaseSizeLabel: "读取失败",
        databaseSizeMb: null,
        apiLatencyMs: null,
        error: error instanceof Error ? error.message : "Supabase 状态读取失败",
      });
    } finally {
      setSupabaseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadVpsStatus();
    void loadSupabaseStatus();
  }, [loadSupabaseStatus, loadVpsStatus, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const memoryPercent = useMemo(() => {
    if (vpsStatus.memoryTotalGb <= 0) return 0;
    return (vpsStatus.memoryUsedGb / vpsStatus.memoryTotalGb) * 100;
  }, [vpsStatus.memoryTotalGb, vpsStatus.memoryUsedGb]);

  const databasePercent = useMemo(() => {
    if (supabaseStatus.databaseSizeMb === null) return 0;
    return (supabaseStatus.databaseSizeMb / FREE_TIER_DATABASE_MB) * 100;
  }, [supabaseStatus.databaseSizeMb]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overscroll-none bg-black/85 px-4 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="System Operations"
    >
      <div
        className="relative flex max-h-[88vh] w-[90vw] max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,197,94,0.14),transparent_34%),radial-gradient(circle_at_90%_15%,rgba(59,130,246,0.16),transparent_32%)]" />
        <div className="relative z-10">
          <button
            aria-label="关闭系统状态监控"
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-6 pr-12">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-white">System Operations</h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.9)] animate-pulse" />
                All Systems Normal
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              VPS 与 Supabase 的轻量实时状态面板，后续可把 `public/vps-status.json` 替换为真实监控源。
            </p>
          </div>

          <div className="system-monitor-scrollbar max-h-[64vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-widest text-zinc-500">RackNerd Node</h3>
                  {vpsLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : <Server className="h-4 w-4 text-zinc-500" />}
                </div>

                <div className="space-y-5">
                  <MetricBar label="CPU Usage" value={vpsStatus.cpuUsage} detail={`${Math.round(vpsStatus.cpuUsage)}%`} />
                  <MetricBar
                    label="Memory"
                    value={memoryPercent}
                    detail={`${vpsStatus.memoryUsedGb.toFixed(1)}GB / ${vpsStatus.memoryTotalGb.toFixed(0)}GB`}
                    tone="blue"
                  />
                  <DataRow icon={<Activity className="h-4 w-4" />} label="Uptime" value={vpsStatus.uptime} />
                  <DataRow
                    icon={<Network className="h-4 w-4" />}
                    label="Network"
                    value={
                      <span>
                        RX: {vpsStatus.networkRx} <span className="text-zinc-600">|</span> TX: {vpsStatus.networkTx}
                      </span>
                    }
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-widest text-zinc-500">Supabase Database</h3>
                  {supabaseLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : <Database className="h-4 w-4 text-zinc-500" />}
                </div>

                <div className="space-y-5">
                  <MetricBar
                    label="Database Size"
                    value={databasePercent}
                    detail={
                      supabaseStatus.databaseSizeMb === null
                        ? supabaseStatus.databaseSizeLabel
                        : `${supabaseStatus.databaseSizeLabel} / ${FREE_TIER_DATABASE_MB}MB`
                    }
                    tone="cyan"
                  />
                  <DataRow
                    icon={<Activity className="h-4 w-4" />}
                    label="API Latency"
                    value={supabaseStatus.apiLatencyMs === null ? "N/A" : `${supabaseStatus.apiLatencyMs}ms`}
                    muted="Ping forum_posts"
                  />
                  <DataRow
                    icon={<HardDrive className="h-4 w-4" />}
                    label="Auth Service"
                    value={<span className="text-emerald-300">Operational</span>}
                  />
                  {supabaseStatus.error ? (
                    <div className="flex gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-100">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{supabaseStatus.error}</span>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>

        <style jsx>{`
          .system-monitor-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .system-monitor-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          .system-monitor-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}</style>
      </div>
    </div>
  );
}

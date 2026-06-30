"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type TokenCostLevel = "less" | "normal" | "more" | "unknown";
export type MonitorStatus = "normal" | "degraded" | "offline" | "unknown";

export type StationMonitorMetric = {
  monitorId: string;
  stationId?: string;
  stationName: string;
  stationGroup: string;
  modelName: string;
  providerLabel: string;
  badge: string;
  isVerified: boolean;
  sortOrder: number;
  checkMethod: string;
  targetUrl: string;
  notes: string;
  snapshotId?: string;
  checkedAt?: string;
  price?: number;
  priceLabel: string;
  multiplier?: number;
  multiplierLabel: string;
  priceChangePercent?: number;
  tokenCostLevel: TokenCostLevel;
  onlineRate?: number;
  relayRateLabel: string;
  latencyMs?: number;
  status: MonitorStatus;
  statusMessage: string;
  errorMessage: string;
  source: string;
};

export type StationMonitorGroup = {
  modelName: string;
  metrics: StationMonitorMetric[];
};

function numberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function monitorFromRow(row: Record<string, unknown>): StationMonitorMetric {
  return {
    monitorId: String(row.monitor_id ?? ""),
    stationId: row.station_id ? String(row.station_id) : undefined,
    stationName: String(row.station_name ?? ""),
    stationGroup: String(row.station_group ?? "default"),
    modelName: String(row.model_name ?? "未分组"),
    providerLabel: String(row.provider_label ?? ""),
    badge: String(row.badge ?? ""),
    isVerified: Boolean(row.is_verified),
    sortOrder: Number(row.sort_order ?? 0),
    checkMethod: String(row.check_method ?? "manual"),
    targetUrl: String(row.target_url ?? ""),
    notes: String(row.notes ?? ""),
    snapshotId: row.snapshot_id ? String(row.snapshot_id) : undefined,
    checkedAt: row.checked_at ? String(row.checked_at) : undefined,
    price: numberOrUndefined(row.price),
    priceLabel: String(row.price_label ?? ""),
    multiplier: numberOrUndefined(row.multiplier),
    multiplierLabel: String(row.multiplier_label ?? ""),
    priceChangePercent: numberOrUndefined(row.price_change_percent),
    tokenCostLevel: (String(row.token_cost_level ?? "unknown") as TokenCostLevel),
    onlineRate: numberOrUndefined(row.online_rate),
    relayRateLabel: String(row.relay_rate_label ?? ""),
    latencyMs: numberOrUndefined(row.latency_ms),
    status: (String(row.status ?? "unknown") as MonitorStatus),
    statusMessage: String(row.status_message ?? ""),
    errorMessage: String(row.error_message ?? ""),
    source: String(row.source ?? ""),
  };
}

export function groupMonitorMetrics(metrics: StationMonitorMetric[]): StationMonitorGroup[] {
  const groups = new Map<string, StationMonitorMetric[]>();
  for (const metric of metrics) {
    const modelName = metric.modelName || "未分组";
    const current = groups.get(modelName) ?? [];
    current.push(metric);
    groups.set(modelName, current);
  }

  return Array.from(groups.entries()).map(([modelName, rows]) => ({
    modelName,
    metrics: rows.sort((a, b) => a.sortOrder - b.sortOrder || a.stationName.localeCompare(b.stationName, "zh-CN")),
  }));
}

export async function loadLatestStationMetrics(): Promise<StationMonitorMetric[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await getSupabaseClient()
      .from("station_monitor_latest")
      .select("*")
      .order("model_name", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("[loadLatestStationMetrics] Supabase query failed:", error.message);
      return [];
    }

    return ((data ?? []) as Record<string, unknown>[]).map(monitorFromRow);
  } catch (error) {
    console.warn("[loadLatestStationMetrics] Unexpected error:", error);
    return [];
  }
}

"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { stationComparisonRows, stationLinkMap } from "@/lib/site-data";
import { RelayStationDetailModal } from "@/components/relay-station-detail-modal";
import { DiscussionFeed } from "@/components/discussion-feed";
import { StationEditModal } from "@/components/station-edit-modal";
import { SubmissionPanel } from "@/components/submission-panel";
import { useForumAuth } from "@/lib/forum-auth";
import { useToast } from "@/lib/toast-context";
import { getSafeExternalHref } from "@/lib/url-safety";
import { createSubmission } from "@/lib/submission-storage";
import {
  createStation,
  deleteStation,
  isTemporaryStationId,
  loadStationEditHistory,
  loadStations,
  notifyStationsChanged,
  updateStation,
  type Station,
  type StationEditRecord,
} from "@/lib/station-storage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type FilterId = "all" | "featured" | "trial" | "free" | "lowRate" | "pending";

type SortOption = "default" | "priceAsc" | "recentUpdate";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "default", label: "默认排序" },
  { value: "priceAsc", label: "倍率从低到高" },
  { value: "recentUpdate", label: "最近更新" },
];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function stableSeries(key: string, count: number, min = 55, max = 100) {
  let seed = hashString(key) || 1;
  return Array.from({ length: count }, () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return min + (seed % (max - min + 1));
  });
}

function parsePercent(value: string) {
  const parsed = Number(value.match(/(\d+(?:\.\d+)?)/)?.[1] ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function uptimeTone(value: string) {
  const percent = parsePercent(value);
  if (percent === null) return "text-zinc-400";
  if (percent > 95) return "text-emerald-400";
  if (percent > 80) return "text-amber-300";
  return "text-rose-400";
}

function inferTokenCost(station: Station) {
  const multiplier = Number(station.multiplier.match(/(\d+(?:\.\d+)?)/)?.[1] ?? Number.NaN);
  if (station.price.includes("免费") || station.badge.includes("免费")) return "少一些";
  if (Number.isFinite(multiplier)) {
    if (multiplier <= 0.12) return "偏省";
    if (multiplier >= 0.3) return "多一些";
  }
  return "平均水平";
}

function inferFidelity(station: Station) {
  const source = `${station.status} ${station.verdict} ${station.note}`;
  if (/异常|失效|关|不可|风险/.test(source)) return "需观察";
  if (/波动|待补|未实测|复核/.test(source)) return "中等";
  return "几乎不";
}

function statusTone(status: string) {
  if (/异常|失效|关|不可|停/.test(status)) return "bg-rose-500";
  if (/波动|维护|排队|待|缺|测试/.test(status)) return "bg-amber-400";
  return "bg-emerald-500";
}

function MiniSparkline({ station }: { station: Station }) {
  const values = stableSeries(`${station.id}:spark`, 8, 35, 92);
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 72},${28 - (value / 100) * 24}`)
    .join(" ");
  const delta = (hashString(`${station.id}:delta`) % 9) - 4;
  const isUp = delta >= 0;

  return (
    <div className="flex items-center gap-2">
      <svg className="h-7 w-20 overflow-visible" viewBox="0 0 72 30" aria-hidden="true">
        <polyline
          fill="none"
          points={points}
          stroke={isUp ? "rgb(52 211 153)" : "rgb(251 113 133)"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
      <span className={isUp ? "text-emerald-400" : "text-rose-400"}>
        {isUp ? "+" : ""}
        {delta}%
      </span>
    </div>
  );
}

function MiniStatusBars({ station, count = 12 }: { station: Station; count?: number }) {
  const bars = stableSeries(`${station.id}:bars`, count, 42, 100);
  const color = statusTone(station.status);

  return (
    <div className="flex h-4 items-end gap-[2px]" aria-label={station.status || "运行状态"}>
      {bars.map((height, index) => (
        <div
          key={`${station.id}-bar-${index}`}
          className={`w-1 rounded-sm ${color}`}
          style={{ height: `${height}%`, opacity: height < 58 ? 0.45 : 0.9 }}
        />
      ))}
    </div>
  );
}

const FEATURED_NAMES = ["虎虎", "Aether", "杂货铺", "秋天中转站"];

const filters: { id: FilterId; label: string; description: string }[] = [
  { id: "all", label: "全部站点", description: "完整总表" },
  { id: "featured", label: "首页重点", description: "虎虎 / Aether / 杂货铺 / 秋天中转站" },
  { id: "trial", label: "可先试用", description: "低门槛入口" },
  { id: "free", label: "免费入口", description: "公益或免费" },
  { id: "lowRate", label: "低倍率", description: "0.15x 及以下" },
  { id: "pending", label: "待补测", description: "缺数据" },
];

/** Editable fields shown in the edit / create form. */
const EDITABLE_FIELDS: { key: keyof Station; label: string; type: "input" | "textarea" }[] = [
  { key: "name", label: "站点名", type: "input" },
  { key: "url", label: "网址", type: "input" },
  { key: "entry", label: "入口 / 地址", type: "input" },
  { key: "price", label: "标称价格", type: "input" },
  { key: "multiplier", label: "倍率", type: "input" },
  { key: "packageType", label: "收费方式", type: "input" },
  { key: "status", label: "状态", type: "input" },
  { key: "models", label: "模型", type: "textarea" },
  { key: "uptime", label: "在线率", type: "input" },
  { key: "latency", label: "延迟", type: "input" },
  { key: "source", label: "来源", type: "input" },
  { key: "verdict", label: "评价", type: "input" },
  { key: "note", label: "备注", type: "textarea" },
  { key: "advantage", label: "优势", type: "textarea" },
  { key: "risk", label: "风险", type: "textarea" },
  { key: "badge", label: "标签", type: "input" },
  { key: "groupName", label: "分组", type: "input" },
  { key: "sortOrder", label: "排序", type: "input" },
];

/** Human-readable labels for snake_case field names returned from edit history. */
const FIELD_LABELS: Record<string, string> = {
  name: "站点名",
  url: "网址",
  price: "标称价格",
  multiplier: "倍率",
  entry: "入口 / 地址",
  package_type: "收费方式",
  status: "状态",
  models: "模型",
  uptime: "在线率",
  latency: "延迟",
  source: "来源",
  verdict: "评价",
  note: "备注",
  advantage: "优势",
  risk: "风险",
  badge: "标签",
  group_name: "分组",
  sort_order: "排序",
};

const EMPTY_FORM: Partial<Station> = {
  name: "",
  url: "",
  entry: "",
  price: "",
  multiplier: "",
  packageType: "",
  status: "",
  models: "",
  uptime: "",
  latency: "",
  source: "",
  verdict: "",
  note: "",
  advantage: "",
  risk: "",
  badge: "",
  groupName: "",
};

const STATIC_STATIONS: Station[] = stationComparisonRows.map((row, i) => ({
  id: `static-${i}`,
  name: row.name,
  url: stationLinkMap[row.name] ?? "",
  price: row.price,
  multiplier: row.multiplier,
  entry: row.entry ?? "",
  packageType: row.packageType ?? "",
  status: row.status ?? "",
  models: row.models ?? "",
  uptime: row.uptime ?? "",
  latency: row.latency ?? "",
  source: row.source ?? "",
  verdict: row.verdict ?? "",
  note: row.note ?? "",
  advantage: row.advantage ?? "",
  risk: row.risk ?? "",
  badge: row.badge ?? "",
  groupName: row.group ?? "",
  sortOrder: i + 1,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesFilter(filter: FilterId, station: Station) {
  if (filter === "all") return true;

  if (filter === "featured") {
    return FEATURED_NAMES.includes(station.name);
  }

  if (filter === "trial") {
    return (
      station.badge.includes("试用") ||
      station.note.includes("试用") ||
      station.note.includes("注册送") ||
      station.status.includes("试用")
    );
  }

  if (filter === "free") {
    return station.badge.includes("免费") || station.price.includes("免费");
  }

  if (filter === "lowRate") {
    return ["0.058x", "0.06x", "0.15x"].some((value) =>
      station.multiplier.includes(value),
    );
  }

  // pending
  return (
    station.badge.includes("待补") ||
    station.badge.includes("未实测") ||
    station.status.includes("待") ||
    station.status.includes("缺")
  );
}

function rankingBadge(index: number) {
  return `#${(index + 1).toString().padStart(2, "0")}`;
}

function freshnessInfo(lastEditAt: string | undefined): {
  label: string;
  isRecent: boolean;
  isThisWeek: boolean;
} | null {
  if (!lastEditAt) return null;
  const updated = new Date(lastEditAt).getTime();
  if (isNaN(updated)) return null;
  const hours = (Date.now() - updated) / (1000 * 60 * 60);
  if (hours <= 24) return { label: "最近更新", isRecent: true, isThisWeek: true };
  if (hours <= 24 * 7) return { label: "本周更新", isRecent: false, isThisWeek: true };
  const d = new Date(updated);
  return {
    label: `${d.getMonth() + 1}/${d.getDate()}更新`,
    isRecent: false,
    isThisWeek: false,
  };
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fieldLabel(snakeName: string): string {
  return FIELD_LABELS[snakeName] ?? snakeName;
}

function isStaticStationId(id: string | null | undefined) {
  return isTemporaryStationId(id);
}

function stationFormToCreateInput(form: Partial<Station>) {
  return {
    name: form.name?.trim() ?? "",
    url: form.url,
    price: form.price,
    multiplier: form.multiplier,
    entry: form.entry,
    packageType: form.packageType,
    status: form.status,
    models: form.models,
    uptime: form.uptime,
    latency: form.latency,
    source: form.source,
    verdict: form.verdict,
    note: form.note,
    advantage: form.advantage,
    risk: form.risk,
    badge: form.badge,
    groupName: form.groupName,
    sortOrder: form.sortOrder,
  };
}

function stationFormToSubmissionInput(form: Partial<Station>, contact: string) {
  const name = form.name?.trim() ?? "";
  const priceParts = [form.price, form.multiplier, form.packageType]
    .map((value) => value?.trim())
    .filter(Boolean);
  const detailParts = [
    form.status ? `状态：${form.status}` : "",
    form.models ? `模型：${form.models}` : "",
    form.uptime ? `在线率：${form.uptime}` : "",
    form.latency ? `延迟：${form.latency}` : "",
    form.source ? `来源：${form.source}` : "",
    form.verdict ? `评价：${form.verdict}` : "",
    form.note ? `备注：${form.note}` : "",
    form.advantage ? `优势：${form.advantage}` : "",
    form.risk ? `风险：${form.risk}` : "",
    form.badge ? `标签：${form.badge}` : "",
    form.groupName ? `分组：${form.groupName}` : "",
    form.entry ? `入口：${form.entry}` : "",
  ].filter(Boolean);

  return {
    kind: "新站点" as const,
    stationName: name,
    url: form.url?.trim() || form.entry?.trim() || "",
    priceOrRate: priceParts.join(" / ") || "待补",
    note: detailParts.join("\n") || "通过站点榜添加入口提交。",
    contact,
  };
}

function pickEditableStationFields(station: Partial<Station>): Partial<Station> {
  return EDITABLE_FIELDS.reduce<Partial<Station>>((next, field) => {
    const value = station[field.key];
    if (value !== undefined) {
      return { ...next, [field.key]: value };
    }
    return next;
  }, {});
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StationsBoard() {
  const { isConnected, displayName, isAdmin, isOwner, showAuthModal, user } = useForumAuth();
  const { addToast } = useToast();
  const canManageStationsDirectly = isAdmin || isOwner;
  const canDeleteStations = canManageStationsDirectly;

  // ---- data ---------------------------------------------------------------
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- filters ------------------------------------------------------------
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [showAllRows, setShowAllRows] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---- editing ------------------------------------------------------------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Station>>({});
  const [wikiEditStation, setWikiEditStation] = useState<Station | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  // ---- detail modal -------------------------------------------------------
  const [detailStation, setDetailStation] = useState<Station | null>(null);

  // Debug-safe wrapper: logs to console so you can inspect station.id in browser DevTools
  function handleDetailStationClick(station: Station) {
    if (!station || !station.id) {
      console.error("[StationsBoard] Cannot open detail — station or station.id is missing:", station);
      return;
    }
    setDetailStation(station);
  }

  // ---- station discussion modal --------------------------------------------
  const [discussionStation, setDiscussionStation] = useState<Station | null>(null);

  // ---- history ------------------------------------------------------------
  const [historyStationId, setHistoryStationId] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<StationEditRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // =========================================================================
  // Data loading
  // =========================================================================

  const refreshStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadStations();
      // Merge Supabase data with static fallback, deduplicating by name
      const dbNames = new Set(data.map((s) => s.name));
      const merged = [...data, ...STATIC_STATIONS.filter((s) => !dbNames.has(s.name))];
      setStations(merged);
      setDetailStation((current) =>
        current ? merged.find((station) => station.id === current.id) ?? current : current,
      );
      setDiscussionStation((current) =>
        current ? merged.find((station) => station.id === current.id) ?? current : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载站点数据失败");
      setStations(STATIC_STATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Data loading ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let resolved = false;
    // 10s fallback — don't hang forever if Supabase is unreachable
    const timeout = setTimeout(() => {
      if (!cancelled && !resolved) {
        setError("加载超时，请刷新页面重试。");
        setLoading(false);
      }
    }, 10_000);
    loadStations()
      .then((data) => {
        clearTimeout(timeout);
        if (!cancelled) {
          resolved = true;
          const dbNames = new Set(data.map((s) => s.name));
          const merged = [...data, ...STATIC_STATIONS.filter((s) => !dbNames.has(s.name))];
          setStations(merged);
          setError(null);
          setLoading(false);
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        resolved = true;
        if (!cancelled) {
          setError("数据暂时加载失败，请稍后刷新重试。");
          setStations(STATIC_STATIONS);
          setLoading(false);
        }
      });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  // ---- Edit history loading -----------------------------------------------
  useEffect(() => {
    if (!historyStationId || isStaticStationId(historyStationId)) {
      setEditHistory([]);
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    loadStationEditHistory(historyStationId)
      .then((records) => {
        if (!cancelled) setEditHistory(records);
      })
      .catch(() => {
        if (!cancelled) setEditHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyStationId]);

  // ---- Debounce search query -----------------------------------------------
  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ---- Ctrl+K keyboard shortcut -------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // =========================================================================
  // Derived data
  // =========================================================================

  const featuredStations = useMemo<Station[]>(
    () =>
      FEATURED_NAMES.map((name) => stations.find((s) => s.name === name)).filter(
        (s): s is Station => Boolean(s),
      ),
    [stations],
  );

  const filteredRows = useMemo(() => {
    return stations.filter((station) => {
      const matchFilter = matchesFilter(activeFilter, station);
      if (!matchFilter) return false;

      if (!debouncedQuery) return true;

      const haystacks = [
        station.name,
        station.groupName,
        station.entry,
        station.packageType,
        station.models,
        station.price,
        station.multiplier,
        station.status,
        station.note,
        station.badge,
      ];

      return haystacks.some((value) => value.toLowerCase().includes(debouncedQuery));
    });
  }, [activeFilter, debouncedQuery, stations]);

  const sortedRows = useMemo(() => {
    if (sortBy === "default") return filteredRows;

    return [...filteredRows].sort((a, b) => {
      if (sortBy === "priceAsc") {
        const numA = parseFloat(a.multiplier.replace(/[xX]/, ""));
        const numB = parseFloat(b.multiplier.replace(/[xX]/, ""));
        const validA = !isNaN(numA) && numA > 0;
        const validB = !isNaN(numB) && numB > 0;
        if (validA && validB) return numA - numB;
        if (validA) return -1;
        if (validB) return 1;
        return 0;
      }
      if (sortBy === "recentUpdate") {
        const timeA = a.lastEditAt ? new Date(a.lastEditAt).getTime() : 0;
        const timeB = b.lastEditAt ? new Date(b.lastEditAt).getTime() : 0;
        return timeB - timeA;
      }
      return 0;
    });
  }, [filteredRows, sortBy]);

  const visibleRows = showAllRows ? sortedRows : sortedRows.slice(0, 8);

  const lowestMultiplier = useMemo(() => {
    const nums = stations
      .map((s) => parseFloat(s.multiplier.replace(/[xX]/, "")))
      .filter((n) => !isNaN(n) && n > 0);
    if (nums.length === 0) return "--";
    return Math.min(...nums) + "x";
  }, [stations]);

  const trialCount = useMemo(
    () =>
      stations.filter(
        (s) =>
          s.badge.includes("试用") ||
          s.note.includes("试用") ||
          s.status.includes("试用"),
      ).length,
    [stations],
  );

  const freshnessStats = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    let updatedThisWeek = 0;
    for (const s of stations) {
      if (s.lastEditAt) {
        const t = new Date(s.lastEditAt).getTime();
        if (!isNaN(t) && now - t <= week) updatedThisWeek++;
      }
    }
    return { updatedThisWeek, total: stations.length };
  }, [stations]);

  // =========================================================================
  // Edit / create / delete handlers
  // =========================================================================

  const startEdit = useCallback((station: Station) => {
    setAddingNew(false);
    setWikiEditStation(null);
    setEditingId(station.id);
    setEditForm(pickEditableStationFields(station));
  }, []);
  const openWikiEditModal = useCallback((station: Station) => {
    if (!isConnected || !user?.id) {
      addToast("请先登录再提交修改", "error");
      showAuthModal();
      return;
    }
    if (isStaticStationId(station.id)) {
      startEdit(station);
      addToast(canManageStationsDirectly ? "这是本地兜底站点，保存后会写入正式榜单。" : "这是本地兜底站点，保存后会提交给管理员审核。", "info");
      return;
    }
    setEditingId(null);
    setWikiEditStation(station);
  }, [addToast, canManageStationsDirectly, isConnected, showAuthModal, startEdit, user?.id]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    if (!editForm.name?.trim()) {
      addToast("站点名不能为空。", "warning");
      return;
    }
    const editorName = displayName || "未知用户";
    setSaving(true);
    try {
      if (isStaticStationId(editingId)) {
        if (canManageStationsDirectly) {
          await createStation(stationFormToCreateInput(editForm));
          addToast("已把这条本地兜底数据保存为正式站点。", "success");
        } else {
          await createSubmission(stationFormToSubmissionInput(editForm, user?.email ?? displayName ?? "站内用户"));
          addToast("已提交新增站点申请，管理员审核后会进入正式榜单。", "success");
        }
      } else {
        const result = await updateStation(editingId, editForm, editorName);
        if (result.needsReview) {
          addToast("已提交巡查队列，站主或管理员确认后会生效。", "success");
        } else {
          addToast("已保存到正式榜单。", "success");
        }
      }
      await refreshStations();
      notifyStationsChanged();
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      addToast(err instanceof Error ? err.message : "保存失败，请稍后重试。", "error");
    } finally {
      setSaving(false);
    }
  }, [addToast, canManageStationsDirectly, editingId, editForm, displayName, refreshStations, user?.email]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (isStaticStationId(id)) {
        alert("这是本地兜底数据，还没有进入正式榜单；先保存为正式站点后再删除。");
        return;
      }
      if (!window.confirm("确定要删除这个站点吗？此操作不可撤销。")) return;
      try {
        await deleteStation(id);
        await refreshStations();
        notifyStationsChanged();
        if (editingId === id) {
          setEditingId(null);
          setEditForm({});
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "删除失败，请稍后重试。");
      }
    },
    [editingId, refreshStations],
  );

  const startAdd = useCallback(() => {
    setAddingNew(true);
    setEditingId(null);
    setEditForm({ ...EMPTY_FORM });
  }, []);

  const cancelAdd = useCallback(() => {
    setAddingNew(false);
    setEditForm({});
  }, []);

  const saveNew = useCallback(async () => {
    if (!editForm.name?.trim()) {
      addToast("站点名不能为空。", "warning");
      return;
    }
    setSaving(true);
    try {
      if (canManageStationsDirectly) {
        await createStation({
          name: editForm.name.trim(),
          url: editForm.url,
          price: editForm.price,
          multiplier: editForm.multiplier,
          entry: editForm.entry,
          packageType: editForm.packageType,
          status: editForm.status,
          models: editForm.models,
          uptime: editForm.uptime,
          latency: editForm.latency,
          source: editForm.source,
          verdict: editForm.verdict,
          note: editForm.note,
          advantage: editForm.advantage,
          risk: editForm.risk,
          badge: editForm.badge,
          groupName: editForm.groupName,
        });
        await refreshStations();
        notifyStationsChanged();
        addToast("已创建正式站点。", "success");
      } else {
        await createSubmission(stationFormToSubmissionInput(editForm, user?.email ?? displayName ?? "站内用户"));
        addToast("已提交新增站点申请，管理员审核后会进入正式榜单。", "success");
      }
      setAddingNew(false);
      setEditForm({});
    } catch (err) {
      addToast(err instanceof Error ? err.message : "创建失败，请稍后重试。", "error");
    } finally {
      setSaving(false);
    }
  }, [addToast, canManageStationsDirectly, displayName, editForm, refreshStations, user?.email]);

  const toggleHistory = useCallback((stationId: string) => {
    setHistoryStationId((prev) => (prev === stationId ? null : stationId));
  }, []);

  const updateField = useCallback((key: keyof Station, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // =========================================================================
  // Sub-renderers
  // =========================================================================

  function renderEditPanel() {
    return (
      <div className="bg-[var(--color-soft)] rounded-[18px] p-5 my-2 border border-[var(--color-line)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EDITABLE_FIELDS.map(({ key, label, type }) => {
            const value = editForm[key] ?? "";
            const inputClass =
              "w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-white/[0.08]";

            return (
              <div key={key} className={type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {label}
                </label>
                {type === "textarea" ? (
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={String(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                ) : (
                  <input
                    className={inputClass}
                    type="text"
                    value={String(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
          <button
            className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition active:bg-[var(--color-brand-deep)] active:scale-[0.98] md:hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
            disabled={saving}
            onClick={saveEdit}
            type="button"
          >
            {saving
              ? "保存中..."
              : isStaticStationId(editingId)
                ? "保存为正式站点"
                : "保存修改"}
          </button>
          <button
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition active:border-[var(--color-brand)] active:text-[var(--color-brand-deep)] active:scale-[0.98] md:hover:border-[var(--color-brand)] md:hover:text-[var(--color-brand-deep)]"
            onClick={cancelEdit}
            type="button"
          >
            取消
          </button>
          <span className="flex-1" />
          {canDeleteStations ? (
            <button
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition active:bg-red-100 active:scale-[0.98] md:hover:bg-red-100"
              onClick={() => editingId && handleDelete(editingId)}
              type="button"
            >
              删除站点
            </button>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              社区用户可以补充和修正资料；删除站点仅管理员可操作。
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderCreatePanel() {
    return (
      <div className="bg-[var(--color-soft)] rounded-[18px] p-5 my-4 mx-6 border border-dashed border-[var(--color-brand-soft)]">
        <h3 className="mb-4 text-lg font-black text-[var(--color-brand-deep)]">添加新站点</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EDITABLE_FIELDS.map(({ key, label, type }) => {
            const value = editForm[key] ?? "";
            const inputClass =
              "w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-white/[0.08]";

            return (
              <div key={key} className={type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {label}
                </label>
                {type === "textarea" ? (
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={String(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                ) : (
                  <input
                    className={inputClass}
                    type="text"
                    value={String(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
          <button
            className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition active:bg-[var(--color-brand-deep)] active:scale-[0.98] md:hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
            disabled={saving}
            onClick={saveNew}
            type="button"
          >
            {saving ? "处理中..." : canManageStationsDirectly ? "创建站点" : "提交新增申请"}
          </button>
          <button
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition active:border-[var(--color-brand)] active:text-[var(--color-brand-deep)] active:scale-[0.98] md:hover:border-[var(--color-brand)] md:hover:text-[var(--color-brand-deep)]"
            onClick={cancelAdd}
            type="button"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  function renderHistoryPanel(station: Station) {
    return (
      <div className="bg-[var(--color-soft)] rounded-[18px] p-5 my-2 border border-[var(--color-line)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h4 className="text-sm font-bold text-[var(--color-brand-deep)]">
            {station.name} 编辑历史
          </h4>
          {station.lastEditorName && (
            <span className="text-xs text-[var(--color-muted)]">
              最后编辑：{station.lastEditorName}
              {station.lastEditAt ? ` · ${formatTime(station.lastEditAt)}` : ""}
            </span>
          )}
        </div>
        {historyLoading ? (
          <p className="text-sm text-[var(--color-muted)]">加载中...</p>
        ) : editHistory.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">暂无编辑记录。发现信息有变化？点击编辑按钮来更新。</p>
        ) : (
          <ul className="space-y-2">
            {editHistory.map((record) => (
              <li
                key={record.id}
                className="rounded-xl bg-[var(--color-panel)] px-4 py-2.5 text-sm leading-6"
              >
                <span className="font-bold text-[var(--color-ink)]">{record.editorName}</span>
                <span className="text-[var(--color-muted)]"> 把 </span>
                <span className="font-semibold text-[var(--color-brand-deep)]">
                  {fieldLabel(record.fieldName)}
                </span>
                <span className="text-[var(--color-muted)]"> 从 &quot;</span>
                <span className="text-[var(--color-ink)]">
                  {record.oldValue || "(空)"}
                </span>
                <span className="text-[var(--color-muted)]">&quot; 改为 &quot;</span>
                <span className="font-semibold text-[var(--color-ink)]">
                  {record.newValue || "(空)"}
                </span>
                <span className="text-[var(--color-muted)]">&quot;</span>
                <span className="ml-2 text-xs text-[var(--color-muted)]">
                  · {formatTime(record.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // =========================================================================
  // Loading / error states
  // =========================================================================

  if (loading && stations.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-8 text-center lg:px-10">
        <p className="text-lg font-bold text-[var(--color-muted)]">正在加载站点数据...</p>
      </section>
    );
  }

  if (error && stations.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-8 text-center lg:px-10">
        <p className="text-lg font-bold text-red-500">加载失败</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{error}</p>
        <button
          className="mt-4 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition active:bg-[var(--color-brand-deep)] active:scale-[0.98] md:hover:bg-[var(--color-brand-deep)]"
          onClick={refreshStations}
          type="button"
        >
          重新加载
        </button>
      </section>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <>
      {/* ---- Hero + Filters ---- */}
      <section className="relative mx-auto max-w-[1680px] px-0 py-1 sm:px-5 lg:px-6 lg:py-4">
        <div className="hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 shadow-[var(--shadow-card)] sm:px-5 lg:block">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                API Relay Index
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                中转站榜单
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                用倍率、试用和备注先缩出 2 到 3 个候选。
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 rounded-[18px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2 text-xs sm:w-auto sm:min-w-[240px] sm:px-4">
              <div>
                <p className="text-[var(--color-muted)]">站点</p>
                <p className="mt-0.5 text-xl font-black">{stations.length}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted)]">最低</p>
                <p className="mt-0.5 text-xl font-black">{lowestMultiplier}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted)]">试用</p>
                <p className="mt-0.5 text-xl font-black">{trialCount}+</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 hidden gap-3 lg:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
          {featuredStations.length > 0 ? (
            <div className="hidden items-start gap-3 sm:grid-cols-2 lg:grid 2xl:grid-cols-4">
              {featuredStations.map((station, index) => {
                const stationHref = getSafeExternalHref(station.url);
                const cardContent = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                          {rankingBadge(index)} · 首批候选
                        </p>
                        <h2 className="mt-1 text-lg font-black sm:text-xl">{station.name}</h2>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                        {station.badge}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-1 text-sm leading-5 text-[var(--color-muted)]">{station.note}</p>

                    <div className="mt-2 grid grid-cols-3 gap-2 border-t border-[var(--color-line)] pt-2 text-xs">
                      <div>
                        <p className="text-[var(--color-muted)]">价格</p>
                        <p className="mt-1 font-black">{station.price}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-muted)]">倍率</p>
                        <p className="mt-1 font-black">{station.multiplier}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-muted)]">门槛</p>
                        <p className="mt-1 line-clamp-1 font-black">{station.packageType || "待补"}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      {stationHref ? (
                        <div className="inline-flex items-center text-xs font-bold text-[var(--color-brand-deep)]">
                          打开站点入口
                          <span className="ml-2 transition-all duration-300">→</span>
                        </div>
                      ) : null}

                      <button
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)] transition active:bg-[var(--color-brand-soft)] active:text-[var(--color-brand-deep)] active:scale-[0.98] md:hover:bg-[var(--color-brand-soft)] md:hover:text-[var(--color-brand-deep)]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDiscussionStation(station);
                        }}
                        type="button"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        讨论区
                      </button>
                    </div>
                  </>
                );

                if (stationHref) {
                  return (
                    <a
                      key={`${station.id}-hero`}
                      href={stationHref}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="card-lift group min-h-0 self-start rounded-[20px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-3.5 shadow-[var(--shadow-card)] transition-all duration-300 active:scale-[0.98] md:hover:-translate-y-[3px] md:hover:border-[var(--color-brand)] md:hover:shadow-[0_28px_72px_rgba(15,23,42,0.10)] sm:p-4"
                    >
                      {cardContent}
                    </a>
                  );
                }

                return (
                  <div
                    key={`${station.id}-hero`}
                    className="card-lift group min-h-0 self-start rounded-[20px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-3.5 shadow-[var(--shadow-card)] transition-all duration-300 active:scale-[0.98] md:hover:-translate-y-[3px] md:hover:border-[var(--color-brand)] md:hover:shadow-[0_28px_72px_rgba(15,23,42,0.10)] sm:p-4"
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          <aside className="hidden self-start rounded-[20px] border border-[var(--color-line)] bg-[linear-gradient(180deg,var(--color-panel),color-mix(in_srgb,var(--color-brand-soft)_34%,var(--color-panel)))] p-3 shadow-[var(--shadow-card)] xl:block">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-sm font-black text-[var(--color-on-brand)]">
                3
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  先这样看
                </p>
                <p className="mt-1 text-base font-black leading-6 text-[var(--color-ink)]">
                  筛候选，回社区补证据。
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="flex items-center gap-3 rounded-[16px] bg-[var(--color-soft)] px-3 py-2.5">
                <span className="text-xs font-black text-[var(--color-brand-deep)]">01</span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--color-ink)]">锁 2 到 3 个候选</p>
                  <p className="line-clamp-1 text-xs leading-5 text-[var(--color-muted)]">价格 / 倍率 / 门槛先过一遍。</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[16px] bg-[var(--color-soft)] px-3 py-2.5">
                <span className="text-xs font-black text-[var(--color-brand-deep)]">02</span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--color-ink)]">再看备注更新</p>
                  <p className="line-clamp-1 text-xs leading-5 text-[var(--color-muted)]">总表只读摘要，细节进历史。</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[16px] bg-[var(--color-brand-soft)] px-3 py-2.5">
                <span className="text-xs font-black text-[var(--color-brand-deep)]">03</span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--color-ink)]">最后补反馈</p>
                  <p className="line-clamp-1 text-xs leading-5 text-[var(--color-muted)]">真实变化继续靠社区回流。</p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-line)] pt-3">
              <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">本周更新</p>
                <p className="mt-1 text-lg font-black text-[var(--color-ink)]">{freshnessStats.updatedThisWeek}</p>
              </div>
              <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">试用样本</p>
                <p className="mt-1 text-lg font-black text-[var(--color-ink)]">{trialCount}+</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mobile-station-filter mt-1.5 rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel)] p-1.5 shadow-[var(--shadow-card)] backdrop-blur sm:p-4 lg:mt-3 lg:rounded-[22px] lg:p-2.5">
          <div className="hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <div>
              <p className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)] lg:block">快速查找</p>
              <h2 className="text-base font-black lg:mt-1 lg:text-xl">筛选</h2>
              <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-[var(--color-muted)] lg:block">搜索后直接看总表；详细口径进历史或讨论区。</p>
            </div>
            <div className="hidden gap-2 lg:grid">
              <div className="rounded-[16px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2.5 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  当前结果面
                </p>
                <p className="mt-1 text-base font-black text-[var(--color-ink)]">
                  找到 {filteredRows.length} 个站点
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  先看前 {Math.min(visibleRows.length, filteredRows.length)} 条，再决定要不要展开更多。
                </p>
              </div>
              <div className="rounded-[16px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-2.5 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  当前筛选
                </p>
                <p className="mt-2 text-sm font-black text-[var(--color-ink)]">
                  {filters.find((filter) => filter.id === activeFilter)?.label ?? "全部站点"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {sortOptions.find((option) => option.value === sortBy)?.label}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-1.5 lg:mt-4 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
            <div className="relative min-w-0 flex-1">
              <input
                id="station-search"
                ref={searchInputRef}
                className="h-8 w-full rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] py-0 pl-3 pr-8 text-[11px] outline-none transition focus:border-[var(--color-brand)] focus:bg-white/[0.08] lg:h-auto lg:py-3 lg:pl-4 lg:pr-[88px] lg:text-sm"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜站点、倍率、试用、模型"
                value={query}
              />
              <div className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2">
                {query ? (
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)] transition active:bg-[var(--color-line)] active:text-[var(--color-ink)] active:scale-[0.98] md:hover:bg-[var(--color-line)] md:hover:text-[var(--color-ink)]"
                    onClick={() => { setQuery(""); setDebouncedQuery(""); }}
                    type="button"
                    aria-label="清除搜索"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                ) : null}
                <span className="hidden select-none rounded-md border border-[var(--color-line)] px-1.5 py-0.5 text-[11px] leading-tight text-[var(--color-muted)] lg:inline">
                  Ctrl+K
                </span>
              </div>
            </div>
            <select
              className="h-8 w-full cursor-pointer appearance-none rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-2.5 py-0 pr-7 text-[11px] text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand)] lg:h-auto lg:w-auto lg:px-4 lg:py-3 lg:text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
              }}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-1.5 flex flex-nowrap gap-1 overflow-x-auto pb-1 lg:mt-4 lg:flex-wrap lg:gap-2 lg:overflow-visible lg:pb-0">
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold transition lg:px-3 lg:py-2 lg:text-sm ${
                  activeFilter === filter.id
                    ? "pill-pulse bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]"
                    : "border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)] active:border-[var(--color-brand)] active:text-[var(--color-brand-deep)] active:scale-[0.98] md:hover:border-[var(--color-brand)] md:hover:text-[var(--color-brand-deep)]"
                }`}
                onClick={() => setActiveFilter(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-3 hidden flex-wrap gap-2 text-xs text-[var(--color-muted)] lg:flex">
            {filters
              .filter((filter) => filter.id !== "all")
              .map((filter) => (
                <span key={`${filter.id}-desc`} className="rounded-full bg-[var(--color-soft)] px-2.5 py-1.5">
                  {filter.label}：{filter.description}
                </span>
              ))}
          </div>

          <div className="mt-3 hidden gap-2 border-t border-[var(--color-line)] pt-3 lg:grid lg:grid-cols-4">
            <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">结果</p>
              <p className="mt-1 text-base font-black text-[var(--color-ink)]">{filteredRows.length} 个站点</p>
            </div>
            <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">本周更新</p>
              <p className="mt-1 text-base font-black text-[var(--color-ink)]">{freshnessStats.updatedThisWeek} 个</p>
            </div>
            <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">最低倍率</p>
              <p className="mt-1 text-base font-black text-[var(--color-ink)]">{lowestMultiplier}</p>
            </div>
            <div className="rounded-[16px] bg-[var(--color-brand-soft)] px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">下一步</p>
              <p className="mt-1 text-base font-black text-[var(--color-ink)]">缩候选，再补反馈</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Table ---- */}
      <section className="relative mx-auto max-w-[1680px] px-0 pb-4 sm:px-5 lg:px-6 lg:pb-6">
        <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_280px] 2xl:items-start">
          <div className="mobile-station-table overflow-hidden rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)] lg:rounded-[22px]">
          {/* Table header */}
          <div className="flex flex-nowrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-2.5 py-1.5 lg:flex-wrap lg:gap-4 lg:px-5 lg:py-4">
            <div>
              <h2 className="text-sm font-black lg:text-2xl">榜单 <span className="font-mono text-[11px] text-[var(--color-muted)] lg:hidden">{visibleRows.length}/{filteredRows.length}</span></h2>
              <div className="mt-2 hidden items-center gap-3 lg:flex">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  数据新鲜度
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  {freshnessStats.updatedThisWeek}/{freshnessStats.total} 站点本周有更新
                </span>
                <span
                  className="inline-block h-1.5 rounded-full bg-[var(--color-soft)]"
                  style={{ width: 96 }}
                >
                  <span
                    className="inline-block h-full rounded-full bg-[var(--color-brand-soft)] transition-all"
                    style={{
                      width: `${freshnessStats.total ? (freshnessStats.updatedThisWeek / freshnessStats.total) * 100 : 0}%`,
                    }}
                  />
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-nowrap gap-1.5 lg:flex-wrap lg:gap-3">
              <button
                className="rounded-full bg-[var(--color-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-brand-deep)] transition active:bg-[var(--color-brand-soft)] active:scale-[0.98] md:hover:bg-[var(--color-brand-soft)] lg:px-4 lg:py-2 lg:text-sm"
                onClick={() => setShowAllRows((value) => !value)}
                type="button"
              >
                <span className="lg:hidden">{showAllRows ? "收起" : "更多"}</span><span className="hidden lg:inline">{showAllRows ? "收起部分结果" : "展开更多中转站"}</span>
              </button>
              <Link
                href="/community"
                className="hidden rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-sm font-bold text-[var(--color-ink)] transition active:border-[var(--color-brand)] active:text-[var(--color-brand-deep)] active:scale-[0.98] md:hover:border-[var(--color-brand)] md:hover:text-[var(--color-brand-deep)] sm:inline-flex"
              >
                去论坛补反馈
              </Link>
            </div>
          </div>

          {/* ---- Mobile feed layout (below lg) ---- */}
          <div className="mobile-station-feed divide-y divide-[var(--color-line)] lg:hidden">
            {visibleRows.length === 0 ? (
              <div className="bg-[var(--color-panel)] px-6 py-16 text-center">
                {stations.length === 0 ? (
                  <>
                    <p className="text-lg font-bold text-[var(--color-muted)]">暂无站点数据</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      站点数据需要通过 Supabase 初始化。详见 README 的 Supabase 配置说明。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-[var(--color-muted)]">没有匹配的站点</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      试试调整搜索关键词或切换筛选标签
                    </p>
                    <button
                      className="mt-4 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-brand-deep)] transition hover:border-[var(--color-brand)]"
                      onClick={() => { setQuery(""); setDebouncedQuery(""); setActiveFilter("all"); }}
                      type="button"
                    >
                      清除所有筛选
                    </button>
                  </>
                )}
              </div>
            ) : (
              visibleRows.map((station, index) => {
                const isEditing = editingId === station.id;
                const isShowingHistory = historyStationId === station.id;
                const stationHref = getSafeExternalHref(station.url);

                return (
                  <div key={station.id}>
                    <div
                      className="mobile-station-row relative z-10 cursor-pointer bg-[var(--color-panel)] px-2.5 py-2 transition-colors active:bg-[var(--color-soft)]"
                      onClick={() => handleDetailStationClick(station)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] text-[9px] font-black text-[var(--color-muted)]">
                          {rankingBadge(index).replace("#", "")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                          <button
                              className="relative z-20 min-w-0 truncate text-left text-[13px] font-black leading-4 text-[var(--color-ink)] transition active:text-[var(--color-brand)] active:scale-[0.98] md:hover:text-[var(--color-brand)]"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDetailStationClick(station);
                            }}
                            type="button"
                          >
                            {station.name}
                          </button>
                            {station.badge ? (
                              <span className="shrink-0 rounded-full bg-[var(--color-brand-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-brand-deep)]">
                                {station.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] leading-[14px] text-[var(--color-muted)]">
                            {station.note || station.models || station.packageType || "暂无备注"}
                          </p>
                        </div>

                        <div className="grid w-[76px] shrink-0 grid-cols-1 gap-0.5 text-right">
                          <p className="truncate text-[11px] font-black leading-4 text-[var(--color-ink)]">
                            {station.multiplier || station.price || "待补"}
                          </p>
                          <p className={`truncate text-[10px] font-bold leading-4 ${uptimeTone(station.uptime)}`}>
                            {station.uptime || station.status || "待测"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {stationHref ? (
                            <a
                              aria-label={`打开 ${station.name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[10px] font-black text-[var(--color-brand-deep)]"
                              href={stationHref}
                              onClick={(event) => event.stopPropagation()}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              ↗
                            </a>
                          ) : null}
                          <button
                            aria-label={`${station.name} 讨论`}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-muted)]"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDiscussionStation(station);
                            }}
                            type="button"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Edit panel */}
                    {isEditing && renderEditPanel()}

                    {/* History panel */}
                    {isShowingHistory && renderHistoryPanel(station)}
                  </div>
                );
              })
            )}

            {/* Add-new button */}
            {isConnected && !addingNew && (
              <button
                className="w-full rounded-full border border-dashed border-[var(--color-brand-soft)] bg-[var(--color-soft)] px-5 py-3 text-sm font-bold text-[var(--color-brand-deep)] transition active:border-[var(--color-brand)] active:bg-[var(--color-brand-soft)] active:scale-[0.98] md:hover:border-[var(--color-brand)] md:hover:bg-[var(--color-brand-soft)] md:col-span-2"
                onClick={startAdd}
                type="button"
              >
                + 添加新站点
              </button>
            )}

            {/* Create panel */}
            {addingNew && <div className="md:col-span-2">{renderCreatePanel()}</div>}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <div className="min-w-[1480px]">
              {/* Column headers */}
              <div className="grid grid-cols-[1.35fr_0.9fr_0.72fr_0.92fr_0.82fr_0.7fr_0.78fr_0.68fr_0.9fr] bg-white/[0.03] px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                <span>站点</span>
                <span>分组/模型</span>
                <span>价格</span>
                <span>价格趋势</span>
                <span>Token消耗</span>
                <span>在线率</span>
                <span>纯度/成功率</span>
                <span>延迟</span>
                <span>运行状态</span>
              </div>

              {/* Rows */}
              {visibleRows.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  {stations.length === 0 ? (
                    <>
                      <p className="text-lg font-bold text-[var(--color-muted)]">暂无站点数据</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        站点数据需要通过 Supabase 初始化。详见 README 的 Supabase 配置说明。
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-[var(--color-muted)]">没有匹配的站点</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        试试调整搜索关键词或切换筛选标签
                      </p>
                      <button
                        className="mt-4 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-brand-deep)] transition active:border-[var(--color-brand)] active:scale-[0.98] md:hover:border-[var(--color-brand)]"
                        onClick={() => { setQuery(""); setDebouncedQuery(""); setActiveFilter("all"); }}
                        type="button"
                      >
                        清除所有筛选
                      </button>
                    </>
                  )}
                </div>
              ) : (
                visibleRows.map((station, index) => {
                const isEditing = editingId === station.id;
                const isShowingHistory = historyStationId === station.id;
                const stationHref = getSafeExternalHref(station.url);

                return (
                  <div key={station.id}>
                    <article
                      className="group relative z-10 grid cursor-pointer grid-cols-[1.35fr_0.9fr_0.72fr_0.92fr_0.82fr_0.7fr_0.78fr_0.68fr_0.9fr] items-center gap-x-3 border-b border-white/5 px-5 py-3 pr-14 text-sm transition active:bg-white/[0.02] active:scale-[0.98] md:hover:bg-white/[0.02]"
                      onClick={() => handleDetailStationClick(station)}
                    >
                      {/* 站点 */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-[var(--color-muted)]">{rankingBadge(index)}</span>
                          <button
                            className="relative z-20 max-w-[180px] truncate text-left font-bold text-[var(--color-ink)] transition active:text-[var(--color-brand)] active:scale-[0.98] md:hover:text-[var(--color-brand)]"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDetailStationClick(station);
                            }}
                            type="button"
                          >
                            {station.name}
                          </button>
                          {station.badge ? (
                            <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              {station.badge}
                            </span>
                          ) : null}
                          {station.packageType ? (
                            <span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                              {station.packageType.slice(0, 8)}
                            </span>
                          ) : null}
                          {(() => {
                            const fi = freshnessInfo(station.lastEditAt);
                            if (!fi) return null;
                            return (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] ${
                                  fi.isRecent
                                    ? "text-[var(--color-brand-deep)]"
                                    : "text-[var(--color-muted)]"
                                }`}
                              >
                                <span
                                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                                    fi.isRecent ? "bg-green-500" : "bg-[var(--color-muted)]"
                                  }`}
                                />
                                {fi.label}
                              </span>
                            );
                          })()}
                        </div>
                        <button
                          className="absolute right-4 top-4 z-20 rounded-full p-2 text-zinc-500 transition-colors active:bg-white/5 active:text-emerald-400 active:scale-[0.98] md:hover:bg-white/5 md:hover:text-emerald-400"
                          onClick={(event) => {
                            event.stopPropagation();
                            openWikiEditModal(station);
                          }}
                          title="编辑此站点"
                          type="button"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)]">
                          {stationHref ? (
                            <a
                              href={stationHref}
                              rel="noopener noreferrer"
                              target="_blank"
                              className="relative z-20 font-semibold text-zinc-300 transition active:text-white active:scale-[0.98] md:hover:text-white"
                              onClick={(event) => event.stopPropagation()}
                            >
                              打开入口
                            </a>
                          ) : null}
                          <button
                            className="relative z-20 transition active:text-[var(--color-brand-deep)] active:scale-[0.98] md:hover:text-[var(--color-brand-deep)]"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDiscussionStation(station);
                            }}
                            title="查看站点讨论"
                            type="button"
                          >
                            讨论区
                          </button>
                          <button
                            className="relative z-20 transition active:text-[var(--color-brand-deep)] active:scale-[0.98] md:hover:text-[var(--color-brand-deep)]"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleHistory(station.id);
                            }}
                            type="button"
                          >
                            {isShowingHistory ? "收起历史" : "历史"}
                          </button>
                        </div>
                      </div>

                      {/* 分组/模型 */}
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-bold text-zinc-200">{station.groupName || "default"}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-[var(--color-muted)]">{station.models || station.packageType || "model pending"}</p>
                      </div>

                      {/* 价格 */}
                      <div>
                        <p className="font-mono text-sm font-bold text-zinc-100">{station.price || station.multiplier || "待补"}</p>
                        {station.multiplier ? <p className="mt-1 text-xs text-[var(--color-muted)]">{station.multiplier}</p> : null}
                      </div>

                      {/* 价格趋势 */}
                      <div className="font-mono text-xs font-bold">
                        <MiniSparkline station={station} />
                      </div>

                      {/* Token消耗 */}
                      <div>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-bold text-zinc-300">
                          {inferTokenCost(station)}
                        </span>
                      </div>

                      {/* 在线率 */}
                      <div className={`font-mono text-sm font-black ${uptimeTone(station.uptime)}`}>
                        {station.uptime || "待测"}
                      </div>

                      {/* 纯度/成功率 */}
                      <div className="text-xs font-bold text-zinc-300">{inferFidelity(station)}</div>

                      {/* 延迟 */}
                      <div className="font-mono text-sm font-bold text-zinc-200">{station.latency || "--"}</div>

                      {/* 运行状态 */}
                      <div className="flex items-center gap-2.5">
                        <MiniStatusBars station={station} />
                        <span className="line-clamp-1 text-xs text-[var(--color-muted)]">{station.status || "待检测"}</span>
                      </div>
                      <button
                        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full p-2 text-zinc-500 opacity-70 transition-colors active:bg-white/5 active:text-emerald-400 active:scale-[0.98] md:hover:bg-white/5 md:hover:text-emerald-400 md:group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          openWikiEditModal(station);
                        }}
                        title="编辑此站点"
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </article>

                    {/* Edit panel (below row) */}
                    {isEditing && renderEditPanel()}

                    {/* History panel (below row) */}
                    {isShowingHistory && renderHistoryPanel(station)}
                  </div>
                );
              })
              )}

              {/* Add-new button */}
              {isConnected && !addingNew && (
                <div className="px-6 py-4 border-t border-dashed border-[var(--color-line)]">
                  <button
                    className="rounded-full border border-dashed border-[var(--color-brand-soft)] bg-[var(--color-soft)] px-5 py-2.5 text-sm font-bold text-[var(--color-brand-deep)] transition active:border-[var(--color-brand)] active:bg-[var(--color-brand-soft)] active:scale-[0.98] md:hover:border-[var(--color-brand)] md:hover:bg-[var(--color-brand-soft)]"
                    onClick={startAdd}
                    type="button"
                  >
                    + 添加新站点
                  </button>
                </div>
              )}

              {/* Create panel (below all rows) */}
              {addingNew && renderCreatePanel()}
            </div>
          </div>

          {/* Table footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-line)] px-3 py-2.5 lg:gap-4 lg:px-5 lg:py-4">
            <p className="text-xs leading-5 text-[var(--color-muted)] lg:text-sm lg:leading-7">
              {filteredRows.length === 0
                ? "没有匹配的站点，试试调整筛选条件。"
                : `当前显示 ${visibleRows.length} / ${filteredRows.length} 条。`}
            </p>
            {!showAllRows && filteredRows.length > visibleRows.length ? (
              <button
                className="rounded-full bg-[var(--color-brand)] px-3 py-2 text-xs font-bold text-[var(--color-on-brand)] transition active:bg-[var(--color-brand-deep)] active:scale-[0.98] md:hover:bg-[var(--color-brand-deep)] lg:px-5 lg:py-3 lg:text-sm"
                onClick={() => setShowAllRows(true)}
                type="button"
              >
                查看剩余 {filteredRows.length - visibleRows.length} 条
              </button>
            ) : null}
          </div>

          </div>

          <aside className="hidden 2xl:block">
            <div className="surface-in sticky top-24 rounded-[24px] border border-[var(--color-line)] bg-[linear-gradient(180deg,var(--color-panel),color-mix(in_srgb,var(--color-soft)_68%,var(--color-panel)))] p-4 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">快速动作</p>

              <div className="mt-4 grid gap-2.5">
                <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    当前显示
                  </p>
                  <p className="mt-1 text-base font-black text-[var(--color-ink)]">
                    {visibleRows.length} / {filteredRows.length} 条
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                    按当前筛选结果显示。
                  </p>
                </div>

                <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    看表顺序
                  </p>
                  <p className="mt-2 text-sm font-black text-[var(--color-ink)]">倍率和门槛先看，备注后看</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                    入口、套餐和更新时间决定是否值得继续试。
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-[var(--color-line)] pt-4">
                <Link
                  href="/community"
                  className="block rounded-full bg-[var(--color-brand)] px-5 py-3 text-center text-sm font-bold text-[var(--color-on-brand)] transition active:bg-[var(--color-brand-deep)] active:scale-[0.98] md:hover:bg-[var(--color-brand-deep)]"
                >
                  进入站内讨论区
                </Link>
                <a
                  href="https://github.com/hfeng620-cmd/timin_api_test_and_forum/discussions"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-center text-sm font-bold text-[var(--color-ink)] transition active:border-[var(--color-brand)] active:text-[var(--color-brand-deep)] active:scale-[0.98] md:hover:border-[var(--color-brand)] md:hover:text-[var(--color-brand-deep)]"
                >
                  GitHub Discussions
                </a>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-[var(--color-line)] pt-4 text-sm">
                <a
                  href="https://huhuai.xyz/register?aff=BCPA5AKW3KHX"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block rounded-[18px] bg-[var(--color-soft)] px-4 py-3 leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  虎虎注册链接：直接送额度
                </a>
                <a
                  href="https://www.kdocs.cn/l/cj84YbmlJswN"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block rounded-[18px] bg-[var(--color-soft)] px-4 py-3 leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  历史填表记录：以前群里有过填表送额度
                </a>
                <a
                  href="https://www.kdocs.cn/l/cr2932V6f6bH"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block rounded-[18px] bg-[var(--color-soft)] px-4 py-3 leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  API 中转站集合统计表：继续补更多站点
                </a>
              </div>

              <div className="mt-5 rounded-[18px] bg-[var(--color-soft)] px-4 py-3 text-sm leading-7 text-[var(--color-muted)]">
                <p className="font-semibold text-[var(--color-ink)]">QQ群 602190132</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ---- Submission ---- */}
      <section className="relative mx-auto hidden max-w-[1680px] px-3 pb-8 sm:px-5 lg:block lg:px-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.52fr)] xl:items-start">
          <SubmissionPanel />

          <aside className="surface-in rounded-[26px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              投稿前确认
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--color-ink)]">补站点，也补上下文</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              投稿不需要一次写完所有字段，优先给入口、倍率、套餐门槛和你看到的变化，后续可以继续在讨论区补证据。
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[20px] bg-[var(--color-soft)] px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  短规则
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  不贴敏感密钥；入口尽量用官网或公开注册链接；不确定的数据可以标为待补测。
                </p>
              </div>

              <div className="rounded-[20px] bg-[var(--color-soft)] px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  编辑口径
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  登录后可直接补站和修改字段；当前人少，改动会直接保存到正式榜单。
                </p>
              </div>

              <div className="rounded-[20px] bg-[var(--color-brand-soft)] px-4 py-3.5 text-sm leading-7 text-[var(--color-muted)]">
                <p className="font-black text-[var(--color-ink)]">优先补这四项</p>
                <p className="mt-1">
                  入口、倍率、套餐门槛、更新时间。短线变化放讨论区，稳定后再沉淀回榜单。
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ---- Station Detail Modal ---- */}
      <RelayStationDetailModal
        station={detailStation}
        open={detailStation !== null}
        onClose={() => setDetailStation(null)}
      />

      <StationEditModal
        editorName={displayName || "未知用户"}
        isAdmin={isAdmin || isOwner}
        onClose={() => setWikiEditStation(null)}
        onSaved={() => void refreshStations()}
        open={wikiEditStation !== null}
        station={wikiEditStation}
        userId={user?.id ?? null}
      />

      {/* ---- Station Discussion Modal (Portal to body) ---- */}
      {discussionStation && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090b]/50 p-4"
          style={{ backdropFilter: 'blur(4px)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) setDiscussionStation(null); }}
        >
          <div className="relative flex h-[85vh] w-[95vw] max-w-4xl flex-col overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                  <svg className="h-5 w-5 text-[var(--color-brand-deep)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-black text-[var(--color-ink)]">{discussionStation.name} 讨论区</h2>
                  <p className="text-xs text-[var(--color-muted)]">价格、入口和稳定性反馈</p>
                </div>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)] transition active:bg-[var(--color-soft)] active:text-[var(--color-ink)] active:scale-[0.98] md:hover:bg-[var(--color-soft)] md:hover:text-[var(--color-ink)]"
                onClick={() => setDiscussionStation(null)}
                type="button"
                aria-label="关闭"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Content - scrollable area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-4">
                <DiscussionFeed
                  hideComposer={false}
                  hideHeader={true}
                  title={`${discussionStation.name} 讨论`}
                  stationId={discussionStation.id}
                  stationFilter={discussionStation.name}
                  showSyncButton={true}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick action FAB — bottom-right */}
      {isConnected && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-[60] lg:bottom-6">
          {quickMenuOpen && (
            <div className="surface-in mb-3 flex flex-col gap-2 rounded-[16px] border border-[var(--color-line)] bg-[var(--color-panel)] p-3 shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
              <button
                className="whitespace-nowrap rounded-[12px] px-4 py-2.5 text-left text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-soft)]"
                onClick={() => { setQuickMenuOpen(false); setAddingNew(true); }}
                type="button"
              >
                ＋ 添加中转站
              </button>
              <button
                className="whitespace-nowrap rounded-[12px] px-4 py-2.5 text-left text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-soft)]"
                onClick={() => { setQuickMenuOpen(false); document.getElementById("station-search")?.focus(); }}
                type="button"
              >
                ✎ 搜索站点后编辑
              </button>
            </div>
          )}
          <button
            aria-label="站点操作"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-xl font-bold text-[var(--color-on-brand)] shadow-[0_8px_28px_var(--color-panel-glow)] transition active:scale-95 active:opacity-90 active:bg-[var(--color-brand-deep)] md:hover:bg-[var(--color-brand-deep)]"
            onClick={() => setQuickMenuOpen((v) => !v)}
            type="button"
          >
            {quickMenuOpen ? "✕" : "＋"}
          </button>
        </div>
      )}
    </>
  );
}

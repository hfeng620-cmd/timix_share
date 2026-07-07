"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadStations,
  reorderStation,
  updateStation,
  notifyStationsChanged,
  type Station,
} from "@/lib/station-storage";

type StationEditorModalProps = {
  open: boolean;
  onClose: () => void;
};

const FIELD_META: { key: keyof Station; label: string; type: "text" | "textarea" }[] = [
  { key: "name", label: "站点名", type: "text" },
  { key: "url", label: "网址", type: "text" },
  { key: "badge", label: "标签", type: "text" },
  { key: "price", label: "标称价格", type: "text" },
  { key: "multiplier", label: "倍率", type: "text" },
  { key: "entry", label: "入口/地址", type: "text" },
  { key: "packageType", label: "收费方式", type: "text" },
  { key: "status", label: "状态", type: "text" },
  { key: "models", label: "模型", type: "textarea" },
  { key: "uptime", label: "在线率", type: "text" },
  { key: "latency", label: "延迟", type: "text" },
  { key: "source", label: "来源", type: "text" },
  { key: "verdict", label: "评价", type: "text" },
  { key: "note", label: "备注", type: "textarea" },
  { key: "advantage", label: "优势", type: "textarea" },
  { key: "risk", label: "风险", type: "textarea" },
  { key: "groupName", label: "分组", type: "text" },
];

const NON_EDITABLE: (keyof Station)[] = ["id", "sortOrder", "lastEditorName", "lastEditAt"];

function getEditableFields(): (keyof Station)[] {
  return FIELD_META.map((f) => f.key).filter((k) => !NON_EDITABLE.includes(k));
}

export function StationEditorModal({ open, onClose }: StationEditorModalProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Station>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStations(await loadStations());
      setStatus("");
    } catch {
      setStatus("加载站点失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function startEdit(s: Station) {
    setEditingId(s.id);
    const d: Partial<Station> = {};
    for (const key of getEditableFields()) d[key] = s[key] as any;
    setDraft(d);
    setStatus("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setStatus("");
    try {
      await updateStation(editingId, draft, "管理员");
      notifyStationsChanged();
      setStatus("已保存");
      setEditingId(null);
      setDraft({});
      await refresh();
    } catch (e: any) {
      setStatus(`保存失败: ${e?.message || "未知错误"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(id: string, dir: -1 | 1) {
    setReorderingId(id);
    try {
      await reorderStation(id, dir);
      await refresh();
    } catch (e: any) {
      setStatus(`排序失败: ${e?.message || "未知错误"}`);
    } finally {
      setReorderingId(null);
    }
  }

  // HTML5 drag-and-drop
  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId) setDragOverId(id);
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    setDragOverId(null);
    setDragId(null);
    if (!dragId || dragId === targetId) return;

    // Find indices and repeatedly move the dragged item toward the target
    const fromIdx = stations.findIndex((s) => s.id === dragId);
    const toIdx = stations.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const dir: -1 | 1 = toIdx > fromIdx ? 1 : -1;
    const steps = Math.abs(toIdx - fromIdx);
    setReorderingId(dragId);
    try {
      for (let i = 0; i < steps; i++) {
        await reorderStation(dragId, dir);
      }
      await refresh();
    } catch (e: any) {
      setStatus(`拖拽排序失败: ${e?.message || "未知错误"}`);
    } finally {
      setReorderingId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-[#09090b]/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#09090b]/70 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-xl font-heading italic text-white">站点编辑器</h2>
            <p className="mt-1 text-xs text-white/40 font-body">
              {stations.length} 个站点 · 拖拽或点击箭头排序 · 点击行展开编辑
            </p>
          </div>
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-white/50 active:bg-white/10 active:text-white active:scale-[0.98] md:hover:bg-white/10 md:hover:text-white transition font-body">
            关闭
          </button>
        </div>

        {/* Status */}
        {status && (
          <div className="border-b border-white/10 px-6 py-2 text-xs text-white/50 font-body">{status}</div>
        )}

        {/* Station list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="py-12 text-center text-sm text-white/40 font-body">加载中...</p>
          ) : stations.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/40 font-body">暂无站点数据</p>
          ) : (
            <div className="space-y-1">
              {stations.map((s, idx) => {
                const isEditing = editingId === s.id;
                const isDragOver = dragOverId === s.id;
                const isDragging = dragId === s.id;

                return (
                  <div key={s.id} className={isDragOver ? "border-t-2 border-white/30" : ""}>
                    {/* Row */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, s.id)}
                      onDragOver={(e) => handleDragOver(e, s.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, s.id)}
                      onClick={() => isEditing ? cancelEdit() : startEdit(s)}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition ${
                        isDragging
                          ? "opacity-30"
                          : isEditing
                            ? "bg-white/10 border border-white/20"
                            : "active:bg-white/[0.04] md:hover:bg-white/[0.04]"
                      }`}
                    >
                      {/* Drag handle */}
                      <span className="shrink-0 cursor-grab text-white/20 select-none">⠿</span>

                      {/* Rank + arrows */}
                      <span className="shrink-0 w-6 text-center font-mono text-xs text-white/30">{idx + 1}</span>
                      <div className="flex shrink-0 flex-col items-center leading-none">
                        <button
                          className="text-xs text-white/25 active:text-white active:scale-[0.98] md:hover:text-white disabled:opacity-10 transition"
                          disabled={idx === 0 || reorderingId === s.id}
                          onClick={(e) => { e.stopPropagation(); handleMove(s.id, -1); }}
                          type="button"
                        >▲</button>
                        <button
                          className="text-xs text-white/25 active:text-white active:scale-[0.98] md:hover:text-white disabled:opacity-10 transition"
                          disabled={idx === stations.length - 1 || reorderingId === s.id}
                          onClick={(e) => { e.stopPropagation(); handleMove(s.id, 1); }}
                          type="button"
                        >▼</button>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-white">{s.name}</span>
                        {s.badge && <span className="ml-2 text-xs text-white/40">({s.badge})</span>}
                        <span className="ml-3 text-xs text-white/30 hidden sm:inline">{s.url || "无网址"}</span>
                      </div>

                      {/* Quick meta */}
                      <span className="hidden shrink-0 gap-3 text-xs text-white/30 lg:flex">
                        {s.price && <span>{s.price}</span>}
                        {s.multiplier && <span>{s.multiplier}</span>}
                        {s.status && <span>{s.status}</span>}
                      </span>

                      {/* Edit indicator */}
                      <span className="shrink-0 text-xs text-white/20">{isEditing ? "收起 ▲" : "编辑"}</span>
                    </div>

                    {/* Expanded edit form */}
                    {isEditing && (
                      <div className="mx-4 mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {FIELD_META.map(({ key, label, type }) => {
                            if (NON_EDITABLE.includes(key)) return null;
                            const value = (draft as any)[key] ?? "";
                            return (
                              <label key={key} className="block space-y-1">
                                <span className="text-xs text-white/40 font-body">{label}</span>
                                {type === "textarea" ? (
                                  <textarea
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white outline-none transition focus:border-white/30 font-body resize-none"
                                    rows={2}
                                    value={value}
                                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                                  />
                                ) : (
                                  <input
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white outline-none transition focus:border-white/30 font-body"
                                    value={value}
                                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white active:bg-white/25 active:scale-[0.98] md:hover:bg-white/25 disabled:opacity-50 transition font-body"
                            disabled={saving}
                            onClick={saveEdit}
                            type="button"
                          >
                            {saving ? "保存中..." : "保存修改"}
                          </button>
                          <button
                            className="rounded-full px-4 py-2 text-sm text-white/40 active:text-white active:scale-[0.98] md:hover:text-white transition font-body"
                            onClick={cancelEdit}
                            type="button"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/10 px-6 py-3 flex items-center justify-between" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
          <span className="text-xs text-white/25 font-body">拖拽⠿手柄或点击▲▼排序 · 点击行编辑字段</span>
          <button
            className="rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/50 active:bg-white/20 active:scale-[0.98] md:hover:bg-white/20 transition font-body"
            onClick={refresh}
            type="button"
          >
            刷新列表
          </button>
        </div>
      </div>
    </div>
  );
}

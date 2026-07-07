"use client";

import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  submitStationEditRequest,
  updateStation,
  type Station,
  type StationEditRequestPayload,
} from "@/lib/station-storage";
import { useToast } from "@/lib/toast-context";

type StationEditModalProps = {
  station: Station | null;
  open: boolean;
  isAdmin: boolean;
  userId: string | null;
  editorName: string;
  onClose: () => void;
  onSaved: () => void;
};

type EditField = {
  key: keyof StationEditRequestPayload;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

const EDIT_FIELDS: EditField[] = [
  { key: "price", label: "价格", placeholder: "例如：¥1.9 / 0.12x / 待补录" },
  { key: "multiplier", label: "倍率", placeholder: "例如：0.12x" },
  { key: "packageType", label: "Token消耗 / 收费方式", placeholder: "例如：平均水平 / 多一些 / 模型分组计价" },
  { key: "status", label: "运行状态", placeholder: "例如：正常 / 波动 / 待补测" },
  { key: "uptime", label: "在线率", placeholder: "例如：99.8%" },
  { key: "latency", label: "延迟", placeholder: "例如：1.32s / 320ms" },
  { key: "models", label: "模型支持", placeholder: "例如：Claude / GPT / Grok" },
  { key: "risk", label: "纯度/成功率", placeholder: "例如：几乎不 / 中等 / 需观察" },
  { key: "note", label: "备注", placeholder: "补充依据、测速时间或注意事项", multiline: true },
];

function buildInitialForm(station: Station | null): StationEditRequestPayload {
  if (!station) return {};
  return {
    price: station.price,
    multiplier: station.multiplier,
    packageType: station.packageType,
    status: station.status,
    uptime: station.uptime,
    latency: station.latency,
    models: station.models,
    risk: station.risk,
    note: station.note,
  };
}

function trimForm(form: StationEditRequestPayload): StationEditRequestPayload {
  const next: StationEditRequestPayload = {};
  for (const field of EDIT_FIELDS) {
    const value = form[field.key];
    if (typeof value === "string") {
      Object.assign(next, { [field.key]: value.trim() });
    }
  }
  return next;
}

export function StationEditModal({
  station,
  open,
  isAdmin,
  userId,
  editorName,
  onClose,
  onSaved,
}: StationEditModalProps) {
  const { addToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<StationEditRequestPayload>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(station));
    const unlock = lockBodyScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      unlock();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, station, onClose]);

  async function handleSubmit() {
    if (!station || !userId) {
      addToast("请先登录再提交修改", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = trimForm(form);

      if (isAdmin) {
        await updateStation(station.id, payload, editorName || "管理员");
        addToast("数据更新成功！", "success");
      } else {
        await submitStationEditRequest({
          stationId: station.id,
          userId,
          editorName: editorName || "站内用户",
          suggestedData: payload,
        });
        addToast("已提交修改申请，管理员审核后会生效。", "success");
      }

      onSaved();
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? `操作失败: ${error.message}` : "操作失败，请稍后重试", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open || !station || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="关闭"
          className="absolute right-4 top-4 rounded-full bg-zinc-900/80 p-2 text-zinc-400 transition hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
            Wiki Edit
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">{station.name}</h2>
          <p className="mt-2 text-sm text-zinc-500">
            {isAdmin ? "管理员将直接写入正式榜单。" : "普通用户的修改会进入后台审核。"}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {EDIT_FIELDS.map((field) => (
            <label key={field.key} className="block space-y-2 text-sm text-zinc-300">
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea
                  className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300/60"
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  value={form[field.key] ?? ""}
                />
              ) : (
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-300/60"
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  value={form[field.key] ?? ""}
                />
              )}
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 text-zinc-400 transition hover:text-white"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isAdmin ? "直接保存修改" : "提交修改申请"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

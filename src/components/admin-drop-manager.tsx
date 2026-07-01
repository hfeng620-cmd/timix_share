"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Gift, Loader2, UploadCloud } from "lucide-react";

import { createCampaignWithBulkCodes } from "@/lib/drop-storage";
import { useForumAuth } from "@/lib/forum-auth";

const emptyForm = {
  title: "",
  sponsorName: "",
  sponsorUrl: "",
  description: "",
};

function parseCodes(text: string) {
  return text
    .split("\n")
    .map((code) => code.trim())
    .filter(Boolean);
}

export function AdminDropManager() {
  const { isAdmin } = useForumAuth();
  const [form, setForm] = useState(emptyForm);
  const [bulkCodesText, setBulkCodesText] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeList = useMemo(() => parseCodes(bulkCodesText), [bulkCodesText]);

  if (!isAdmin) {
    return null;
  }

  function resetForm() {
    setForm(emptyForm);
    setBulkCodesText("");
  }

  async function handlePublish() {
    setStatus(null);
    const nextCodeList = parseCodes(bulkCodesText);

    if (nextCodeList.length === 0) {
      setStatus({ type: "error", message: "请至少输入一个兑换码。" });
      return;
    }

    setIsSubmitting(true);
    const result = await createCampaignWithBulkCodes({
      ...form,
      codeList: nextCodeList,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.error });
      return;
    }

    setStatus({ type: "success", message: `成功发布活动，共存入 ${nextCodeList.length} 个兑换码！` });
    resetForm();
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Admin Drop Console</p>
            <h2 className="mt-2 flex items-center gap-2 text-lg font-bold text-emerald-400">
              <Gift className="h-5 w-5" />
              新建福利活动 (Drop)
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              批量粘贴赞助商兑换码，一次性创建活动并写入库存表。
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
            <p className="text-xs text-emerald-200/70">已识别兑换码</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-200">{codeList.length}</p>
          </div>
        </div>

        {status ? (
          <div
            className={`mt-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
              status.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "border-red-400/20 bg-red-400/10 text-red-100"
            }`}
          >
            {status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
            {status.message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-zinc-300">
            <span>活动标题</span>
            <input
              value={form.title}
              onChange={(event) => setForm((next) => ({ ...next, title: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
              placeholder="DeepSeek API 福利活动"
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span>赞助商名称</span>
            <input
              value={form.sponsorName}
              onChange={(event) => setForm((next) => ({ ...next, sponsorName: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
              placeholder="Timix 观察站"
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
            <span>注册链接</span>
            <input
              value={form.sponsorUrl}
              onChange={(event) => setForm((next) => ({ ...next, sponsorUrl: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
              placeholder="https://timix.top"
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
            <span>活动说明</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((next) => ({ ...next, description: event.target.value }))}
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-white outline-none transition focus:border-emerald-300/60"
              placeholder="限量发放，先到先得..."
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
            <span>批量兑换码 (每行一个)</span>
            <textarea
              value={bulkCodesText}
              onChange={(event) => setBulkCodesText(event.target.value)}
              rows={10}
              className="w-full resize-y rounded-2xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-emerald-50 outline-none transition placeholder:text-zinc-600 focus:border-emerald-300/60"
              placeholder={"XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY\n..."}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            已识别: <span className="font-mono font-bold text-emerald-300">{codeList.length}</span> 个兑换码
          </p>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(52,211,153,0.22)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isSubmitting ? "正在发布..." : "一键发布活动并入库"}
          </button>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createCampaign,
  deleteCampaign,
  loadAllCampaigns,
  loadCampaignSubmissions,
  toggleCampaignActive,
  type CampaignAdmin,
  type UserSubmission,
} from "@/lib/drop-storage";

const initialForm = {
  title: "",
  sponsorName: "",
  sponsorUrl: "",
  description: "",
  customQuestion: "",
  customOptions: "",
  codeCount: "10",
};

function RatingBadge({ rating }: { rating: string }) {
  const palette: Record<string, string> = {
    神级体验: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    非常实用: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    还有欠缺: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${palette[rating] ?? "border-zinc-500/30 bg-zinc-500/10 text-zinc-300"}`}>
      {rating}
    </span>
  );
}

export function CampaignAdmin() {
  const [campaigns, setCampaigns] = useState<CampaignAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const refreshCampaigns = useCallback(async () => {
    setLoading(true);
    setCampaigns(await loadAllCampaigns());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshCampaigns();
  }, [refreshCampaigns]);

  async function handleCreate() {
    const codeCount = Number.parseInt(form.codeCount, 10);
    if (!form.title.trim() || !form.sponsorName.trim() || !form.sponsorUrl.trim()) {
      setStatus("请填写活动标题、赞助商名称和链接。");
      return;
    }
    if (!Number.isFinite(codeCount) || codeCount < 1 || codeCount > 1000) {
      setStatus("兑换码数量需要在 1-1000 之间。");
      return;
    }

    setSaving(true);
    const result = await createCampaign({ ...form, codeCount });
    setSaving(false);

    if (!result.ok) {
      setStatus(`创建失败：${result.error}`);
      return;
    }

    setStatus("活动已创建，兑换码已自动生成。");
    setForm(initialForm);
    setShowForm(false);
    void refreshCampaigns();
  }

  async function handleToggle(campaign: CampaignAdmin) {
    const result = await toggleCampaignActive(campaign.id, !campaign.is_active);
    if (!result.ok) {
      setStatus(`操作失败：${result.error}`);
      return;
    }
    setStatus(campaign.is_active ? "活动已暂停。" : "活动已重新启用。");
    void refreshCampaigns();
  }

  async function handleDelete(campaign: CampaignAdmin) {
    if (!window.confirm(`确定删除「${campaign.title}」吗？相关兑换码和领取记录会一起删除。`)) return;
    const result = await deleteCampaign(campaign.id);
    if (!result.ok) {
      setStatus(`删除失败：${result.error}`);
      return;
    }
    setStatus("活动已删除。");
    setDetailId(null);
    void refreshCampaigns();
  }

  async function openSubmissions(campaignId: string) {
    if (detailId === campaignId) {
      setDetailId(null);
      return;
    }
    setDetailId(campaignId);
    setSubmissionsLoading(true);
    setSubmissions(await loadCampaignSubmissions(campaignId));
    setSubmissionsLoading(false);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-950/80 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Campaign Drops</p>
          <h2 className="mt-2 text-2xl font-heading italic text-white">福利 Drop 活动管理</h2>
          <p className="mt-2 text-sm text-zinc-400">站内创建活动、自动生成兑换码，并查看用户领取反馈。</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="rounded-full bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-950 transition active:bg-white active:scale-[0.98] md:hover:bg-white"
        >
          {showForm ? "收起表单" : "新建活动"}
        </button>
      </div>

      {status && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {status}
        </div>
      )}

      {showForm && (
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <h3 className="text-lg font-medium text-white">新建福利活动</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-zinc-300">
              <span>活动标题</span>
              <input
                value={form.title}
                onChange={(event) => setForm((next) => ({ ...next, title: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/35"
                placeholder="DeepSeek API 福利活动"
              />
            </label>
            <label className="space-y-1 text-sm text-zinc-300">
              <span>赞助商名称</span>
              <input
                value={form.sponsorName}
                onChange={(event) => setForm((next) => ({ ...next, sponsorName: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/35"
                placeholder="Timix 观察站"
              />
            </label>
            <label className="space-y-1 text-sm text-zinc-300">
              <span>赞助商链接</span>
              <input
                value={form.sponsorUrl}
                onChange={(event) => setForm((next) => ({ ...next, sponsorUrl: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/35"
                placeholder="https://timix.top"
              />
            </label>
            <label className="space-y-1 text-sm text-zinc-300">
              <span>兑换码数量</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={form.codeCount}
                onChange={(event) => setForm((next) => ({ ...next, codeCount: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/35"
              />
            </label>
          </div>
          <label className="mt-4 block space-y-1 text-sm text-zinc-300">
            <span>活动说明</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((next) => ({ ...next, description: event.target.value }))}
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/35"
              placeholder="说明兑换码权益、使用方式和注意事项。"
            />
          </label>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold text-emerald-100">附加互动问卷 (可选)</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-300">
                <span>自定义问题</span>
                <input
                  value={form.customQuestion}
                  onChange={(event) => setForm((next) => ({ ...next, customQuestion: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/35"
                  placeholder="例如：你觉得本次活动的UI怎么样？"
                />
              </label>
              <label className="space-y-1 text-sm text-zinc-300">
                <span>自定义选项</span>
                <input
                  value={form.customOptions}
                  onChange={(event) => setForm((next) => ({ ...next, customOptions: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-emerald-300/35"
                  placeholder="例如：🔥 夯爆了, 🤖 NPC, 💩 拉完了 (请用逗号分隔)"
                />
              </label>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="mt-5 rounded-full bg-zinc-100 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition active:bg-white active:scale-[0.98] md:hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "创建中..." : "确认创建并生成兑换码"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-8 text-sm text-zinc-500">活动加载中...</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-950 p-10 text-center text-sm text-zinc-500">暂无福利活动。</div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <article key={campaign.id} className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-medium text-white">{campaign.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${campaign.is_active ? "bg-emerald-400/10 text-emerald-300" : "bg-zinc-700 text-zinc-300"}`}>
                      {campaign.is_active ? "进行中" : "已暂停"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{campaign.sponsor_name} · {campaign.sponsor_url}</p>
                  {campaign.description && <p className="mt-3 text-sm leading-6 text-zinc-500">{campaign.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-400">
                    <span className="rounded-full bg-white/5 px-3 py-1">剩余 {campaign.remaining_codes}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">已领 {campaign.claimed_codes}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">总量 {campaign.total_codes}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openSubmissions(campaign.id)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition active:border-emerald-300/35 active:scale-[0.98] md:hover:border-emerald-300/35">
                    领取记录
                  </button>
                  <button type="button" onClick={() => handleToggle(campaign)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition active:border-amber-300/50 active:scale-[0.98] md:hover:border-amber-300/50">
                    {campaign.is_active ? "暂停" : "▶ 恢复"}
                  </button>
                  <button type="button" onClick={() => handleDelete(campaign)} className="rounded-full border border-red-400/30 px-4 py-2 text-sm text-red-300 transition active:bg-red-400/10 active:scale-[0.98] md:hover:bg-red-400/10">
                    删除
                  </button>
                </div>
              </div>

              {detailId === campaign.id && (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <h4 className="text-sm font-medium text-zinc-200">领取反馈</h4>
                  {submissionsLoading ? (
                    <p className="mt-3 text-sm text-zinc-500">加载中...</p>
                  ) : submissions.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">暂无领取记录。</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="rounded-2xl bg-white/[0.03] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="text-sm text-zinc-200">{submission.sponsor_account}</span>
                            <RatingBadge rating={submission.ui_rating ?? submission.sponsor_rating ?? submission.rating ?? "未评价"} />
                          </div>
                          {submission.favorite_station ? (
                            <p className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-zinc-300">
                              <span className="text-zinc-500">稳定站点反馈：</span>{submission.favorite_station}
                            </p>
                          ) : null}
                          {submission.timix_feedback || submission.suggestion ? (
                            <p className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-zinc-400">
                              <span className="text-zinc-500">TiMix 建议：</span>{submission.timix_feedback ?? submission.suggestion}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

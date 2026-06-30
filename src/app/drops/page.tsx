"use client";

import { Gift, Sparkles, Timer } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DropClaimModal } from "@/components/drop-claim-modal";
import { Navbar } from "@/components/navbar";
import { loadCampaigns, type Campaign } from "@/lib/drop-storage";

function CampaignCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/6 bg-zinc-900/40 p-6 backdrop-blur-md">
      <div className="h-4 w-28 animate-pulse rounded-full bg-white/5" />
      <div className="mt-3 h-6 w-48 animate-pulse rounded-full bg-white/8" />
      <div className="mt-5 h-2 w-full rounded-full bg-white/5" />
      <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-white/5" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/6 bg-white/[0.02]">
        <Gift className="h-9 w-9 text-zinc-500" />
      </div>
      <h2 className="mt-6 text-xl font-bold text-white">暂无福利活动</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        当前没有进行中的福利 Drop 活动。请稍后再来看看，
        <br />
        或去论坛关注最新的站点福利消息。
      </p>
    </div>
  );
}

export default function DropsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const refreshCampaigns = useCallback(async () => {
    const data = await loadCampaigns();
    setCampaigns(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCampaigns()
      .then((data) => {
        if (!cancelled) {
          setCampaigns(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCampaigns([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <section className="relative z-10 mx-auto max-w-[1680px] px-4 pt-28 sm:px-5 lg:px-8">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="liquid-glass mb-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
            <Sparkles className="h-3 w-3" />
            福利 Drop
          </div>
          <h1 className="text-3xl font-heading italic leading-[1.15] text-white md:text-4xl">
            福利 Drop
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base font-body">
            限量中转站福利，先到先得。完成赞助商注册并提交真实体验反馈，即可自动领取专属兑换码。
          </p>
        </div>

        {/* ── How it works ── */}
        <div className="mb-8 grid gap-2 sm:grid-cols-3">
          {[
            { icon: ExternalLinkHint, label: "第 1 步", desc: "前往赞助商链接注册账号" },
            { icon: FormHint, label: "第 2 步", desc: "回来填写简短体验反馈" },
            { icon: Gift, label: "第 3 步", desc: "自动领取专属兑换码" },
          ].map((item) => (
            <div key={item.label} className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-3">
              <item.icon />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 font-body">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm text-white/80 font-body">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Campaign Cards ── */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const claimed = campaign.claimed_codes;
              const total = campaign.total_code_records;
              const remaining = campaign.remaining_codes;
              const progressPct = total > 0 ? (claimed / total) * 100 : 0;
              const isSoldOut = remaining === 0;

              return (
                <article
                  key={campaign.id}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-xl transition-all hover:bg-zinc-800/50 hover:border-white/20"
                >
                  {/* Sponsor badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                      {campaign.sponsor_name}
                    </span>
                    {isSoldOut && (
                      <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300">
                        已抢空
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-white leading-tight">
                    {campaign.title}
                  </h3>

                  {campaign.description && (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400 line-clamp-2 font-body">
                      {campaign.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-body">
                      <span className="text-zinc-500">
                        剩余 <span className="text-white font-bold">{remaining}</span> / {total}
                      </span>
                      <span className="text-zinc-600">
                        {Math.round(progressPct)}% 已领
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                        style={{ width: `${Math.min(progressPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    className={`mt-5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition font-body ${
                      isSoldOut
                        ? "cursor-not-allowed border border-white/5 bg-white/[0.02] text-zinc-600"
                        : "bg-cyan-300 text-black shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:bg-cyan-200"
                    }`}
                    disabled={isSoldOut}
                    onClick={() => setSelectedCampaign(campaign)}
                    type="button"
                  >
                    {isSoldOut ? (
                      <>
                        <Timer className="h-4 w-4" />
                        已抢空
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4" />
                        立即领取
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Claim Modal ── */}
      <DropClaimModal
        campaign={selectedCampaign}
        onClaimed={() => {
          void refreshCampaigns();
        }}
        open={Boolean(selectedCampaign)}
        onClose={() => setSelectedCampaign(null)}
      />
    </div>
  );
}

// ── Inline hint icons (lucide) ──

function ExternalLinkHint() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-white/40"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FormHint() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-white/40"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

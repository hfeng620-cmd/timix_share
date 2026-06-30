"use client";

import { Check, Copy, ExternalLink, Loader2, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { claimPromoCode, type Campaign } from "@/lib/drop-storage";
import { useForumAuth } from "@/lib/forum-auth";

type DropClaimModalProps = {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
};

const RATINGS = [
  { value: "神级体验", label: "🌟 神级体验" },
  { value: "非常实用", label: "👍 非常实用" },
  { value: "还有欠缺", label: "🤨 还有欠缺" },
] as const;

export function DropClaimModal({ campaign, open, onClose }: DropClaimModalProps) {
  const { user } = useForumAuth();

  // ── Form state ──
  const [account, setAccount] = useState("");
  const [rating, setRating] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Success state ──
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const accountRef = useRef<HTMLInputElement>(null);

  // ── Reset on open / campaign change ──
  useEffect(() => {
    if (!open) return;
    setAccount("");
    setRating("");
    setSuggestion("");
    setError(null);
    setClaimedCode(null);
    setCopied(false);
    setSubmitting(false);
  }, [open, campaign?.id]);

  // ── Body scroll lock + Esc ──
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (!campaign || !user?.id) return;

    setError(null);

    const trimmedAccount = account.trim();
    if (!trimmedAccount) {
      setError("请填写您在赞助商平台注册的账号。");
      accountRef.current?.focus();
      return;
    }
    if (!rating) {
      setError("请选择一个使用体验评价。");
      return;
    }

    setSubmitting(true);
    const result = await claimPromoCode(
      campaign.id,
      user.id,
      trimmedAccount,
      rating,
      suggestion,
    );
    setSubmitting(false);

    if (result.ok) {
      setClaimedCode(result.code);
    } else {
      setError(result.error);
    }
  }, [campaign, user, account, rating, suggestion]);

  // ── Copy to clipboard ──
  const handleCopy = useCallback(async () => {
    if (!claimedCode) return;
    try {
      await navigator.clipboard.writeText(claimedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // fallback: user can select manually
    }
  }, [claimedCode]);

  if (!open || !campaign) return null;

  const isLoggedIn = Boolean(user?.id);
  const isSuccess = Boolean(claimedCode);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex max-h-[90vh] w-[90vw] max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Close button ── */}
        <button
          aria-label="关闭"
          className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-zinc-300 backdrop-blur transition hover:bg-white/15 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ═══════════════════════════════════════
            STATE 2: Magic Moment (领取成功)
            ═══════════════════════════════════════ */}
        {isSuccess ? (
          <div className="flex flex-col items-center px-8 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 shadow-[0_0_60px_rgba(52,211,153,0.15)]">
              <Sparkles className="h-10 w-10 text-emerald-300" />
            </div>
            <h2 className="mt-6 text-2xl font-black text-white">
              🎉 恭喜获得专属福利！
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              您的专属兑换码已生成，请妥善保管。
            </p>

            {/* Code display */}
            <div className="mt-8 flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-900 p-6">
              <code className="select-all text-2xl font-mono tracking-[0.3em] text-white">
                {claimedCode}
              </code>
              <button
                aria-label={copied ? "已复制" : "复制兑换码"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                onClick={handleCopy}
                type="button"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="mt-4 text-xs text-zinc-500">
              已复制到剪贴板，请前往 {campaign.sponsor_name} 使用
            </p>

            <button
              className="mt-8 rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
              onClick={onClose}
              type="button"
            >
              完成
            </button>
          </div>
        ) : (
          /* ═══════════════════════════════════════
             STATE 1: Form View
             ═══════════════════════════════════════ */
          <div className="overflow-y-auto px-6 py-8 sm:px-8">
            <div className="pr-6">
              <h2 className="text-xl font-bold text-white">专属福利发放</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {campaign.sponsor_name} · {campaign.title}
              </p>
            </div>

            {/* Step 1: Sponsor URL */}
            <div className="mt-8">
              <p className="text-sm font-semibold text-zinc-300">
                第 1 步 · 前往赞助商平台注册
              </p>
              <a
                className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-5 py-4 text-base font-bold text-cyan-300 transition hover:border-cyan-400/30 hover:bg-zinc-900/80"
                href={campaign.sponsor_url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {campaign.sponsor_url}
                <ExternalLink className="h-4 w-4 shrink-0 opacity-60" />
              </a>
              <p className="mt-2 text-xs text-zinc-500">
                请先在赞助商平台完成注册，然后回到这里填写以下表单领取兑换码。
              </p>
            </div>

            {/* Step 2: Form */}
            <div className="mt-8">
              <p className="text-sm font-semibold text-zinc-300">
                第 2 步 · 填写信息并领取
              </p>

              {!isLoggedIn ? (
                <p className="mt-4 text-sm text-amber-400">
                  ⚠️ 请先登录后再领取福利。
                </p>
              ) : (
                <div className="mt-4 space-y-5">
                  {/* Account input */}
                  <div>
                    <label
                      className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400"
                      htmlFor="drop-account"
                    >
                      注册的账号（邮箱/ID）
                    </label>
                    <input
                      ref={accountRef}
                      autoFocus
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/30 focus:outline-none"
                      disabled={submitting}
                      id="drop-account"
                      onChange={(e) => setAccount(e.target.value)}
                      placeholder="例如 yourname@email.com"
                      type="text"
                      value={account}
                    />
                  </div>

                  {/* Rating pills */}
                  <fieldset>
                    <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      使用体验
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {RATINGS.map((item) => (
                        <button
                          key={item.value}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                            rating === item.value
                              ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.08)]"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                          }`}
                          disabled={submitting}
                          onClick={() => setRating(item.value)}
                          type="button"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {/* Suggestion */}
                  <div>
                    <label
                      className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400"
                      htmlFor="drop-suggestion"
                    >
                      意见与建议（可选）
                    </label>
                    <textarea
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-white/30 focus:outline-none"
                      disabled={submitting}
                      id="drop-suggestion"
                      onChange={(e) => setSuggestion(e.target.value)}
                      placeholder="对这次体验有什么想法？"
                      rows={3}
                      value={suggestion}
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-300">
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-40"
                    disabled={submitting}
                    onClick={handleSubmit}
                    type="button"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在确认...
                      </>
                    ) : (
                      "立即领取"
                    )}
                  </button>
                </div>
              )}
            </div>

            {campaign.description && (
              <p className="mt-6 text-xs leading-5 text-zinc-500 border-t border-white/5 pt-4">
                {campaign.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

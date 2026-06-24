"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useForumAuth } from "@/lib/forum-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export interface AiNewsSubmitProps {
  open: boolean;
  onClose: () => void;
}

export function AiNewsSubmit({ open, onClose }: AiNewsSubmitProps) {
  const { isConnected, isConfigured, showAuthModal } = useForumAuth();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
      // Reset form
      setTitle("");
      setSummary("");
      setSource("");
      setUrl("");
      setSuccess(false);
      setError(null);
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Close when user presses Escape
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    function onCancel(e: Event) {
      e.preventDefault();
      onClose();
    }

    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!title.trim()) {
        setError("请填写新闻标题。");
        return;
      }
      if (!summary.trim()) {
        setError("请填写内容摘要。");
        return;
      }

      if (!isConnected) {
        showAuthModal();
        return;
      }

      if (!isConfigured) {
        setError("投稿服务未配置。");
        return;
      }

      setSubmitting(true);

      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          showAuthModal();
          setSubmitting(false);
          return;
        }

        const cleanUrl = url.trim();

        const { error: insertError } = await supabase.from("ai_news").insert({
          author_id: user.id,
          title: title.trim(),
          summary: summary.trim(),
          source: source.trim(),
          url: cleanUrl,
        });

        if (insertError) throw insertError;

        setSuccess(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "提交失败，请稍后重试。",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [title, summary, source, url, isConnected, isConfigured, showAuthModal],
  );

  if (!open) return null;

  const isLoggedOut = !isConfigured || !isConnected;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-full w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              投稿 AI 新闻
            </p>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              onClick={onClose}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="mt-4">
            {success ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                  <svg
                    className="h-7 w-7 text-[var(--color-brand-deep)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-base font-bold text-[var(--color-ink)]">
                  提交成功，等待审核
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  审核通过后将会公开展示。感谢你的投稿！
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:scale-105 hover:bg-[var(--color-brand-deep)]"
                  onClick={onClose}
                >
                  关闭
                </button>
              </div>
            ) : isLoggedOut ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-soft)]">
                  <svg
                    className="h-7 w-7 text-[var(--color-muted)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-3.86 0-7 2.79-7 6.24 0 .97.84 1.76 1.87 1.76h10.26c1.03 0 1.87-.79 1.87-1.76 0-3.45-3.14-6.24-7-6.24z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-base font-bold text-[var(--color-ink)]">
                  请先登录
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  登录后即可投稿 AI 新闻
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:scale-105 hover:bg-[var(--color-brand-deep)]"
                  onClick={() => {
                    showAuthModal();
                    onClose();
                  }}
                >
                  登录 / 注册
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    新闻标题 <span className="text-red-400">*</span>
                  </label>
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/60 focus:border-[var(--color-brand)] focus:outline-none"
                    maxLength={200}
                    placeholder="例如：OpenAI 发布 GPT-5"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    内容摘要 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    className="w-full resize-none rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/60 focus:border-[var(--color-brand)] focus:outline-none"
                    maxLength={1000}
                    placeholder="简要描述这条新闻的主要内容..."
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    来源
                  </label>
                  <input
                    className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/60 focus:border-[var(--color-brand)] focus:outline-none"
                    maxLength={100}
                    placeholder="例如：量子位、机器之心"
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    原文链接
                  </label>
                  <input
                    className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/60 focus:border-[var(--color-brand)] focus:outline-none"
                    placeholder="https://..."
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                    onClick={onClose}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_8px_20px_var(--color-panel-glow)] transition hover:scale-105 hover:bg-[var(--color-brand-deep)] disabled:opacity-50 disabled:hover:scale-100"
                    disabled={submitting}
                  >
                    {submitting ? "提交中..." : "提交新闻"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}

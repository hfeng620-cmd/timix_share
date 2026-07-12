"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/lib/toast-context";

import {
  createSelectionComment,
  loadSelectionComments,
  removeSelectionComment,
  type SelectionComment,
  type SelectionCommentSide,
} from "@/lib/selection-comments";

type DraftSelection = {
  quote: string;
  top: number;
  left: number;
  side: SelectionCommentSide;
  anchorTop: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

const ENABLED_PATHS = new Set(["/", "/stations"]);
const MAX_QUOTE_LENGTH = 300;
const MAX_BODY_LENGTH = 1000;

const BLOCKED_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "nav",
  "form",
  "[contenteditable='true']",
  "[data-selection-comments='off']",
].join(", ");

export function SelectionCommentLayer() {
  const pathname = usePathname();
  const { addToast } = useToast();
  const commentsEnabled = ENABLED_PATHS.has(pathname);
  const [comments, setComments] = useState<SelectionComment[]>(() => loadSelectionComments());
  const [draft, setDraft] = useState<DraftSelection | null>(null);
  const [commentText, setCommentText] = useState("");
  const [scrollY, setScrollY] = useState(0);

  function closeDraft() {
    setDraft(null);
    setCommentText("");
    window.getSelection()?.removeAllRanges();
  }

  useEffect(() => {
    function handleScroll() {
      setScrollY(window.scrollY);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!commentsEnabled) {
      return;
    }

    function handleMouseUp() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const text = selection.toString().trim().replace(/\s+/g, " ");
      if (!text || text.length < 2) {
        return;
      }
      const quote = text.slice(0, MAX_QUOTE_LENGTH);

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        return;
      }

      const anchorNode =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? (range.commonAncestorContainer as Element)
          : range.commonAncestorContainer.parentElement;
      if (!anchorNode) {
        return;
      }

      if (!anchorNode.closest("main")) {
        return;
      }

      if (anchorNode.closest(BLOCKED_SELECTOR)) {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        activeElement.closest(".selection-comment-pop")
      ) {
        return;
      }

      const side: SelectionCommentSide =
        rect.left + rect.width / 2 > window.innerWidth / 2 ? "left" : "right";

      const panelWidth = 320;
      const margin = 20;
      const top = Math.min(
        window.innerHeight - 240,
        Math.max(96, rect.top + rect.height / 2 - 56),
      );
      const left =
        side === "right"
          ? Math.min(window.innerWidth - panelWidth - margin, rect.right + 18)
          : Math.max(margin, rect.left - panelWidth - 18);

      setCommentText("");
      setDraft({
        quote,
        top,
        left,
        side,
        anchorTop: window.scrollY + rect.top,
      });
    }

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [commentsEnabled]);

  useEffect(() => {
    if (!commentsEnabled || !draft) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDraft();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commentsEnabled, draft]);

  const pageComments = useMemo(
    () =>
      comments
        .filter((item) => item.pathname === pathname)
        .sort((a, b) => a.anchorTop - b.anchorTop),
    [comments, pathname],
  );

  const leftComments = pageComments.filter((item) => item.side === "left");
  const rightComments = pageComments.filter((item) => item.side === "right");

  function handleSaveComment() {
    const body = commentText.trim().slice(0, MAX_BODY_LENGTH);
    if (!draft || !body) {
      return;
    }

    try {
      const created = createSelectionComment({
        pathname,
        quote: draft.quote.slice(0, MAX_QUOTE_LENGTH),
        body,
        side: draft.side,
        anchorTop: draft.anchorTop,
      });

      setComments((current) => [...current, created]);
      closeDraft();
    } catch (err: unknown) {
      addToast(err instanceof Error ? `评论保存失败：${err.message}` : "评论保存失败，请稍后重试。", "error");
    }
  }

  function handleDeleteComment(id: string) {
    const updated = removeSelectionComment(id);
    setComments(updated);
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-y-0 left-0 z-40 hidden w-[270px] xl:block">
        <div className="relative h-full">
          {leftComments.map((item) => (
            <article
              key={item.id}
              className="pointer-events-auto absolute left-4 w-[240px] rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur"
              style={{ top: Math.max(120, item.anchorTop - scrollY) }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  评论
                </span>
                <button
                  aria-label="删除这条划词评论"
                  className="text-xs font-semibold text-[var(--color-muted)] transition hover:[color:var(--color-ink)]"
                  onClick={() => handleDeleteComment(item.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--color-muted)]">“{item.quote}”</p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-ink)]">{item.body}</p>
              <p className="mt-3 text-xs text-[var(--color-muted)]">{formatDate(item.createdAt)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-[270px] xl:block">
        <div className="relative h-full">
          {rightComments.map((item) => (
            <article
              key={item.id}
              className="pointer-events-auto absolute right-4 w-[240px] rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur"
              style={{ top: Math.max(120, item.anchorTop - scrollY) }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  评论
                </span>
                <button
                  aria-label="删除这条划词评论"
                  className="text-xs font-semibold text-[var(--color-muted)] transition hover:[color:var(--color-ink)]"
                  onClick={() => handleDeleteComment(item.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--color-muted)]">“{item.quote}”</p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-ink)]">{item.body}</p>
              <p className="mt-3 text-xs text-[var(--color-muted)]">{formatDate(item.createdAt)}</p>
            </article>
          ))}
        </div>
      </div>

      {commentsEnabled && draft ? (
        <div
          className="selection-comment-pop pointer-events-auto fixed z-50 w-[320px] rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur"
          style={{ top: draft.top, left: draft.left }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              划词评论
            </span>
            <button
              aria-label="关闭划词评论草稿"
              className="text-xs font-semibold text-[var(--color-muted)] transition hover:[color:var(--color-ink)]"
              onClick={closeDraft}
              type="button"
            >
              关闭
            </button>
          </div>
          <p className="mt-3 rounded-2xl bg-[var(--color-soft)] px-3 py-3 text-sm leading-6 text-[var(--color-muted)]">
            “{draft.quote}”
          </p>
          <textarea
            className="mt-3 min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-3 py-3 text-sm leading-6 text-[var(--color-ink)] outline-none transition focus:[border-color:var(--color-brand)]"
            maxLength={MAX_BODY_LENGTH}
            onChange={(event) => setCommentText(event.target.value.slice(0, MAX_BODY_LENGTH))}
            onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveComment(); } }}
            placeholder="像 Notion 那样，给这段话单独留个评论。"
            value={commentText}
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-xs text-[var(--color-muted)]">
              {commentText.length}/{MAX_BODY_LENGTH} · 保存后会自动挂到
              {draft.side === "left" ? "左侧" : "右侧"}评论栏
            </span>
            <button
              className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] transition hover:[background-color:var(--color-brand-deep)]"
              onClick={handleSaveComment}
              type="button"
            >
              发布评论
            </button>
          </div>
        </div>
      ) : null}

      {commentsEnabled && pageComments.length > 0 ? (
        <div className="fixed right-4 bottom-4 z-30 xl:hidden">
          <div className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-sm font-semibold shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
            本页评论 {pageComments.length}
          </div>
        </div>
      ) : null}
    </>
  );
}


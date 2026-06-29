"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Heart, MessageCircle, Bookmark, X,
  Send, Loader2, Pencil, Trash2, ChevronDown,
} from "lucide-react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useForumAuth } from "@/lib/forum-auth";
import {
  loadEditLogs, type EditLogEntry,
  loadSharedComments, createSharedComment, deleteSharedComment,
  type SharedComment,
} from "@/lib/share-storage";

/* ═══════════════════════════════════════════
   嵌套评论数据模型
   - parentId === null  → 根评论
   - parentId !== null  → 子回复 (parentId = 根评论ID)
   ═══════════════════════════════════════════ */

type CommentItem = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
  likedBy: Set<string>;
};

type PostNode = {
  id: string;
  title: string;
  summary: string;
  tag: string;
  likes: number;
  comments: number;
  bookmarks: number;
  authorId: string;
  body: string;
  isHot: boolean;
  authorName?: string;
  createdAt?: string;
};

/* ═══════════════════════════════════════════
   相对时间格式化
   ═══════════════════════════════════════════ */

function formatRelativeTime(input: string): string {
  const m = Math.floor((Date.now() - new Date(input).getTime()) / 60000);
  if (isNaN(m)) return input;
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}

/* ═══════════════════════════════════════════
   NestedReplyModal — 沉浸式楼中楼弹窗
   ═══════════════════════════════════════════ */

function NestedReplyModal({
  rootComment,
  allReplies,
  currentUserId,
  onSendReply,
  onToggleLike,
  onClose,
}: {
  rootComment: CommentItem;
  allReplies: CommentItem[];
  currentUserId: string | null;
  onSendReply: (parentId: string, text: string) => void;
  onToggleLike: (commentId: string) => void;
  onClose: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ authorName: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* 挂载时聚焦遮罩层，用于捕获 Esc */
  useEffect(() => {
    overlayRef.current?.focus();
    const unlock = lockBodyScroll();
    return unlock;
  }, []);

  /** Esc 栈管理：阻止事件冒泡到外层 PostModal */
  function handleOverlayKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  }

  /** 点击回复图标：聚焦输入框 + 自动填充 @用户名 */
  function focusReplyTo(authorName: string) {
    setReplyTarget({ authorName });
    setReplyText(`@${authorName} `);
    setTimeout(() => {
      inputRef.current?.focus();
      const len = inputRef.current?.value.length ?? 0;
      inputRef.current?.setSelectionRange(len, len);
    }, 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!replyText.trim()) return;
      onSendReply(rootComment.id, replyText);
      setReplyText("");
      setReplyTarget(null);
    }
  }

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4 outline-none"
      onKeyDown={handleOverlayKeyDown}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-base font-heading italic text-white">楼中楼回复</h3>
          <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition" type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 镇楼：根评论 */}
        <div className="shrink-0 px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-3">
            {rootComment.authorAvatar ? (
              <img src={rootComment.authorAvatar} className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5" alt="" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white/50 mt-0.5">
                {rootComment.authorName.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white/80 font-body">{rootComment.authorName}</span>
                <span className="text-[11px] text-gray-500 font-body">{formatRelativeTime(rootComment.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-white/60 font-body whitespace-pre-wrap break-words">
                {rootComment.content}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <button onClick={() => onToggleLike(rootComment.id)} className={`text-xs transition font-body ${rootComment.likedBy.has(currentUserId ?? "") ? "text-rose-400" : "text-gray-500 hover:text-gray-300"}`} type="button">
                  <Heart className={`h-3.5 w-3.5 inline mr-1 ${rootComment.likedBy.has(currentUserId ?? "") ? "fill-current" : ""}`} />
                  {rootComment.likedBy.size > 0 ? rootComment.likedBy.size : ""}
                </button>
                <button onClick={() => focusReplyTo(rootComment.authorName)} className="text-xs text-gray-500 hover:text-gray-300 transition font-body" type="button">
                  <MessageCircle className="h-3.5 w-3.5 inline mr-1" />回复
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 全部回复列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {allReplies.length === 0 ? (
            <p className="text-sm text-gray-500 font-body text-center py-8">暂无回复，来做第一个回应者吧 ✨</p>
          ) : (
            allReplies.map((reply) => (
              <div key={reply.id} className="flex gap-3 pl-4 border-l-2 border-white/5">
                {reply.authorAvatar ? (
                  <img src={reply.authorAvatar} className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5" alt="" />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50 mt-0.5">
                    {reply.authorName.charAt(0)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/70 font-body">{reply.authorName}</span>
                    <span className="text-[11px] text-gray-500 font-body">{formatRelativeTime(reply.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-white/45 font-body whitespace-pre-wrap break-words">
                    {reply.content}
                  </p>
                  <div className="mt-1.5 flex items-center gap-4">
                    <button onClick={() => onToggleLike(reply.id)} className={`text-xs transition font-body ${reply.likedBy.has(currentUserId ?? "") ? "text-rose-400" : "text-gray-500 hover:text-gray-300"}`} type="button">
                      <Heart className={`h-3 w-3 inline mr-1 ${reply.likedBy.has(currentUserId ?? "") ? "fill-current" : ""}`} />
                      {reply.likedBy.size > 0 ? reply.likedBy.size : ""}
                    </button>
                    <button onClick={() => focusReplyTo(reply.authorName)} className="text-xs text-gray-500 hover:text-gray-300 transition font-body" type="button">
                      <MessageCircle className="h-3 w-3 inline mr-1" />回复
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部输入框 */}
        <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-zinc-900/50">
          {replyTarget && (
            <p className="text-[11px] text-gray-500 font-body mb-2">
              回复 <span className="text-sky-400">@{replyTarget.authorName}</span>
            </p>
          )}
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              className="flex-1 min-h-[44px] resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 font-body outline-none focus:border-white/30 transition"
              placeholder="输入回复... (Enter 发送, Shift+Enter 换行)"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              autoFocus
            />
            <button
              className="shrink-0 cursor-pointer rounded-full bg-white/15 px-4 py-2 text-xs text-white/50 hover:bg-white/25 transition disabled:opacity-30 font-body"
              onClick={() => { if (replyText.trim()) { onSendReply(rootComment.id, replyText); setReplyText(""); setReplyTarget(null); } }}
              disabled={!replyText.trim()}
              type="button"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PostDetailModal — Share 项目详情主弹窗
   ═══════════════════════════════════════════ */

type Props = {
  post: PostNode;
  onClose: () => void;
  onEdit?: () => void;
};

export function PostDetailModal({ post, onClose, onEdit }: Props) {
  const { user, isAdmin, isOwner, showAuthModal } = useForumAuth();
  const canEdit = !!(user && (isAdmin || isOwner || user.id === post.authorId));

  /* ── 评论状态 ── */
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  /* 从 Supabase 加载评论 */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setCommentsLoading(true);
      try {
        const rows = await loadSharedComments(post.id);
        if (cancelled) return;
        const mapped: CommentItem[] = rows.map((r: SharedComment) => ({
          id: r.id,
          parentId: r.parentCommentId,
          authorId: r.authorId,
          authorName: r.authorName,
          authorAvatar: r.authorAvatar,
          content: r.body,
          createdAt: r.createdAt,
          likedBy: new Set<string>(),
        }));
        setComments(mapped);
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [post.id]);

  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── 编辑日志 ── */
  const [editLogs, setEditLogs] = useState<EditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [rightTab, setRightTab] = useState<"comments" | "logs">("comments");

  /* ── 楼中楼弹窗状态 ── */
  const [nestedRootId, setNestedRootId] = useState<string | null>(null);

  /* ── 主弹窗 Esc + 滚动锁 ── */
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const unlock = lockBodyScroll();
    overlayRef.current?.focus();
    return unlock;
  }, []);

  /** Esc 栈管理：仅当没有二级弹窗打开时才关闭主弹窗 */
  function handleMainKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (nestedRootId) return; // 二级弹窗打开，不处理
      e.stopPropagation();
      onClose();
    }
  }

  /* ── 加载编辑日志 ── */
  useEffect(() => {
    let cancelled = false;
    async function f() {
      setLogsLoading(true);
      try { const logs = await loadEditLogs(post.id, "post"); if (!cancelled) setEditLogs(logs); }
      catch { if (!cancelled) setEditLogs([]); } finally { if (!cancelled) setLogsLoading(false); }
    }
    f();
    return () => { cancelled = true; };
  }, [post.id]);

  /* ═══════════════════════════════════════════
     发送根评论 — 强制身份校验，无匿名 Fallback
     ═══════════════════════════════════════════ */
  async function handleSendComment() {
    if (!user) {
      alert("请先登录后再发表评论。");
      showAuthModal();
      return;
    }

    const body = commentText.trim();
    if (!body) {
      console.warn("[评论] 内容为空，拦截发送");
      return;
    }

    try {
      console.log("[评论] 发送根评论 → Supabase:", { postId: post.id, body, userId: user.id });
      const saved = await createSharedComment(post.id, user.id, body, null);
      const newComment: CommentItem = {
        id: saved.id,
        parentId: saved.parentCommentId,
        authorId: saved.authorId,
        authorName: saved.authorName,
        authorAvatar: saved.authorAvatar,
        content: saved.body,
        createdAt: saved.createdAt,
        likedBy: new Set(),
      };
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err: unknown) {
      console.error("[评论] 发送失败:", err);
      alert("评论发送失败: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  /* ═══════════════════════════════════════════
     发送回复 (parentId = 根评论ID)
     ═══════════════════════════════════════════ */
  const handleSendReply = useCallback(
    async (parentId: string, text: string) => {
      if (!user) {
        alert("请先登录后再发表回复。");
        showAuthModal();
        return;
      }

      const body = text.trim();
      if (!body) {
        console.warn("[评论] 回复内容为空，拦截发送");
        return;
      }

      try {
        console.log("[评论] 发送楼中楼回复 → Supabase:", { postId: post.id, parentId, body, userId: user.id });
        const saved = await createSharedComment(post.id, user.id, body, parentId);
        const newReply: CommentItem = {
          id: saved.id,
          parentId: saved.parentCommentId,
          authorId: saved.authorId,
          authorName: saved.authorName,
          authorAvatar: saved.authorAvatar,
          content: saved.body,
          createdAt: saved.createdAt,
          likedBy: new Set(),
        };
        setComments((prev) => [...prev, newReply]);
      } catch (err: unknown) {
        console.error("[评论] 回复发送失败:", err);
        alert("回复发送失败: " + (err instanceof Error ? err.message : String(err)));
      }
    },
    [user, showAuthModal, post.id],
  );

  /* ── 点赞切换 ── */
  function handleToggleCommentLike(commentId: string) {
    if (!user) { showAuthModal(); return; }
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const next = new Set(c.likedBy);
        if (next.has(user.id)) next.delete(user.id);
        else next.add(user.id);
        return { ...c, likedBy: next };
      }),
    );
  }

  /* ── 删除评论 ── */
  async function handleDeleteComment(commentId: string) {
    if (!window.confirm("确定要删除这条评论吗？")) return;
    try {
      await deleteSharedComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert("删除失败: " + (err instanceof Error ? err.message : "未知错误"));
    }
  }

  /* ── 计算嵌套结构 ── */
  const rootComments = comments.filter((c) => c.parentId === null);
  const getReplies = (rootId: string) => comments.filter((c) => c.parentId === rootId);

  /* 当前打开的楼中楼 */
  const activeRoot = rootComments.find((c) => c.id === nestedRootId);
  const activeReplies = nestedRootId ? getReplies(nestedRootId) : [];

  return (
    <>
      {/* ═══ 主弹窗 ═══ */}
      <div
        ref={overlayRef}
        tabIndex={-1}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4 outline-none"
        onKeyDown={handleMainKeyDown}
        onClick={onClose}
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors z-[999]" type="button">
          <X className="h-6 w-6" />
        </button>
        <div
          className="relative w-full max-w-6xl h-[85vh] flex overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Left: 项目内容 (70%) ── */}
          <div className="flex-1 flex flex-col border-r border-white/10 overflow-y-auto">
            <div className="flex-1 p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/50 font-body">{post.tag}</span>
                <div className="flex items-center gap-2">
                  {canEdit && onEdit && (
                    <button onClick={onEdit} className="rounded-lg p-1.5 text-white/30 hover:text-white hover:bg-white/10 transition" title="编辑" type="button">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {editLogs.length > 0 && (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40 font-body">{editLogs.length} 次修改</span>
                  )}
                </div>
              </div>

              <h2 className="text-3xl font-heading italic text-white md:text-4xl leading-tight">{post.title}</h2>

              <div className="flex items-center gap-3 mt-4 text-sm text-white/40 font-body">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">
                  {(post.authorName ?? "U").charAt(0)}
                </span>
                <span className="text-white/60">{post.authorName ?? "未知用户"}</span>
                <span>·</span>
                <span>{formatRelativeTime(post.createdAt ?? new Date().toISOString())}</span>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-white/50 font-body">{post.summary}</p>

              <div className="mt-6 text-sm leading-relaxed text-gray-300 font-body space-y-4">
                {post.body ? post.body.split("\n").filter(Boolean).map((para, i) => <p key={i}>{para}</p>) : <p>项目详细说明内容。</p>}
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="shrink-0 flex items-center gap-5 px-8 py-4 border-t border-white/10 bg-zinc-950/50">
              <button onClick={() => setLiked(!liked)} className={`cursor-pointer inline-flex items-center gap-1.5 text-sm transition font-body ${liked ? "text-rose-400" : "text-white/40 hover:text-rose-300"}`} type="button">
                <Heart className={`h-4 w-4 transition ${liked ? "fill-current" : ""}`} />{liked ? post.likes + 1 : post.likes}
              </button>
              <button onClick={() => setRightTab("comments")} className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-sky-300 transition font-body" type="button">
                <MessageCircle className="h-4 w-4" />{commentsLoading ? "..." : comments.length}
              </button>
              <button onClick={() => setSaved(!saved)} className={`cursor-pointer inline-flex items-center gap-1.5 text-sm transition font-body ml-auto ${saved ? "text-amber-400" : "text-white/40 hover:text-amber-300"}`} type="button">
                <Bookmark className={`h-4 w-4 transition ${saved ? "fill-current" : ""}`} />{saved ? "已收藏" : "收藏"}
              </button>
            </div>
          </div>

          {/* ── Right: Tabs (30%, 380px) ── */}
          <div className="w-[380px] flex flex-col bg-zinc-900/30">
            {/* Tab header */}
            <div className="shrink-0 flex border-b border-white/10">
              <button onClick={() => setRightTab("comments")} className={`cursor-pointer flex-1 py-3 text-sm font-body transition relative ${rightTab === "comments" ? "text-white" : "text-gray-500 hover:text-gray-400"}`} type="button">
                💬 评论
                {rightTab === "comments" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white/60 rounded-full" />}
              </button>
              <button onClick={() => setRightTab("logs")} className={`cursor-pointer flex-1 py-3 text-sm font-body transition relative ${rightTab === "logs" ? "text-white" : "text-gray-500 hover:text-gray-400"}`} type="button">
                🕒 日志
                {rightTab === "logs" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white/60 rounded-full" />}
              </button>
            </div>

            {/* Tab: Comments */}
            {rightTab === "comments" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 text-white/30 animate-spin" /></div>
                  ) : rootComments.length === 0 ? (
                    <p className="text-sm text-gray-500 font-body text-center py-12">暂无评论，来抢个沙发吧 ✨</p>
                  ) : (
                    rootComments.map((root) => {
                      const replies = getReplies(root.id);
                      const previewReplies = replies.slice(0, 2);
                      const remainingCount = replies.length - 2;
                      const isRootLiked = root.likedBy.has(user?.id ?? "");
                      return (
                        <div key={root.id} className="group">
                          {/* 根评论 */}
                          <div className="flex gap-3">
                            {root.authorAvatar ? (
                              <img src={root.authorAvatar} className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5" alt="" />
                            ) : (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50 mt-0.5">
                                {root.authorName.charAt(0)}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white/70 font-body">{root.authorName}</span>
                                <span className="text-[11px] text-gray-500 font-body">{formatRelativeTime(root.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-sm leading-relaxed text-white/45 font-body whitespace-pre-wrap break-words">
                                {root.content}
                              </p>
                              <div className="mt-1.5 flex items-center gap-4">
                                <button onClick={() => handleToggleCommentLike(root.id)} className={`cursor-pointer text-xs transition font-body ${isRootLiked ? "text-rose-400" : "text-gray-500 hover:text-gray-300"}`} type="button">
                                  <Heart className={`h-3.5 w-3.5 inline mr-1 ${isRootLiked ? "fill-current" : ""}`} />
                                  {root.likedBy.size > 0 ? root.likedBy.size : ""}
                                </button>
                                <button onClick={() => setNestedRootId(root.id)} className="cursor-pointer text-xs text-gray-500 hover:text-gray-300 transition font-body" type="button">
                                  <MessageCircle className="h-3.5 w-3.5 inline mr-1" />回复
                                </button>
                                {/* Delete: only own comments */}
                                {user?.id === root.authorId && (
                                  <button onClick={() => handleDeleteComment(root.id)} className="cursor-pointer text-xs text-gray-600 hover:text-red-400 transition font-body" type="button">
                                    <Trash2 className="h-3 w-3 inline" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 子回复预览 (最多 2 条) */}
                          {previewReplies.length > 0 && (
                            <div className="mt-2 ml-10 pl-3 border-l-2 border-white/5 space-y-2">
                              {previewReplies.map((reply) => {
                                const isReplyLiked = reply.likedBy.has(user?.id ?? "");
                                return (
                                  <div key={reply.id} className="flex gap-2">
                                    {reply.authorAvatar ? (
                                      <img src={reply.authorAvatar} className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5" alt="" />
                                    ) : (
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] text-white/50 mt-0.5">
                                        {reply.authorName.charAt(0)}
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <span className="text-xs font-medium text-white/60 font-body">{reply.authorName}</span>
                                      <span className="ml-1.5 text-[10px] text-gray-500 font-body">{formatRelativeTime(reply.createdAt)}</span>
                                      <p className="mt-0.5 text-xs leading-relaxed text-white/35 font-body whitespace-pre-wrap break-words">{reply.content}</p>
                                      <button onClick={() => handleToggleCommentLike(reply.id)} className={`cursor-pointer text-[10px] transition font-body mt-0.5 ${isReplyLiked ? "text-rose-400" : "text-gray-600 hover:text-gray-400"}`} type="button">
                                        <Heart className={`h-3 w-3 inline mr-0.5 ${isReplyLiked ? "fill-current" : ""}`} />
                                        {reply.likedBy.size > 0 ? reply.likedBy.size : ""}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 查看全部回复按钮 */}
                          {replies.length > 2 ? (
                            <button
                              onClick={() => setNestedRootId(root.id)}
                              className="ml-10 mt-2 text-xs text-sky-400 hover:text-sky-300 transition font-body inline-flex items-center gap-1 cursor-pointer"
                              type="button"
                            >
                              查看全部 {replies.length} 条回复 <ChevronDown className="h-3 w-3" />
                            </button>
                          ) : replies.length > 0 && replies.length <= 2 ? (
                            <button
                              onClick={() => setNestedRootId(root.id)}
                              className="ml-10 mt-1 text-xs text-gray-500 hover:text-gray-300 transition font-body cursor-pointer"
                              type="button"
                            >
                              查看全部 {replies.length} 条回复
                            </button>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 底部评论输入框 */}
                <div className="shrink-0 p-4 border-t border-white/10 bg-zinc-900/50">
                  <div className="relative">
                    <textarea
                      className="w-full min-h-[44px] resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/25 font-body outline-none focus:border-white/30 transition"
                      placeholder="说点什么... (Enter 发送, Shift+Enter 换行)"
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }
                      }}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                    />
                    <button
                      className="absolute right-2 bottom-2 cursor-pointer rounded-full bg-white/15 p-1.5 text-white/50 hover:bg-white/25 hover:text-white transition disabled:opacity-30"
                      type="button"
                      onClick={handleSendComment}
                      disabled={!commentText.trim()}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Tab: Logs */}
            {rightTab === "logs" && (
              <div className="flex-1 overflow-y-auto p-4">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 text-white/30 animate-spin" /></div>
                ) : editLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 font-body">暂无修改记录</p>
                ) : (
                  <div className="relative pl-5 border-l border-white/10 space-y-4">
                    {editLogs.map((log) => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border border-white/20 bg-zinc-950" />
                        <span className="text-[10px] text-gray-500 font-body">{formatRelativeTime(log.createdAt)}</span>
                        <div className="flex items-center gap-2 mt-1">
                          {log.editorAvatar ? <img src={log.editorAvatar} className="w-4 h-4 rounded-full" alt="" /> : <span className="flex w-4 h-4 items-center justify-center rounded-full bg-white/10 text-[8px] text-white/50">{log.editorName.charAt(0)}</span>}
                          <span className="text-xs text-white/50 font-body">{log.editorName}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-white/35 font-body">{log.actionSummary}</p>
                        {log.totalContributions > 0 && <span className="inline-block mt-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/30 font-body">累计 {log.totalContributions} 次</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 二级楼中楼弹窗 ═══ */}
      {nestedRootId && activeRoot && (
        <NestedReplyModal
          rootComment={activeRoot}
          allReplies={activeReplies}
          currentUserId={user?.id ?? null}
          onSendReply={handleSendReply}
          onToggleLike={handleToggleCommentLike}
          onClose={() => setNestedRootId(null)}
        />
      )}
    </>
  );
}

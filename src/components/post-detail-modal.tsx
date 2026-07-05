"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Heart, MessageCircle, Bookmark, X,
  Send, Loader2, Pencil, Trash2, ChevronDown, ImageIcon, ExternalLink, Link as LinkIcon,
} from "lucide-react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useForumAuth } from "@/lib/forum-auth";
import { useToast } from "@/lib/toast-context";
import { getUserProfileHref } from "@/lib/user-profile-url";
import { EmojiPickerButton } from "@/components/emoji-picker-button";
import { ImageLightbox } from "@/components/image-lightbox";
import { LikeIndicator } from "@/components/like-indicator";
import { MarkdownContent } from "@/components/markdown-content";
import { uploadPostImage } from "@/lib/post-image-upload";
import {
  loadEditLogs, type EditLogEntry,
  toggleCommentLike, togglePostLike, type Liker,
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
  authorRole?: "owner" | "admin" | "user";
  authorCustomTitle?: string | null;
  content: string;
  createdAt: string;
  likedBy: Set<string>;
};

type PostNode = {
  id: string;
  title: string;
  summary: string;
  link?: string | null;
  url?: string | null;
  tag: string;
  likes: number | Liker[];
  comments: number;
  bookmarks: number;
  authorId: string;
  body: string;
  isHot: boolean;
  authorName?: string | null;
  authorAvatar?: string | null;
  createdAt?: string;
};

function normalizePostLikers(likes: PostNode["likes"]): Liker[] {
  return Array.isArray(likes) ? likes : [];
}

function getPostLikesCount(likes: PostNode["likes"]): number {
  return Array.isArray(likes) ? likes.length : likes;
}

function RoleTitleBadges({ role, customTitle }: { role?: "owner" | "admin" | "user"; customTitle?: string | null }) {
  return (
    <>
      {role === "owner" ? (
        <span className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
          TiMix 站主
        </span>
      ) : null}
      {role === "admin" ? (
        <span className="rounded border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
          管理员
        </span>
      ) : null}
      {customTitle ? (
        <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
          {customTitle}
        </span>
      ) : null}
    </>
  );
}

type SlashEmojiItem = {
  aliases: string[];
  insertText: string;
  label: string;
  preview: string;
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

const SLASH_EMOJI_ITEMS: SlashEmojiItem[] = [
  { label: "笑哭", preview: "😂", insertText: "😂", aliases: ["xk", "xiaoku", "笑哭"] },
  { label: "爱心", preview: "❤️", insertText: "❤️", aliases: ["xin", "ax", "aixin", "爱心"] },
  { label: "心碎", preview: "💔", insertText: "💔", aliases: ["xs", "xinsui", "心碎"] },
  { label: "西瓜", preview: "🍉", insertText: "🍉", aliases: ["xg", "xig", "xigua", "西瓜"] },
  { label: "吃惊", preview: "😲", insertText: "😲", aliases: ["cj", "xia", "chijing", "吃惊"] },
  { label: "思考", preview: "🤔", insertText: "🤔", aliases: ["sk", "xj", "sikao", "思考"] },
  { label: "墨镜", preview: "😎", insertText: "😎", aliases: ["mj", "xyx", "mojing", "墨镜"] },
  { label: "狗头", preview: "🐕", insertText: "[狗头]", aliases: ["gt", "gou", "goutou", "doge", "狗头"] },
  { label: "吃瓜", preview: "🍉", insertText: "[吃瓜]", aliases: ["cg", "gua", "chigua", "吃瓜"] },
  { label: "泪目", preview: "🥹", insertText: "[泪目]", aliases: ["lm", "leimu", "泪目", "哭"] },
  { label: "捂脸", preview: "🫣", insertText: "[捂脸]", aliases: ["wl", "wulian", "捂脸", "尴尬"] },
  { label: "妙啊", preview: "😏", insertText: "[妙啊]", aliases: ["ma", "miaoa", "妙啊"] },
  { label: "破防", preview: "💥", insertText: "[破防]", aliases: ["pf", "pofang", "破防"] },
  { label: "点赞", preview: "👍", insertText: "[点赞]", aliases: ["dz", "zan", "like", "点赞"] },
  { label: "666", preview: "🔥", insertText: "[666]", aliases: ["666", "liuliu", "nb"] },
  { label: "草", preview: "🌿", insertText: "[草]", aliases: ["cao", "c", "草"] },
  { label: "火箭", preview: "🚀", insertText: "[火箭]", aliases: ["hj", "rocket", "huojian", "火箭"] },
];

function getActiveSlashEmoji(text: string, cursor: number) {
  const beforeCursor = text.slice(0, cursor);
  const match = beforeCursor.match(/(?:^|\s)\/([^\s/]*)$/);
  if (!match) return null;

  const query = (match[1] ?? "").trim().toLowerCase();
  const matches = SLASH_EMOJI_ITEMS.filter((item) => {
    const keywords = [item.label, ...item.aliases].map((keyword) => keyword.trim().toLowerCase());
    if (!query) return true;
    return keywords.some((keyword) => keyword === query || keyword.startsWith(query) || keyword.includes(query));
  }).slice(0, 8);

  return {
    exactMatch: query
      ? matches.find((item) => [item.label, ...item.aliases].map((keyword) => keyword.trim().toLowerCase()).includes(query)) ?? null
      : null,
    matches,
    rangeEnd: cursor,
    rangeStart: cursor - query.length - 1,
  };
}

function SlashEmojiSuggestions({
  activeSlash,
  onPick,
}: {
  activeSlash: ReturnType<typeof getActiveSlashEmoji>;
  onPick: (item: SlashEmojiItem) => void;
}) {
  if (!activeSlash?.matches.length) return null;

  return (
    <div className="absolute bottom-[calc(100%+10px)] right-0 z-[230] w-[260px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 py-1.5 shadow-2xl">
      {activeSlash.matches.map((item) => (
        <button
          key={`${item.insertText}-${item.aliases[0]}`}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition ${
            activeSlash.exactMatch?.insertText === item.insertText
              ? "bg-white/[0.08] text-white"
              : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
          }`}
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(item);
          }}
          type="button"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-base">{item.preview}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px]">{item.label}</span>
            <span className="mt-0.5 block text-[10px] text-zinc-500">/{item.aliases[0]}</span>
          </span>
        </button>
      ))}
    </div>
  );
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
  onOpenLightbox,
  onNotify,
  onClose,
}: {
  rootComment: CommentItem;
  allReplies: CommentItem[];
  currentUserId: string | null;
  onSendReply: (parentId: string, text: string) => void;
  onToggleLike: (commentId: string) => void;
  onOpenLightbox: (src: string) => void;
  onNotify: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  onClose: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState<{ authorName: string } | null>(null);
  const [replyUploading, setReplyUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
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
    const activeSlash = getActiveSlashEmoji(replyText, inputRef.current?.selectionStart ?? replyText.length);
    if (activeSlash?.matches.length) {
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        applyReplySlashEmoji(activeSlash.matches[0], true);
        return;
      }

      if (e.key === " " && activeSlash.exactMatch) {
        e.preventDefault();
        applyReplySlashEmoji(activeSlash.exactMatch, true);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!replyText.trim()) return;
      onSendReply(rootComment.id, replyText);
      setReplyText("");
      setReplyTarget(null);
    }
  }

  function insertEmojiAtCursor(emoji: string) {
    const textarea = inputRef.current;
    const start = textarea?.selectionStart ?? replyText.length;
    const end = textarea?.selectionEnd ?? start;
    const next = replyText.slice(0, start) + emoji + replyText.slice(end);
    const nextCursor = start + emoji.length;

    setReplyText(next);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function applyReplySlashEmoji(item: SlashEmojiItem, appendSpace: boolean) {
    const textarea = inputRef.current;
    const start = textarea?.selectionStart ?? replyText.length;
    const end = textarea?.selectionEnd ?? start;
    const activeSlash = getActiveSlashEmoji(replyText, start);
    if (!activeSlash) return;

    const head = replyText.slice(0, activeSlash.rangeStart);
    const tail = replyText.slice(Math.max(end, activeSlash.rangeEnd));
    const shouldAppendSpace = appendSpace && !/^[\s，。！？、,.!?)]/.test(tail);
    const inserted = `${item.insertText}${shouldAppendSpace ? " " : ""}`;
    const nextCursor = head.length + inserted.length;

    setReplyText(`${head}${inserted}${tail}`);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function uploadAndInsertReplyImage(file: File) {
    setReplyUploading(true);
    try {
      const url = await uploadPostImage(file);
      const textarea = inputRef.current;
      const start = textarea?.selectionStart ?? replyText.length;
      const end = textarea?.selectionEnd ?? start;
      const markdown = `![图片](${url})`;
      const next = replyText.slice(0, start) + markdown + replyText.slice(end);
      setReplyText(next);
      requestAnimationFrame(() => {
        const cursor = start + markdown.length;
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(cursor, cursor);
      });
    } finally {
      setReplyUploading(false);
    }
  }

  async function handleReplyPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        try {
          await uploadAndInsertReplyImage(file);
        } catch (err) {
          onNotify(err instanceof Error ? err.message : "粘贴图片上传失败，请稍后重试。", "error");
        }
        return;
      }
    }
  }

  const activeReplySlashEmoji = getActiveSlashEmoji(replyText, inputRef.current?.selectionStart ?? replyText.length);

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[#09090b]/60 px-0 backdrop-blur-xl outline-none sm:items-center sm:px-4"
      onKeyDown={handleOverlayKeyDown}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[min(82dvh,calc(100dvh_-_var(--safe-top)_-_12px))] w-full flex-col rounded-t-2xl border border-white/10 bg-zinc-950/95 shadow-2xl sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-sm font-heading italic text-white sm:text-base">回复</h3>
          <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition" type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 镇楼：根评论 */}
        <div className="shrink-0 border-b border-white/5 bg-white/[0.02] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex gap-3">
            {rootComment.authorAvatar ? (
              <img src={rootComment.authorAvatar} className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5" alt="" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white/50 mt-0.5">
                {rootComment.authorName.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-white/80 font-body">{rootComment.authorName}</span>
                <RoleTitleBadges role={rootComment.authorRole} customTitle={rootComment.authorCustomTitle} />
                <span className="text-[11px] text-gray-500 font-body">{formatRelativeTime(rootComment.createdAt)}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/60 font-body">
                <MarkdownContent
                  text={rootComment.content}
                  imageClassName="max-h-48 w-auto cursor-zoom-in rounded-md border border-white/10 object-cover mt-2 transition-opacity hover:opacity-90"
                  onImageClick={onOpenLightbox}
                />
              </div>
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
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:space-y-4 sm:px-6 sm:py-4">
          {allReplies.length === 0 ? (
            <p className="text-sm text-gray-500 font-body text-center py-8">暂无回复</p>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-white/70 font-body sm:text-sm">{reply.authorName}</span>
                    <RoleTitleBadges role={reply.authorRole} customTitle={reply.authorCustomTitle} />
                    <span className="text-[11px] text-gray-500 font-body">{formatRelativeTime(reply.createdAt)}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/45 font-body sm:text-sm">
                    <MarkdownContent
                      text={reply.content}
                      imageClassName="max-h-48 w-auto cursor-zoom-in rounded-md border border-white/10 object-cover mt-2 transition-opacity hover:opacity-90"
                      onImageClick={onOpenLightbox}
                    />
                  </div>
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
        <div className="shrink-0 border-t border-white/10 bg-zinc-900/50 px-4 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] pt-3 sm:px-6 sm:py-4">
          {replyTarget && (
            <p className="text-[11px] text-gray-500 font-body mb-2">
              回复 <span className="text-zinc-300">@{replyTarget.authorName}</span>
            </p>
          )}
          <div className="relative flex gap-3">
            <SlashEmojiSuggestions activeSlash={activeReplySlashEmoji} onPick={(item) => applyReplySlashEmoji(item, true)} />
            <textarea
              ref={inputRef}
              className="flex-1 min-h-[44px] resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-28 text-sm text-white placeholder:text-white/25 font-body outline-none focus:border-white/30 transition"
              placeholder="输入回复..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onPaste={handleReplyPaste}
              onKeyDown={handleKeyDown}
              rows={2}
              autoFocus
            />
            <input
              ref={replyFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await uploadAndInsertReplyImage(file);
                } catch (err) {
                  onNotify(err instanceof Error ? err.message : "图片上传失败，请稍后重试。", "error");
                } finally {
                  if (replyFileInputRef.current) replyFileInputRef.current.value = "";
                }
              }}
            />
            <button
              className="shrink-0 cursor-pointer rounded-full p-2 text-zinc-500 transition hover:text-white disabled:opacity-40"
              onClick={() => replyFileInputRef.current?.click()}
              disabled={replyUploading}
              title="上传图片"
              type="button"
            >
              {replyUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </button>
            <EmojiPickerButton
              align="right"
              buttonClassName="shrink-0 rounded-full p-2 text-zinc-500 transition hover:text-white disabled:opacity-40"
              iconClassName="h-4 w-4"
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={insertEmojiAtCursor}
              onToggle={() => setShowEmojiPicker((current) => !current)}
              open={showEmojiPicker}
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
   PostDetailModal — 分享详情主弹窗
   ═══════════════════════════════════════════ */

type Props = {
  post: PostNode;
  onClose: () => void;
  onEdit?: () => void;
};

export function PostDetailModal({ post, onClose, onEdit }: Props) {
  const { user, isAdmin, isOwner, showAuthModal } = useForumAuth();
  const { addToast } = useToast();
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
          authorRole: r.authorRole,
          authorCustomTitle: r.authorCustomTitle,
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
  const [commentUploading, setCommentUploading] = useState(false);
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);
  const [commentCursor, setCommentCursor] = useState(0);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const initialPostLikers = normalizePostLikers(post.likes);
  const [postIsLiked, setPostIsLiked] = useState(initialPostLikers.some((l) => l.userId === user?.id));
  const [postLikers, setPostLikers] = useState<Liker[]>(initialPostLikers);
  const [postLikesCount, setPostLikesCount] = useState(getPostLikesCount(post.likes));
  const [postLikePending, setPostLikePending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (postLikePending) return;
    const nextLikers = normalizePostLikers(post.likes);
    setPostLikers(nextLikers);
    setPostLikesCount(getPostLikesCount(post.likes));
    setPostIsLiked(nextLikers.some((l) => l.userId === user?.id));
  }, [post.id, post.likes, postLikePending, user?.id]);

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
      addToast("请先登录后再发表评论。", "warning");
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
      const saved = await createSharedComment(post.id, body, null);
      const newComment: CommentItem = {
        id: saved.id,
        parentId: saved.parentCommentId,
        authorId: saved.authorId,
        authorName: saved.authorName,
        authorAvatar: saved.authorAvatar,
        authorRole: saved.authorRole,
        authorCustomTitle: saved.authorCustomTitle,
        content: saved.body,
        createdAt: saved.createdAt,
        likedBy: new Set(),
      };
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
      setCommentCursor(0);
    } catch (err: unknown) {
      console.error("[评论] 发送失败:", err);
      addToast(err instanceof Error ? err.message : "评论发送失败，请稍后重试。", "error");
    }
  }

  /* ═══════════════════════════════════════════
     发送回复 (parentId = 根评论ID)
     ═══════════════════════════════════════════ */
  const handleSendReply = useCallback(
    async (parentId: string, text: string) => {
      if (!user) {
        addToast("请先登录后再发表回复。", "warning");
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
        const saved = await createSharedComment(post.id, body, parentId);
        const newReply: CommentItem = {
          id: saved.id,
          parentId: saved.parentCommentId,
          authorId: saved.authorId,
          authorName: saved.authorName,
          authorAvatar: saved.authorAvatar,
          authorRole: saved.authorRole,
          authorCustomTitle: saved.authorCustomTitle,
          content: saved.body,
          createdAt: saved.createdAt,
          likedBy: new Set(),
        };
        setComments((prev) => [...prev, newReply]);
      } catch (err: unknown) {
        console.error("[评论] 回复发送失败:", err);
        addToast(err instanceof Error ? err.message : "回复发送失败，请稍后重试。", "error");
      }
    },
    [addToast, user, showAuthModal, post.id],
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
      addToast(err instanceof Error ? err.message : "删除失败，请稍后重试。", "error");
    }
  }

  async function handlePostLike() {
    if (postLikePending) return;
    if (!user) { showAuthModal(); return; }

    setPostLikePending(true);
    const userMetadata = user.user_metadata ?? {};
    const profile: Liker = {
      userId: user.id,
      displayName: (userMetadata.display_name as string) ?? (userMetadata.full_name as string) ?? user.email ?? "",
      avatarUrl: (userMetadata.avatar_url as string) ?? null,
      role: isOwner ? "owner" : isAdmin ? "admin" : "user",
    };

    const prev = postIsLiked;
    const prevCount = postLikesCount;
    const prevLikers = [...postLikers];
    const next = !prev;

    setPostIsLiked(next);
    setPostLikesCount((c) => c + (next ? 1 : -1));
    setPostLikers(next
      ? [...prevLikers, profile]
      : prevLikers.filter((l) => l.userId !== user.id)
    );

    try {
      const result = await togglePostLike(post.id, user.id);
      setPostLikers(result);
      setPostLikesCount(result.length);
      setPostIsLiked(result.some((l: Liker) => l.userId === user.id));
    } catch (error) {
      setPostIsLiked(prev);
      setPostLikesCount(prevCount);
      setPostLikers(prevLikers);
      addToast(error instanceof Error ? error.message : "点赞失败，请稍后重试", "error");
    } finally {
      setPostLikePending(false);
    }
  }

  /* ── 计算嵌套结构 ── */
  const rootComments = comments.filter((c) => c.parentId === null);
  const getReplies = (rootId: string) => comments.filter((c) => c.parentId === rootId);
  const postLink = post.link || post.url || "";
  const linkSegments = postLink.split(/;;|；；/).map((segment) => segment.trim()).filter(Boolean);

  /* 当前打开的楼中楼 */
  const activeRoot = rootComments.find((c) => c.id === nestedRootId);
  const activeReplies = nestedRootId ? getReplies(nestedRootId) : [];

  async function uploadAndInsertCommentImage(file: File) {
    setCommentUploading(true);
    try {
      const url = await uploadPostImage(file);
      const textarea = commentTextareaRef.current;
      const start = textarea?.selectionStart ?? commentText.length;
      const end = textarea?.selectionEnd ?? start;
      const markdown = `![图片](${url})`;
      const next = commentText.slice(0, start) + markdown + commentText.slice(end);
      setCommentText(next);
      requestAnimationFrame(() => {
        const cursor = start + markdown.length;
        commentTextareaRef.current?.focus();
        commentTextareaRef.current?.setSelectionRange(cursor, cursor);
        setCommentCursor(cursor);
      });
    } finally {
      setCommentUploading(false);
    }
  }

  function insertCommentEmojiAtCursor(emoji: string) {
    const textarea = commentTextareaRef.current;
    const start = textarea?.selectionStart ?? commentText.length;
    const end = textarea?.selectionEnd ?? start;
    const next = commentText.slice(0, start) + emoji + commentText.slice(end);
    const nextCursor = start + emoji.length;

    setCommentText(next);
    requestAnimationFrame(() => {
      commentTextareaRef.current?.focus();
      commentTextareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      setCommentCursor(nextCursor);
    });
  }

  function applyCommentSlashEmoji(item: SlashEmojiItem, appendSpace: boolean) {
    const textarea = commentTextareaRef.current;
    const start = textarea?.selectionStart ?? commentText.length;
    const end = textarea?.selectionEnd ?? start;
    const activeSlash = getActiveSlashEmoji(commentText, start);
    if (!activeSlash) return;

    const head = commentText.slice(0, activeSlash.rangeStart);
    const tail = commentText.slice(Math.max(end, activeSlash.rangeEnd));
    const shouldAppendSpace = appendSpace && !/^[\s，。！？、,.!?)]/.test(tail);
    const inserted = `${item.insertText}${shouldAppendSpace ? " " : ""}`;
    const nextCursor = head.length + inserted.length;

    setCommentText(`${head}${inserted}${tail}`);
    requestAnimationFrame(() => {
      commentTextareaRef.current?.focus();
      commentTextareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      setCommentCursor(nextCursor);
    });
  }

  async function handleCommentPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        try {
          await uploadAndInsertCommentImage(file);
        } catch (err) {
          addToast(err instanceof Error ? err.message : "粘贴图片上传失败，请稍后重试。", "error");
        }
        return;
      }
    }
  }

  const activeCommentSlashEmoji = getActiveSlashEmoji(commentText, Math.min(commentCursor, commentText.length));

  return (
    <>
      {/* ═══ 主弹窗 ═══ */}
      <div
        ref={overlayRef}
        tabIndex={-1}
        className="fixed inset-0 z-[100] flex items-end justify-center bg-[#09090b]/60 px-0 backdrop-blur-xl outline-none sm:items-center sm:px-4"
        onKeyDown={handleMainKeyDown}
        onClick={onClose}
      >
        <button onClick={onClose} className="absolute right-4 top-[calc(8dvh+0.75rem)] z-[999] rounded-full bg-white/10 p-2 text-white/50 transition-colors hover:text-white sm:right-6 sm:top-6 sm:bg-transparent" type="button">
          <X className="h-6 w-6" />
        </button>
        <div
          className="relative flex h-auto max-h-[calc(100dvh_-_var(--safe-top))] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-white/10 border-b-0 bg-zinc-950/95 shadow-2xl sm:h-[85dvh] sm:flex-row sm:rounded-2xl sm:border-b sm:bg-zinc-950/90"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Left: 分享内容 ── */}
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:border-r sm:border-white/10">
            <div className="flex-1 p-4 sm:p-8">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
                <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/50 font-body sm:px-3 sm:text-xs">{post.tag}</span>
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

              <h2 className="text-xl font-heading italic leading-tight text-white sm:text-3xl md:text-4xl">{post.title}</h2>

              <div className="mt-3 flex items-center gap-2 text-xs text-white/40 font-body sm:mt-4 sm:gap-3 sm:text-sm">
                {(post.authorName || post.authorAvatar) ? (
                  <>
                    {post.authorId ? (
                      <Link
                        className="shrink-0 cursor-pointer transition hover:opacity-80"
                        href={getUserProfileHref(post.authorId)}
                        onClick={(event) => event.stopPropagation()}
                        title="查看公开主页"
                      >
                        {post.authorAvatar ? (
                          <img
                            src={post.authorAvatar}
                            className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                            alt={post.authorName ?? "作者头像"}
                          />
                        ) : post.authorName ? (
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">
                            {post.authorName.charAt(0)}
                          </span>
                        ) : null}
                      </Link>
                    ) : post.authorAvatar ? (
                      <img
                        src={post.authorAvatar}
                        className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                        alt={post.authorName ?? "作者头像"}
                      />
                    ) : post.authorName ? (
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">
                        {post.authorName.charAt(0)}
                      </span>
                    ) : null}
                    {post.authorName ? post.authorId ? (
                      <Link
                        className="text-white/60 transition hover:text-white"
                        href={getUserProfileHref(post.authorId)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {post.authorName}
                      </Link>
                    ) : (
                      <span className="text-white/60">{post.authorName}</span>
                    ) : null}
                    {post.createdAt ? <span>·</span> : null}
                  </>
                ) : null}
                {post.createdAt ? <span>{formatRelativeTime(post.createdAt)}</span> : null}
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-white/50 font-body sm:mt-5 sm:text-sm">{post.summary}</p>

              <div className="my-4 sm:my-6">
                {linkSegments.length > 0 ? (
                  <div className="flex flex-col gap-2 sm:gap-3">
                    {linkSegments.map((segment, index) => {
                      const urlMatch = segment.match(/(https?:\/\/[^\s]+)/);
                      const actualUrl = urlMatch ? urlMatch[0] : "#";

                      return (
                        <div
                          key={`${segment}-${index}`}
                          className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-zinc-900/60 p-3 transition-colors hover:bg-zinc-900/80 sm:p-4"
                        >
                          <div className="flex min-w-0 flex-col overflow-hidden pr-4">
                            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                              分享链接 {linkSegments.length > 1 ? index + 1 : ""}
                            </span>
                            <a
                              className="truncate text-[13px] text-white transition-colors hover:text-emerald-400 sm:text-sm"
                              href={actualUrl}
                              onClick={(event) => event.stopPropagation()}
                              rel="noopener noreferrer"
                              target={actualUrl !== "#" ? "_blank" : "_self"}
                            >
                              {segment}
                            </a>
                          </div>
                          {actualUrl !== "#" && (
                            <a
                              aria-label={`打开分享链接 ${index + 1}`}
                              className="shrink-0 rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400 shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-500 hover:text-white sm:p-3"
                              href={actualUrl}
                              onClick={(event) => event.stopPropagation()}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-zinc-900/30 p-3 text-[13px] text-zinc-500 sm:gap-3 sm:p-4 sm:text-sm">
                    <LinkIcon className="h-4 w-4 opacity-50" />
                    <span>该分享未提供直达链接或链接已失效</span>
                  </div>
                )}
              </div>

              <div className="mt-5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-300 font-body sm:mt-6 sm:text-sm">
                {post.body ? (
                  <MarkdownContent text={post.body} onImageClick={setLightboxImage} />
                ) : (
                  <p>暂无正文。</p>
                )}
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="shrink-0 flex items-center gap-4 border-t border-white/10 bg-zinc-950/50 px-4 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] pt-3 sm:gap-5 sm:px-8 sm:py-4">
              <button onClick={handlePostLike} disabled={postLikePending} className={`cursor-pointer inline-flex items-center gap-1.5 text-xs transition font-body disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${postIsLiked ? "text-rose-400" : "text-white/40 hover:text-rose-300"}`} type="button">
                <Heart className={`h-4 w-4 transition ${postIsLiked ? "fill-current" : ""}`} />{postLikesCount}
              </button>
              <LikeIndicator likers={postLikers} />
              <button onClick={() => setRightTab("comments")} className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-zinc-300 font-body sm:text-sm" type="button">
                <MessageCircle className="h-4 w-4" />{commentsLoading ? "..." : comments.length}
              </button>
              <button onClick={() => setSaved(!saved)} className={`ml-auto cursor-pointer inline-flex items-center gap-1.5 text-xs transition font-body sm:text-sm ${saved ? "text-amber-400" : "text-white/40 hover:text-amber-300"}`} type="button">
                <Bookmark className={`h-4 w-4 transition ${saved ? "fill-current" : ""}`} />{saved ? "已收藏" : "收藏"}
              </button>
            </div>
          </div>

          {/* ── Right: comments/logs ── */}
          <div className="flex h-[42dvh] max-h-[42dvh] w-full shrink-0 flex-col border-t border-white/10 bg-zinc-900/30 sm:h-auto sm:max-h-none sm:w-[380px] sm:border-t-0">
            {/* Tab header */}
            <div className="shrink-0 flex border-b border-white/10">
              <button onClick={() => setRightTab("comments")} className={`relative flex-1 cursor-pointer py-2.5 text-xs transition font-body sm:py-3 sm:text-sm ${rightTab === "comments" ? "text-white" : "text-gray-500 hover:text-gray-400"}`} type="button">
                评论
                {rightTab === "comments" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white/60 rounded-full" />}
              </button>
              <button onClick={() => setRightTab("logs")} className={`relative flex-1 cursor-pointer py-2.5 text-xs transition font-body sm:py-3 sm:text-sm ${rightTab === "logs" ? "text-white" : "text-gray-500 hover:text-gray-400"}`} type="button">
                日志
                {rightTab === "logs" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white/60 rounded-full" />}
              </button>
            </div>

            {/* Tab: Comments */}
            {rightTab === "comments" && (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4">
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 text-white/30 animate-spin" /></div>
                  ) : rootComments.length === 0 ? (
                    <p className="text-sm text-gray-500 font-body text-center py-12">暂无评论</p>
                  ) : (
                    rootComments.map((root) => {
                      const replies = getReplies(root.id);
                      const previewReplies = replies.slice(0, 2);
                      const isRootLiked = root.likedBy.has(user?.id ?? "");
                      return (
                        <div key={root.id} className="group">
                          {/* 根评论 */}
                          <div className="flex gap-3">
                              {root.authorAvatar ? (
                                <Link
                                  className="shrink-0 cursor-pointer transition hover:opacity-80"
                                  href={getUserProfileHref(root.authorId)}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <img src={root.authorAvatar} className="h-7 w-7 rounded-full object-cover shrink-0 mt-0.5" alt="" />
                                </Link>
                              ) : (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50 mt-0.5">
                                  {root.authorName.charAt(0)}
                                </span>
                              )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {root.authorId ? (
                                  <Link
                                    className="text-xs font-medium text-white/70 transition hover:text-white font-body sm:text-sm"
                                    href={getUserProfileHref(root.authorId)}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {root.authorName}
                                  </Link>
                                ) : (
                                  <span className="text-xs font-medium text-white/70 font-body sm:text-sm">{root.authorName}</span>
                                )}
                                <RoleTitleBadges role={root.authorRole} customTitle={root.authorCustomTitle} />
                                <span className="text-[11px] text-gray-500 font-body">{formatRelativeTime(root.createdAt)}</span>
                              </div>
                              <div className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/45 font-body sm:text-sm">
                                <MarkdownContent
                                  text={root.content}
                                  imageClassName="max-h-48 w-auto cursor-zoom-in rounded-md border border-white/10 object-cover mt-2 transition-opacity hover:opacity-90"
                                  onImageClick={setLightboxImage}
                                />
                              </div>
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
                                      <Link
                                        className="shrink-0 cursor-pointer transition hover:opacity-80"
                                        href={getUserProfileHref(reply.authorId)}
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <img src={reply.authorAvatar} className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5" alt="" />
                                      </Link>
                                    ) : (
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] text-white/50 mt-0.5">
                                        {reply.authorName.charAt(0)}
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {reply.authorId ? (
                                          <Link
                                            className="text-xs font-medium text-white/60 font-body transition hover:text-white"
                                            href={getUserProfileHref(reply.authorId)}
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            {reply.authorName}
                                          </Link>
                                        ) : (
                                          <span className="text-xs font-medium text-white/60 font-body">{reply.authorName}</span>
                                        )}
                                        <RoleTitleBadges role={reply.authorRole} customTitle={reply.authorCustomTitle} />
                                        <span className="text-[10px] text-gray-500 font-body">{formatRelativeTime(reply.createdAt)}</span>
                                      </div>
                                      <div className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/35 font-body">
                                        <MarkdownContent
                                          text={reply.content}
                                          imageClassName="max-h-48 w-auto cursor-zoom-in rounded-md border border-white/10 object-cover mt-2 transition-opacity hover:opacity-90"
                                          onImageClick={setLightboxImage}
                                        />
                                      </div>
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
                              className="ml-10 mt-2 text-xs text-zinc-300 hover:text-zinc-300 transition font-body inline-flex items-center gap-1 cursor-pointer"
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
                <div className="shrink-0 border-t border-white/10 bg-zinc-900/50 p-3 sm:p-4">
                  <div className="relative">
                    <SlashEmojiSuggestions activeSlash={activeCommentSlashEmoji} onPick={(item) => applyCommentSlashEmoji(item, true)} />
                    <textarea
                      ref={commentTextareaRef}
                      className="w-full min-h-[40px] resize-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-20 text-[13px] text-white placeholder:text-white/25 outline-none transition focus:border-white/30 font-body sm:min-h-[44px] sm:py-3 sm:pl-10 sm:pr-24 sm:text-sm"
                      placeholder="说点什么..."
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return;
                        const activeSlash = getActiveSlashEmoji(commentText, e.currentTarget.selectionStart ?? commentText.length);
                        if (activeSlash?.matches.length) {
                          if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
                            e.preventDefault();
                            applyCommentSlashEmoji(activeSlash.matches[0], true);
                            return;
                          }

                          if (e.key === " " && activeSlash.exactMatch) {
                            e.preventDefault();
                            applyCommentSlashEmoji(activeSlash.exactMatch, true);
                            return;
                          }
                        }

                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }
                      }}
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value);
                        setCommentCursor(e.currentTarget.selectionStart ?? e.target.value.length);
                      }}
                      onPaste={handleCommentPaste}
                      onSelect={(e) => setCommentCursor(e.currentTarget.selectionStart ?? commentText.length)}
                      rows={2}
                    />
                    <input
                      ref={commentFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          await uploadAndInsertCommentImage(file);
                        } catch (err) {
                          addToast(err instanceof Error ? err.message : "图片上传失败，请稍后重试。", "error");
                        } finally {
                          if (commentFileInputRef.current) commentFileInputRef.current.value = "";
                        }
                      }}
                    />
                    <button
                      className="absolute bottom-2 left-2 cursor-pointer rounded-full p-1.5 text-zinc-500 transition hover:text-white disabled:opacity-40"
                      type="button"
                      onClick={() => commentFileInputRef.current?.click()}
                      disabled={commentUploading}
                      title="上传图片"
                    >
                      {commentUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                    </button>
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <EmojiPickerButton
                        align="right"
                        buttonClassName="cursor-pointer rounded-full p-1.5 text-zinc-500 transition hover:text-white disabled:opacity-40"
                        iconClassName="h-3.5 w-3.5"
                        onClose={() => setShowCommentEmojiPicker(false)}
                        onEmojiSelect={insertCommentEmojiAtCursor}
                        onToggle={() => setShowCommentEmojiPicker((current) => !current)}
                        open={showCommentEmojiPicker}
                      />
                      <button
                        className="cursor-pointer rounded-full bg-white/15 p-1.5 text-white/50 hover:bg-white/25 hover:text-white transition disabled:opacity-30"
                        type="button"
                        onClick={handleSendComment}
                        disabled={!commentText.trim()}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tab: Logs */}
            {rightTab === "logs" && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
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
          onOpenLightbox={setLightboxImage}
          onNotify={addToast}
          onClose={() => setNestedRootId(null)}
        />
      )}
      {lightboxImage ? (
        <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
      ) : null}
    </>
  );
}

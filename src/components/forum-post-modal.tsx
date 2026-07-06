"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Heart, ImageIcon, Loader2, MessageCircle, Send, X } from "lucide-react";

import { EmojiPickerButton } from "@/components/emoji-picker-button";
import { MarkdownContent } from "@/components/markdown-content";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { uploadForumImage, type DiscussionPost, type DiscussionReply } from "@/lib/discussion-storage";
import { useToast } from "@/lib/toast-context";
import { getUserProfileHref } from "@/lib/user-profile-url";

type ReplyQuote = {
  author: string;
  body: string;
};

type SlashEmojiItem = {
  aliases: string[];
  insertText: string;
  label: string;
};

type ForumPostModalProps = {
  post: DiscussionPost;
  comments?: DiscussionReply[];
  commentsLoading: boolean;
  adminUserIds: Set<string>;
  ownerUserIds: Set<string>;
  isConnected: boolean;
  postLiked: boolean;
  postBookmarked: boolean;
  likedReplies: Set<string>;
  replySubmitting: boolean;
  onClose: () => void;
  onOpenImage: (src: string) => void;
  onTogglePostLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onToggleReplyLike: (postId: string, replyId: string) => void;
  onSendComment: (postId: string, body: string) => Promise<void>;
};

function formatRelativeTime(input: string): string {
  const direct = new Date(input);
  if (!Number.isNaN(direct.getTime())) {
    const minutes = Math.floor((Date.now() - direct.getTime()) / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
  }
  return input;
}

const SLASH_EMOJI_ITEMS: SlashEmojiItem[] = [
  { label: "笑哭", insertText: "😂", aliases: ["xk", "xiaoku", "笑哭"] },
  { label: "爱心", insertText: "❤️", aliases: ["xin", "ax", "aixin", "爱心"] },
  { label: "心碎", insertText: "💔", aliases: ["xs", "xinsui", "心碎"] },
  { label: "西瓜", insertText: "🍉", aliases: ["xg", "xig", "xigua", "西瓜"] },
  { label: "吃惊", insertText: "😲", aliases: ["cj", "xia", "chijing", "吃惊"] },
  { label: "思考", insertText: "🤔", aliases: ["sk", "xj", "sikao", "思考"] },
  { label: "墨镜", insertText: "😎", aliases: ["mj", "xyx", "mojing", "墨镜"] },
  { label: "狗头", insertText: "[狗头]", aliases: ["gt", "gou", "goutou", "doge", "狗头"] },
  { label: "吃瓜", insertText: "[吃瓜]", aliases: ["cg", "gua", "chigua", "吃瓜"] },
  { label: "泪目", insertText: "[泪目]", aliases: ["lm", "leimu", "泪目", "哭"] },
  { label: "捂脸", insertText: "[捂脸]", aliases: ["wl", "wulian", "捂脸", "尴尬"] },
  { label: "妙啊", insertText: "[妙啊]", aliases: ["ma", "miaoa", "妙啊"] },
  { label: "破防", insertText: "[破防]", aliases: ["pf", "pofang", "破防"] },
  { label: "点赞", insertText: "[点赞]", aliases: ["dz", "zan", "like", "点赞"] },
  { label: "666", insertText: "[666]", aliases: ["666", "liuliu", "nb"] },
  { label: "草", insertText: "[草]", aliases: ["cao", "c", "草"] },
  { label: "火箭", insertText: "[火箭]", aliases: ["hj", "rocket", "huojian", "火箭"] },
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
  }).slice(0, 6);

  return {
    exactMatch: query
      ? matches.find((item) => [item.label, ...item.aliases].map((keyword) => keyword.trim().toLowerCase()).includes(query)) ?? null
      : null,
    matches,
    rangeEnd: cursor,
    rangeStart: cursor - query.length - 1,
    query,
  };
}

export function ForumPostModal({
  post,
  comments,
  commentsLoading,
  adminUserIds,
  ownerUserIds,
  isConnected,
  postLiked,
  postBookmarked,
  likedReplies,
  replySubmitting,
  onClose,
  onOpenImage,
  onTogglePostLike,
  onToggleBookmark,
  onToggleReplyLike,
  onSendComment,
}: ForumPostModalProps) {
  const { addToast } = useToast();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [composerValue, setComposerValue] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyQuote, setReplyQuote] = useState<ReplyQuote | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [composerCursor, setComposerCursor] = useState(0);

  useEffect(() => {
    const unlock = lockBodyScroll();
    overlayRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      unlock();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setComposerValue("");
    setComposerCursor(0);
    setReplyTarget(null);
    setReplyQuote(null);
    setShowEmojiPicker(false);
  }, [post.issueNumber]);

  function focusComposerWithMention(authorName: string, reply?: DiscussionReply) {
    const mention = `@${authorName} `;
    setReplyTarget(authorName);
    setReplyQuote(reply ? { author: reply.author, body: reply.body } : null);
    setComposerValue((current) => {
      if (current.startsWith(mention)) {
        return current;
      }
      return `${mention}${current}`;
    });
    requestAnimationFrame(() => {
      const node = composerRef.current;
      if (!node) return;
      node.focus();
      const end = node.value.length;
      node.setSelectionRange(end, end);
      setComposerCursor(end);
    });
  }

  async function insertImage(file: File) {
    setUploadingImage(true);
    try {
      const url = await uploadForumImage(file);
      const markdown = `![图片](${url})`;
      const textarea = composerRef.current;
      const start = textarea?.selectionStart ?? composerValue.length;
      const end = textarea?.selectionEnd ?? start;

      setComposerValue((current) => `${current.slice(0, start)}${markdown}${current.slice(end)}`);
      requestAnimationFrame(() => {
        const node = composerRef.current;
        if (!node) return;
        const cursor = start + markdown.length;
        node.focus();
        node.setSelectionRange(cursor, cursor);
        setComposerCursor(cursor);
      });
    } finally {
      setUploadingImage(false);
    }
  }

  function insertEmojiAtCursor(emoji: string) {
    const textarea = composerRef.current;
    const start = textarea?.selectionStart ?? composerValue.length;
    const end = textarea?.selectionEnd ?? start;
    const nextValue = composerValue.slice(0, start) + emoji + composerValue.slice(end);
    const nextCursor = start + emoji.length;

    setComposerValue(nextValue);
    requestAnimationFrame(() => {
      const node = composerRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(nextCursor, nextCursor);
      setComposerCursor(nextCursor);
    });
  }

  function applySlashEmoji(item: SlashEmojiItem, appendSpace: boolean) {
    const textarea = composerRef.current;
    const start = textarea?.selectionStart ?? composerValue.length;
    const end = textarea?.selectionEnd ?? start;
    const activeSlash = getActiveSlashEmoji(composerValue, start);
    if (!activeSlash) return false;

    const head = composerValue.slice(0, activeSlash.rangeStart);
    const tail = composerValue.slice(Math.max(end, activeSlash.rangeEnd));
    const shouldAppendSpace = appendSpace && !/^[\s，。！？、,.!?)]/.test(tail);
    const inserted = `${item.insertText}${shouldAppendSpace ? " " : ""}`;
    const nextCursor = head.length + inserted.length;

    setComposerValue(`${head}${inserted}${tail}`);
    requestAnimationFrame(() => {
      const node = composerRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(nextCursor, nextCursor);
      setComposerCursor(nextCursor);
    });

    return true;
  }

  async function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      event.preventDefault();
      const file = item.getAsFile();
      if (!file) return;
      try {
        await insertImage(file);
      } catch (error) {
        addToast(error instanceof Error ? error.message : "图片上传失败，请稍后重试。", "error");
      }
      return;
    }
  }

  async function handleSubmit() {
    const trimmed = composerValue.trim();
    if (!trimmed) return;

    await onSendComment(post.issueNumber, trimmed);
    setComposerValue("");
    setReplyTarget(null);
    setReplyQuote(null);
  }

  async function handleComposerImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await insertImage(file);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "图片上传失败，请稍后重试。", "error");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const renderedComments = comments ?? [];
  const activeSlashEmoji = getActiveSlashEmoji(composerValue, Math.min(composerCursor, composerValue.length));

  return createPortal(
    <div
      ref={overlayRef}
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#09090b]/80 px-0 py-0 backdrop-blur-md md:items-center md:px-4 md:py-5"
      onClick={onClose}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className="pb-safe relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-b-0 border-white/10 bg-zinc-950 shadow-2xl md:h-[85vh] md:w-[90vw] md:max-w-6xl md:flex-row md:rounded-2xl md:border-b"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="关闭帖子详情"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#09090b]/55 text-zinc-400 transition hover:text-white active:scale-95 md:right-5 md:top-5 md:h-10 md:w-10"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="forum-post-modal-scrollbar flex-1 overflow-y-auto p-4 pr-12 md:p-8 lg:p-12">
          <div className="flex flex-wrap items-center gap-2">
            {post.tags.map((tag) => (
              <span
                key={`${post.issueNumber}-${tag}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-zinc-300"
              >
                #{tag}
              </span>
            ))}
            {post.station ? (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-zinc-300">
                {post.station}
              </span>
            ) : null}
            {post.is_pinned ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-200">
                置顶
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-zinc-100 md:mt-5 md:text-3xl md:font-medium">
            {post.station || "论坛讨论帖"}
          </h2>

          <div className="mt-5 flex items-center gap-3 text-sm text-zinc-400">
            {post.authorId ? (
              <Link
                className="shrink-0 cursor-pointer transition hover:opacity-80"
                href={getUserProfileHref(post.authorId)}
                onClick={(event) => event.stopPropagation()}
                title="查看公开主页"
              >
                {post.authorAvatarUrl ? (
                  <img
                    alt={post.author}
                    className="h-10 w-10 rounded-full border border-white/10 object-cover"
                    src={post.authorAvatarUrl}
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-zinc-300">
                    {post.author.charAt(0)}
                  </span>
                )}
              </Link>
            ) : post.authorAvatarUrl ? (
              <img alt={post.author} className="h-10 w-10 rounded-full border border-white/10 object-cover" src={post.authorAvatarUrl} />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-zinc-300">
                {post.author.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {post.authorId ? (
                  <Link
                    className="font-medium text-zinc-200 transition hover:text-white"
                    href={getUserProfileHref(post.authorId)}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {post.author}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-200">{post.author}</span>
                )}
                {post.authorId && ownerUserIds.has(post.authorId) ? (
                  <span className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-500">
                    TiMix 站主
                  </span>
                ) : null}
                {post.authorId && !ownerUserIds.has(post.authorId) && adminUserIds.has(post.authorId) ? (
                  <span className="rounded border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs font-bold text-zinc-300">
                    管理员
                  </span>
                ) : null}
                {post.authorCustomTitle ? (
                  <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs font-bold text-zinc-300">
                    {post.authorCustomTitle}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{formatRelativeTime(post.createdAt || post.postedAt)}</span>
                {post.updatedAt && post.updatedAt !== post.createdAt ? <span>已编辑</span> : null}
                <span>{post.replyCount} 条评论</span>
              </div>
            </div>
          </div>

          <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200 md:mt-8 md:text-[15px] md:leading-8">
            <MarkdownContent
              text={post.body}
              imageClassName="my-3 max-h-[420px] w-auto max-w-full cursor-zoom-in rounded-xl border border-white/10 object-cover transition-opacity hover:opacity-90"
              onImageClick={onOpenImage}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 md:mt-10 md:gap-3 md:pt-5">
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition ${
                postLiked ? "bg-rose-500/10 text-rose-300" : "bg-white/5 text-zinc-400 hover:text-zinc-100"
              }`}
              onClick={() => onTogglePostLike(post.issueNumber)}
              type="button"
            >
              <Heart className={`h-4 w-4 ${postLiked ? "fill-current" : ""}`} />
              <span>{post.likes}</span>
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2.5 text-sm text-zinc-400">
              <MessageCircle className="h-4 w-4" />
              <span>{post.replyCount}</span>
            </div>
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition ${
                postBookmarked ? "bg-amber-500/10 text-amber-300" : "bg-white/5 text-zinc-400 hover:text-zinc-100"
              }`}
              onClick={() => onToggleBookmark(post.issueNumber)}
              type="button"
            >
              <Bookmark className={`h-4 w-4 ${postBookmarked ? "fill-current" : ""}`} />
              <span>{postBookmarked ? "已收藏" : "收藏"}</span>
            </button>
          </div>
        </div>

        <aside className="flex h-[45dvh] w-full shrink-0 flex-col border-t border-white/10 bg-zinc-900/20 md:h-auto md:w-[380px] md:border-l md:border-t-0">
          <div className="border-b border-white/10 py-2.5 text-center text-xs font-medium text-zinc-300 md:py-4 md:text-sm">评论</div>

          <div className="forum-post-modal-scrollbar flex-1 overflow-y-auto p-3 md:p-4">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-16 text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : renderedComments.length === 0 ? (
              <p className="py-14 text-center text-sm text-zinc-500">暂无评论</p>
            ) : (
              <div className="space-y-4">
                {renderedComments.map((reply) => {
                  const liked = likedReplies.has(reply.id);
                  return (
                    <div key={reply.id} className="rounded-xl border border-white/6 bg-white/[0.03] p-3 md:rounded-2xl md:p-3.5">
                      <div className="flex gap-3">
                        {reply.authorId ? (
                          <Link
                            className="shrink-0 cursor-pointer transition hover:opacity-80"
                            href={getUserProfileHref(reply.authorId)}
                            onClick={(event) => event.stopPropagation()}
                            title="查看公开主页"
                          >
                            {reply.avatar ? (
                              <img alt={reply.author} className="h-8 w-8 rounded-full object-cover" src={reply.avatar} />
                            ) : (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-zinc-300">
                                {reply.author.charAt(0)}
                              </span>
                            )}
                          </Link>
                        ) : reply.avatar ? (
                          <img alt={reply.author} className="h-8 w-8 shrink-0 rounded-full object-cover" src={reply.avatar} />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-zinc-300">
                            {reply.author.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            {reply.authorId ? (
                              <Link
                                className="font-medium text-zinc-200 transition hover:text-white"
                                href={getUserProfileHref(reply.authorId)}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {reply.author}
                              </Link>
                            ) : (
                              <span className="font-medium text-zinc-200">{reply.author}</span>
                            )}
                            {reply.authorId && ownerUserIds.has(reply.authorId) ? (
                              <span className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
                                TiMix 站主
                              </span>
                            ) : null}
                            {reply.authorId && !ownerUserIds.has(reply.authorId) && adminUserIds.has(reply.authorId) ? (
                              <span className="rounded border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                                管理员
                              </span>
                            ) : null}
                            {reply.authorCustomTitle ? (
                              <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                                {reply.authorCustomTitle}
                              </span>
                            ) : null}
                            <span>{formatRelativeTime(reply.postedAt)}</span>
                          </div>

                          <div className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300 md:mt-2 md:text-sm md:leading-7">
                            <MarkdownContent
                              text={reply.body}
                              imageClassName="mt-2 max-h-52 w-auto cursor-zoom-in rounded-lg border border-white/10 object-cover transition-opacity hover:opacity-90"
                              onImageClick={onOpenImage}
                            />
                          </div>

                          <div className="mt-2 flex items-center gap-4">
                            <button
                              className={`inline-flex items-center gap-1 text-xs transition ${
                                liked ? "text-rose-400" : "text-zinc-500 hover:text-zinc-300"
                              }`}
                              onClick={() => onToggleReplyLike(post.issueNumber, reply.id)}
                              type="button"
                            >
                              <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                              <span>{reply.likes > 0 ? reply.likes : "点赞"}</span>
                            </button>
                            <button
                              className="text-xs text-zinc-500 transition hover:text-zinc-300"
                              onClick={() => focusComposerWithMention(reply.author, reply)}
                              type="button"
                            >
                              回复
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-zinc-950/90 p-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] md:p-4">
            {replyTarget ? (
              <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[11px] font-medium text-zinc-400">
                  回复 <span className="text-zinc-300">@{replyTarget}</span>
                </p>
                {replyQuote ? (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-zinc-500">{replyQuote.body}</p>
                ) : null}
              </div>
            ) : null}

            {!isConnected ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-500">
                登录后即可参与评论与图片回复。
              </p>
            ) : (
              <div className="relative">
                {activeSlashEmoji?.matches.length ? (
                  <div className="absolute bottom-[calc(100%+10px)] right-4 z-[230] flex max-w-[280px] flex-wrap justify-end gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/95 px-3 py-2 shadow-2xl">
                    {activeSlashEmoji.matches.map((item) => (
                      <button
                        key={item.insertText}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                          activeSlashEmoji.exactMatch?.insertText === item.insertText
                            ? "border-amber-300/25 bg-amber-300/12 text-amber-100"
                            : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-white"
                        }`}
                        onClick={() => {
                          applySlashEmoji(item, true);
                        }}
                        type="button"
                      >
                        /{item.aliases[0]} · {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <textarea
                  ref={composerRef}
                  className="min-h-14 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 pr-28 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/25 md:min-h-[88px] md:rounded-2xl md:px-4 md:py-3 md:pr-32"
                  onChange={(event) => {
                    setComposerValue(event.target.value);
                    setComposerCursor(event.currentTarget.selectionStart ?? event.target.value.length);
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return;
                    const activeSlash = getActiveSlashEmoji(composerValue, event.currentTarget.selectionStart ?? composerValue.length);
                    if (activeSlash?.matches.length) {
                      if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
                        event.preventDefault();
                        applySlashEmoji(activeSlash.matches[0], true);
                        return;
                      }

                      if (event.key === " " && activeSlash.exactMatch) {
                        event.preventDefault();
                        applySlashEmoji(activeSlash.exactMatch, true);
                        return;
                      }
                    }

                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  onPaste={handlePaste}
                  onSelect={(event) => setComposerCursor(event.currentTarget.selectionStart ?? composerValue.length)}
                  placeholder={replyTarget ? `回复 @${replyTarget}...` : "说点什么..."}
                  rows={2}
                  value={composerValue}
                />
                <input
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void handleComposerImageChange(event);
                  }}
                  type="file"
                />
                <div className="absolute bottom-3 right-4 flex items-center gap-2.5">
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:text-zinc-200 disabled:opacity-40"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    title="上传图片"
                    type="button"
                  >
                    {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  </button>
                  <EmojiPickerButton
                    align="right"
                    buttonClassName="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:text-zinc-200 disabled:opacity-40"
                    disabled={replySubmitting}
                    iconClassName="h-4 w-4"
                    onClose={() => setShowEmojiPicker(false)}
                    onEmojiSelect={insertEmojiAtCursor}
                    onToggle={() => setShowEmojiPicker((current) => !current)}
                    open={showEmojiPicker}
                  />
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-zinc-200 transition hover:bg-white/20 disabled:opacity-40"
                    disabled={replySubmitting || !composerValue.trim()}
                    onClick={() => {
                      void handleSubmit();
                    }}
                    type="button"
                  >
                    {replySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <style jsx global>{`
        .forum-post-modal-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .forum-post-modal-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .forum-post-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>,
    document.body,
  );
}

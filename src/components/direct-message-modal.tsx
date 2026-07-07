"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Lock, MessageCircle, Send, Sparkles, X } from "lucide-react";

import { EmojiPickerButton } from "@/components/emoji-picker-button";
import {
  loadDirectMessageProfile,
  loadDirectMessages,
  sendDirectMessage,
  subscribeDirectMessages,
  type DirectMessage,
  type DirectMessageProfile,
} from "@/lib/direct-message-storage";
import { useForumAuth } from "@/lib/forum-auth";
import { lockBodyScroll } from "@/lib/body-scroll-lock";

export type DirectMessageModalProps = {
  open?: boolean;
  targetUser?: {
    id?: string | null;
    display_name?: string | null;
    displayName?: string | null;
    nickname?: string | null;
    avatar_url?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
  } | null;
  recipientId?: string | null;
  recipientName?: string | null;
  recipientAvatarUrl?: string | null;
  targetUserId?: string | null;
  targetName?: string | null;
  targetAvatarUrl?: string | null;
  peerUserId?: string | null;
  peerName?: string | null;
  peerAvatarUrl?: string | null;
  toUserId?: string | null;
  toUserName?: string | null;
  toUserAvatarUrl?: string | null;
  onClose: () => void;
};

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;

  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "私";
}

function mergeMessages(messages: DirectMessage[], incoming: DirectMessage) {
  if (messages.some((message) => message.id === incoming.id)) return messages;
  return [...messages, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function DirectMessageModal({
  open = true,
  targetUser,
  recipientId,
  recipientName,
  recipientAvatarUrl,
  targetUserId,
  targetName,
  targetAvatarUrl,
  peerUserId,
  peerName,
  peerAvatarUrl,
  toUserId,
  toUserName,
  toUserAvatarUrl,
  onClose,
}: DirectMessageModalProps) {
  const { isConnected, isLoading: authLoading, user, displayName, showAuthModal } = useForumAuth();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [profile, setProfile] = useState<DirectMessageProfile | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const peerId = targetUser?.id ?? recipientId ?? targetUserId ?? peerUserId ?? toUserId ?? null;
  const fallbackName =
    targetUser?.display_name ??
    targetUser?.displayName ??
    targetUser?.nickname ??
    targetUser?.email ??
    recipientName ??
    targetName ??
    peerName ??
    toUserName ??
    "用户";
  const fallbackAvatarUrl =
    targetUser?.avatar_url ??
    targetUser?.avatarUrl ??
    recipientAvatarUrl ??
    targetAvatarUrl ??
    peerAvatarUrl ??
    toUserAvatarUrl ??
    "";
  const peerDisplayName = profile?.displayName || fallbackName;
  const peerAvatar = profile?.avatarUrl || fallbackAvatarUrl;
  const currentUserName = displayName || user?.email?.split("@")[0] || "我";
  const canSend = Boolean(isConnected && user?.id && peerId && user.id !== peerId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

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
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setDraft("");
    setError(null);
    setProfile(null);
    setShowEmojiPicker(false);
  }, [open, peerId]);

  useEffect(() => {
    if (!open || !peerId) return;

    let cancelled = false;
    loadDirectMessageProfile(peerId).then((nextProfile) => {
      if (!cancelled) setProfile(nextProfile);
    });

    return () => {
      cancelled = true;
    };
  }, [open, peerId]);

  useEffect(() => {
    if (!open || !isConnected || !user?.id || !peerId) return;
    if (user.id === peerId) {
      setError("不能给自己发送私信。");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadDirectMessages(peerId, user.id)
      .then((loadedMessages) => {
        if (cancelled) return;
        setMessages(loadedMessages);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "私信加载失败，请稍后重试。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected, open, peerId, user?.id]);

  useEffect(() => {
    if (!open || !isConnected || !user?.id || !peerId || user.id === peerId) return;

    return subscribeDirectMessages(user.id, peerId, (message) => {
      setMessages((current) => mergeMessages(current, message));
    });
  }, [isConnected, open, peerId, user?.id]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, open]);

  useEffect(() => {
    if (!open || !canSend) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [canSend, open, peerId]);

  async function handleSend() {
    if (!canSend || !peerId || !user?.id || sending) return;

    const content = draft.trim();
    if (!content) {
      textareaRef.current?.focus();
      return;
    }

    setSending(true);
    setError(null);

    try {
      const message = await sendDirectMessage(peerId, content, user.id);
      setMessages((current) => mergeMessages(current, message));
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "私信发送失败，请稍后重试。");
    } finally {
      setSending(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function insertEmojiAtCursor(emoji: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? start;
    const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    const nextCursor = start + emoji.length;

    setDraft(nextDraft);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(nextCursor, nextCursor);
    });
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      aria-modal="true"
      className="fixed inset-0 z-[240] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-6 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className="relative flex h-[min(760px,88vh)] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-white/12 bg-zinc-950/75 text-zinc-100 shadow-[0_34px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,0.22),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(245,158,11,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.10),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

        <header className="relative flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {peerAvatar ? (
              <img
                alt={peerDisplayName}
                className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover"
                src={peerAvatar}
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-base font-black text-zinc-200">
                {getInitial(peerDisplayName)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-bold text-white">{peerDisplayName}</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  <Sparkles className="h-3 w-3" />
                  私信
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-zinc-400">
                {canSend ? `以 ${currentUserName} 身份发送` : "登录后可以开始一对一私信"}
              </p>
            </div>
          </div>

          <button
            aria-label="关闭私信"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="direct-message-scrollbar relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {!peerId ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageCircle className="h-10 w-10 text-zinc-600" />
              <p className="mt-4 text-sm font-semibold text-zinc-300">缺少私信对象</p>
              <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-500">
                打开私信弹窗时需要传入对方用户 ID。
              </p>
            </div>
          ) : authLoading || loading ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="mt-3 text-sm">正在加载私信...</p>
            </div>
          ) : !isConnected ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Lock className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-zinc-200">登录后才能发送私信</p>
              <p className="mt-2 max-w-sm text-xs leading-6 text-zinc-500">
                私信会通过 Supabase 当前账号写入 direct_messages 表，并只展示你和对方之间的双向消息。
              </p>
              <button
                className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200"
                onClick={showAuthModal}
                type="button"
              >
                去登录
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10">
                <MessageCircle className="h-6 w-6 text-sky-200" />
              </div>
              <p className="mt-4 text-sm font-semibold text-zinc-200">还没有消息</p>
              <p className="mt-2 max-w-sm text-xs leading-6 text-zinc-500">
                发送第一条私信，对话会自动滚动到底部，新的 INSERT 也会实时同步到这里。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {!isMine ? (
                      peerAvatar ? (
                        <img
                          alt={peerDisplayName}
                          className="mb-5 h-8 w-8 rounded-full border border-white/10 object-cover"
                          src={peerAvatar}
                        />
                      ) : (
                        <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-zinc-300">
                          {getInitial(peerDisplayName)}
                        </div>
                      )
                    ) : null}
                    <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                      <div
                        className={`whitespace-pre-wrap break-words rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg ${
                          isMine
                            ? "rounded-br-lg bg-sky-400 text-slate-950 shadow-sky-950/20"
                            : "rounded-bl-lg border border-white/10 bg-white/[0.07] text-zinc-100 shadow-black/20"
                        }`}
                      >
                        {message.content}
                      </div>
                      <span className="mt-1.5 px-1 text-[10px] text-zinc-500">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <footer className="relative border-t border-white/10 bg-black/20 px-4 py-4 sm:px-6">
          {error ? (
            <p className="mb-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">
              {error}
            </p>
          ) : null}

          <div className="relative">
            <textarea
              ref={textareaRef}
              className="min-h-[82px] w-full resize-none rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-28 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-sky-300/40 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSend || sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={canSend ? "写一条私信... (Enter 发送, Shift+Enter 换行)" : "登录后可发送私信"}
              rows={3}
              value={draft}
            />
            <div className="absolute bottom-3 right-14">
              <EmojiPickerButton
                align="right"
                buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!canSend || sending}
                iconClassName="h-4 w-4"
                onClose={() => setShowEmojiPicker(false)}
                onEmojiSelect={insertEmojiAtCursor}
                onToggle={() => setShowEmojiPicker((current) => !current)}
                open={showEmojiPicker}
              />
            </div>
            <button
              aria-label="发送私信"
              className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg shadow-black/20 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canSend || sending || !draft.trim()}
              onClick={() => {
                void handleSend();
              }}
              type="button"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </footer>

        <style jsx global>{`
          .direct-message-scrollbar::-webkit-scrollbar {
            width: 5px;
          }

          .direct-message-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.14);
            border-radius: 999px;
          }

          .direct-message-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.24);
          }
        `}</style>
      </div>
    </div>,
    document.body,
  );
}

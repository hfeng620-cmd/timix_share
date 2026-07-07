"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageCircle, X } from "lucide-react";

import { DirectMessageModal } from "@/components/direct-message-modal";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useBackButtonClose } from "@/lib/use-back-button-close";
import { useForumAuth } from "@/lib/forum-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type RecipientColumn = "receiver_id" | "recipient_id" | "to_user_id";

type DirectMessageInboxRow = {
  id?: string | null;
  sender_id?: string | null;
  from_user_id?: string | null;
  receiver_id?: string | null;
  recipient_id?: string | null;
  to_user_id?: string | null;
  content?: string | null;
  body?: string | null;
  message?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

type InboxProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type RecentChat = {
  user: InboxProfile;
  lastMessage: DirectMessageInboxRow;
  unreadCount: number;
};

type GlobalInboxModalProps = {
  onClose: () => void;
};

const RECIPIENT_COLUMNS: RecipientColumn[] = ["receiver_id", "recipient_id", "to_user_id"];
const MESSAGE_LIMIT = 100;

function getSenderId(row: DirectMessageInboxRow) {
  return row.sender_id ?? row.from_user_id ?? "";
}

function getRecipientId(row: DirectMessageInboxRow) {
  return row.receiver_id ?? row.recipient_id ?? row.to_user_id ?? "";
}

function getMessageContent(row: DirectMessageInboxRow) {
  return row.content ?? row.body ?? row.message ?? "";
}

function isColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

function formatInboxDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

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
  }).format(date);
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "私";
}

async function loadInboxRows(currentUserId: string) {
  const supabase = getSupabaseClient();
  let lastError: { code?: string; message?: string } | null = null;

  for (const recipientColumn of RECIPIENT_COLUMNS) {
    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${currentUserId},${recipientColumn}.eq.${currentUserId}`)
      .order("created_at", { ascending: false })
      .limit(MESSAGE_LIMIT);

    if (!error) {
      return (data ?? []) as DirectMessageInboxRow[];
    }

    lastError = error;
    if (!isColumnError(error)) break;
  }

  throw new Error(lastError?.message || "私信收件箱加载失败。");
}

async function loadProfiles(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const profileMap = new Map<string, InboxProfile>();
  if (ids.length === 0) return profileMap;

  const { data, error } = await getSupabaseClient()
    .from("forum_profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);

  if (error) throw error;

  for (const profile of (data ?? []) as InboxProfile[]) {
    if (!profile.id) continue;
    profileMap.set(profile.id, profile);
  }

  return profileMap;
}

function buildRecentChats(
  rows: DirectMessageInboxRow[],
  profileMap: Map<string, InboxProfile>,
  currentUserId: string,
) {
  const chats = new Map<string, RecentChat>();

  for (const row of rows) {
    const senderId = getSenderId(row);
    const recipientId = getRecipientId(row);
    const otherUserId = senderId === currentUserId ? recipientId : senderId;
    if (!otherUserId || otherUserId === currentUserId) continue;

    const profile = profileMap.get(otherUserId) ?? {
      id: otherUserId,
      display_name: "用户",
      avatar_url: null,
    };
    const unreadIncrement = senderId === otherUserId && row.is_read === false ? 1 : 0;
    const existing = chats.get(otherUserId);

    if (existing) {
      existing.unreadCount += unreadIncrement;
      continue;
    }

    chats.set(otherUserId, {
      user: profile,
      lastMessage: row,
      unreadCount: unreadIncrement,
    });
  }

  return Array.from(chats.values());
}

export function GlobalInboxModal({ onClose }: GlobalInboxModalProps) {
  const { isConnected, user, showAuthModal } = useForumAuth();
  const [mounted, setMounted] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<InboxProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = user?.id ?? "";

  useBackButtonClose(true, onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unlock = lockBodyScroll();
    return unlock;
  }, []);

  const refreshChats = useCallback(async () => {
    if (!isSupabaseConfigured() || !currentUserId) {
      setRecentChats([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await loadInboxRows(currentUserId);
      const otherUserIds = rows
        .map((row) => {
          const senderId = getSenderId(row);
          const recipientId = getRecipientId(row);
          return senderId === currentUserId ? recipientId : senderId;
        })
        .filter((id) => id && id !== currentUserId);
      const profileMap = await loadProfiles(otherUserIds);
      setRecentChats(buildRecentChats(rows, profileMap, currentUserId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "私信收件箱加载失败，请稍后重试。");
      setRecentChats([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    if (activeChatUser) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeChatUser, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-modal="true"
        className="fixed inset-0 z-[220] flex items-end justify-center overscroll-contain bg-[#09090b]/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClose}
        role="dialog"
      >
        <div
          className="pb-safe relative flex h-auto max-h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom)_-_16px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 border-b-0 bg-zinc-950 shadow-2xl sm:h-[min(600px,calc(100dvh-32px))] sm:rounded-2xl sm:border-b sm:pb-0"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-zinc-900/70 p-4">
            <div className="flex items-center gap-2 font-bold text-white">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              <span>私信收件箱</span>
              {recentChats.some((chat) => chat.unreadCount > 0) ? (
                <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400" />
              ) : null}
            </div>
            <button
              aria-label="关闭私信收件箱"
              className="touch-press flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-white/10 active:scale-[0.98] md:hover:bg-white/10 md:hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {!isConnected || !user ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-zinc-500">
                <MessageCircle className="mb-3 h-12 w-12 opacity-20" />
                <p>登录后可以查看你的私信收件箱。</p>
                <button
                  className="touch-press mt-4 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/30 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-emerald-500/25 active:scale-[0.98] md:hover:bg-emerald-500/25"
                  onClick={() => {
                    onClose();
                    showAuthModal();
                  }}
                  type="button"
                >
                  登录 / 注册
                </button>
              </div>
            ) : loading ? (
              <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-400" />
                正在加载私信...
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-sm text-zinc-500">
                <MessageCircle className="mb-3 h-12 w-12 opacity-20" />
                <p>{error}</p>
                <button
                  className="touch-press mt-4 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-white/10 active:scale-[0.98] active:text-white md:hover:bg-white/10 md:hover:text-white"
                  onClick={() => void refreshChats()}
                  type="button"
                >
                  重新加载
                </button>
              </div>
            ) : recentChats.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-sm text-zinc-500">
                <MessageCircle className="mb-3 h-12 w-12 opacity-20" />
                暂无私信记录
              </div>
            ) : (
              recentChats.map((chat) => {
                const name = chat.user.display_name?.trim() || "用户";
                const content = getMessageContent(chat.lastMessage) || "暂无内容";
                return (
                  <button
                    key={chat.user.id}
                    className="touch-press flex w-full items-center gap-3 rounded-xl border-b border-white/5 p-3 text-left transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] last:border-0 active:bg-white/10 active:scale-[0.98] md:hover:bg-white/5"
                    onClick={() => setActiveChatUser(chat.user)}
                    type="button"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                      {chat.user.avatar_url ? (
                        <img
                          alt={name}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                          src={chat.user.avatar_url}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-400">
                          {getInitial(name)}
                        </div>
                      )}
                      {chat.unreadCount > 0 ? (
                        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-zinc-200">{name}</span>
                        <span className="shrink-0 text-[10px] text-zinc-600">
                          {formatInboxDate(chat.lastMessage.created_at)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-zinc-500">{content}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {activeChatUser ? (
        <DirectMessageModal
          onClose={() => {
            setActiveChatUser(null);
            void refreshChats();
          }}
          targetUser={activeChatUser}
        />
      ) : null}
    </>,
    document.body,
  );
}

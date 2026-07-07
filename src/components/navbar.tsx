"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";
import { AuthButton } from "@/components/auth-button";
import { DirectMessageModal } from "@/components/direct-message-modal";
import { GlobalInboxModal } from "@/components/global-inbox-modal";
import { NotificationBell } from "@/components/notification-bell";
import { OnlineIndicator } from "@/components/online-indicator";
import { useForumAuth } from "@/lib/forum-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const links = [
  { label: "首页", href: "/" },
  { label: "中转站榜单", href: "/stations" },
  { label: "论坛入口", href: "/community" },
  { label: "模型择优", href: "/models" },
  { label: "福利Drop", href: "/drops" },
  { label: "热门有趣项目Share", href: "/guides" },
];

type IncomingDirectMessageRow = {
  id?: string | null;
  sender_id?: string | null;
  receiver_id?: string | null;
  recipient_id?: string | null;
  to_user_id?: string | null;
  content?: string | null;
  body?: string | null;
  message?: string | null;
};

type DirectMessagePopupSender = {
  id: string;
  displayName: string;
  avatarUrl: string;
};

type DirectMessagePopup = {
  id: string;
  message: string;
  sender: DirectMessagePopupSender;
};

function getRecipientId(row: IncomingDirectMessageRow) {
  return row.receiver_id ?? row.recipient_id ?? row.to_user_id ?? "";
}

function getMessageContent(row: IncomingDirectMessageRow) {
  return row.content ?? row.body ?? row.message ?? "发来一条私信";
}

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, user } = useForumAuth();
  const [mounted, setMounted] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [incomingPopup, setIncomingPopup] = useState<DirectMessagePopup | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<DirectMessagePopupSender | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isConnected || !user?.id || !isSupabaseConfigured()) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`navbar-direct-messages:${user.id}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        async (payload) => {
          const newMessage = payload.new as IncomingDirectMessageRow;
          if (!newMessage?.sender_id || getRecipientId(newMessage) !== user.id) return;

          const { data: senderProfile } = await supabase
            .from("forum_profiles")
            .select("id, display_name, avatar_url")
            .eq("id", newMessage.sender_id)
            .maybeSingle();

          const sender = {
            id: newMessage.sender_id,
            displayName: String((senderProfile as Record<string, unknown> | null)?.display_name ?? "新朋友"),
            avatarUrl: String((senderProfile as Record<string, unknown> | null)?.avatar_url ?? ""),
          };

          setIncomingPopup({
            id: newMessage.id ?? `${newMessage.sender_id}-${Date.now()}`,
            message: getMessageContent(newMessage),
            sender,
          });

          if (popupTimerRef.current) {
            window.clearTimeout(popupTimerRef.current);
          }
          popupTimerRef.current = window.setTimeout(() => {
            setIncomingPopup(null);
            popupTimerRef.current = null;
          }, 5000);
        },
      )
      .subscribe();

    return () => {
      if (popupTimerRef.current) {
        window.clearTimeout(popupTimerRef.current);
        popupTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [isConnected, user?.id]);

  const incomingPopupPortal = mounted && incomingPopup ? createPortal(
    <div className="fixed right-4 top-20 z-[99999] animate-in fade-in slide-in-from-top-10 duration-300 md:right-8">
      <div
        className="group w-80 cursor-pointer rounded-2xl border border-emerald-500/30 bg-zinc-900/95 p-4 shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur-xl transition-all hover:bg-zinc-800"
        onClick={() => {
          setActiveChatUser(incomingPopup.sender);
          setIncomingPopup(null);
          if (popupTimerRef.current) {
            window.clearTimeout(popupTimerRef.current);
            popupTimerRef.current = null;
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800">
            {incomingPopup.sender.avatarUrl ? (
              <img
                alt={`${incomingPopup.sender.displayName} 的头像`}
                className="h-full w-full object-cover"
                src={incomingPopup.sender.avatarUrl}
              />
            ) : (
              <span className="text-sm text-zinc-500">
                {incomingPopup.sender.displayName.charAt(0) || "U"}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="truncate text-sm font-bold text-white">
                {incomingPopup.sender.displayName}
              </span>
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                发来一条私信
              </span>
            </div>
            <p className="truncate text-xs text-zinc-400 transition-colors group-hover:text-zinc-300">
              {incomingPopup.message}
            </p>
          </div>

          <button
            aria-label="关闭私信提醒"
            className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              setIncomingPopup(null);
              if (popupTimerRef.current) {
                window.clearTimeout(popupTimerRef.current);
                popupTimerRef.current = null;
              }
            }}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <nav className="fixed top-4 left-0 right-0 z-[100] px-4 sm:px-8 lg:px-16">
      <div className="mx-auto flex max-w-7xl items-center justify-between py-3 gap-3">
        <Link
          href="/"
          className="group flex shrink-0 items-center transition-all duration-300"
        >
          <span
            className="text-2xl tracking-wide font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-100 to-gray-400"
            style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.25))" }}
          >
            Ti
          </span>
          <span
            className="text-2xl tracking-wide font-light bg-clip-text text-transparent bg-gradient-to-b from-white via-gray-200 to-gray-500"
            style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.15))" }}
          >
            Mix
          </span>
        </Link>

        {/* iOS 26 frosted glass nav pill */}
        <div
          className="hidden items-center gap-0.5 rounded-full px-1.5 py-1 md:flex"
          style={{
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(28px) saturate(200%)",
            WebkitBackdropFilter: "blur(28px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.12), inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 -0.5px 0 rgba(255,255,255,0.04)",
          }}
        >
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 font-body ${
                  active
                    ? "bg-white/18 text-white shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
                    : "text-white/65 hover:text-white hover:bg-white/6"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/stations"
            className="rounded-full px-4 py-2 text-sm font-medium text-white md:hidden"
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(28px) saturate(200%)",
              WebkitBackdropFilter: "blur(28px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            榜单
          </Link>
          <OnlineIndicator />
          <NotificationBell />
          <button
            aria-label="我的私信"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)] transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"
            onClick={() => setIsInboxOpen(true)}
            title="我的私信"
            type="button"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <AuthButton />
        </div>
      </div>
      {isInboxOpen ? <GlobalInboxModal onClose={() => setIsInboxOpen(false)} /> : null}
      {incomingPopupPortal}
      {activeChatUser ? (
        <DirectMessageModal
          onClose={() => setActiveChatUser(null)}
          targetUser={activeChatUser}
        />
      ) : null}
    </nav>
  );
}


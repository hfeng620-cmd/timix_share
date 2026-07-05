"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MessageSquare } from "lucide-react";

import { DirectMessageModal } from "@/components/direct-message-modal";
import { getSupabaseClient } from "@/lib/supabase";

const CARD_WIDTH = 360;
const CARD_EDGE_PADDING = 12;
const CLOSE_ANIMATION_MS = 200;

type UserProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  tags: string[] | null;
  personality_tags: string[] | null;
  custom_title?: string | null;
  created_at: string | null;
};

type UserProfile = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  tags: string[];
  custom_title: string | null;
  created_at: string | null;
};

type UserProfileCardProps = {
  userId: string;
  position: { x: number; y: number };
  viewerUserId?: string;
  onClose: () => void;
};

function normalizeProfile(row: UserProfileRow): UserProfile {
  const rawTags =
    Array.isArray(row.tags) && row.tags.length > 0
      ? row.tags
      : Array.isArray(row.personality_tags)
        ? row.personality_tags
        : [];

  return {
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio,
    tags: rawTags
      .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      .map((tag) => tag.trim())
      .slice(0, 5),
    custom_title: row.custom_title ?? null,
    created_at: row.created_at,
  };
}

function formatProfileJoinDate(value: string | null) {
  if (!value) return "加入时间未知";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "加入时间未知";
  }
}

function createArchiveId(userId: string) {
  return `PF-${userId.slice(0, 8).toUpperCase()}`;
}

function createCardMotionStyle(
  isVisible: boolean,
  delayMs = 0,
  distance = 16,
  scale = 0.992,
  prefersReducedMotion = false,
): CSSProperties {
  if (prefersReducedMotion) {
    return {
      opacity: isVisible ? 1 : 0,
      transition: "opacity 120ms linear",
    };
  }

  return {
    opacity: isVisible ? 1 : 0,
    transform: isVisible
      ? "translate3d(0, 0, 0) scale(1)"
      : `translate3d(0, ${distance}px, 0) scale(${scale})`,
    filter: isVisible ? "blur(0px)" : "blur(5px)",
    transition: [
      `opacity 420ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
      `transform 420ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
      `filter 420ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
    ].join(", "),
    willChange: "opacity, transform, filter",
  };
}

function clampCardPosition(
  position: { x: number; y: number },
  size: { width: number; height: number },
) {
  if (typeof window === "undefined") return position;

  const availableWidth = Math.max(CARD_WIDTH, window.innerWidth - CARD_EDGE_PADDING * 2);
  const availableHeight = Math.max(120, window.innerHeight - CARD_EDGE_PADDING * 2);
  const cardWidth = Math.min(size.width, availableWidth);
  const cardHeight = Math.min(size.height, availableHeight);
  const maxLeft = Math.max(CARD_EDGE_PADDING, window.innerWidth - cardWidth - CARD_EDGE_PADDING);
  const maxTop = Math.max(CARD_EDGE_PADDING, window.innerHeight - cardHeight - CARD_EDGE_PADDING);

  return {
    x: Math.min(Math.max(CARD_EDGE_PADDING, position.x), maxLeft),
    y: Math.min(Math.max(CARD_EDGE_PADDING, position.y), maxTop),
  };
}

export function UserProfileCard({ userId, position, viewerUserId, onClose }: UserProfileCardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardPosition, setCardPosition] = useState(position);
  const [isAnimating, setIsAnimating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDMOpen, setIsDMOpen] = useState(false);
  const [role, setRole] = useState<"owner" | "admin" | "user">("user");
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);

  // Smooth entrance animation
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    const timer = setTimeout(() => {
      setIsAnimating(true);
    }, 10);
    return () => {
      clearTimeout(timer);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Smooth exit animation
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsAnimating(false);
    closeTimerRef.current = setTimeout(onClose, prefersReducedMotion ? 0 : CLOSE_ANIMATION_MS);
  }, [onClose, prefersReducedMotion]);

  const updateCardPosition = useCallback(() => {
    if (typeof window === "undefined") return;
    const rect = cardRef.current?.getBoundingClientRect();
    setCardPosition(
      clampCardPosition(position, {
        width: rect?.width ?? CARD_WIDTH,
        height: rect?.height ?? Math.min(560, window.innerHeight - CARD_EDGE_PADDING * 2),
      }),
    );
  }, [position]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRole("user");
      try {
        const supabase = getSupabaseClient();
        const profileResult = await supabase
          .from("forum_profiles")
          .select("display_name, avatar_url, bio, tags, custom_title, created_at")
          .eq("id", userId)
          .single();
        let data: any = profileResult.data;
        const error = profileResult.error;
        if (error) {
          const fallback = await supabase
            .from("forum_profiles")
            .select("display_name, avatar_url, bio, tags, created_at")
            .eq("id", userId)
            .single();
          data = fallback.data;
        }
        if (!cancelled && data) {
          setProfile(normalizeProfile(data as UserProfileRow));
        }

        const { data: isOwner } = await supabase.rpc("is_site_owner", { check_user_id: userId });
        if (!cancelled && isOwner) {
          setRole("owner");
          return;
        }
        const { data: isAdmin } = await supabase.rpc("is_forum_admin", { check_user_id: userId });
        if (!cancelled && isAdmin) {
          setRole("admin");
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    updateCardPosition();
  }, [loading, profile, updateCardPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("resize", updateCardPosition);
    window.addEventListener("scroll", updateCardPosition, true);
    return () => {
      window.removeEventListener("resize", updateCardPosition);
      window.removeEventListener("scroll", updateCardPosition, true);
    };
  }, [updateCardPosition]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (isDMOpen) return;
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClose, isDMOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  const name = profile?.display_name || "用户";
  const initial = name.charAt(0).toUpperCase();
  const bioText = profile?.bio?.trim() ?? "";
  const bio = bioText || "还没有留下个人简介，这张名片暂时只展示基础身份信息。";
  const tags = profile?.tags ?? [];
  const profileCompleteness = [
    Boolean(profile?.display_name?.trim()),
    Boolean(profile?.avatar_url),
    Boolean(profile?.bio?.trim()),
    tags.length > 0,
  ].filter(Boolean).length;
  const completenessPercent = Math.round((profileCompleteness / 4) * 100);
  const completenessLabel =
    completenessPercent >= 100
      ? "主页已完成"
      : completenessPercent >= 75
        ? "接近完整"
        : completenessPercent >= 50
          ? "还差一点"
          : "建议继续补充";
  const joinDate = formatProfileJoinDate(profile?.created_at ?? null);
  const archiveId = createArchiveId(userId);
  const customTitle = profile?.custom_title?.trim() ?? "";
  const isOwnProfile = viewerUserId === userId;

  return (
    <div
      ref={cardRef}
      className="z-50 max-h-[calc(100dvh-24px)] w-[min(340px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-[28px] border border-white/10 bg-[#121214] text-zinc-100 shadow-[0_28px_80px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
      aria-label={`${name} 的公开主页预览`}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
      role="dialog"
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        left: cardPosition.x,
        top: cardPosition.y,
        transform: isAnimating ? "scale(1) translateY(0)" : "scale(0.96) translateY(-10px)",
        opacity: isAnimating ? 1 : 0,
        boxShadow: isAnimating
          ? "0 28px 78px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 16px 42px rgba(0,0,0,0.24)",
        transition: prefersReducedMotion
          ? "opacity 120ms linear"
          : "opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        transformOrigin: "top left",
      }}
    >
      {loading ? (
        <div className="p-5">
          <div className="h-24 animate-pulse rounded-[20px] bg-[var(--color-soft)]" />
          <div className="mt-4 flex items-center gap-3">
            <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--color-soft)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-soft)]" />
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--color-soft)]" />
            </div>
          </div>
          <div className="mt-4 h-16 animate-pulse rounded-[18px] bg-[var(--color-soft)]" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-soft)]" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-soft)]" />
          </div>
        </div>
      ) : (
        <>
          <div
            className="relative overflow-hidden border-b border-white/5 px-5 pb-5 pt-4 text-center"
            style={createCardMotionStyle(isAnimating, 40, 12, 0.994, prefersReducedMotion)}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.16),transparent_60%)]" />
            <button
              className="touch-press absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-500 transition hover:bg-white/[0.08] hover:text-zinc-100"
              onClick={handleClose}
              type="button"
              aria-label="关闭"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="relative mx-auto mt-9 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              {profile?.avatar_url ? (
                <img
                  alt={name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  src={profile.avatar_url}
                />
              ) : (
                <span className="text-3xl font-black text-zinc-400">{initial}</span>
              )}
            </div>

            <div className="mt-3 flex min-w-0 flex-col items-center">
              <h2 className="max-w-full truncate text-xl font-black leading-7 text-zinc-50">{name}</h2>
              <div className="mt-2 flex max-w-full flex-wrap justify-center gap-1.5">
                {role === "owner" ? (
                  <span className="rounded-md border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                    TiMix 站主
                  </span>
                ) : null}
                {role === "admin" ? (
                  <span className="rounded-md border border-blue-400/25 bg-blue-400/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                    管理员
                  </span>
                ) : null}
                {customTitle ? (
                  <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                    {customTitle}
                  </span>
                ) : null}
                {role === "user" && !customTitle ? (
                  <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                    分享成员
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-zinc-500">{joinDate}</p>
            </div>
          </div>

          <div className="space-y-3 px-5 pb-5 pt-4">
            <div
              className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              style={createCardMotionStyle(isAnimating, 120, 12, 0.996, prefersReducedMotion)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-zinc-500">公开简介</span>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                  {bioText ? `${bioText.length} 字` : "未填写"}
                </span>
              </div>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-zinc-300">{bio}</p>
            </div>

            <div
              className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              style={createCardMotionStyle(isAnimating, 170, 12, 0.996, prefersReducedMotion)}
            >
              <div className="px-3 py-3 text-center">
                <p className="text-base font-black text-zinc-50">{profileCompleteness}/4</p>
                <p className="mt-0.5 text-[10px] font-semibold text-zinc-500">资料</p>
              </div>
              <div className="border-x border-white/5 px-3 py-3 text-center">
                <p className="text-base font-black text-zinc-50">{tags.length}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-zinc-500">标签</p>
              </div>
              <div className="px-3 py-3 text-center">
                <p className="text-base font-black text-zinc-50">{completenessPercent}%</p>
                <p className="mt-0.5 text-[10px] font-semibold text-zinc-500">完成</p>
              </div>
            </div>

            <div
              className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              style={createCardMotionStyle(isAnimating, 220, 12, 0.996, prefersReducedMotion)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-zinc-500">个人标签</span>
                <span className="text-[10px] font-semibold text-zinc-500">{completenessLabel}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/8 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-dashed border-white/10 px-3 py-1 text-[11px] font-semibold text-zinc-500">
                    还没有填写个人标签
                  </span>
                )}
              </div>
            </div>

            <div
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3 text-xs text-zinc-500"
              style={createCardMotionStyle(isAnimating, 270, 12, 0.998, prefersReducedMotion)}
            >
              <span className="truncate">{archiveId}</span>
              <span className="shrink-0">公开资料卡</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2" style={createCardMotionStyle(isAnimating, 320, 12, 0.998, prefersReducedMotion)}>
              {isOwnProfile ? (
                <Link
                  className="touch-press block rounded-full bg-zinc-100 py-2.5 text-center text-sm font-bold text-zinc-950 transition hover:bg-white"
                  href="/profile"
                >
                  编辑主页
                </Link>
              ) : (
                <button
                  className="touch-press rounded-full bg-zinc-100 py-2.5 text-center text-sm font-bold text-zinc-950 transition hover:bg-white"
                  onClick={handleClose}
                  type="button"
                >
                  收起
                </button>
              )}
              {viewerUserId && !isOwnProfile ? (
                <button
                  className="touch-press inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
                  onClick={() => setIsDMOpen(true)}
                  type="button"
                >
                  <MessageSquare className="h-4 w-4" />
                  私信
                </button>
              ) : (
                <Link
                  className="touch-press block rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-center text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
                  href="/community"
                >
                  去社区
                </Link>
              )}
            </div>
          </div>
        </>
      )}
      {isDMOpen && profile ? (
        <DirectMessageModal
          onClose={() => setIsDMOpen(false)}
          targetUser={{
            id: userId,
            display_name: name,
            avatar_url: profile.avatar_url,
          }}
        />
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

import { DirectMessageModal } from "@/components/direct-message-modal";
import { Navbar } from "@/components/navbar";
import { useForumAuth } from "@/lib/forum-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type PublicProfile = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  tags: string[] | null;
  custom_title: string | null;
  created_at: string | null;
};

function formatJoinDate(value: string | null) {
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

function UserProfileContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") ?? "";
  const { user: currentUser } = useForumAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [role, setRole] = useState<"owner" | "admin" | "user">("user");
  const [loading, setLoading] = useState(true);
  const [isDMOpen, setIsDMOpen] = useState(false);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseClient();

    async function loadProfile() {
      setLoading(true);
      try {
        const profileResult = await supabase
          .from("forum_profiles")
          .select("display_name, avatar_url, bio, tags, custom_title, created_at")
          .eq("id", userId)
          .maybeSingle();
        let data: any = profileResult.data;
        const error = profileResult.error;

        if (error) {
          const fallback = await supabase
            .from("forum_profiles")
            .select("display_name, avatar_url, bio, tags, created_at")
            .eq("id", userId)
            .maybeSingle();
          data = fallback.data;
        }

        if (!cancelled) setProfile((data as PublicProfile | null) ?? null);

        const { data: isOwner } = await supabase.rpc("is_site_owner", { check_user_id: userId });
        if (!cancelled && isOwner) {
          setRole("owner");
          return;
        }

        const { data: isAdmin } = await supabase.rpc("is_forum_admin", { check_user_id: userId });
        if (!cancelled && isAdmin) setRole("admin");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const name = profile?.display_name?.trim() || "未知用户";
  const tags = Array.isArray(profile?.tags) ? profile.tags.filter(Boolean).slice(0, 5) : [];
  const isViewingSelf = currentUser?.id === userId;

  return (
    <div className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] sm:p-8">
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">正在加载公开主页...</p>
      ) : !userId || !profile ? (
        <div className="py-12 text-center text-[var(--color-muted)]">
          <p className="text-sm">暂无记录</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {profile.avatar_url ? (
              <img
                alt={name}
                className="h-24 w-24 rounded-[28px] object-cover ring-1 ring-[var(--color-line)]"
                referrerPolicy="no-referrer"
                src={profile.avatar_url}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[var(--color-soft)] text-4xl font-black text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
                {name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight">{name}</h1>
                {role === "owner" ? (
                  <span className="rounded px-2 py-0.5 text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                    TiMix 站主
                  </span>
                ) : null}
                {role === "admin" ? (
                  <span className="rounded px-2 py-0.5 text-xs font-bold bg-white/[0.06] text-zinc-300 border border-white/10">
                    管理员
                  </span>
                ) : null}
                {profile.custom_title?.trim() ? (
                  <span className="rounded-md px-2 py-0.5 text-xs font-bold bg-white/[0.06] text-zinc-300 border border-white/10">
                    {profile.custom_title.trim()}
                  </span>
                ) : null}
                {role === "user" && !profile.custom_title?.trim() ? (
                  <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                    Timix 观察成员
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-[var(--color-muted)]">{formatJoinDate(profile.created_at)}</p>
              {currentUser && !isViewingSelf ? (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-emerald-400 shadow-sm transition-all hover:bg-emerald-500/20"
                    onClick={() => setIsDMOpen(true)}
                    type="button"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">私信</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 rounded-[22px] border border-[var(--color-line)] bg-[var(--color-soft)] px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">个人简介</p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              {profile.bio?.trim() || "暂无记录"}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)] ring-1 ring-[var(--color-brand)]/20"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">暂无记录</span>
            )}
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

export default function UserProfilePage() {
  return (
    <main className="min-h-screen text-white">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 pt-28 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="text-sm text-[var(--color-muted)]">正在加载公开主页...</div>}>
          <UserProfileContent />
        </Suspense>
        <Link
          className="mt-5 inline-flex rounded-full border border-[var(--color-line)] px-5 py-2.5 text-sm font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
          href="/community"
        >
          返回讨论区
        </Link>
      </section>
    </main>
  );
}

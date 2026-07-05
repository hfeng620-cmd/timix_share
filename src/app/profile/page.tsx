"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Heart,
  LogIn,
  Mail,
  MessageCircle,
  Pencil,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { GlobalInboxModal } from "@/components/global-inbox-modal";
import { NotificationBell } from "@/components/notification-bell";
import { MobileThemeToggle } from "@/components/mobile-theme-toggle";
import { Navbar } from "@/components/navbar";
import {
  getUserLikedPosts,
  getUserPosts,
  getUserReplies,
  type DiscussionPost,
  type DiscussionReply,
  updateProfileAvatar,
  uploadAvatar,
} from "@/lib/discussion-storage";
import { FORUM_IMAGE_ACCEPT } from "@/lib/forum-image-safety";
import { useForumAuth } from "@/lib/forum-auth";
import { getSupabaseClient } from "@/lib/supabase";
import { useToast } from "@/lib/toast-context";
import { useMobileNotificationStatus } from "@/lib/use-mobile-notification-status";

type ActivityTab = "feed" | "posts" | "about";
type ReplyWithPost = { reply: DiscussionReply; postTitle: string; postId: string };

const activityTabs: { key: ActivityTab; label: string }[] = [
  { key: "feed", label: "动态" },
  { key: "posts", label: "帖子" },
  { key: "about", label: "关于" },
];

function EmptyRecordsState({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-white/[0.04] px-4 py-8 text-center">
      <p className="text-sm font-semibold text-white/72">暂无{label}</p>
      <p className="mt-1 text-xs text-white/50">去分享或互动后，这里会自动更新。</p>
    </div>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) return "暂无";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatProfileJoinDate(value?: string | null) {
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

function normalizeTagList(value: string[]) {
  return Array.from(
    new Set(value.map((item) => item.trim()).filter((item) => item.length > 0)),
  ).slice(0, 5);
}

function truncateText(value?: string | null, maxLength = 78) {
  if (!value) return "";

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function pickTopStation(posts: DiscussionPost[]) {
  const stationMap = new Map<string, number>();
  for (const post of posts) {
    if (!post.station) continue;
    stationMap.set(post.station, (stationMap.get(post.station) ?? 0) + 1);
  }

  let topStation = "";
  let topCount = 0;
  for (const [station, count] of stationMap.entries()) {
    if (count > topCount) {
      topStation = station;
      topCount = count;
    }
  }

  return topStation ? { station: topStation, count: topCount } : null;
}

export default function ProfilePage() {
  const { isConnected, user, email, displayName, isAdmin, isOwner, showAuthModal, setDisplayName } = useForumAuth();
  const { addToast } = useToast();
  const { inboxUnread, notificationUnread, permission: notificationPermission, requestPermission: requestNotificationPermission } = useMobileNotificationStatus();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<DiscussionPost[]>([]);
  const [replies, setReplies] = useState<ReplyWithPost[]>([]);
  const [activeTab, setActiveTab] = useState<ActivityTab>("feed");
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(displayName ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bio, setBio] = useState("");
  const [newBio, setNewBio] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!isConnected || !user) {
      setPosts([]);
      setLikedPosts([]);
      setReplies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [postData, likedData, replyData] = await Promise.all([
        getUserPosts(user.id),
        getUserLikedPosts(user.id),
        getUserReplies(user.id),
      ]);
      setPosts(postData);
      setLikedPosts(likedData);
      setReplies(replyData);
    } catch {
      setPosts([]);
      setLikedPosts([]);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!isConnected || !user) return;
    (async () => {
      try {
        const profileResult = await getSupabaseClient()
          .from("forum_profiles")
          .select("avatar_url, bio, custom_title")
          .eq("id", user.id)
          .single();
        let profileData: { avatar_url?: string | null; bio?: string | null; custom_title?: string | null } | null =
          profileResult.data;
        let profileError = profileResult.error;

        if (profileError) {
          const fallback = await getSupabaseClient()
            .from("forum_profiles")
            .select("avatar_url, bio")
            .eq("id", user.id)
            .single();
          profileData = fallback.data;
          profileError = fallback.error;
        }

        if (profileError) {
          console.error("[Profile] Load avatar/bio error:", profileError.message);
        } else if (profileData) {
          if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
          if (profileData.bio) setBio(profileData.bio);
          setCustomTitle((profileData.custom_title ?? "").trim());
        }

        try {
          const { data: tagsData } = await getSupabaseClient()
            .from("forum_profiles")
            .select("tags")
            .eq("id", user.id)
            .single();
          if (tagsData && Array.isArray(tagsData.tags)) {
            setTags(normalizeTagList(tagsData.tags));
          }
        } catch (tagsErr) {
          console.warn("[Profile] Tags column may not exist:", tagsErr);
        }
      } catch (err) {
        console.error("[Profile] Load profile error:", err);
      }
    })();
  }, [isConnected, user]);

  async function handleAvatarUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      addToast("头像不能超过 2MB。", "error");
      return;
    }

    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(file);
      await updateProfileAvatar(url);
      setAvatarUrl(url);
      addToast("头像已更新。", "success");
    } catch {
      addToast("头像上传失败，请稍后重试。", "error");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSaveProfile() {
    if (!user || !newName.trim()) return;
    setNameSaving(true);
    const nextTags = normalizeTagList(newTags);
    let saveSuccess = true;

    try {
      if (newName.trim() !== name) {
        await setDisplayName(newName.trim());
      }

      const { error: bioError } = await getSupabaseClient()
        .from("forum_profiles")
        .upsert({ id: user.id, bio: newBio.trim() }, { onConflict: "id" });
      if (bioError) {
        console.error("[Profile] Save bio error:", bioError.message);
        saveSuccess = false;
      }

      try {
        const { error: tagsError } = await getSupabaseClient()
          .from("forum_profiles")
          .upsert({ id: user.id, tags: nextTags }, { onConflict: "id" });
        if (tagsError) {
          console.warn("[Profile] Tags save failed (column may not exist):", tagsError.message);
        }
      } catch (tagsErr) {
        console.warn("[Profile] Tags column may not exist:", tagsErr);
      }

      if (saveSuccess) {
        setBio(newBio.trim());
        setTags(nextTags);
        setEditingName(false);
        addToast("资料已保存。", "success");
      } else {
        addToast("保存失败，请检查网络后重试。", "error");
      }
    } catch (err) {
      console.error("[Profile] Save profile exception:", err);
      addToast("保存失败，请检查网络后重试。", "error");
    } finally {
      setNameSaving(false);
    }
  }

  const postCount = posts.length;
  const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
  const totalReplies = posts.reduce((sum, post) => sum + post.replyCount, 0);
  const authoredReplyCount = replies.length;
  const totalContribution = postCount + authoredReplyCount;
  const uniqueStations = new Set(posts.map((post) => post.station).filter(Boolean)).size;
  const bioText = bio.trim();
  const name = displayName || email?.split("@")[0] || "用户";
  const initial = name.charAt(0).toUpperCase();
  const hasCustomName = Boolean(displayName?.trim());
  const profileCompleteness = [hasCustomName, Boolean(avatarUrl), Boolean(bioText), tags.length > 0].filter(Boolean).length;
  const completenessPercent = Math.round((profileCompleteness / 4) * 100);
  const mostDiscussedStation = pickTopStation(posts);
  const latestPost = posts[0];
  const latestReply = replies[0];
  const latestLike = likedPosts[0];
  const joinDate = formatProfileJoinDate(user?.created_at);
  const activeArchiveCount = activeTab === "feed" ? totalContribution + likedPosts.length : activeTab === "posts" ? posts.length : profileCompleteness;
  const currentTabLabel = activityTabs.find((tab) => tab.key === activeTab)?.label ?? "动态";
  const isProfileDirty =
    newName.trim() !== name || newBio !== bio || JSON.stringify(normalizeTagList(newTags)) !== JSON.stringify(tags);

  const roleLabel = isOwner ? "TiMix 站主" : isAdmin ? "管理员" : customTitle || "成员";
  const focusLabel = mostDiscussedStation ? mostDiscussedStation.station : uniqueStations > 0 ? `${uniqueStations} 个站点` : "还在探索";
  const profileHint = bioText || "补一句简介，让别人更快知道你关注什么。";

  const stats = [
    { label: "动态", value: totalContribution },
    { label: "帖子", value: postCount },
    { label: "获赞", value: totalLikes },
    { label: "回响", value: totalReplies },
  ];

  const recentItems = [
    {
      title: "最近分享",
      meta: latestPost ? formatDateLabel(latestPost.postedAt) : "暂无记录",
      body: latestPost ? truncateText(latestPost.body) : "发出第一条分享后会出现在这里。",
    },
    {
      title: "最近回复",
      meta: latestReply ? formatDateLabel(latestReply.reply.postedAt) : "暂无记录",
      body: latestReply ? truncateText(latestReply.reply.body) : "参与讨论后会沉淀为你的贡献。",
    },
    {
      title: "最近喜欢",
      meta: latestLike ? formatDateLabel(latestLike.postedAt) : "暂无记录",
      body: latestLike ? truncateText(latestLike.body) : "喜欢过的内容会留在这里。",
    },
  ];

  function beginEditProfile() {
    setEditingName(true);
    setNewName(name);
    setNewBio(bio);
    setNewTags([...tags]);
    setTagInput("");
  }
  function handleCheckUpdate() {
    if (isCheckingUpdate) return;

    setIsCheckingUpdate(true);
    window.setTimeout(() => {
      setIsCheckingUpdate(false);
      addToast("当前已是最新版本 v1.0.0", "success");
    }, 1500);
  }

  return (
    <div className="profile-mobile-app min-h-[100dvh] overflow-x-hidden bg-[#09090b] text-white">
      <Navbar />

      <main className="mx-auto max-w-md px-4 pb-24 pt-20 sm:max-w-2xl lg:max-w-3xl">
        <header className="-mx-4 rounded-b-[30px] border-b border-white/5 bg-[#09090b]/80 px-4 pb-5 pt-3 shadow-[0_14px_42px_rgba(0,0,0,0.34)] sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-300">TiMix</p>
              <h1 className="mt-1 text-xl font-black tracking-normal text-white">我的</h1>
            </div>
            <div className="flex items-center gap-2">
              <MobileThemeToggle />
              {isConnected ? (
                <>
                  <NotificationBell />
                  <button
                    aria-label={`打开私信${inboxUnread > 0 ? `，${inboxUnread} 条未读` : ""}`}
                    className="btn-press relative flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-zinc-300 shadow-sm ring-1 ring-white/10 transition active:scale-95 active:bg-white/[0.12]"
                    onClick={() => setIsInboxOpen(true)}
                    type="button"
                  >
                    <Mail size={18} />
                    {inboxUnread > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-black leading-none text-zinc-950 ring-2 ring-[#09090b]">
                        {inboxUnread > 99 ? "99+" : inboxUnread}
                      </span>
                    ) : null}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {!isConnected ? (
            <section className="mt-5 rounded-[22px] bg-white/[0.07] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-300">
                  <UserRound size={26} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black text-white">登录后使用个人页</p>
                  <p className="mt-1 text-xs leading-5 text-white/50">管理头像、分享、贡献和私信。</p>
                </div>
              </div>
              <button
                className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,255,255,0.055)]"
                onClick={showAuthModal}
                type="button"
              >
                <LogIn size={17} />
                登录 / 注册
              </button>
            </section>
          ) : (
            <section className="mt-5 overflow-hidden rounded-[30px] border border-white/5 bg-white/[0.035] shadow-[0_18px_52px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/[0.03]">
              <div className="relative h-32 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.18),transparent_32%),linear-gradient(135deg,#18181b_0%,#09090b_54%,#121214_100%)]">
                <div className="absolute inset-x-4 top-4 flex items-center justify-between text-[11px] font-semibold text-white/55">
                  <span>TiMix Social</span>
                  <span>{focusLabel}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#09090b]/85 to-transparent" />
              </div>

              <div className="px-4 pb-4">
                <div className="-mt-10 flex items-end justify-between gap-3">
                  <button
                    className="btn-press group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#09090b] bg-[#18181b] text-3xl font-black text-zinc-300 shadow-[0_16px_34px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10"
                    onClick={() => avatarInputRef.current?.click()}
                    title="点击更换头像"
                    type="button"
                  >
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" src={avatarUrl} />
                    ) : (
                      <span>{initial}</span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-[#09090b]/72 py-1.5 text-[10px] font-bold text-white/86 transition-opacity group-active:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      {avatarUploading ? "上传中" : "换头像"}
                    </span>
                    <input
                      ref={avatarInputRef}
                      accept={FORUM_IMAGE_ACCEPT}
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                        if (avatarInputRef.current) avatarInputRef.current.value = "";
                      }}
                      type="file"
                    />
                  </button>

                  <button
                    aria-label="编辑资料"
                    className="btn-press mb-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-100 px-4 text-sm font-bold text-zinc-950 shadow-[0_10px_24px_rgba(255,255,255,0.055)]"
                    onClick={beginEditProfile}
                    type="button"
                  >
                    <Pencil size={16} />
                    编辑
                  </button>
                </div>

                <div className="mt-3 min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="max-w-full truncate text-2xl font-black leading-8 tracking-normal text-white">{name}</h2>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                        isOwner
                          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                          : isAdmin
                            ? "border-white/15 bg-white/[0.06] text-zinc-100"
                            : "border-white/10 bg-white/[0.045] text-zinc-300"
                      }`}
                    >
                      {roleLabel}
                    </span>
                    {customTitle && !isOwner && !isAdmin ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-bold text-zinc-300">
                        {customTitle}
                      </span>
                    ) : null}
                  </div>
                  {email ? <p className="mt-1 truncate text-xs text-zinc-500">{email}</p> : null}

                  <p className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                    {profileHint}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-white/5 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
                      {joinDate}
                    </span>
                    <span className="rounded-full border border-white/5 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
                      关注 {focusLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 divide-x divide-white/5 rounded-2xl border border-white/5 bg-white/[0.035] py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                  {stats.map((item) => (
                    <div key={item.label} className="min-w-0 text-center">
                      <p className="truncate text-base font-black leading-6 text-white">{item.value}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </header>

        {isConnected ? (
          <>
            <nav className="sticky top-[64px] z-30 -mx-4 mt-3 border-y border-white/5 bg-[#09090b]/86 px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:-mx-6 sm:px-6" aria-label="个人主页内容切换">
              <div className="grid grid-cols-3 rounded-2xl bg-white/[0.035] p-1 ring-1 ring-white/5">
                {activityTabs.map((tab) => {
                  const count = tab.key === "feed" ? totalContribution + likedPosts.length : tab.key === "posts" ? posts.length : profileCompleteness;
                  return (
                    <button
                      key={tab.key}
                      className={`btn-press min-h-11 rounded-xl px-2 text-xs font-bold transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                        activeTab === tab.key
                          ? "bg-zinc-100 text-zinc-950 shadow-[0_8px_18px_rgba(255,255,255,0.06)]"
                          : "text-zinc-400 active:bg-white/[0.06]"
                      }`}
                      aria-pressed={activeTab === tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      type="button"
                    >
                      {tab.label}{tab.key === "about" ? "" : ` ${count}`}
                    </button>
                  );
                })}
              </div>
            </nav>

            {editingName ? (
              <section className="mt-4 rounded-[22px] border border-white/5 bg-white/[0.035] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.045)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-black text-white">编辑资料</h2>
                  <span className="text-xs font-semibold text-zinc-400">{profileCompleteness}/4</span>
                </div>
                <input
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
                  maxLength={80}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="昵称"
                  value={newName}
                />
                <textarea
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-white/20"
                  maxLength={200}
                  onChange={(event) => setNewBio(event.target.value)}
                  placeholder="写一句个人简介"
                  rows={3}
                  value={newBio}
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>简介会显示在个人主页。</span>
                  <span>{newBio.trim().length}/200</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {newTags.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="inline-flex min-h-8 items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-bold text-zinc-300"
                    >
                      {tag}
                      <button
                        aria-label={`删除标签 ${tag}`}
                        className="btn-press -mr-1 flex h-7 w-7 items-center justify-center rounded-full text-white/45 active:bg-white/10 active:text-white/80"
                        onClick={() => setNewTags(newTags.filter((_, itemIndex) => itemIndex !== index))}
                        type="button"
                      >
                        x
                      </button>
                    </span>
                  ))}
                  {newTags.length < 5 ? (
                    <input
                      className="min-h-9 w-28 rounded-full border border-white/10 bg-white/[0.055] px-3 text-xs outline-none transition focus:border-white/20"
                      maxLength={20}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && tagInput.trim() && newTags.length < 5) {
                          event.preventDefault();
                          setNewTags(normalizeTagList([...newTags, tagInput]));
                          setTagInput("");
                        }
                      }}
                      placeholder="回车添加"
                      value={tagInput}
                    />
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="btn-press min-h-11 rounded-2xl bg-zinc-100 px-4 text-sm font-bold text-zinc-950 transition active:scale-[0.98] disabled:opacity-50"
                    disabled={!newName.trim() || nameSaving || !isProfileDirty}
                    onClick={handleSaveProfile}
                    type="button"
                  >
                    {nameSaving ? "保存中..." : "保存"}
                  </button>
                  <button
                    className="btn-press min-h-11 rounded-2xl border border-white/10 bg-white/[0.075] px-4 text-sm font-bold text-zinc-300 transition active:bg-white/[0.10]"
                    onClick={() => setEditingName(false)}
                    type="button"
                  >
                    取消
                  </button>
                </div>
              </section>
            ) : null}

            <section id="activity" className="mt-4 rounded-[24px] border border-white/5 bg-white/[0.035] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.045)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white">{currentTabLabel}</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">{activeArchiveCount} 条个人记录</p>
                </div>
                <MessageCircle className="text-zinc-500" size={20} />
              </div>

              <div className="mt-4">
                {loading ? (
                  <div className="rounded-[18px] border border-white/5 bg-white/[0.04] px-4 py-8 text-center text-sm text-zinc-500">正在加载...</div>
                ) : activeTab === "feed" ? (
                  <div className="divide-y divide-white/5">
                    {recentItems.map((item) => (
                      <div key={item.title} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-zinc-100">{item.title}</p>
                          <span className="text-[11px] font-semibold text-zinc-500">{item.meta}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{item.body}</p>
                      </div>
                    ))}
                    <Link className="btn-press flex min-h-11 items-center justify-between py-3 text-sm font-bold text-zinc-200" href="/guides">
                      去发布新的分享
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                ) : activeTab === "posts" ? (
                  posts.length === 0 ? (
                    <EmptyRecordsState label="帖子" />
                  ) : (
                    <div className="divide-y divide-white/5">
                      {posts.slice(0, 12).map((post) => (
                        <Link key={post.issueNumber} className="btn-press block py-3 first:pt-0 last:pb-0" href="/community">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-zinc-500">
                            {post.station ? <span className="rounded-full border border-white/5 bg-white/[0.05] px-2 py-0.5 text-zinc-300">{post.station}</span> : null}
                            <span>{formatDateLabel(post.postedAt)}</span>
                            <span>{post.likes} 赞</span>
                            <span>{post.replyCount} 回复</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-zinc-100">{post.body}</p>
                        </Link>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-white">资料完成度</h3>
                        <span className="text-sm font-black text-zinc-300">{completenessPercent}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.075]">
                        <div className="h-full rounded-full bg-zinc-100 transition-[width]" style={{ width: `${completenessPercent}%` }} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(tags.length > 0 ? tags : ["还没有标签"]).map((tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            className="rounded-full border border-white/5 bg-white/[0.055] px-3 py-1 text-xs font-semibold text-zinc-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn-press flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.035] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
                      onClick={async () => {
                        const nextPermission = await requestNotificationPermission();
                        if (nextPermission === "granted") addToast("手机通知已开启。", "success");
                        else if (nextPermission === "denied") addToast("系统已拒绝通知，请在浏览器或手机设置里开启。", "warning");
                        else addToast("当前环境暂不支持系统通知。", "info");
                      }}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-400">
                          <Mail className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-100">系统通知</p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {notificationPermission === "granted"
                              ? "私信和帖子回复会推送到手机"
                              : notificationPermission === "denied"
                                ? "已被系统拒绝"
                                : notificationPermission === "default"
                                  ? "点击开启私信和回复提醒"
                                  : "当前环境暂不支持"}
                          </p>
                        </div>
                      </div>
                      <span className="ml-3 shrink-0 rounded-full border border-white/5 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-zinc-400">
                        {notificationPermission === "granted" ? "已开启" : notificationPermission === "default" ? "去开启" : notificationPermission === "denied" ? "已关闭" : "不可用"}
                      </span>
                    </button>

                    <button
                      className="btn-press flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.035] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] disabled:opacity-80"
                      disabled={isCheckingUpdate}
                      onClick={handleCheckUpdate}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-400">
                          <RefreshCw className={`h-5 w-5 ${isCheckingUpdate ? "animate-spin text-emerald-400" : ""}`} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-100">检查更新</p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {isCheckingUpdate ? "正在连接更新服务..." : "当前安装包版本"}
                          </p>
                        </div>
                      </div>
                      <span className="ml-3 shrink-0 text-xs font-medium text-zinc-500">v1.0.0</span>
                    </button>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4 text-xs leading-5 text-zinc-400">
                      <p className="font-semibold text-zinc-200">通知范围</p>
                      <p className="mt-1">私信、帖子回复、点赞、审核通过和公告会进入通知中心；授权后，在 App 打开或保持活跃时会同步触发手机系统通知。</p>
                      <p className="mt-2 text-zinc-500">当前未读：通知 {notificationUnread}，私信 {inboxUnread}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <Link className="btn-press flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-white/[0.035] text-xs font-bold text-zinc-300" href="/guides">
                        <Sparkles size={17} />
                        分享
                      </Link>
                      <a className="btn-press flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-white/[0.035] text-xs font-bold text-zinc-300" href="#activity">
                        <ShieldCheck size={17} />
                        贡献
                      </a>
                      <button
                        className="btn-press flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-white/[0.035] text-xs font-bold text-zinc-300"
                        onClick={() => setIsInboxOpen(true)}
                        type="button"
                      >
                        <Mail size={17} />
                        私信
                      </button>
                      <button
                        className="btn-press flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-white/[0.035] text-xs font-bold text-zinc-300"
                        onClick={beginEditProfile}
                        type="button"
                      >
                        <Settings size={17} />
                        设置
                      </button>
                    </div>

                    {likedPosts.length > 0 ? (
                      <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-100">
                          <Heart size={15} />
                          最近喜欢
                        </div>
                        <p className="line-clamp-2 text-xs leading-5 text-zinc-400">{truncateText(latestLike?.body)}</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>

      {isInboxOpen ? <GlobalInboxModal onClose={() => setIsInboxOpen(false)} /> : null}
    </div>
  );
}

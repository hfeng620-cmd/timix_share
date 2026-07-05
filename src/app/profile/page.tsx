"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronRight,
  Heart,
  LogIn,
  Mail,
  MessageCircle,
  Pencil,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { GlobalInboxModal } from "@/components/global-inbox-modal";
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

type ActivityTab = "posts" | "replies" | "likes";
type ReplyWithPost = { reply: DiscussionReply; postTitle: string; postId: string };

const activityTabs: { key: ActivityTab; label: string }[] = [
  { key: "posts", label: "分享" },
  { key: "replies", label: "回复" },
  { key: "likes", label: "喜欢" },
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<DiscussionPost[]>([]);
  const [replies, setReplies] = useState<ReplyWithPost[]>([]);
  const [activeTab, setActiveTab] = useState<ActivityTab>("posts");
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
  const activeArchiveCount = activeTab === "posts" ? posts.length : activeTab === "replies" ? replies.length : likedPosts.length;
  const currentTabLabel = activityTabs.find((tab) => tab.key === activeTab)?.label ?? "记录";
  const isProfileDirty =
    newName.trim() !== name || newBio !== bio || JSON.stringify(normalizeTagList(newTags)) !== JSON.stringify(tags);

  const roleLabel = isOwner ? "TiMix 站主" : isAdmin ? "管理员" : customTitle || "成员";
  const focusLabel = mostDiscussedStation ? mostDiscussedStation.station : uniqueStations > 0 ? `${uniqueStations} 个站点` : "还在探索";
  const profileHint = bioText || "补一句简介，让别人更快知道你关注什么。";

  const stats = [
    { label: "分享", value: postCount },
    { label: "贡献", value: totalContribution },
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

  return (
    <div className="profile-mobile-app min-h-[100dvh] bg-[#07080b] text-white">
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
                <button
                  aria-label="打开私信"
                  className="btn-press flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-zinc-300 shadow-sm ring-1 ring-white/10"
                  onClick={() => setIsInboxOpen(true)}
                  type="button"
                >
                  <Bell size={18} />
                </button>
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
            <section className="mt-5 rounded-[24px] bg-white/[0.07] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/10">
              <div className="flex gap-3">
                <button
                  className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/[0.05] text-2xl font-black text-zinc-300 ring-1 ring-white/10"
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
                  <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
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

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-black leading-6 text-white">{name}</p>
                        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] font-bold text-zinc-300 ring-1 ring-white/10">
                          {roleLabel}
                        </span>
                      </div>
                      {email ? <p className="mt-1 truncate text-xs text-white/50">{email}</p> : null}
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/62">{profileHint}</p>
                    </div>
                    <button
                      aria-label="编辑资料"
                      className="btn-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.075] text-white/72"
                      onClick={beginEditProfile}
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {customTitle && !isOwner && !isAdmin ? (
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] font-bold text-zinc-300 ring-1 ring-white/10">
                        {customTitle}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white/[0.075] px-2 py-0.5 text-[11px] font-semibold text-white/62">
                      {joinDate}
                    </span>
                    <span className="rounded-full bg-white/[0.075] px-2 py-0.5 text-[11px] font-semibold text-white/62">
                      关注 {focusLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 divide-x divide-zinc-100 rounded-2xl bg-white/[0.055] py-3">
                {stats.map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-lg font-black leading-6 text-white">{item.value}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-white/50">{item.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </header>

        {isConnected ? (
          <>
            <section className="mt-4 grid grid-cols-4 gap-2">
              <Link className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.07] px-2 py-3 text-xs font-bold text-white/72 shadow-sm ring-1 ring-zinc-100" href="/guides">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-zinc-300">
                  <Sparkles size={17} />
                </span>
                分享
              </Link>
              <a className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.07] px-2 py-3 text-xs font-bold text-white/72 shadow-sm ring-1 ring-zinc-100" href="#activity">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={17} />
                </span>
                贡献
              </a>
              <button
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.07] px-2 py-3 text-xs font-bold text-white/72 shadow-sm ring-1 ring-zinc-100"
                onClick={() => setIsInboxOpen(true)}
                type="button"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-zinc-300">
                  <Mail size={17} />
                </span>
                私信
              </button>
              <button
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.07] px-2 py-3 text-xs font-bold text-white/72 shadow-sm ring-1 ring-zinc-100"
                onClick={beginEditProfile}
                type="button"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.075] text-white/72">
                  <Settings size={17} />
                </span>
                设置
              </button>
            </section>

            {editingName ? (
              <section className="mt-4 rounded-[22px] bg-white/[0.07] p-4 shadow-sm ring-1 ring-zinc-100">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-black text-white">编辑资料</h2>
                  <span className="text-xs font-semibold text-zinc-300">{profileCompleteness}/4</span>
                </div>
                <input
                  className="mt-4 w-full rounded-2xl border border-zinc-200 bg-white/[0.055] px-4 py-3 text-sm text-white outline-none transition focus:border-teal-400"
                  maxLength={80}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="昵称"
                  value={newName}
                />
                <textarea
                  className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-white/[0.055] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-teal-400"
                  maxLength={200}
                  onChange={(event) => setNewBio(event.target.value)}
                  placeholder="写一句个人简介"
                  rows={3}
                  value={newBio}
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
                  <span>简介会显示在“我的”资料卡。</span>
                  <span>{newBio.trim().length}/200</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {newTags.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-xs font-bold text-zinc-300 ring-1 ring-white/10"
                    >
                      {tag}
                      <button
                        className="text-white/38 hover:text-white/72"
                        onClick={() => setNewTags(newTags.filter((_, itemIndex) => itemIndex !== index))}
                        type="button"
                      >
                        x
                      </button>
                    </span>
                  ))}
                  {newTags.length < 5 ? (
                    <input
                      className="w-28 rounded-full border border-zinc-200 bg-white/[0.055] px-3 py-1 text-xs outline-none transition focus:border-teal-400"
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
                    className="btn-press rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-bold text-black disabled:opacity-50"
                    disabled={!newName.trim() || nameSaving || !isProfileDirty}
                    onClick={handleSaveProfile}
                    type="button"
                  >
                    {nameSaving ? "保存中..." : "保存"}
                  </button>
                  <button
                    className="rounded-2xl bg-white/[0.075] px-4 py-3 text-sm font-bold text-white/72"
                    onClick={() => setEditingName(false)}
                    type="button"
                  >
                    取消
                  </button>
                </div>
              </section>
            ) : null}

            <section className="mt-4 rounded-[22px] bg-white/[0.07] p-4 shadow-sm ring-1 ring-zinc-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-white">资料完成度</h2>
                <span className="text-sm font-black text-zinc-300">{completenessPercent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.075]">
                <div className="h-full rounded-full bg-zinc-100 transition-[width]" style={{ width: `${completenessPercent}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(tags.length > 0 ? tags : ["还没有标签"]).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full bg-white/[0.075] px-3 py-1 text-xs font-semibold text-white/62"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-4 rounded-[22px] bg-white/[0.07] p-4 shadow-sm ring-1 ring-zinc-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-white">最近动态</h2>
                <Link className="flex items-center gap-0.5 text-xs font-bold text-zinc-300" href="/guides">
                  去分享
                  <ChevronRight size={14} />
                </Link>
              </div>
              <div className="mt-3 divide-y divide-zinc-100">
                {recentItems.map((item) => (
                  <div key={item.title} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-white/82">{item.title}</p>
                      <span className="text-[11px] font-semibold text-white/38">{item.meta}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/50">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="activity" className="mt-4 rounded-[22px] bg-white/[0.07] p-4 shadow-sm ring-1 ring-zinc-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white">我的贡献</h2>
                  <p className="mt-0.5 text-xs text-white/50">{activeArchiveCount} 条{currentTabLabel}记录</p>
                </div>
                <MessageCircle className="text-teal-600" size={20} />
              </div>

              <div className="mt-4 grid grid-cols-3 rounded-2xl bg-white/[0.075] p-1">
                {activityTabs.map((tab) => {
                  const count = tab.key === "posts" ? posts.length : tab.key === "replies" ? replies.length : likedPosts.length;
                  return (
                    <button
                      key={tab.key}
                      className={`rounded-xl px-2 py-2 text-xs font-bold transition ${
                        activeTab === tab.key ? "bg-white/[0.08] text-zinc-300 shadow-sm" : "text-white/50"
                      }`}
                      aria-pressed={activeTab === tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      type="button"
                    >
                      {tab.label} {count}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                {loading ? (
                  <div className="rounded-[18px] bg-white/[0.055] px-4 py-8 text-center text-sm text-white/50">正在加载...</div>
                ) : activeTab === "posts" ? (
                  posts.length === 0 ? (
                    <EmptyRecordsState label="分享" />
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {posts.slice(0, 10).map((post) => (
                        <Link key={post.issueNumber} className="block py-3 first:pt-0 last:pb-0" href="/community">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/38">
                            {post.station ? <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-zinc-300">{post.station}</span> : null}
                            <span>{formatDateLabel(post.postedAt)}</span>
                            <span>{post.likes} 赞</span>
                            <span>{post.replyCount} 回复</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white/82">{post.body}</p>
                        </Link>
                      ))}
                    </div>
                  )
                ) : activeTab === "replies" ? (
                  replies.length === 0 ? (
                    <EmptyRecordsState label="回复" />
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {replies.map((item) => (
                        <Link key={item.reply.id} className="block py-3 first:pt-0 last:pb-0" href="/community">
                          <p className="text-[11px] font-semibold text-white/38">
                            回复 {item.postTitle} · {formatDateLabel(item.reply.postedAt)}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white/82">{item.reply.body}</p>
                        </Link>
                      ))}
                    </div>
                  )
                ) : likedPosts.length === 0 ? (
                  <EmptyRecordsState label="喜欢" />
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {likedPosts.map((post) => (
                      <Link key={post.issueNumber} className="block py-3 first:pt-0 last:pb-0" href="/community">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/38">
                          {post.station ? <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-zinc-300">{post.station}</span> : null}
                          <span>{formatDateLabel(post.postedAt)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Heart size={12} />
                            {post.likes}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white/82">{post.body}</p>
                      </Link>
                    ))}
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

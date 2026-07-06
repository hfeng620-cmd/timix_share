"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Heart, MessageCircle, Bookmark, Plus, Flame,
  Folder, ChevronRight, Trash2,
} from "lucide-react";
import { useForumAuth } from "@/lib/forum-auth";
import { useToast } from "@/lib/toast-context";
import { loadFolders, loadAllPosts, createFolder, createSharePost, deleteSharePost, deleteFolder, getFolderCreator, getFolderContributors, toggleHot, togglePostLike, type ShareFolder, type SharePost, type Contributor, type Liker } from "@/lib/share-storage";
import { EditPanelModal } from "@/components/edit-panel-modal";
import { LikeIndicator } from "@/components/like-indicator";
import { MobileThemeToggle } from "@/components/mobile-theme-toggle";
import { PwaInstallCallout } from "@/components/pwa-install-prompt";
import { ShareCreateModal, type CreateMode } from "@/components/share-create-modal";
import { PostDetailModal } from "@/components/post-detail-modal";

/* ──────────────────────────────────────────────
   Data model — tree structure
   - Folder: { type:"folder", name, desc?, children }
   - Post:   { type:"post", id, title, summary, tag, likes, comments, bookmarks }
   ────────────────────────────────────────────── */

type TreeNode = FolderNode | PostNode;

type FolderNode = {
  type: "folder";
  name: string;
  desc?: string;
  dbId?: string;
  children: TreeNode[];
};

type PostNode = {
  type: "post";
  id: string;
  title: string;
  summary: string;
  link: string | null;
  tag: string;
  likes: import('@/lib/share-storage').Liker[];
  comments: number;
  bookmarks: number;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  createdAt: string;
  body: string;
  isHot: boolean;
};

const emptyRoot: FolderNode = { type: "folder", name: "root", children: [] };

function buildTreeFromDb(dbFolders: ShareFolder[], dbPosts: SharePost[]): FolderNode {
  const childrenMap = new Map<string | null, ShareFolder[]>();
  for (const f of dbFolders) {
    const key = f.parentId;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(f);
  }
  const postsByFolder = new Map<string | null, SharePost[]>();
  for (const p of dbPosts) {
    const key = p.folderId ?? "__root__";
    if (!postsByFolder.has(key)) postsByFolder.set(key, []);
    postsByFolder.get(key)!.push(p);
  }
  function convertFolder(f: ShareFolder): FolderNode {
    const childFolders = (childrenMap.get(f.id) ?? []).map(convertFolder);
    const childPosts: PostNode[] = (postsByFolder.get(f.id) ?? []).map((p) => ({
      type: "post", id: p.id, title: p.title, summary: p.summary,
      link: p.link,
      tag: f.name, likes: p.likes, comments: p.commentsCount, bookmarks: 0,
      authorId: p.authorId, authorName: p.authorName, authorAvatar: p.authorAvatar,
      createdAt: p.createdAt, body: p.body, isHot: p.isHot,
    }));
    return { type: "folder", name: f.name, desc: f.description || undefined, dbId: f.id, children: [...childFolders, ...childPosts] };
  }
  const rootFolders = (childrenMap.get(null) ?? []).map(convertFolder);
  const rootPosts: PostNode[] = (postsByFolder.get("__root__") ?? []).map((p) => ({
    type: "post", id: p.id, title: p.title, summary: p.summary,
    link: p.link,
    tag: "root", likes: p.likes, comments: p.commentsCount, bookmarks: 0,
    authorId: p.authorId, authorName: p.authorName, authorAvatar: p.authorAvatar,
    createdAt: p.createdAt, body: p.body, isHot: p.isHot,
  }));
  return { type: "folder", name: "root", children: [...rootFolders, ...rootPosts] };
}

/* ── Helpers ── */

type Breadcrumb = { name: string; index: number }[];

function resolvePath(tree: FolderNode, indices: number[]): FolderNode | null {
  let current: FolderNode = tree;
  for (const i of indices) {
    const child = current.children[i];
    if (!child || child.type !== "folder") return null;
    current = child;
  }
  return current;
}

function getBreadcrumb(tree: FolderNode, indices: number[]): Breadcrumb {
  const crumbs: Breadcrumb = [{ name: "分享", index: -1 }];
  let current = tree;
  for (const i of indices) {
    const child = current.children[i];
    if (!child || child.type !== "folder") break;
    crumbs.push({ name: child.name, index: i });
    current = child;
  }
  return crumbs;
}

/* ── Post card ── */

function PostCard({ post, onClick, onEdit, onDelete, onToggleHot }: { post: PostNode; onClick: () => void; onEdit?: () => void; onDelete?: () => void; onToggleHot?: () => void }) {
  const { user, isAdmin, isOwner, displayName } = useForumAuth();
  const { addToast } = useToast();
  const canEdit = !!(user && (isAdmin || isOwner || user.id === post.authorId));
  const [likers, setLikers] = useState(post.likes);
  const [likePending, setLikePending] = useState(false);
  useEffect(() => { setLikers(post.likes); }, [post.likes]);
  const liked = user ? likers.some((l) => l.userId === user.id) : false;
  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user || likePending) return;
    setLikePending(true);
    const optimisticName = displayName ?? user.email?.split("@")[0] ?? "我";
    const optimisticLiker: Liker = {
      userId: user.id,
      displayName: optimisticName,
      avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
      role: isOwner ? "owner" : isAdmin ? "admin" : "user",
    };
    const next = liked
      ? likers.filter((l) => l.userId !== user!.id)
      : [...likers, optimisticLiker];
    setLikers(next);
    try {
      const fresh = await togglePostLike(post.id, user.id);
      setLikers(fresh);
    } catch (error) {
      setLikers(likers);
      addToast(error instanceof Error ? error.message : "点赞失败，请稍后重试", "error");
    } finally {
      setLikePending(false);
    }
  }
  return (
    <div
      onClick={onClick}
      className="share-post-row group w-full cursor-pointer rounded-[14px] border border-white/5 bg-white/[0.03] p-2.5 text-left shadow-[0_14px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 active:scale-[0.99] sm:rounded-[20px] sm:p-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-white">{post.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-white/50 font-body sm:mt-1 sm:line-clamp-2 sm:text-[12px] sm:leading-5">{post.summary}</p>
        </div>
        {canEdit && (onEdit || onDelete) && (
          <div className="relative shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <button className="rounded-lg p-1.5 text-white/50 transition active:scale-95 active:bg-white/10 hover:bg-white/10 hover:text-white" title="更多操作" type="button"
              onClick={(e) => { e.stopPropagation(); const menu = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement; if (menu) menu.classList.toggle('hidden'); }}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
            <div className="hidden absolute right-0 top-full mt-1 w-28 rounded-xl border border-white/10 bg-[#09090b]/90 backdrop-blur py-1 shadow-xl z-30">
              {onEdit && (
                <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-white/60 transition active:bg-white/10 hover:bg-white/10 hover:text-white font-body" type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  编辑
                </button>
              )}
              {(isAdmin || isOwner) && onToggleHot && (
                <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 transition font-body" type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleHot(); }}>
                  <Flame className="h-3.5 w-3.5" />
                  {post.isHot ? "取消热门" : "设为热门"}
                </button>
              )}
              {onDelete && (
                <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 hover:text-red-300 transition font-body" type="button"
                  onClick={(e) => { e.stopPropagation(); if (window.confirm("确认删除？此操作不可撤销。")) onDelete(); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400 font-body sm:mt-3 sm:gap-4 sm:text-[11px]">
        <button type="button" onClick={handleLike} disabled={likePending} className={`inline-flex items-center gap-1 transition ${liked ? "text-red-400" : ""} ${user ? "hover:text-red-400 cursor-pointer" : "cursor-default"}`}><Heart className={`h-3 w-3 ${liked ? "fill-current" : ""}`} />{likers.length >= 1000 ? `${(likers.length / 1000).toFixed(1)}k` : likers.length}<LikeIndicator likers={likers} /></button>
        <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comments}</span>
        <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" />{post.bookmarks}</span>
      </div>
    </div>
  );
}

/* ── Hot sidebar ── */

function HotSidebar({ allPosts, onPostClick }: { allPosts: (PostNode & { path: string })[], onPostClick: (p: PostNode) => void }) {
  const hot = [...allPosts].filter((p) => p.likes.length > 0 || p.comments > 0 || p.isHot).sort((a, b) => { if (a.isHot && !b.isHot) return -1; if (!a.isHot && b.isHot) return 1; return b.likes.length - a.likes.length; }).slice(0, 10);

  function fireColor(rank: number) {
    if (rank === 0) return "text-orange-400";
    if (rank === 1) return "text-amber-400";
    if (rank === 2) return "text-yellow-400";
    return "text-white/25";
  }

  return (
    <div className="liquid-glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-orange-400" />
        <h3 className="text-base font-heading italic text-white">热门帖子</h3>
      </div>
      <div className="space-y-2.5">
        {hot.map((post, i) => (
          <button
            key={post.id}
            onClick={() => onPostClick(post)}
            type="button"
            className="flex items-start gap-2.5 w-full text-left group"
          >
            <span className={`shrink-0 mt-0.5 text-sm ${fireColor(i)}`}>
              <Flame className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] text-white/30 font-body">[{post.path}]</span>
              <span className="ml-1.5 text-sm text-white/50 group-hover:text-white/80 transition font-body truncate block">
                {post.title}
              </span>
            </div>
          </button>
        ))}
        {hot.length === 0 && (
          <p className="text-sm text-white/30 font-body">暂无热门帖子</p>
        )}
      </div>
    </div>
  );
}

/* ── Page ── */

export default function GuidesPage() {
  const [path, setPath] = useState<number[]>([]);
  const [modalPost, setModalPost] = useState<PostNode | null>(null);

  // Supabase data state
  const [dbFolders, setDbFolders] = useState<ShareFolder[] | null>(null);
  const [dbPosts, setDbPosts] = useState<SharePost[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("post");

  // Creator + contributors for current folder
  const [folderCreator, setFolderCreator] = useState<{ userId: string; displayName: string; avatarUrl: string | null } | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);

  // Edit state
  const [editingFolder, setEditingFolder] = useState(false);
  const [editingPost, setEditingPost] = useState<PostNode | null>(null);

  // Load from Supabase
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const [folders, posts] = await Promise.all([loadFolders(), loadAllPosts()]);
      if (!cancelled) { setDbFolders(folders); setDbPosts(posts); }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [refreshKey]);

  function triggerRefresh() { setRefreshKey((k) => k + 1); }

  const hasRealData = dbFolders !== null && dbPosts !== null && (dbFolders.length > 0 || dbPosts.length > 0);

  // Load creator + contributors when entering a folder
  useEffect(() => {
    if (isRoot || !hasRealData || !currentFolder || currentFolder.name === "root") {
      setFolderCreator(null);
      setContributors([]);
      return;
    }
    // Find the matching db folder
    const dbFolder = (dbFolders ?? []).find((f) => f.name === currentFolder.name);
    if (!dbFolder) { setFolderCreator(null); setContributors([]); return; }

    let cancelled = false;
    async function load() {
      const [creator, contribs] = await Promise.all([
        getFolderCreator(dbFolder!.id),
        getFolderContributors(dbFolder!.id),
      ]);
      if (cancelled) return;
      setFolderCreator(creator);
      setContributors(contribs);
    }
    load();
    return () => { cancelled = true; };
  }, [path, hasRealData, dbFolders]);

  // Edit handlers
  function openEditFolder() {
    setEditingFolder(true);
  }

  function openEditPost(post: PostNode) {
    setEditingPost(post);
  }
  const handleCreateFolder = useCallback(async (name: string, desc: string, parentId: string | null) => {
    const result = await createFolder(name, desc, parentId);
    const [folders, posts] = await Promise.all([loadFolders(), loadAllPosts()]);
    setDbFolders(folders); setDbPosts(posts);
    return result;
  }, []);
  const handleCreatePost = useCallback(async (title: string, summary: string, body: string, link: string, folderId: string | null) => {
    const result = await createSharePost(title, summary, body, link, folderId);
    const [folders, posts] = await Promise.all([loadFolders(), loadAllPosts()]);
    setDbFolders(folders); setDbPosts(posts);
    return result;
  }, []);
  const handleDeletePost = useCallback(async (id: string) => {
    await deleteSharePost(id);
    const [folders, posts] = await Promise.all([loadFolders(), loadAllPosts()]);
    setDbFolders(folders); setDbPosts(posts);
  }, []);
  const handleToggleHot = useCallback(async (id: string, hot: boolean) => {
    try { await toggleHot(id, hot, hot ? new Date(Date.now()+7*86400000).toISOString() : null); const [f, p] = await Promise.all([loadFolders(), loadAllPosts()]); setDbFolders(f); setDbPosts(p); }
    catch (e: any) { alert(e?.message || "设置热门失败"); }
  }, []);
  const handleDeleteFolder = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`确认删除板块「${name}」？\n\n板块必须为空才能删除（无帖子和子板块）。`)) return;
    try {
      await deleteFolder(id);
      const [folders, posts] = await Promise.all([loadFolders(), loadAllPosts()]);
      setDbFolders(folders); setDbPosts(posts);
    }
    catch (e: any) { alert(e?.message || "删除失败"); }
  }, []);

  const rootTree = hasRealData ? buildTreeFromDb(dbFolders!, dbPosts!) : emptyRoot;
  const currentFolder = resolvePath(rootTree, path) ?? rootTree;
  const isRoot = path.length === 0;
  const breadcrumb = getBreadcrumb(rootTree, path);

  const subFolders = currentFolder.children.filter((c): c is FolderNode => c.type === "folder");
  const posts = currentFolder.children.filter((c): c is PostNode => c.type === "post");

  // All posts for sidebar
  const allPostsWithPath: (PostNode & { path: string })[] = [];
  function collect(f: FolderNode, label: string) {
    for (const c of f.children) {
      if (c.type === "post") allPostsWithPath.push({ ...c, path: label });
      else collect(c, c.name);
    }
  }
  collect(rootTree, "root");

  function navigateToChild(index: number) {
    setPath([...path, index]);
  }

  function navigateToCrumb(crumbIndex: number) {
    if (crumbIndex < 0) { setPath([]); return; }
    setPath(path.slice(0, crumbIndex + 1));
  }

  function currentPathLabel() {
    return breadcrumb.map((b) => b.name).join(" / ");
  }

  return (
    <div className="mobile-tab-scroll timix-mobile-shell flex-1 h-full overflow-y-auto overscroll-y-contain pb-24 bg-[var(--mobile-app-bg,#09090b)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#09090b]/80 px-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2.5 text-zinc-100 shadow-[0_14px_38px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:px-4 sm:pt-[calc(env(safe-area-inset-top,0px)+14px)] sm:pb-4">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] text-white/70 sm:text-[11px]">TIMIX</p>
              <h1 className="mt-0.5 text-[22px] font-semibold leading-none tracking-normal text-white sm:mt-1 sm:text-[28px]">分享</h1>
            </div>
            <div className="flex items-center gap-2 text-white/95 sm:gap-3">
              <MobileThemeToggle />
              <button
                aria-label="新建分享"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 active:scale-95 sm:h-10 sm:w-10"
                onClick={() => { setCreateMode("post"); setCreateOpen(true); }}
                type="button"
              >
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 sm:mt-3 sm:gap-3">
            <button
              className="mobile-primary-action rounded-full bg-white/24 px-3 py-1.5 text-[11px] font-medium text-white shadow-inner active:scale-95 sm:px-4 sm:text-[12px]"
              onClick={() => { setCreateMode("folder"); setCreateOpen(true); }}
              type="button"
            >
              新建板块
            </button>
            <p className="truncate text-[11px] text-white/82 sm:text-[12px]">项目、教程、工具和灵感</p>
          </div>
        </div>
      </header>

      <div className="timix-share-app mx-auto max-w-5xl px-2.5 pb-28 pt-3 sm:px-5 sm:pt-4 lg:max-w-7xl lg:px-8">
        <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 sm:mb-3 sm:gap-2">
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-white/70">
            {isRoot ? "全部" : currentPathLabel()}
          </span>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-white/55">
            {(dbPosts?.length ?? 0)} 条分享
          </span>
          <button
            className="mobile-secondary-action ml-auto inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-3 text-[11px] font-bold text-zinc-300 shadow-sm border border-white/10 active:scale-95 font-body"
            type="button"
            onClick={() => { setCreateMode("folder"); setCreateOpen(true); }}
          >
            <Folder className="h-3.5 w-3.5" />
            板块
          </button>
          <button
            className="mobile-secondary-action inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-3 text-[11px] font-bold text-zinc-300 shadow-sm border border-white/10 active:scale-95 font-body"
            type="button"
            onClick={() => { setCreateMode("post"); setCreateOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            分享
          </button>
        </div>

        {/* Breadcrumb (non-root) */}
        {!isRoot && (
          <div className="flex flex-wrap items-center gap-1.5 mb-5 text-sm text-white/40 font-body">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-white/20" />}
                <button
                  onClick={() => navigateToCrumb(i === 0 ? -1 : i - 1)}
                  className={`hover:text-white transition ${i === breadcrumb.length - 1 ? "text-white/70" : ""}`}
                  type="button"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-6">
          {/* ── Left: main content ── */}
          <div className="space-y-3 lg:col-span-8 md:space-y-8">
            {/* Creator + Contributors banner (non-root only) */}
            {!isRoot && (
              <div className="space-y-3">
                {/* Creator info + Edit folder button */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {folderCreator ? (
                    <div className="flex items-center gap-2 text-sm text-white/40 font-body">
                      {folderCreator.avatarUrl ? (
                        <img src={folderCreator.avatarUrl} className="w-5 h-5 rounded-full ring-1 ring-white/20" alt="" />
                      ) : (
                        <span className="flex w-5 h-5 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">{folderCreator.displayName.charAt(0)}</span>
                      )}
                      <span>由 <span className="text-white/60">{folderCreator.displayName}</span> 建立</span>
                    </div>
                  ) : (
                    <div />
                  )}
                  {hasRealData && (
                    <button onClick={openEditFolder} className="text-xs text-white/30 hover:text-white/60 transition font-body">更改</button>
                  )}
                </div>

                {/* Contributors banner */}
                {contributors.length > 0 && (
                  <div className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 overflow-hidden">
                    <span className="text-xs text-white/40 font-body shrink-0">✨ 真诚感谢参与共建的同僚：</span>
                    <div className="flex items-center -space-x-2 overflow-x-auto scrollbar-none">
                      {contributors.slice(0, 8).map((c) => (
                        c.avatarUrl ? (
                          <img key={c.userId} src={c.avatarUrl} className="w-7 h-7 rounded-full ring-2 ring-white/10 object-cover shrink-0" title={c.displayName} alt={c.displayName} />
                        ) : (
                          <span key={c.userId} className="flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/10 text-[10px] text-white/50" title={c.displayName}>{c.displayName.charAt(0)}</span>
                        )
                      ))}
                      {contributors.length > 8 && (
                        <span className="flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/10 text-[10px] text-white/60 font-body">+{contributors.length - 8}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Edit folder modal */}
            <EditPanelModal
              open={editingFolder}
              mode="folder"
              targetId={(dbFolders ?? []).find((f) => f.name === currentFolder.name)?.id ?? ""}
              initialName={currentFolder.name === "root" ? "" : currentFolder.name}
              initialDesc={(currentFolder as any).desc ?? ""}
              onClose={() => setEditingFolder(false)}
              onSaved={() => { triggerRefresh(); setEditingFolder(false); }}
            />

            {/* Root view: folders or empty state */}
            {isRoot && subFolders.length === 0 && !hasRealData && (
              <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
                <Folder className="h-10 w-10 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-heading italic text-white/60">还没有板块</h3>
                <p className="mt-2 text-sm text-white/30 font-body">点击上方「建立板块」创建第一个分类目录，然后「分享项目」发布内容。</p>
              </div>
            )}
            {isRoot && subFolders.length > 0 && (
              <div className="share-folder-list overflow-hidden rounded-[16px] border border-white/5 bg-white/[0.03] shadow-[0_14px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] sm:grid sm:grid-cols-2 sm:gap-4 sm:rounded-[22px] sm:border-0 sm:bg-transparent sm:shadow-none">
                {subFolders.map((folder, i) => {
                  const dbId = (folder as any).dbId;
                  return (
                  <div
                    key={dbId ?? folder.name}
                    className="group relative cursor-pointer border-b border-white/5 px-2.5 py-2.5 text-left transition-all duration-200 active:bg-white/[0.06] last:border-b-0 sm:rounded-[22px] sm:border sm:border-white/5 sm:bg-white/[0.03] sm:p-4 sm:shadow-[0_14px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)]"
                    onClick={() => navigateToChild(i)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] sm:h-9 sm:w-9">
                        <Folder className="h-4 w-4 text-white/50 transition group-hover:text-white/80 sm:h-5 sm:w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[13px] font-semibold text-white sm:text-[14px]">{folder.name}</h2>
                        {folder.desc && <p className="mt-0.5 truncate text-[11px] text-white/50 font-body">{folder.desc}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-bold text-white/45">
                        {folder.children.length}
                      </span>
                    </div>

                    {/* Three-dot menu — only on real DB folders */}
                    {hasRealData && dbId && (
                      <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100 sm:right-3 sm:top-3" onClick={(e) => e.stopPropagation()}>
                        <button className="rounded-lg p-1.5 text-white/50 transition active:scale-95 active:bg-white/10 hover:bg-white/10 hover:text-white" type="button"
                          onClick={(e) => { e.stopPropagation(); const menu = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement; if (menu) menu.classList.toggle('hidden'); }}>
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        <div className="hidden absolute right-0 top-full mt-1 w-28 rounded-xl border border-white/10 bg-[#09090b]/90 backdrop-blur py-1 shadow-xl z-30">
                          <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-white/60 transition active:bg-white/10 hover:bg-white/10 hover:text-white font-body" type="button"
                            onClick={(e) => { e.stopPropagation(); openEditFolder(); }}>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            编辑
                          </button>
                          <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 hover:text-red-300 transition font-body" type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteFolder(dbId, folder.name); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}

            {/* Non-root: sub-folders grid + posts feed */}
            {!isRoot && (
              <>
                {/* Sub-folders */}
                {subFolders.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/30 font-body mb-3">子板块</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {subFolders.map((folder, i) => (
                        <button
                          key={(folder as any).dbId ?? folder.name}
                          onClick={() => navigateToChild(i)}
                          type="button"
                          className="liquid-glass rounded-xl p-4 text-left transition active:scale-[0.98] active:bg-white/10 hover:bg-white/10 group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Folder className="h-5 w-5 text-white/40 group-hover:text-white/70 transition" />
                            <span className="text-sm font-heading italic text-white">{folder.name}</span>
                          </div>
                          <p className="mt-1.5 text-xs text-white/30 font-body">
                            {folder.children.length > 0 ? `${folder.children.length} 项` : "空板块"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts */}
                <div>
                  {posts.length > 0 && (
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/30 font-body mb-3">帖子</p>
                  )}
                  <div className="space-y-2.5">
                    {posts.map((p) => (
                      <PostCard key={p.id} post={p} onClick={() => setModalPost(p)} onEdit={() => openEditPost(p)} onDelete={() => handleDeletePost(p.id)} onToggleHot={() => handleToggleHot(p.id, !p.isHot)} />
                    ))}
                    {posts.length === 0 && subFolders.length === 0 && (
                      <div className="rounded-2xl bg-white/[0.02] border border-dashed border-white/10 p-10 text-center">
                        <p className="text-sm text-white/30 font-body">此板块暂无内容</p>
                        <p className="mt-1 text-xs text-white/20 font-body">点击上方「分享项目」发布第一条帖子</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Root: also show posts directly under root if any */}
            {isRoot && posts.length > 0 && (
              <div className="space-y-2.5">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} onClick={() => setModalPost(p)} onEdit={() => openEditPost(p)} onDelete={() => handleDeletePost(p.id)} onToggleHot={() => handleToggleHot(p.id, !p.isHot)} />
                ))}
              </div>
            )}
          </div>

          {/* ── Right: sidebar ── */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-28 space-y-6">
              <HotSidebar allPosts={allPostsWithPath} onPostClick={(p) => setModalPost(p)} />

              <PwaInstallCallout />

              <div className="liquid-glass rounded-2xl p-5 text-center">
                <p className="text-sm text-white/40 font-body mb-4">有好的项目想分享？</p>
                <button
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] active:bg-white/20 hover:bg-white/20 font-body"
                  type="button"
                  onClick={() => { setCreateMode("post"); setCreateOpen(true); }}
                >
                  <Plus className="h-4 w-4" />
                  分享项目
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {modalPost && <PostDetailModal post={modalPost} onClose={() => setModalPost(null)} onEdit={() => openEditPost(modalPost)} />}
      <ShareCreateModal
        open={createOpen}
        mode={createMode}
        currentFolder={{ id: null, name: currentFolder.name === "root" ? "根目录" : currentFolder.name }}
        folders={dbFolders ?? []}
        onClose={() => setCreateOpen(false)}
        onCreateFolder={handleCreateFolder}
        onCreatePost={handleCreatePost}
      />

      {/* Edit post modal */}
      {editingPost && (
        <EditPanelModal
          open={!!editingPost}
          mode="post"
          targetId={editingPost.id}
          initialName={editingPost.title}
          initialDesc={editingPost.summary}
          initialBody={(editingPost as any).body ?? editingPost.summary}
          initialLink={(editingPost as any).link ?? ""}
          onClose={() => setEditingPost(null)}
          onSaved={() => { triggerRefresh(); setEditingPost(null); }}
        />
      )}
    </div>
  );
}

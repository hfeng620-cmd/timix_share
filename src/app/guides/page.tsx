"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart, MessageCircle, Bookmark, Plus, Flame, X,
  Folder, ChevronRight, Trash2, Send, Loader2,
  Clock, Pencil,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
import { useForumAuth } from "@/lib/forum-auth";
import { loadFolders, loadAllPosts, createFolder, createSharePost, deleteSharePost, deleteFolder, updateFolder, updateSharePost, getFolderCreator, getFolderContributors, loadEditLogs, toggleHot, togglePostLike, type ShareFolder, type SharePost, type Contributor, type EditLogEntry, type Liker } from "@/lib/share-storage";
import { EditPanelModal } from "@/components/edit-panel-modal";
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
      tag: f.name, likes: p.likes, comments: p.commentsCount, bookmarks: 0,
      authorId: p.authorId, authorName: p.authorName, authorAvatar: p.authorAvatar,
      createdAt: p.createdAt, body: p.body, isHot: p.isHot,
    }));
    return { type: "folder", name: f.name, desc: f.description || undefined, dbId: f.id, children: [...childFolders, ...childPosts] };
  }
  const rootFolders = (childrenMap.get(null) ?? []).map(convertFolder);
  const rootPosts: PostNode[] = (postsByFolder.get("__root__") ?? []).map((p) => ({
    type: "post", id: p.id, title: p.title, summary: p.summary,
    tag: "root", likes: p.likes, comments: p.commentsCount, bookmarks: 0,
    authorId: p.authorId, authorName: p.authorName, authorAvatar: p.authorAvatar,
    createdAt: p.createdAt, body: p.body, isHot: p.isHot,
  }));
  return { type: "folder", name: "root", children: [...rootFolders, ...rootPosts] };
}

const OLD_MOCK: FolderNode = {
  type: "folder", name: "root", children: [
    {
      type: "folder", name: "基础部分", desc: "Codex，ClaudeCode使用教程",
      children: [
        {
          type: "folder", name: "Codex", children: [
            {
              type: "post", id: "p1", title: "Codex CLI 实战：用自然语言操控终端",
              summary: "OpenAI Codex 命令行工具深度体验，附常用 prompt 模板和避坑记录。",
              tag: "Codex", likes: [], comments: 156, bookmarks: 892, authorId: "",
              authorName: null, authorAvatar: null, createdAt: "", body: "", isHot: false,
            },
          ],
        },
        {
          type: "folder", name: "ClaudeCode", children: [
            {
              type: "post", id: "p2", title: "Claude Code 终极配置指南",
              summary: "从零搭建 Claude Code 开发环境，MCP 插件、自定义 hooks 与快捷键映射。",
              tag: "ClaudeCode", likes: [], comments: 98, bookmarks: 654, authorId: "",
              authorName: null, authorAvatar: null, createdAt: "", body: "", isHot: false,
            },
          ],
        },
        { type: "folder", name: "Cursor", children: [] },
        { type: "folder", name: "Windsurf", children: [] },
      ],
    },
    {
      type: "folder", name: "Github优质项目汇总",
      children: [
        {
          type: "folder", name: "前端", children: [
            {
              type: "post", id: "p3", title: "Tauri 2.0 桌面应用开发指南",
              summary: "基于 Rust 的轻量级跨平台桌面应用框架，替代 Electron 的首选方案。",
              tag: "前端", likes: [], comments: 187, bookmarks: 940, authorId: "",
              authorName: null, authorAvatar: null, createdAt: "", body: "", isHot: false,
            },
          ],
        },
        { type: "folder", name: "后端", children: [] },
        { type: "folder", name: "AI工具", children: [] },
        { type: "folder", name: "DevOps", children: [] },
      ],
    },
  ],
};

/* ── Like indicator ── */

function LikeIndicator({ likers }: { likers: { displayName: string }[] }) {
  if (likers.length === 0) return null;
  if (likers.length === 1) return <span className="text-xs text-zinc-500 ml-1">{likers[0].displayName} 赞过</span>;
  if (likers.length === 2) return <span className="text-xs text-zinc-500 ml-1">{likers[0].displayName}、{likers[1].displayName} 赞过</span>;
  return <span className="text-xs text-zinc-500 ml-1">{likers[0].displayName}、{likers[1].displayName} 等 {likers.length} 人赞过</span>;
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

function findAllPosts(folder: FolderNode): PostNode[] {
  const result: PostNode[] = [];
  for (const child of folder.children) {
    if (child.type === "post") result.push(child);
    else result.push(...findAllPosts(child));
  }
  return result;
}

function getBreadcrumb(tree: FolderNode, indices: number[]): Breadcrumb {
  const crumbs: Breadcrumb = [{ name: "热门有趣项目Share", index: -1 }];
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
    const next = liked
      ? likers.filter((l) => l.userId !== user!.id)
      : [...likers, { userId: user!.id, displayName: optimisticName, avatarUrl: (user!.user_metadata?.avatar_url as string) ?? null }];
    setLikers(next);
    try {
      const fresh = await togglePostLike(post.id, user.id);
      setLikers(fresh);
    } catch {
      setLikers(likers);
    } finally {
      setLikePending(false);
    }
  }
  return (
    <div
      onClick={onClick}
      className="w-full text-left rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-heading italic text-white truncate">{post.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-white/45 font-body line-clamp-2">{post.summary}</p>
        </div>
        {canEdit && (onEdit || onDelete) && (
          <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
            <button className="rounded-lg p-1.5 text-white/30 hover:text-white hover:bg-white/10 transition" title="更多操作" type="button"
              onClick={(e) => { e.stopPropagation(); const menu = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement; if (menu) menu.classList.toggle('hidden'); }}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
            <div className="hidden absolute right-0 top-full mt-1 w-28 rounded-xl border border-white/10 bg-black/90 backdrop-blur py-1 shadow-xl z-30">
              {onEdit && (
                <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition font-body" type="button"
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
      <div className="mt-3 flex items-center gap-5 text-xs text-white/30 font-body">
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
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");
  const [editingPost, setEditingPost] = useState<PostNode | null>(null);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostSummary, setEditPostSummary] = useState("");
  const [editPostBody, setEditPostBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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
    setEditFolderName(currentFolder.name === "root" ? "" : currentFolder.name);
    setEditFolderDesc((currentFolder as any).desc ?? "");
  }
  async function saveEditFolder() {
    const dbFolder = (dbFolders ?? []).find((f) => f.name === currentFolder.name);
    if (!dbFolder) return;
    setEditSaving(true);
    try { await updateFolder(dbFolder.id, editFolderName, editFolderDesc); triggerRefresh(); setEditingFolder(false); }
    catch (e: any) { alert(e?.message || "更新板块失败"); }
    finally { setEditSaving(false); }
  }

  function openEditPost(post: PostNode) {
    setEditingPost(post);
    setEditPostTitle(post.title);
    setEditPostSummary(post.summary);
    setEditPostBody((post as any).body ?? post.summary);
  }
  async function saveEditPost() {
    if (!editingPost) return;
    setEditSaving(true);
    try { await updateSharePost(editingPost.id, editPostTitle, editPostSummary, editPostBody, ""); triggerRefresh(); setEditingPost(null); }
    catch (e: any) { alert(e?.message || "更新帖子失败"); }
    finally { setEditSaving(false); }
  }

  const reloadData = useCallback(async () => {
    const [folders, posts] = await Promise.all([loadFolders(), loadAllPosts()]);
    setDbFolders(folders); setDbPosts(posts);
  }, []);

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
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-6">
          <div className="liquid-glass mb-3 inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
            热门有趣项目Share
          </div>
          <h1 className="text-3xl font-heading italic leading-[1.15] text-white md:text-5xl">
            {isRoot ? "发现、分享、讨论有趣的项目。" : currentPathLabel()}
          </h1>
          <p className="mt-2 text-xs text-white/25 font-body">
            文件夹:{dbFolders?.length ?? "…"} 帖子:{dbPosts?.length ?? "…"} hasReal:{String(hasRealData)}
          </p>
          {isRoot && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50 font-body">
              Codex、ClaudeCode 使用教程 · Github 优质开源项目汇总 · 社区共建持续更新
            </p>
          )}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left: main content ── */}
          <div className="lg:col-span-8 space-y-8">
            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/20 transition font-body"
                type="button"
                onClick={() => { setCreateMode("folder"); setCreateOpen(true); }}
              >
                <Folder className="h-4 w-4" />
                建立板块
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/20 transition font-body"
                type="button"
                onClick={() => { setCreateMode("post"); setCreateOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                Share（分享项目）
              </button>
            </div>

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
                          <img key={c.userId} src={c.avatarUrl} className="w-7 h-7 rounded-full ring-2 ring-black object-cover shrink-0" title={c.displayName} alt={c.displayName} />
                        ) : (
                          <span key={c.userId} className="flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-white/10 ring-2 ring-black text-[10px] text-white/50" title={c.displayName}>{c.displayName.charAt(0)}</span>
                        )
                      ))}
                      {contributors.length > 8 && (
                        <span className="flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-black text-[10px] text-white/60 font-body">+{contributors.length - 8}</span>
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
                <p className="mt-2 text-sm text-white/30 font-body">点击上方「建立板块」创建第一个分类目录，然后「Share 项目」发布内容。</p>
              </div>
            )}
            {isRoot && subFolders.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {subFolders.map((folder, i) => {
                  const dbId = (folder as any).dbId;
                  return (
                  <div
                    key={`${folder.name}-${i}`}
                    className="liquid-glass rounded-2xl p-6 text-left hover:bg-white/10 transition-all duration-200 group cursor-pointer relative"
                    onClick={() => navigateToChild(i)}
                  >
                    <Folder className="h-7 w-7 text-white/50 group-hover:text-white/80 transition mb-3" />
                    <h2 className="text-xl font-heading italic text-white">{folder.name}</h2>
                    {folder.desc && <p className="mt-2 text-sm text-white/35 font-body">{folder.desc}</p>}
                    <p className="mt-4 text-xs text-white/25 font-body">{folder.children.length} 个子项</p>

                    {/* Three-dot menu — only on real DB folders */}
                    {hasRealData && dbId && (
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                        <button className="rounded-lg p-1.5 text-white/30 hover:text-white hover:bg-white/10 transition" type="button"
                          onClick={(e) => { e.stopPropagation(); const menu = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement; if (menu) menu.classList.toggle('hidden'); }}>
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        <div className="hidden absolute right-0 top-full mt-1 w-28 rounded-xl border border-white/10 bg-black/90 backdrop-blur py-1 shadow-xl z-30">
                          <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white transition font-body" type="button"
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
                          key={`${folder.name}-${i}`}
                          onClick={() => navigateToChild(i)}
                          type="button"
                          className="liquid-glass rounded-xl p-4 text-left hover:bg-white/10 transition group"
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
                        <p className="mt-1 text-xs text-white/20 font-body">点击上方「Share（分享项目）」发布第一条帖子</p>
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
          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <HotSidebar allPosts={allPostsWithPath} onPostClick={(p) => setModalPost(p)} />

              <div className="liquid-glass rounded-2xl p-5 text-center">
                <p className="text-sm text-white/40 font-body mb-4">有好的项目想分享？</p>
                <button
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition font-body"
                  type="button"
                  onClick={() => { setCreateMode("post"); setCreateOpen(true); }}
                >
                  <Plus className="h-4 w-4" />
                  Share 项目
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
          initialLink=""
          onClose={() => setEditingPost(null)}
          onSaved={() => { triggerRefresh(); setEditingPost(null); }}
        />
      )}
    </div>
  );
}

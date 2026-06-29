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
import { loadFolders, loadAllPosts, createFolder, createSharePost, deleteSharePost, deleteFolder, updateFolder, updateSharePost, getFolderCreator, getFolderContributors, loadEditLogs, toggleHot, type ShareFolder, type SharePost, type Contributor, type EditLogEntry } from "@/lib/share-storage";
import { EditPanelModal } from "@/components/edit-panel-modal";
import { ShareCreateModal, type CreateMode } from "@/components/share-create-modal";

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
  likes: number;
  comments: number;
  bookmarks: number;
  authorId: string;
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
      tag: f.name, likes: p.likesCount, comments: p.commentsCount, bookmarks: 0, authorId: p.authorId, body: p.body, isHot: p.isHot,
    }));
    return { type: "folder", name: f.name, desc: f.description || undefined, dbId: f.id, children: [...childFolders, ...childPosts] };
  }
  const rootFolders = (childrenMap.get(null) ?? []).map(convertFolder);
  const rootPosts: PostNode[] = (postsByFolder.get("__root__") ?? []).map((p) => ({
    type: "post", id: p.id, title: p.title, summary: p.summary,
    tag: "root", likes: p.likesCount, comments: p.commentsCount, bookmarks: 0, authorId: p.authorId, body: p.body, isHot: p.isHot,
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
              tag: "Codex", likes: 2340, comments: 156, bookmarks: 892, authorId: "", body: "", isHot: false,
            },
          ],
        },
        {
          type: "folder", name: "ClaudeCode", children: [
            {
              type: "post", id: "p2", title: "Claude Code 终极配置指南",
              summary: "从零搭建 Claude Code 开发环境，MCP 插件、自定义 hooks 与快捷键映射。",
              tag: "ClaudeCode", likes: 1890, comments: 98, bookmarks: 654, authorId: "", body: "", isHot: false,
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
              tag: "前端", likes: 2780, comments: 187, bookmarks: 940, authorId: "", body: "", isHot: false,
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
  const { user, isAdmin, isOwner } = useForumAuth();
  const canEdit = !!(user && (isAdmin || isOwner || user.id === post.authorId));
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
        <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes}</span>
        <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comments}</span>
        <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" />{post.bookmarks}</span>
      </div>
    </div>
  );
}

/* ── Post modal ── */

function PostModal({ post, onClose, onEdit }: { post: PostNode; onClose: () => void; onEdit?: () => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [likedCommentIds, setLikedCommentIds] = useState<Set<number>>(new Set());
  const [replyModalComment, setReplyModalComment] = useState<{ id: number; username: string; content: string } | null>(null);
  const [replyModalText, setReplyModalText] = useState("");
  const [editLogs, setEditLogs] = useState<EditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [rightTab, setRightTab] = useState<"comments" | "logs">("comments");
  const { user, isAdmin, isOwner } = useForumAuth();
  const canEdit = !!(user && (isAdmin || isOwner || user.id === post.authorId));

  const [comments, setComments] = useState<{
    id: number; username: string; timestamp: string; content: string;
    likedBy: { name: string; avatar: null; role: "owner" | "admin" | "author" }[];
  }[]>([
    { id: 1, username: "噜噜", timestamp: "2 小时前", content: "这个项目太棒了！已经在我自己的项目里用上了。",
      likedBy: [{ name: "站主", avatar: null, role: "owner" as const }, { name: "管理员", avatar: null, role: "admin" as const }] },
    { id: 2, username: "CodeMaster", timestamp: "5 小时前", content: "Windows 下需要额外配置 PATH 环境变量。",
      likedBy: [{ name: "帖主", avatar: null, role: "author" as const }] },
    { id: 3, username: "AI探索者", timestamp: "1 天前", content: "有没有人遇到过 OOM 的问题？",
      likedBy: [] },
  ]);

  function handleSendComment() {
    const body = commentText.trim();
    if (!body) {
      console.warn("[指南评论] 评论内容为空，拦截发送");
      return;
    }
    try {
      console.log("[指南评论] 准备发送评论:", { body, username: user?.user_metadata?.display_name ?? "匿名" });
      const newComment = {
        id: Date.now(),
        username: user?.user_metadata?.display_name ?? "匿名",
        timestamp: "刚刚",
        content: body,
        likedBy: [] as { name: string; avatar: null; role: "owner" | "admin" | "author" }[],
      };
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err: unknown) {
      console.error("[指南评论] 发送失败:", err);
      alert("评论发送失败: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  function handleSendReply() {
    if (!replyModalComment) return;
    const body = replyModalText.trim();
    if (!body) {
      console.warn("[指南评论] 回复内容为空，拦截发送");
      return;
    }
    try {
      console.log("[指南评论] 准备发送回复:", { body, replyTo: replyModalComment.username });
      const newReply = {
        id: Date.now(),
        username: user?.user_metadata?.display_name ?? "匿名",
        timestamp: "刚刚",
        content: body,
        likedBy: [] as { name: string; avatar: null; role: "owner" | "admin" | "author" }[],
      };
      setComments((prev) => [...prev, newReply]);
      setReplyModalComment(null);
      setReplyModalText("");
    } catch (err: unknown) {
      alert("回复发送失败: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const unlock = lockBodyScroll(); overlayRef.current?.focus(); return unlock; }, []);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function f() { setLogsLoading(true);
      try { const logs = await loadEditLogs(post.id, "post"); if (!cancelled) setEditLogs(logs); }
      catch { if (!cancelled) setEditLogs([]); } finally { if (!cancelled) setLogsLoading(false); }
    } f(); return () => { cancelled = true; };
  }, [post.id]);

  function rt(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (isNaN(m)) return d; if (m < 1) return "刚刚"; if (m < 60) return `${m}分钟前`; const h = Math.floor(m / 60); if (h < 24) return `${h}小时前`; return `${Math.floor(h / 24)}天前`; }

  return (<>
    <div ref={overlayRef} tabIndex={-1} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4 outline-none" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors z-[999]" type="button"><X className="h-6 w-6" /></button>
      <div className="relative w-full max-w-6xl h-[85vh] flex overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* ── Left: project content (70%) ── */}
        <div className="flex-1 flex flex-col border-r border-white/10 overflow-y-auto custom-scrollbar">
          <div className="flex-1 p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/50 font-body">{post.tag}</span>
              <div className="flex items-center gap-2">
                {canEdit && onEdit && (
                  <button onClick={onEdit} className="rounded-lg p-1.5 text-white/30 hover:text-white hover:bg-white/10 transition" title="编辑"><Pencil className="h-4 w-4" /></button>
                )}
                {editLogs.length > 0 && <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40 font-body">{editLogs.length} 次修改</span>}
              </div>
            </div>

            <h2 className="text-3xl font-heading italic text-white md:text-4xl leading-tight">{post.title}</h2>

            <div className="flex items-center gap-3 mt-4 text-sm text-white/40 font-body">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">{(post as any).authorName?.charAt(0) ?? "U"}</span>
              <span className="text-white/60">{(post as any).authorName ?? "匿名用户"}</span>
              <span>·</span>
              <span>{rt((post as any).createdAt ?? new Date().toISOString())}</span>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-white/50 font-body">{post.summary}</p>

            <div className="mt-6 text-sm leading-relaxed text-gray-300 font-body space-y-4">
              {post.body ? post.body.split("\n").filter(Boolean).map((para, i) => <p key={i}>{para}</p>) : <p>项目详细说明内容。</p>}
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="shrink-0 flex items-center gap-5 px-8 py-4 border-t border-white/10 bg-zinc-950/50">
            <button onClick={() => setLiked(!liked)} className={`inline-flex items-center gap-1.5 text-sm transition font-body ${liked ? "text-rose-400" : "text-white/40 hover:text-rose-300"}`} type="button"><Heart className={`h-4 w-4 transition ${liked ? "fill-current" : ""}`} />{liked ? post.likes + 1 : post.likes}</button>
            <button onClick={() => setRightTab("comments")} className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-sky-300 transition font-body" type="button"><MessageCircle className="h-4 w-4" />{post.comments}</button>
            <button onClick={() => setSaved(!saved)} className={`inline-flex items-center gap-1.5 text-sm transition font-body ml-auto ${saved ? "text-amber-400" : "text-white/40 hover:text-amber-300"}`} type="button"><Bookmark className={`h-4 w-4 transition ${saved ? "fill-current" : ""}`} />{saved ? "已收藏" : "收藏"}</button>
          </div>
        </div>

        {/* ── Right: Tabs panel (30%, 380px) ── */}
        <div className="w-[380px] flex flex-col bg-zinc-900/30">
          {/* Tab header */}
          <div className="shrink-0 flex border-b border-white/10">
            <button onClick={() => setRightTab("comments")} className={`flex-1 py-3 text-sm font-body transition relative ${rightTab === "comments" ? "text-white" : "text-gray-500 hover:text-gray-400"}`} type="button">
              💬 评论
              {rightTab === "comments" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white/60 rounded-full" />}
            </button>
            <button onClick={() => setRightTab("logs")} className={`flex-1 py-3 text-sm font-body transition relative ${rightTab === "logs" ? "text-white" : "text-gray-500 hover:text-gray-400"}`} type="button">
              🕒 日志
              {rightTab === "logs" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-white/60 rounded-full" />}
            </button>
          </div>

          {/* Tab: Comments */}
          {rightTab === "comments" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {comments.map((c) => {
                  const isLiked = likedCommentIds.has(c.id);
                  const topLike = c.likedBy[0];
                  const topRoleColor = topLike?.role === "owner" ? "text-amber-400" : topLike?.role === "admin" ? "text-blue-400" : "text-purple-400";
                  const topLabel = topLike?.role === "owner" ? "站主赞过" : topLike?.role === "admin" ? "管理员赞过" : "帖主赞过";
                  return (
                  <div key={c.id} className="group">
                    <div className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50 mt-0.5">{c.username.charAt(0)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="text-sm font-medium text-white/70 font-body">{c.username}</span><span className="text-[11px] text-gray-500 font-body">{c.timestamp}</span></div>
                        <p className="mt-1 text-sm leading-relaxed text-white/45 font-body">{c.content}</p>
                        {/* Privilege like badge */}
                        {topLike && (
                          <div className={`mt-1.5 inline-flex items-center gap-1 bg-zinc-800 text-[10px] px-1.5 py-0.5 rounded-full ${topRoleColor} cursor-default`}
                            title={`${topLike.name}${c.likedBy.length > 1 ? ` 等 ${c.likedBy.length} 人点赞` : " 赞了"}`}>
                            <span className="flex w-4 h-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[8px]">{topLike.name.charAt(0)}</span>
                            {topLabel}{c.likedBy.length > 1 && ` 等${c.likedBy.length}人`}
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center gap-4">
                          <button onClick={() => { setLikedCommentIds(p => { const n = new Set(p); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; }); }}
                            className={`text-gray-500 hover:text-gray-300 transition ${isLiked ? "text-rose-400" : ""}`} type="button">
                            <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
                          </button>
                          <button onClick={() => { setReplyModalComment(c); setReplyModalText(`@${c.username} `); }}
                            className="text-gray-500 hover:text-gray-300 transition" type="button">
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Three-dot menu */}
                      <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <button className="rounded p-1 text-gray-600 hover:text-gray-300 transition" type="button"
                          onClick={(e) => { e.stopPropagation(); const m = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement; if (m) m.classList.toggle('hidden'); }}>
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                        </button>
                        <div className="hidden absolute right-0 top-full mt-1 w-20 rounded-xl border border-white/10 bg-black/90 backdrop-blur py-1 shadow-xl z-30">
                          <button className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 transition font-body" type="button"
                            onClick={(e) => { e.stopPropagation(); if (window.confirm("确定删除此评论？")) { /* TODO: delete comment */ } }}>
                            <Trash2 className="h-3 w-3" />删除
                          </button>
                          <button className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition font-body" type="button"
                            onClick={(e) => { e.stopPropagation(); alert("已举报，管理员将审核此评论。"); }}>
                            ⚠️ 举报
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
              {/* Comment input — fixed at bottom */}
              <div className="shrink-0 p-4 border-t border-white/10 bg-zinc-900/50">
                <div className="relative">
                  <textarea className="w-full min-h-[44px] resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/25 font-body outline-none focus:border-white/30 transition" placeholder="说点什么... (Enter 发送, Shift+Enter 换行)" onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }} value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} />
                  <button className="absolute right-2 bottom-2 rounded-full bg-white/15 p-1.5 text-white/50 hover:bg-white/25 hover:text-white transition disabled:opacity-30" type="button" onClick={handleSendComment} disabled={!commentText.trim()}><Send className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </>
          )}

          {/* Tab: Logs */}
          {rightTab === "logs" && (
            <div className="flex-1 overflow-y-auto p-4">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 text-white/30 animate-spin" /></div>
              ) : editLogs.length === 0 ? (
                <p className="text-sm text-gray-500 font-body">暂无修改记录</p>
              ) : (
                <div className="relative pl-5 border-l border-white/10 space-y-4">
                  {editLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border border-white/20 bg-zinc-950" />
                      <span className="text-[10px] text-gray-500 font-body">{rt(log.createdAt)}</span>
                      <div className="flex items-center gap-2 mt-1">
                        {log.editorAvatar ? <img src={log.editorAvatar} className="w-4 h-4 rounded-full" alt="" /> : <span className="flex w-4 h-4 items-center justify-center rounded-full bg-white/10 text-[8px] text-white/50">{log.editorName.charAt(0)}</span>}
                        <span className="text-xs text-white/50 font-body">{log.editorName}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/35 font-body">{log.actionSummary}</p>
                      {log.totalContributions > 0 && <span className="inline-block mt-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/30 font-body">累计 {log.totalContributions} 次</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    {/* Nested reply modal */}
    {replyModalComment && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md" onClick={() => { setReplyModalComment(null); setReplyModalText(""); }}>
        <div className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs text-gray-500 font-body mb-2">引用</p>
          <div className="border-l-2 border-gray-500 pl-3 text-gray-400 italic text-sm font-body mb-4">{replyModalComment.content}</div>
          <p className="text-sm text-white/60 font-body mb-3">回复 @{replyModalComment.username}</p>
          <textarea className="w-full min-h-[80px] resize-none rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 font-body outline-none focus:border-white/30 transition mb-4"
            placeholder={`回复 @${replyModalComment.username}... (Enter 发送, Shift+Enter 换行)`}
            value={replyModalText} onChange={(e) => setReplyModalText(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }} />
          <div className="flex items-center justify-end gap-3">
            <button className="rounded-full bg-white/10 px-4 py-2 text-xs text-white/50 hover:bg-white/20 transition font-body" onClick={() => { setReplyModalComment(null); setReplyModalText(""); }} type="button">取消</button>
            <button className="rounded-full bg-white/15 px-4 py-2 text-xs text-white/50 hover:bg-white/25 transition disabled:opacity-30 font-body inline-flex items-center gap-1.5" onClick={handleSendReply} type="button" disabled={!replyModalText.trim()}><Send className="h-3 w-3" />发送</button>
          </div>
        </div>
      </div>
    )}
  </>);
}

/* ── Hot sidebar ── */

function HotSidebar({ allPosts, onPostClick }: { allPosts: (PostNode & { path: string })[], onPostClick: (p: PostNode) => void }) {
  const hot = [...allPosts].filter((p) => p.likes > 0 || p.comments > 0 || p.isHot).sort((a, b) => { if (a.isHot && !b.isHot) return -1; if (!a.isHot && b.isHot) return 1; return b.likes - a.likes; }).slice(0, 10);

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

      {modalPost && <PostModal post={modalPost} onClose={() => setModalPost(null)} onEdit={() => openEditPost(modalPost)} />}
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

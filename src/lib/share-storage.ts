"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type ShareFolder = {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  creatorId: string | null;
  creatorName: string | null;
  creatorAvatar: string | null;
  sortOrder: number;
  createdAt: string;
};

export type Contributor = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

export type SharePost = {
  id: string;
  title: string;
  summary: string;
  body: string;
  folderId: string | null;
  authorId: string;
  authorName: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
};

export async function loadFolders(): Promise<ShareFolder[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("shared_folders")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) ?? "",
      parentId: (row.parent_id as string) ?? null,
      creatorId: (row.creator_id as string) ?? null,
      creatorName: null,
      creatorAvatar: null,
      sortOrder: (row.sort_order as number) ?? 0,
      createdAt: row.created_at as string,
    }));
  } catch { return []; }
}

export async function getFolderCreator(folderId: string): Promise<{ userId: string; displayName: string; avatarUrl: string | null } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabaseClient().rpc("get_folder_creator", { p_folder_id: folderId });
    if (error || !data || (data as any[]).length === 0) return null;
    const r = (data as any[])[0];
    return { userId: r.user_id, displayName: r.display_name || "匿名用户", avatarUrl: r.avatar_url };
  } catch { return null; }
}

export async function getFolderContributors(folderId: string): Promise<Contributor[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient().rpc("get_folder_contributors", { p_folder_id: folderId });
    if (error || !data) return [];
    return (data as any[]).map((r) => ({ userId: r.user_id, displayName: r.display_name, avatarUrl: r.avatar_url }));
  } catch { return []; }
}

export async function loadAllPosts(): Promise<SharePost[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("shared_posts")
      .select("id, title, summary, body, folder_id, author_id, likes_count, comments_count, created_at, forum_profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      summary: row.summary as string,
      body: row.body as string,
      folderId: (row.folder_id as string) ?? null,
      authorId: row.author_id as string,
      authorName: ((row.forum_profiles as any)?.display_name) ?? "匿名用户",
      likesCount: (row.likes_count as number) ?? 0,
      commentsCount: (row.comments_count as number) ?? 0,
      createdAt: row.created_at as string,
    }));
  } catch { return []; }
}

export async function createFolder(name: string, desc: string, parentId: string | null = null): Promise<ShareFolder> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { data: userData } = await getSupabaseClient().auth.getUser();
  if (!userData.user) throw new Error("请先登录后再创建板块。");
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) throw new Error("板块名称无效。");
  const { data, error } = await getSupabaseClient()
    .from("shared_folders")
    .insert({ name: trimmed, description: desc, parent_id: parentId, creator_id: userData.user.id, sort_order: 0 })
    .select("*").single();
  if (error) throw new Error(`创建板块失败: ${error.message}`);
  const row = data as Record<string, unknown>;
  return { id: row.id as string, name: row.name as string, description: (row.description as string) ?? "", parentId: (row.parent_id as string) ?? null, creatorId: (row.creator_id as string) ?? null, creatorName: null, creatorAvatar: null, sortOrder: (row.sort_order as number) ?? 0, createdAt: row.created_at as string };
}

export async function createSharePost(title: string, summary: string, body: string, link: string, folderId: string | null): Promise<SharePost> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { data: userData } = await getSupabaseClient().auth.getUser();
  if (!userData.user) throw new Error("请先登录后再分享项目。");
  const t = title.trim(), s = summary.trim(), b = body.trim();
  if (!t || t.length > 200) throw new Error("标题无效。");
  if (!s) throw new Error("简介不能为空。");
  if (!b) throw new Error("内容不能为空。");
  const { data, error } = await getSupabaseClient()
    .from("shared_posts")
    .insert({ title: t, summary: s, body: b, url: link || null, folder_id: folderId, author_id: userData.user.id, likes_count: 0, comments_count: 0 })
    .select("id, title, summary, body, folder_id, author_id, likes_count, comments_count, created_at").single();
  if (error) throw new Error(`发布失败: ${error.message}`);
  const row = data as Record<string, unknown>;
  let authorName = "匿名用户";
  try {
    const { data: profile } = await getSupabaseClient().from("forum_profiles").select("display_name").eq("id", userData.user.id).maybeSingle();
    authorName = (profile as any)?.display_name ?? "匿名用户";
  } catch {}
  return {
    id: row.id as string, title: row.title as string, summary: row.summary as string,
    body: row.body as string, folderId: (row.folder_id as string) ?? null,
    authorId: row.author_id as string, authorName,
    likesCount: (row.likes_count as number) ?? 0, commentsCount: (row.comments_count as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export async function deleteSharePost(postId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { error } = await getSupabaseClient().from("shared_posts").delete().eq("id", postId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}

export async function deleteFolder(folderId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  // Check if folder has sub-items
  const { count: postCount } = await getSupabaseClient().from("shared_posts").select("*", { count: "exact", head: true }).eq("folder_id", folderId);
  const { count: childCount } = await getSupabaseClient().from("shared_folders").select("*", { count: "exact", head: true }).eq("parent_id", folderId);
  if ((postCount ?? 0) > 0 || (childCount ?? 0) > 0) {
    throw new Error("板块不为空，请先清空内部帖子和子板块后再删除。");
  }
  const { error } = await getSupabaseClient().from("shared_folders").delete().eq("id", folderId);
  if (error) throw new Error(`删除板块失败: ${error.message}`);
}

export async function updateFolder(id: string, name: string, desc: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { error } = await getSupabaseClient().from("shared_folders").update({ name: name.trim(), description: desc.trim() }).eq("id", id);
  if (error) throw new Error(`更新板块失败: ${error.message}`);
  await logEdit("folder", id, "更新了板块信息");
}

export async function updateSharePost(id: string, title: string, summary: string, body: string, link: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { error } = await getSupabaseClient().from("shared_posts").update({ title: title.trim(), summary: summary.trim(), body: body.trim(), url: link.trim() || null }).eq("id", id);
  if (error) throw new Error(`更新帖子失败: ${error.message}`);
  await logEdit("post", id, "更新了帖子内容");
}

export type EditLogEntry = {
  id: string;
  actionSummary: string;
  createdAt: string;
  editorId: string;
  editorName: string;
  editorAvatar: string | null;
  totalContributions: number;
};

export async function logEdit(targetType: "folder" | "post", targetId: string, actionSummary: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { data: userData } = await getSupabaseClient().auth.getUser();
  if (!userData.user) throw new Error("请先登录后再操作。");
  const { error } = await getSupabaseClient().from("edit_logs").insert({
    target_type: targetType, target_id: targetId, editor_id: userData.user.id, action_summary: actionSummary,
  });
  if (error) throw new Error(`记录编辑日志失败: ${error.message}`);
}

export async function loadEditLogs(targetId: string, targetType: "folder" | "post"): Promise<EditLogEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient().rpc("get_edit_logs", { p_target_id: targetId, p_target_type: targetType });
    if (error || !data) return [];
    return (data as any[]).map((r) => ({
      id: r.id as string, actionSummary: r.action_summary as string, createdAt: r.created_at as string,
      editorId: r.editor_id as string, editorName: (r.editor_name as string) ?? "匿名用户",
      editorAvatar: (r.editor_avatar as string) ?? null, totalContributions: (r.total_contributions as number) ?? 0,
    }));
  } catch { return []; }
}

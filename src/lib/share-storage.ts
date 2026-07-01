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

export type Liker = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role?: "owner" | "admin" | "user";
};

export type SharePost = {
  id: string;
  title: string;
  summary: string;
  link: string | null;
  body: string;
  folderId: string | null;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  likesCount: number;
  commentsCount: number;
  likes: Liker[];
  createdAt: string;
  isHot: boolean;
  hotUntil: string | null;
};

async function loadProfilesById(authorIds: string[]) {
  const profiles = new Map<string, { displayName: string | null; avatarUrl: string | null }>();
  const uniqueIds = [...new Set(authorIds.filter(Boolean))];
  if (uniqueIds.length === 0) return profiles;

  try {
    const { data } = await getSupabaseClient()
      .from("forum_profiles")
      .select("id, display_name, avatar_url")
      .in("id", uniqueIds);

    for (const profile of data ?? []) {
      profiles.set((profile as any).id, {
        displayName: ((profile as any).display_name as string | null) ?? null,
        avatarUrl: ((profile as any).avatar_url as string | null) ?? null,
      });
    }
  } catch {
    /* Profile data is optional for rendering; never fake an author identity. */
  }

  return profiles;
}

async function loadUserRoles(userIds: string[]) {
  const roles = new Map<string, "owner" | "admin" | "user">();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  uniqueIds.forEach((id) => roles.set(id, "user"));
  if (uniqueIds.length === 0 || !isSupabaseConfigured()) return roles;

  const supabase = getSupabaseClient();

  try {
    const { data } = await supabase.from("site_owners").select("user_id").in("user_id", uniqueIds);
    for (const row of (data ?? []) as { user_id: string }[]) {
      roles.set(row.user_id, "owner");
    }
  } catch {
    // Role badges should not break the feed if role tables are blocked by RLS.
  }

  try {
    const { data } = await supabase.from("forum_admins").select("user_id").in("user_id", uniqueIds);
    for (const row of (data ?? []) as { user_id: string }[]) {
      if (roles.get(row.user_id) !== "owner") roles.set(row.user_id, "admin");
    }
  } catch {
    // Role badges should not break the feed if role tables are blocked by RLS.
  }

  return roles;
}

async function withUserRoles(likers: Liker[]): Promise<Liker[]> {
  if (likers.length === 0) return likers;
  const roles = await loadUserRoles(likers.map((liker) => liker.userId));
  return likers.map((liker) => ({
    ...liker,
    role: roles.get(liker.userId) ?? liker.role ?? "user",
  }));
}

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
    return { userId: r.user_id, displayName: (r.display_name as string) || "未知用户", avatarUrl: r.avatar_url };
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
    const supabase = getSupabaseClient();
    let { data, error } = await supabase
      .from("shared_posts")
      .select("id, title, summary, url, body, folder_id, author_id, likes_count, comments_count, created_at, is_hot, hot_until, likes:share_post_likes(user_id, profiles:forum_profiles(display_name, nickname, avatar_url, role))")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      const fallback = await supabase
        .from("shared_posts")
        .select("id, title, summary, url, body, folder_id, author_id, likes_count, comments_count, created_at, is_hot, hot_until, likes:share_post_likes(user_id, profiles:forum_profiles(display_name, avatar_url))")
        .order("created_at", { ascending: false })
        .limit(100);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];
    const profiles = await loadProfilesById(rows.map((r) => r.author_id as string));
    return Promise.all(rows.map(async (row) => {
      const uniqueLikers = await withUserRoles(parseLikers((row.likes as unknown[]) ?? []));

      return {
        id: row.id as string, title: row.title as string, summary: row.summary as string,
        link: (row.url as string) ?? null,
        body: row.body as string, folderId: (row.folder_id as string) ?? null,
        authorId: row.author_id as string,
        authorName: profiles.get(row.author_id as string)?.displayName ?? null,
        authorAvatar: profiles.get(row.author_id as string)?.avatarUrl ?? null,
        likesCount: uniqueLikers.length, commentsCount: (row.comments_count as number) ?? 0,
        likes: uniqueLikers,
        createdAt: row.created_at as string,
        isHot: (row.is_hot as boolean) ?? false,
        hotUntil: (row.hot_until as string) ?? null,
      };
    }));
  } catch { return []; }
}

export async function createFolder(name: string, desc: string, parentId: string | null = null): Promise<ShareFolder> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { data: userData } = await getSupabaseClient().auth.getUser();
  if (!userData.user) throw new Error("请先登录后再创建板块。");
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) throw new Error("板块名称无效。");
  const payload = { name: trimmed, description: desc, parent_id: parentId, creator_id: userData.user.id, sort_order: 0 };
  const { data, error } = await getSupabaseClient()
    .from("shared_folders")
    .insert(payload)
    .select("*").single();
  alert("【Debug·板块】返回: " + JSON.stringify({ hasData: !!data, errorCode: error?.code, errorMsg: error?.message }));
  if (error) {
    console.error("[share-storage] createFolder 失败:", error, "payload:", payload);
    alert("【插入板块失败】" + error.message + " (code:" + error.code + ")");
    throw new Error(`创建板块失败: ${error.message} (code: ${error.code})`);
  }
  if (!data) { alert("【诡异】板块没报错但data为空！"); throw new Error("创建板块失败: 服务器未返回数据。"); }
  alert("【板块成功】ID: " + data.id);
  const row = data as Record<string, unknown>;
  return { id: row.id as string, name: row.name as string, description: (row.description as string) ?? "", parentId: (row.parent_id as string) ?? null, creatorId: (row.creator_id as string) ?? null, creatorName: null, creatorAvatar: null, sortOrder: (row.sort_order as number) ?? 0, createdAt: row.created_at as string };
}

export async function createSharePost(title: string, summary: string, body: string, link: string, folderId: string | null): Promise<SharePost> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { data: sessionData } = await getSupabaseClient().auth.getSession();
  const currentUser = sessionData.session?.user ?? null;
  if (!currentUser) throw new Error("请先登录后再分享项目。");
  const t = title.trim(), s = summary.trim(), b = body.trim();
  if (!t || t.length > 200) throw new Error("标题无效。");
  if (!s) throw new Error("简介不能为空。");
  if (!b) throw new Error("内容不能为空。");
  const payload = { title: t, summary: s, body: b, url: link.trim() || null, folder_id: folderId, author_id: currentUser.id, likes_count: 0, comments_count: 0 };
  const { data, error } = await getSupabaseClient()
    .from("shared_posts")
    .insert(payload)
    .select("id, title, summary, url, body, folder_id, author_id, likes_count, comments_count, created_at").single();
  if (error) {
    console.error("[share-storage] createSharePost 失败:", error, "payload:", payload);
    throw new Error(`发布失败: ${error.message} (code: ${error.code})`);
  }
  if (!data) {
    throw new Error("发布失败: 服务器未返回数据，请检查RLS策略。");
  }
  const row = data as Record<string, unknown>;
  const profile = (await loadProfilesById([currentUser.id])).get(currentUser.id);
  return {
    id: row.id as string, title: row.title as string, summary: row.summary as string,
    link: (row.url as string) ?? null,
    body: row.body as string, folderId: (row.folder_id as string) ?? null,
    authorId: row.author_id as string,
    authorName: profile?.displayName ?? null,
    authorAvatar: profile?.avatarUrl ?? null,
    likesCount: (row.likes_count as number) ?? 0, commentsCount: (row.comments_count as number) ?? 0,
    likes: [],
    createdAt: row.created_at as string,
    isHot: false, hotUntil: null,
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
  try { await logEdit("folder", id, "更新了板块信息"); }
  catch (e) { console.warn("[edit_log] 板块日志写入失败（不影响保存）:", e); }
}

export async function updateSharePost(id: string, title: string, summary: string, body: string, link: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { error } = await getSupabaseClient().from("shared_posts").update({ title: title.trim(), summary: summary.trim(), body: body.trim(), url: link.trim() || null }).eq("id", id);
  if (error) throw new Error(`更新帖子失败: ${error.message}`);
  try { await logEdit("post", id, "更新了帖子内容"); }
  catch (e) { console.warn("[edit_log] 帖子日志写入失败（不影响保存）:", e); }
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

export async function toggleHot(postId: string, hot: boolean, hotUntil: string | null = null): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { error } = await getSupabaseClient().from("shared_posts").update({ is_hot: hot, hot_until: hotUntil }).eq("id", postId);
  if (error) throw new Error(`设置热门失败: ${error.message}`);
}

export async function loadEditLogs(targetId: string, targetType: "folder" | "post"): Promise<EditLogEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient().rpc("get_edit_logs", { p_target_id: targetId, p_target_type: targetType });
    if (error || !data) return [];
    return (data as any[]).map((r) => ({
      id: r.id as string, actionSummary: r.action_summary as string, createdAt: r.created_at as string,
      editorId: r.editor_id as string, editorName: (r.editor_name as string) ?? "未知用户",
      editorAvatar: (r.editor_avatar as string) ?? null, totalContributions: (r.total_contributions as number) ?? 0,
    }));
  } catch { return []; }
}

/* ═══════════════════════════════════════════
   分享帖评论 CRUD (shared_post_comments)
   ═══════════════════════════════════════════ */

export type SharedComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  parentCommentId: string | null;
  isHidden: boolean;
  likes: Liker[];
  createdAt: string;
};

/** 解析 likes 关联数据为 Liker[]，去重 */
function parseLikers(likesRaw: unknown[]): Liker[] {
  const seen = new Set<string>();
  return likesRaw
    .map((like: any) => {
      const profile = (like.profiles ?? like.forum_profiles) as Record<string, unknown> | null | undefined;
      return {
        userId: like.user_id as string,
        displayName:
          (profile?.nickname as string | undefined) ??
          (profile?.display_name as string | undefined) ??
          "未知用户",
        avatarUrl: (profile?.avatar_url as string | null | undefined) ?? null,
        role: (profile?.role as Liker["role"] | undefined) ?? "user",
      };
    })
    .filter((l) => {
      if (seen.has(l.userId)) return false;
      seen.add(l.userId);
      return true;
    });
}

/** 加载某个帖子的所有评论（含点赞数据） */
export async function loadSharedComments(postId: string): Promise<SharedComment[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("shared_post_comments")
      .select("id, post_id, author_id, body, parent_comment_id, is_hidden, created_at, likes:share_comment_likes(user_id, profiles:forum_profiles(display_name, avatar_url))")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    /* 批量加载作者 profile */
    const rows = data as Record<string, unknown>[];
    const authorIds = [...new Set(rows.map((r) => r.author_id as string).filter(Boolean))];
    const nameMap = new Map<string, string>();
    const avatarMap = new Map<string, string | null>();
    if (authorIds.length > 0) {
      try {
        const { data: profiles } = await getSupabaseClient()
          .from("forum_profiles")
          .select("id, display_name, avatar_url")
          .in("id", authorIds);
        for (const p of profiles ?? []) {
          nameMap.set((p as any).id, (p as any).display_name);
          avatarMap.set((p as any).id, (p as any).avatar_url ?? null);
        }
      } catch { /* 静默降级 */ }
    }

    return rows.map((row) => ({
      id: row.id as string,
      postId: row.post_id as string,
      authorId: row.author_id as string,
      authorName: nameMap.get(row.author_id as string) ?? "未知用户",
      authorAvatar: avatarMap.get(row.author_id as string) ?? null,
      body: row.body as string,
      parentCommentId: (row.parent_comment_id as string) ?? null,
      isHidden: (row.is_hidden as boolean) ?? false,
      likes: parseLikers((row.likes as unknown[]) ?? []),
      createdAt: row.created_at as string,
    }));
  } catch { return []; }
}

/** 创建新评论 — 调用 SECURITY DEFINER RPC，auth.uid() 在 PG 服务端求值 */
export async function createSharedComment(
  postId: string,
  body: string,
  parentCommentId: string | null = null,
): Promise<SharedComment> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const supabase = getSupabaseClient();

  /* 使用 RPC 插入，auth.uid() 由 PostgreSQL 服务端求值，杜绝 RLS 不匹配 */
  const { data, error } = await supabase.rpc("insert_shared_comment", {
    p_post_id: postId,
    p_body: body.trim(),
    p_parent_comment_id: parentCommentId,
  });

  if (error) {
    console.error("[share-storage] createSharedComment RPC 失败:", error);
    throw new Error(`评论发布失败: ${error.message}`);
  }
  if (!data) throw new Error("评论发布失败: 未返回数据。");

  /* RPC returns SETOF shared_post_comments, data is an array */
  const rows = data as Record<string, unknown>[];
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("评论发布失败: 返回为空。");
  const row = rows[0];
  const authorId = row.author_id as string;

  /* 获取作者显示名 */
  let authorName = "用户";
  let authorAvatar: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("forum_profiles")
      .select("display_name, avatar_url")
      .eq("id", authorId)
      .maybeSingle();
    if (profile) {
      authorName = (profile as any).display_name ?? authorName;
      authorAvatar = (profile as any).avatar_url ?? null;
    }
  } catch { /* 降级 */ }

  return {
    id: row.id as string,
    postId: row.post_id as string,
    authorId,
    authorName,
    authorAvatar,
    body: row.body as string,
    parentCommentId: (row.parent_comment_id as string) ?? null,
    isHidden: (row.is_hidden as boolean) ?? false,
    likes: [],
    createdAt: row.created_at as string,
  };
}

/** 删除评论 */
export async function deleteSharedComment(commentId: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const { error } = await getSupabaseClient()
    .from("shared_post_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}

/* ═══════════════════════════════════════════
   点赞 Toggle（帖子 & 评论）
   ═══════════════════════════════════════════ */

/** 切换帖子点赞：已赞则取消，未赞则添加。返回最新点赞用户列表。 */
export async function togglePostLike(
  postId: string,
  userId: string,
): Promise<Liker[]> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const supabase = getSupabaseClient();

  // 检查是否已点赞
  const { data: existing } = await supabase
    .from("share_post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // 已赞 → 取消
    const { error } = await supabase
      .from("share_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw new Error(`取消点赞失败: ${error.message}`);
  } else {
    // 未赞 → 添加
    const { error } = await supabase
      .from("share_post_likes")
      .insert({ post_id: postId, user_id: userId });
    if (error) throw new Error(`点赞失败: ${error.message}`);
  }

  // 返回最新的点赞列表
  return loadPostLikers(postId);
}

/** 切换评论点赞：已赞则取消，未赞则添加。返回最新点赞用户列表。 */
export async function toggleCommentLike(
  commentId: string,
  userId: string,
): Promise<Liker[]> {
  if (!isSupabaseConfigured()) throw new Error("Supabase 未配置。");
  const supabase = getSupabaseClient();

  // 检查是否已点赞
  const { data: existing } = await supabase
    .from("share_comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    // 已赞 → 取消
    const { error } = await supabase
      .from("share_comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw new Error(`取消点赞失败: ${error.message}`);
  } else {
    // 未赞 → 添加
    const { error } = await supabase
      .from("share_comment_likes")
      .insert({ comment_id: commentId, user_id: userId });
    if (error) throw new Error(`点赞失败: ${error.message}`);
  }

  // 返回最新的点赞列表
  return loadCommentLikers(commentId);
}

/** 加载帖子的赞用户列表 */
export async function loadPostLikers(postId: string): Promise<Liker[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data } = await getSupabaseClient()
      .from("share_post_likes")
      .select("user_id, profiles:forum_profiles(display_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    return withUserRoles(parseLikers((data ?? []) as unknown[]));
  } catch { return []; }
}

/** 加载评论的赞用户列表 */
export async function loadCommentLikers(commentId: string): Promise<Liker[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data } = await getSupabaseClient()
      .from("share_comment_likes")
      .select("user_id, profiles:forum_profiles(display_name, avatar_url)")
      .eq("comment_id", commentId)
      .order("created_at", { ascending: true });
    return withUserRoles(parseLikers((data ?? []) as unknown[]));
  } catch { return []; }
}

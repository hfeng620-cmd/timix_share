"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────

export type NotificationType =
  | "new_reply"
  | "new_like"
  | "post_approved"
  | "admin_announcement";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  content?: string;
  read: boolean;
  createdAt: number;
  postId?: string;
  replyId?: string;
}

// ── Display-friendly type labels ──────────────────────

const TYPE_LABELS: Record<NotificationType, string> = {
  new_reply: "新回复",
  new_like: "新点赞",
  post_approved: "审核通过",
  admin_announcement: "管理员公告",
};

export function getTypeLabel(type: NotificationType): string {
  return TYPE_LABELS[type] || type;
}

// ── Mapping ───────────────────────────────────────────

type SupabaseNotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  post_id: string | null;
  reply_id: string | null;
  read: boolean;
  created_at: string;
};

type AnnouncementPostRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

const ANNOUNCEMENT_NOTIFICATION_PREFIX = "announcement-post:";
const ANNOUNCEMENT_READ_KEY_PREFIX = "timix-announcement-notifications-read:";
const ANNOUNCEMENT_HIDDEN_KEY_PREFIX = "timix-announcement-notifications-hidden:";

function mapNotification(row: SupabaseNotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    read: row.read,
    createdAt: new Date(row.created_at).getTime(),
    postId: row.post_id ?? undefined,
    replyId: row.reply_id ?? undefined,
  };
}

function getStoredAnnouncementIds(prefix: string, userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`${prefix}${userId}`);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function setStoredAnnouncementIds(prefix: string, userId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${prefix}${userId}`, JSON.stringify([...ids].slice(-100)));
  } catch {
    // localStorage can be unavailable in privacy modes.
  }
}

function getAnnouncementPostId(notificationId: string) {
  return notificationId.startsWith(ANNOUNCEMENT_NOTIFICATION_PREFIX)
    ? notificationId.slice(ANNOUNCEMENT_NOTIFICATION_PREFIX.length)
    : null;
}

async function loadAnnouncementNotifications(
  userId: string,
  existingNotifications: NotificationItem[],
): Promise<NotificationItem[]> {
  const supabase = getSupabaseClient();
  const existingAnnouncementKeys = new Set(
    existingNotifications
      .filter((item) => item.type === "admin_announcement")
      .map((item) => item.postId ?? item.message),
  );

  const { data, error } = await supabase
    .from("forum_posts")
    .select("id,title,body,created_at")
    .contains("tags", ["公告"])
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.warn("[loadAnnouncementNotifications] 查询历史公告失败:", error.message);
    return [];
  }

  const readIds = getStoredAnnouncementIds(ANNOUNCEMENT_READ_KEY_PREFIX, userId);
  const hiddenIds = getStoredAnnouncementIds(ANNOUNCEMENT_HIDDEN_KEY_PREFIX, userId);

  return ((data ?? []) as AnnouncementPostRow[])
    .filter((post) => !hiddenIds.has(post.id))
    .filter((post) => !existingAnnouncementKeys.has(post.id) && !existingAnnouncementKeys.has(post.title))
    .map((post) => ({
      id: `${ANNOUNCEMENT_NOTIFICATION_PREFIX}${post.id}`,
      type: "admin_announcement",
      message: post.title,
      title: post.title,
      content: post.body,
      read: readIds.has(post.id),
      createdAt: new Date(post.created_at).getTime(),
      postId: post.id,
    }));
}

async function hydrateAnnouncementDetails(notifications: NotificationItem[]): Promise<NotificationItem[]> {
  const announcementPostIds = [
    ...new Set(
      notifications
        .filter((item) => item.type === "admin_announcement" && item.postId && !item.content)
        .map((item) => item.postId as string),
    ),
  ];

  if (announcementPostIds.length === 0) return notifications;

  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_posts")
      .select("id,title,body,created_at")
      .in("id", announcementPostIds);

    if (error || !data) return notifications;

    const postMap = new Map(
      ((data ?? []) as AnnouncementPostRow[]).map((post) => [post.id, post]),
    );

    return notifications.map((item) => {
      if (item.type !== "admin_announcement" || !item.postId) return item;
      const post = postMap.get(item.postId);
      if (!post) return item;

      return {
        ...item,
        title: post.title,
        content: post.body,
        createdAt: new Date(post.created_at).getTime(),
      };
    });
  } catch {
    return notifications;
  }
}

// ── Load & mutate ─────────────────────────────────────

/** Load recent notifications for the current user from Supabase. */
export async function loadNotifications(): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    const dbNotifications = ((data ?? []) as SupabaseNotificationRow[]).map(mapNotification);
    const announcementNotifications = await loadAnnouncementNotifications(userData.user.id, dbNotifications);
    const hydratedNotifications = await hydrateAnnouncementDetails([...dbNotifications, ...announcementNotifications]);
    return hydratedNotifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30);
  } catch {
    return [];
  }
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const announcementPostId = getAnnouncementPostId(id);
  if (announcementPostId) {
    const { data: userData } = await getSupabaseClient().auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const ids = getStoredAnnouncementIds(ANNOUNCEMENT_READ_KEY_PREFIX, userId);
    ids.add(announcementPostId);
    setStoredAnnouncementIds(ANNOUNCEMENT_READ_KEY_PREFIX, userId, ids);
    return;
  }

  await getSupabaseClient()
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}

/** Mark all notifications as read for the current user. */
export async function markAllNotificationsRead(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { data: announcementPosts } = await supabase
    .from("forum_posts")
    .select("id")
    .contains("tags", ["公告"])
    .eq("is_hidden", false)
    .limit(100);
  const localReadIds = getStoredAnnouncementIds(ANNOUNCEMENT_READ_KEY_PREFIX, userData.user.id);
  ((announcementPosts ?? []) as Array<{ id: string }>).forEach((post) => localReadIds.add(post.id));
  setStoredAnnouncementIds(ANNOUNCEMENT_READ_KEY_PREFIX, userData.user.id, localReadIds);

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userData.user.id)
    .eq("read", false);
}

/** Delete a notification. */
export async function deleteNotification(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const announcementPostId = getAnnouncementPostId(id);
  if (announcementPostId) {
    const { data: userData } = await getSupabaseClient().auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const ids = getStoredAnnouncementIds(ANNOUNCEMENT_HIDDEN_KEY_PREFIX, userId);
    ids.add(announcementPostId);
    setStoredAnnouncementIds(ANNOUNCEMENT_HIDDEN_KEY_PREFIX, userId, ids);
    return;
  }

  await getSupabaseClient()
    .from("notifications")
    .delete()
    .eq("id", id);
}

// ── Realtime subscription ─────────────────────────────

// Module-level channel tracking to prevent duplicate subscriptions
let activeChannel: RealtimeChannel | null = null;

/**
 * Subscribe to real-time notification inserts for the given user.
 * Returns an unsubscribe function.
 */
export function subscribeNotifications(
  userId: string,
  onNewNotification: (notification: NotificationItem) => void,
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const supabase = getSupabaseClient();

  // Remove any existing channel first - this is synchronous
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  // Use unique channel name to avoid conflicts with stale channels
  const channelName = `notifications:${userId}:${Date.now()}`;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as SupabaseNotificationRow;
        if (row) {
          onNewNotification(mapNotification(row));
        }
      },
    )
    .subscribe();

  activeChannel = channel;

  return () => {
    supabase.removeChannel(channel);
    if (activeChannel === channel) {
      activeChannel = null;
    }
  };
}

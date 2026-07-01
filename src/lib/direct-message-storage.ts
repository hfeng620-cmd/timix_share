"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type DirectMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
};

export type DirectMessageProfile = {
  id: string;
  displayName: string;
  avatarUrl: string;
};

type DirectMessageRow = {
  id?: string | null;
  sender_id?: string | null;
  from_user_id?: string | null;
  recipient_id?: string | null;
  receiver_id?: string | null;
  to_user_id?: string | null;
  content?: string | null;
  body?: string | null;
  message?: string | null;
  created_at?: string | null;
};

type MessageTextColumn = "content" | "body" | "message";
type RecipientColumn = "recipient_id" | "receiver_id" | "to_user_id";

const DIRECT_MESSAGES_TABLE = "direct_messages";
const DEFAULT_MESSAGE_LIMIT = 80;
const MAX_MESSAGE_LENGTH = 2000;
const TEXT_COLUMNS: MessageTextColumn[] = ["content", "body", "message"];
const RECIPIENT_COLUMNS: RecipientColumn[] = ["recipient_id", "receiver_id", "to_user_id"];
const activeChannels = new Map<string, RealtimeChannel>();

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("私信服务未配置。");
  }
}

function normalizeMessageText(value: string) {
  const trimmed = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (!trimmed) {
    throw new Error("先写一点内容再发送。");
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`私信不能超过 ${MAX_MESSAGE_LENGTH} 个字符。`);
  }

  return trimmed;
}

function getSenderId(row: DirectMessageRow) {
  return row.sender_id ?? row.from_user_id ?? "";
}

function getRecipientId(row: DirectMessageRow) {
  return row.recipient_id ?? row.receiver_id ?? row.to_user_id ?? "";
}

function rowToMessage(row: DirectMessageRow): DirectMessage | null {
  const senderId = getSenderId(row);
  const recipientId = getRecipientId(row);
  const content = row.content ?? row.body ?? row.message ?? "";

  if (!row.id || !senderId || !recipientId) {
    return null;
  }

  return {
    id: row.id,
    senderId,
    recipientId,
    content,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function isConversationMessage(row: DirectMessageRow, currentUserId: string, peerUserId: string) {
  const senderId = getSenderId(row);
  const recipientId = getRecipientId(row);

  return (
    (senderId === currentUserId && recipientId === peerUserId) ||
    (senderId === peerUserId && recipientId === currentUserId)
  );
}

function isSchemaColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

async function getCurrentUserId(fallbackUserId?: string) {
  if (fallbackUserId) return fallbackUserId;

  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) {
    throw new Error("请先登录后再发送私信。");
  }

  return data.user.id;
}

async function loadMessagesWithRecipientColumn(
  currentUserId: string,
  peerUserId: string,
  recipientColumn: RecipientColumn,
  limit: number,
) {
  return getSupabaseClient()
    .from(DIRECT_MESSAGES_TABLE)
    .select("*")
    .or(
      [
        `and(sender_id.eq.${currentUserId},${recipientColumn}.eq.${peerUserId})`,
        `and(sender_id.eq.${peerUserId},${recipientColumn}.eq.${currentUserId})`,
      ].join(","),
    )
    .order("created_at", { ascending: true })
    .limit(limit);
}

export async function loadDirectMessages(
  peerUserId: string,
  currentUserId?: string,
  options?: { limit?: number },
): Promise<DirectMessage[]> {
  if (!isSupabaseConfigured() || !peerUserId) return [];

  const userId = await getCurrentUserId(currentUserId);
  const limit = options?.limit ?? DEFAULT_MESSAGE_LIMIT;
  let lastError: { code?: string; message?: string } | null = null;

  for (const recipientColumn of RECIPIENT_COLUMNS) {
    const { data, error } = await loadMessagesWithRecipientColumn(
      userId,
      peerUserId,
      recipientColumn,
      limit,
    );

    if (!error) {
      return ((data ?? []) as DirectMessageRow[])
        .map(rowToMessage)
        .filter((message): message is DirectMessage => Boolean(message));
    }

    lastError = error;
    if (!isSchemaColumnError(error)) break;
  }

  throw new Error(lastError?.message || "私信加载失败，请稍后重试。");
}

async function insertDirectMessageWithColumns(
  currentUserId: string,
  peerUserId: string,
  content: string,
  recipientColumn: RecipientColumn,
  textColumn: MessageTextColumn,
) {
  return getSupabaseClient()
    .from(DIRECT_MESSAGES_TABLE)
    .insert({
      sender_id: currentUserId,
      [recipientColumn]: peerUserId,
      [textColumn]: content,
    })
    .select("*")
    .single();
}

export async function sendDirectMessage(
  peerUserId: string,
  content: string,
  currentUserId?: string,
): Promise<DirectMessage> {
  assertConfigured();
  if (!peerUserId) throw new Error("缺少私信接收人。");

  const userId = await getCurrentUserId(currentUserId);
  if (userId === peerUserId) {
    throw new Error("不能给自己发送私信。");
  }

  const normalizedContent = normalizeMessageText(content);
  let lastError: { code?: string; message?: string } | null = null;

  for (const recipientColumn of RECIPIENT_COLUMNS) {
    for (const textColumn of TEXT_COLUMNS) {
      const { data, error } = await insertDirectMessageWithColumns(
        userId,
        peerUserId,
        normalizedContent,
        recipientColumn,
        textColumn,
      );

      if (!error) {
        const message = rowToMessage(data as DirectMessageRow);
        if (message) return message;
        throw new Error("私信已发送，但返回数据不完整。");
      }

      lastError = error;
      if (!isSchemaColumnError(error)) {
        throw new Error(error.message || "私信发送失败，请稍后重试。");
      }
    }
  }

  throw new Error(lastError?.message || "私信发送失败，请检查 direct_messages 表字段。");
}

export function subscribeDirectMessages(
  currentUserId: string,
  peerUserId: string,
  onMessage: (message: DirectMessage) => void,
): () => void {
  if (!isSupabaseConfigured() || !currentUserId || !peerUserId) {
    return () => {};
  }

  const supabase = getSupabaseClient();
  const channelKey = `${currentUserId}:${peerUserId}`;
  const previousChannel = activeChannels.get(channelKey);
  if (previousChannel) {
    supabase.removeChannel(previousChannel);
    activeChannels.delete(channelKey);
  }

  const channel = supabase
    .channel(`direct-messages:${channelKey}:${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: DIRECT_MESSAGES_TABLE,
      },
      (payload) => {
        const row = payload.new as DirectMessageRow;
        if (!isConversationMessage(row, currentUserId, peerUserId)) return;

        const message = rowToMessage(row);
        if (message) onMessage(message);
      },
    )
    .subscribe();

  activeChannels.set(channelKey, channel);

  return () => {
    supabase.removeChannel(channel);
    if (activeChannels.get(channelKey) === channel) {
      activeChannels.delete(channelKey);
    }
  };
}

export async function loadDirectMessageProfile(userId: string): Promise<DirectMessageProfile | null> {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: userId,
      displayName: String((data as Record<string, unknown>).display_name ?? "用户"),
      avatarUrl: String((data as Record<string, unknown>).avatar_url ?? ""),
    };
  } catch {
    return null;
  }
}

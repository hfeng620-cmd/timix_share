"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useForumAuth } from "@/lib/forum-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { loadNotifications, subscribeNotifications } from "@/lib/notification-storage";
import {
  getNativeNotificationPermission,
  requestNativeNotificationPermission,
} from "@/lib/native-notifications";

type DirectMessageRow = {
  id?: string | null;
  sender_id?: string | null;
  receiver_id?: string | null;
  recipient_id?: string | null;
  to_user_id?: string | null;
  is_read?: boolean | null;
};

type RecipientColumn = "receiver_id" | "recipient_id" | "to_user_id";

const RECIPIENT_COLUMNS: RecipientColumn[] = ["receiver_id", "recipient_id", "to_user_id"];

function getRecipientId(row: DirectMessageRow) {
  return row.receiver_id ?? row.recipient_id ?? row.to_user_id ?? "";
}

function isColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42703" || error.code === "PGRST204" || message.includes("column") || message.includes("schema cache");
}

async function loadUnreadDirectMessages(currentUserId: string) {
  if (!isSupabaseConfigured() || !currentUserId) return 0;
  const supabase = getSupabaseClient();

  for (const recipientColumn of RECIPIENT_COLUMNS) {
    const { data, error } = await supabase
      .from("direct_messages")
      .select("id,sender_id,receiver_id,recipient_id,to_user_id,is_read")
      .eq(recipientColumn, currentUserId)
      .eq("is_read", false)
      .limit(99);

    if (!error) {
      return ((data ?? []) as DirectMessageRow[]).filter((row) => row.sender_id !== currentUserId).length;
    }

    if (!isColumnError(error)) break;
  }

  return 0;
}

export function useMobileNotificationStatus() {
  const { isConnected, user } = useForumAuth();
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const currentUserId = user?.id ?? "";

  const refresh = useCallback(async () => {
    if (!isConnected || !currentUserId) {
      setNotificationUnread(0);
      setInboxUnread(0);
      return;
    }

    const [notifications, unreadMessages] = await Promise.all([
      loadNotifications().catch(() => []),
      loadUnreadDirectMessages(currentUserId).catch(() => 0),
    ]);

    setNotificationUnread(notifications.filter((item) => !item.read).length);
    setInboxUnread(unreadMessages);
  }, [currentUserId, isConnected]);

  useEffect(() => {
    setPermission(getNativeNotificationPermission());
  }, []);

  useEffect(() => {
    void refresh();
    if (!isConnected || !currentUserId || !isSupabaseConfigured()) return;

    const unsubscribeNotifications = subscribeNotifications(currentUserId, (notification) => {
      if (!notification.read) setNotificationUnread((count) => Math.min(count + 1, 99));
    });

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`mobile-direct-message-badge:${currentUserId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const row = payload.new as DirectMessageRow;
          if (row.sender_id !== currentUserId && getRecipientId(row) === currentUserId && row.is_read === false) {
            setInboxUnread((count) => Math.min(count + 1, 99));
          }
        },
      )
      .subscribe();

    const timer = window.setInterval(() => {
      void refresh();
    }, 60000);

    return () => {
      unsubscribeNotifications();
      supabase.removeChannel(channel);
      window.clearInterval(timer);
    };
  }, [currentUserId, isConnected, refresh]);

  const requestPermission = useCallback(async () => {
    const nextPermission = await requestNativeNotificationPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  return useMemo(
    () => ({
      notificationUnread,
      inboxUnread,
      totalUnread: notificationUnread + inboxUnread,
      permission,
      refresh,
      requestPermission,
    }),
    [inboxUnread, notificationUnread, permission, refresh, requestPermission],
  );
}
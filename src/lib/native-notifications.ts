"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

type NativeNotificationPermission = NotificationPermission | "unsupported";

type NativeNotificationPayload = {
  title: string;
  body?: string;
  tag?: string;
  url?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
};

const DEFAULT_ICON = "/icons/icon-192x192.png";
const DEFAULT_BADGE = "/icons/icon-maskable-192x192.png";
const TIMIX_NOTIFICATION_CHANNEL_ID = "timix-events";

let nativeNotificationListenerReady = false;

function isCapacitorNative() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function toWebPermission(display?: string): NativeNotificationPermission {
  if (display === "granted") return "granted";
  if (display === "denied") return "denied";
  return "default";
}

async function ensureNativeNotificationChannel() {
  try {
    await LocalNotifications.createChannel({
      id: TIMIX_NOTIFICATION_CHANNEL_ID,
      name: "TiMix 通知",
      description: "私信、回复和社区动态提醒",
      importance: 5,
      visibility: 1,
      lights: true,
      vibration: true,
    });
  } catch {
    // Channel creation is Android-only and idempotent; ignored on unsupported platforms.
  }
}

function ensureNativeNotificationClickHandler() {
  if (nativeNotificationListenerReady || typeof window === "undefined") return;
  nativeNotificationListenerReady = true;

  void LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const url = event.notification.extra?.url;
    if (typeof url === "string" && url.length > 0) {
      window.location.href = url;
    }
  });
}

export function canUseNativeNotifications() {
  return isCapacitorNative() || (typeof window !== "undefined" && "Notification" in window);
}

export function getNativeNotificationPermission(): NativeNotificationPermission {
  if (isCapacitorNative()) return "default";
  if (!canUseNativeNotifications()) return "unsupported";
  return Notification.permission;
}

export async function requestNativeNotificationPermission(): Promise<NativeNotificationPermission> {
  if (isCapacitorNative()) {
    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === "granted") {
        ensureNativeNotificationClickHandler();
        await ensureNativeNotificationChannel();
        return "granted";
      }

      const requested = await LocalNotifications.requestPermissions();
      if (requested.display === "granted") {
        ensureNativeNotificationClickHandler();
        await ensureNativeNotificationChannel();
      }
      return toWebPermission(requested.display);
    } catch {
      return "unsupported";
    }
  }

  if (!canUseNativeNotifications()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showNativeNotification(payload: NativeNotificationPayload) {
  if (isCapacitorNative()) {
    const permission = await requestNativeNotificationPermission();
    if (permission !== "granted") return false;

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2147483647),
            title: payload.title,
            body: payload.body ?? "",
            channelId: TIMIX_NOTIFICATION_CHANNEL_ID,
            extra: { url: payload.url ?? "/community" },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  if (!canUseNativeNotifications() || Notification.permission !== "granted") return false;

  const options: NotificationOptions & { data?: { url?: string } } = {
    body: payload.body,
    tag: payload.tag,
    icon: payload.icon ?? DEFAULT_ICON,
    badge: payload.badge ?? DEFAULT_BADGE,
    requireInteraction: payload.requireInteraction ?? false,
    data: { url: payload.url ?? "/community" },
  };

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, options);
      return true;
    }

    const notification = new Notification(payload.title, options);
    notification.onclick = () => {
      window.focus();
      if (payload.url) window.location.href = payload.url;
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

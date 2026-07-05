"use client";

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

export function canUseNativeNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNativeNotificationPermission(): NativeNotificationPermission {
  if (!canUseNativeNotifications()) return "unsupported";
  return Notification.permission;
}

export async function requestNativeNotificationPermission(): Promise<NativeNotificationPermission> {
  if (!canUseNativeNotifications()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showNativeNotification(payload: NativeNotificationPayload) {
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
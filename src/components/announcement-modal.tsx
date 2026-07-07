"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const DISMISS_PERMANENT_KEY = "timin-announce-dismissed-permanent";
const DISMISS_TODAY_KEY = "timin-announce-dismissed-today";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getSafeAnnouncementUrl(value: string, type: "image" | "link"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const allowedProtocols =
      type === "image"
        ? new Set(["http:", "https:"])
        : new Set(["http:", "https:", "mailto:", "tel:"]);

    if (!allowedProtocols.has(parsed.protocol)) return null;
    if (type === "image") {
      parsed.username = "";
      parsed.password = "";
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Simple markdown renderer: images ![](url), links [text](url), newlines → <br> */
function renderBody(raw: string): string {
  let html = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => {
    const safeUrl = getSafeAnnouncementUrl(url, "image");
    if (!safeUrl) return "";
    return `<img src="${escapeHtmlAttribute(safeUrl)}" alt="${escapeHtmlAttribute(alt)}" class="my-3 max-w-full rounded-xl" />`;
  });
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text: string, url: string) => {
    const safeUrl = getSafeAnnouncementUrl(url, "link");
    if (!safeUrl) return text;
    return `<a href="${escapeHtmlAttribute(safeUrl)}" target="_blank" rel="noopener noreferrer" class="text-sky-400 underline hover:text-sky-300">${text}</a>`;
  });
  // Newlines
  html = html.replace(/\n/g, "<br>");
  return html;
}

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setAnnouncement(null); setVisible(false); setLoadFailed(false); return; }

    let cancelled = false;
    const supabase = getSupabaseClient();
    const run = async () => {
      setLoadFailed(false);
      const { data, error } = await supabase
        .from("forum_posts")
        .select("id, title, body, created_at")
        .contains("tags", ["弹窗公告"])
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (cancelled) return;

      if (!data || data.length === 0) { setAnnouncement(null); setVisible(false); return; }

      const latest = data[0] as unknown as Announcement;

      // Check permanently dismissed
      try {
        const dismissed = localStorage.getItem(DISMISS_PERMANENT_KEY);
        if (dismissed) {
          const ids = JSON.parse(dismissed) as string[];
          if (ids.includes(latest.id)) { setAnnouncement(null); setVisible(false); return; }
        }
      } catch {}

      // Check today dismissed
      try {
        const todayData = localStorage.getItem(DISMISS_TODAY_KEY);
        if (todayData) {
          const parsed = JSON.parse(todayData) as { date: string; ids: string[] };
          if (parsed.date === getTodayKey() && parsed.ids.includes(latest.id)) {
            setAnnouncement(null); setVisible(false); return;
          }
        }
      } catch {}

      setAnnouncement(latest);
      setVisible(true);
    };
    run().catch(() => {
      if (cancelled) return;
      setLoadFailed(true); setAnnouncement(null); setVisible(false);
    });
    return () => { cancelled = true; };
  }, []);

  function handleDismissPermanent() {
    setVisible(false);
    if (announcement) {
      try {
        const raw = localStorage.getItem(DISMISS_PERMANENT_KEY);
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        if (!ids.includes(announcement.id)) ids.push(announcement.id);
        localStorage.setItem(DISMISS_PERMANENT_KEY, JSON.stringify(ids.slice(-20)));
      } catch {}
    }
  }

  function handleDismissToday() {
    setVisible(false);
    if (announcement) {
      try {
        const todayKey = getTodayKey();
        const raw = localStorage.getItem(DISMISS_TODAY_KEY);
        let parsed: { date: string; ids: string[] } = { date: todayKey, ids: [] };
        if (raw) {
          const existing = JSON.parse(raw) as { date: string; ids: string[] };
          if (existing.date === todayKey) parsed = existing;
        }
        if (!parsed.ids.includes(announcement.id)) parsed.ids.push(announcement.id);
        localStorage.setItem(DISMISS_TODAY_KEY, JSON.stringify(parsed));
      } catch {}
    }
  }

  useEffect(() => {
    if (!visible) return;
    function handleKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setVisible(false); }
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); };
  }, [visible]);

  if (loadFailed || !visible || !announcement) return null;

  return (
    <div aria-modal="false" className="pointer-events-none fixed inset-x-3 bottom-4 z-[300] flex justify-center sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24" role="dialog">
      <div ref={panelRef} aria-labelledby="announcement-title" className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] shadow-2xl backdrop-blur-xl sm:w-[420px]" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={() => setVisible(false)} className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-soft)] text-[var(--color-muted)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]" type="button" aria-label="关闭">
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="border-b border-[var(--color-line)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <h2 className="pr-8 text-base font-bold text-[var(--color-ink)]" id="announcement-title">{announcement.title}</h2>
          </div>
        </div>

        {/* Body with rendered markdown images */}
        <div className="max-h-[42vh] overflow-y-auto px-5 py-4">
          <div
            className="text-sm leading-7 text-[var(--color-ink)] font-body"
            dangerouslySetInnerHTML={{ __html: renderBody(announcement.body) }}
          />
          <p className="mt-3 text-[11px] text-[var(--color-muted)] font-body">
            {new Date(announcement.created_at).toLocaleString("zh-CN")}
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--color-line)] px-5 py-4">
          <button
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)] font-body"
            onClick={handleDismissToday} type="button"
          >
            今日不再显示
          </button>
          <button
            className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] transition hover:opacity-90 font-body"
            onClick={handleDismissPermanent} type="button"
          >
            不再显示
          </button>
        </div>
      </div>
    </div>
  );
}

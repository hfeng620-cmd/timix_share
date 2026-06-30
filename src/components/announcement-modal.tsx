"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { lockBodyScroll } from "@/lib/body-scroll-lock";
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
    const unlock = lockBodyScroll();
    return () => { document.removeEventListener("keydown", handleKeyDown); unlock(); };
  }, [visible]);

  if (loadFailed || !visible || !announcement) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4 backdrop-blur-xl" role="dialog" onClick={() => setVisible(false)}>
      <div ref={panelRef} aria-labelledby="announcement-title" className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-white/6 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={() => setVisible(false)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition z-10" type="button" aria-label="关闭">
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📢</span>
            <h2 className="text-lg font-heading italic text-white" id="announcement-title">{announcement.title}</h2>
          </div>
        </div>

        {/* Body with rendered markdown images */}
        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          <div
            className="text-sm leading-7 text-white/75 font-body"
            dangerouslySetInnerHTML={{ __html: renderBody(announcement.body) }}
          />
          <p className="mt-3 text-[11px] text-white/30 font-body">
            {new Date(announcement.created_at).toLocaleString("zh-CN")}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition font-body"
            onClick={handleDismissToday} type="button"
          >
            今日不再显示
          </button>
          <button
            className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/25 transition font-body"
            onClick={handleDismissPermanent} type="button"
          >
            不再显示
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Activity, Flame, Github, MessageSquarePlus, QrCode, Trophy } from "lucide-react";
import { useCallback, useState } from "react";

import { Navbar } from "@/components/navbar";
import { CommunityPostPanel } from "@/components/community-post-panel";
import { DiscussionFeed } from "@/components/discussion-feed";
import { MobileThemeToggle } from "@/components/mobile-theme-toggle";
import HotTopicsPanel from "@/components/hot-topics-panel";
import UserRankPanel from "@/components/user-rank-panel";
import { siteLinks } from "@/lib/site-links";
import { useSystemMonitor } from "@/lib/system-monitor-context";

const hubs = [
  { id: "01", title: "站内快反馈", summary: "补一句、报跳价、留试用。", href: "#community-composer", primary: true },
  { id: "02", title: "GitHub Discussions", summary: "专题归档、经验整理、长期追踪。", href: siteLinks.discussions, external: true },
  { id: "03", title: "QQ 群 602190132", summary: "急线索先同步，再回流站内。", qq: true },
  { id: "04", title: "AI新闻与动态", summary: "追踪前沿AI模型发布、行业重大资讯与技术前瞻。", href: "/models" },
];

export default function CommunityPage() {
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<"hot" | "rank" | null>(null);
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);
  const [qqModalOpen, setQqModalOpen] = useState(false);
  const { openMonitor } = useSystemMonitor();

  const handleTopicClick = useCallback((postId: string) => {
    const el = document.getElementById(postId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="community-mobile-app min-h-[100dvh] overflow-x-hidden text-white">
      <Navbar />

      <div className="mx-auto max-w-[1680px] px-3 pt-20 sm:px-5 md:pt-28 lg:px-8">
        <header className="community-mobile-header -mx-3 mb-2 border-b border-white/5 bg-[#09090b]/80 px-4 pb-2.5 pt-2.5 text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.32)] backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Community</p>
              <h1 className="mt-0.5 text-lg font-bold leading-none tracking-normal text-zinc-50">社区</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <MobileThemeToggle />
              <button
                onClick={openMonitor}
                className="touch-press inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-semibold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-white/10"
                type="button"
              >
                <Activity className="h-3.5 w-3.5" />
                VPS
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button
              className="touch-press inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-xs font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(255,255,255,0.055),inset_0_1px_0_rgba(255,255,255,0.58)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
              onClick={() => setMobileComposerOpen((open) => !open)}
              type="button"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              {mobileComposerOpen ? "收起" : "发帖"}
            </button>
            <a
              href={siteLinks.discussions}
              className="touch-press inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-zinc-400 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-white/10"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </header>

        <nav className="mb-3 flex gap-2 overflow-x-auto pb-1 text-white md:hidden" aria-label="社区快捷入口">
          <button
            className="touch-press inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-white/10"
            onClick={() => setMobileComposerOpen((open) => !open)}
            type="button"
          >
            <MessageSquarePlus className="h-3.5 w-3.5 text-zinc-400" />
            发帖
          </button>
          <button
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold shadow-sm transition active:scale-95 active:opacity-85 ${
              mobilePanel === "hot" ? "bg-zinc-100 text-zinc-950" : "border border-white/10 bg-white/[0.04] text-zinc-300"
            }`}
            onClick={() => setMobilePanel(mobilePanel === "hot" ? null : "hot")}
            type="button"
          >
            <Flame className="h-3.5 w-3.5" />
            热门
          </button>
          <button
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold shadow-sm transition active:scale-95 active:opacity-85 ${
              mobilePanel === "rank" ? "bg-zinc-100 text-zinc-950" : "border border-white/10 bg-white/[0.04] text-zinc-300"
            }`}
            onClick={() => setMobilePanel(mobilePanel === "rank" ? null : "rank")}
            type="button"
          >
            <Trophy className="h-3.5 w-3.5" />
            排行
          </button>
          <button
            className="touch-press inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-white/10"
            onClick={() => setQqModalOpen(true)}
            type="button"
          >
            <QrCode className="h-3.5 w-3.5 text-zinc-400" />
            QQ群
          </button>
        </nav>

        <section className="liquid-glass mb-6 hidden overflow-hidden rounded-[28px] p-5 sm:p-7 md:block">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="liquid-glass mb-3 inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
                社区入口
              </div>
              <h1 className="text-3xl font-heading italic leading-[1.15] text-white md:text-4xl">
                讨论先分流，帖子再沉淀。
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/55 font-body">
                站内接短反馈，Discussions 放长期主题，QQ 群只处理急同步。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openMonitor}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-zinc-900/50 px-3 py-1.5 text-left backdrop-blur-md transition-colors hover:bg-zinc-800/50"
                type="button"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-zinc-300">VPS: Normal</span>
              </button>
              <Link
                href="#community-composer"
                className="liquid-glass-strong rounded-full px-5 py-2.5 text-sm font-medium text-white font-body"
              >
                发反馈
              </Link>
              <a
                href={siteLinks.discussions}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-100 transition font-body"
                rel="noopener noreferrer"
                target="_blank"
              >
                Discussions
              </a>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {hubs.map((hub) => {
              const isQQ = "qq" in hub;
              const isPrimary = "primary" in hub && hub.primary;

              if (isQQ) {
                return (
                  <button
                    key={hub.id}
                    onClick={() => setQqModalOpen(true)}
                    type="button"
                    className="touch-press group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 liquid-glass"
                  >
                    <div>
                      <span className="inline-flex rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold tracking-[0.16em] text-white/60">
                        {hub.id}
                      </span>
                      <p className="mt-3 text-lg font-heading italic text-white">{hub.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/55 font-body">{hub.summary}</p>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white/70 font-body">
                      查看加群方式 <span aria-hidden>→</span>
                    </p>
                  </button>
                );
              }

              const Comp = hub.external ? "a" : Link;
              return (
                <Comp
                  key={hub.id}
                  href={(hub as any).href}
                  {...(hub.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`touch-press group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 ${
                    isPrimary ? "border-white/30 bg-white/10" : "liquid-glass"
                  }`}
                >
                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.16em] ${
                      isPrimary ? "bg-white/20 text-white" : "bg-white/8 text-white/60"
                    }`}>
                      {hub.id}
                    </span>
                    <p className="mt-3 text-lg font-heading italic text-white">{hub.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/55 font-body">{hub.summary}</p>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white/70 font-body">
                    {hub.external ? "打开 Discussions" : "进入"} <span aria-hidden>→</span>
                  </p>
                </Comp>
              );
            })}
          </div>
        </section>

        <div className="mb-5 hidden gap-2 md:flex xl:hidden">
          {(["hot", "rank"] as const).map((key) => (
            <button
              key={key}
              className={`touch-press flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] font-body ${
                mobilePanel === key ? "liquid-glass-strong text-white" : "liquid-glass text-white/60"
              }`}
              onClick={() => setMobilePanel(mobilePanel === key ? null : key)}
              type="button"
            >
              {key === "hot" ? "热门" : "排行"}
            </button>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-3 md:space-y-5">
            <div className="community-mobile-compose md:hidden">
              <button
                className="community-compose-trigger touch-press flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:bg-white/10"
                onClick={() => setMobileComposerOpen((open) => !open)}
                type="button"
              >
                <span>
                  <span className="block text-sm font-semibold text-zinc-100">写一条新讨论</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">短反馈、价格变化、试用记录</span>
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-semibold text-zinc-950">
                  {mobileComposerOpen ? "收起" : "发帖"}
                </span>
              </button>
              {mobileComposerOpen ? (
                <div id="community-composer" className="community-composer-shell mt-2 scroll-mt-24">
                  <CommunityPostPanel onPostCreated={() => {
                    setFeedRefreshKey((v) => v + 1);
                    setMobileComposerOpen(false);
                  }} />
                </div>
              ) : null}
            </div>
            <div id="community-composer-desktop" className="community-composer-shell hidden scroll-mt-24 md:block">
              <CommunityPostPanel onPostCreated={() => setFeedRefreshKey((v) => v + 1)} />
            </div>
            <div className="community-feed-shell">
              <DiscussionFeed key={feedRefreshKey} hideComposer title="讨论工作台" limit={8} />
            </div>
          </div>

          <aside className="hidden min-w-0 xl:block">
            <div className="sticky top-24 space-y-5">
              <HotTopicsPanel onTopicClick={handleTopicClick} />
              <UserRankPanel />
            </div>
          </aside>
        </div>

        {mobilePanel === "hot" && (
          <div className="mt-5 xl:hidden"><HotTopicsPanel onTopicClick={handleTopicClick} /></div>
        )}
        {mobilePanel === "rank" && (
          <div className="mt-5 xl:hidden"><UserRankPanel /></div>
        )}
      </div>

      {/* ── QQ 群二维码毛玻璃弹窗 ── */}
      {qqModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[#09090b]/60 px-0 backdrop-blur-xl md:items-center md:px-4"
          onClick={() => setQqModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 border-b-0 bg-zinc-950/95 shadow-2xl backdrop-blur-xl md:rounded-3xl md:border-b"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setQqModalOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition active:scale-95 active:bg-white/20 hover:bg-white/20 hover:text-white"
              type="button"
              aria-label="关闭"
            >
              ✕
            </button>

            {/* Content */}
            <div className="flex flex-col items-center px-8 py-10 pb-[max(env(safe-area-inset-bottom,0px),2.5rem)] md:pb-10">
              <p className="text-sm font-heading italic text-white mb-6">加入 QQ 群</p>

              {/* QR Code */}
              <div className="rounded-2xl bg-white p-4 shadow-lg">
                <Image
                  src="/qq-group-qrcode.jpg"
                  alt="Timix观察站 QQ群二维码"
                  width={300}
                  height={300}
                  className="rounded-xl w-full h-auto"
                  unoptimized
                  priority
                />
              </div>

              <p className="mt-6 text-sm text-white/60 font-body">
                扫描二维码加入QQ群
              </p>
              <p className="mt-2 text-2xl font-heading italic text-white tracking-wider">
                602190132
              </p>
              <p className="mt-1 text-xs text-white/30 font-body">
                也可在 QQ 中搜索群号加入
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 767px) {
          .community-mobile-app {
            --color-bg: var(--mobile-app-bg);
            --color-ink: var(--mobile-app-ink);
            --color-muted: var(--mobile-app-muted);
            --color-line: var(--mobile-app-line);
            --color-soft: var(--mobile-app-panel);
            --color-brand: var(--mobile-app-primary);
            --color-brand-deep: var(--mobile-app-primary);
            --color-brand-strong: var(--mobile-app-accent);
            --color-on-brand: var(--mobile-app-button-ink);
            --color-brand-soft: color-mix(in srgb, var(--mobile-app-primary) 7%, transparent);
            --color-panel: var(--mobile-app-panel);
            --color-panel-strong: var(--mobile-app-panel-strong);
            --color-panel-glow: color-mix(in srgb, var(--mobile-app-primary) 10%, transparent);
            --color-header: var(--mobile-app-panel-strong);
            --color-hover: color-mix(in srgb, var(--mobile-app-primary) 6%, transparent);
            --color-input: var(--mobile-app-panel-strong);
            --shadow-card: var(--mobile-app-shadow);
            background: var(--mobile-app-surface);
            color: var(--mobile-app-ink);
            font-size: 12px;
            line-height: 1.45;
            overflow-x: hidden;
            touch-action: pan-y;
          }

          .community-mobile-app > div {
            padding-top: 60px !important;
          }

          .community-mobile-app nav[aria-label="社区快捷入口"] {
            margin-bottom: 8px !important;
            scrollbar-width: none;
          }

          .community-mobile-app nav[aria-label="社区快捷入口"]::-webkit-scrollbar {
            display: none;
          }

          .community-mobile-app .community-composer-shell > div {
            border-radius: 18px !important;
            background: var(--mobile-app-panel) !important;
            box-shadow: var(--mobile-app-shadow) !important;
            padding: 10px !important;
          }

          .community-mobile-app .community-composer-shell h2 {
            font-size: 14px !important;
            line-height: 1.2 !important;
          }

          .community-mobile-app .community-composer-shell p,
          .community-mobile-app .community-composer-shell span {
            font-size: 11px !important;
            line-height: 1.45 !important;
          }

          .community-mobile-app .community-composer-shell a {
            display: none !important;
          }

          .community-mobile-app .community-composer-shell button,
          .community-mobile-app .community-composer-shell input,
          .community-mobile-app .community-composer-shell textarea {
            border-radius: 14px !important;
            font-size: 12px !important;
          }

          .community-mobile-app .community-composer-shell textarea {
            min-height: 84px !important;
            line-height: 1.6 !important;
          }

          .community-mobile-app .community-feed-shell section[data-selection-comments="off"] {
            transform: none !important;
            opacity: 1 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            padding-bottom: 76px !important;
          }

          .community-mobile-app .community-feed-shell section[data-selection-comments="off"] > div.border-b {
            display: none !important;
          }

          .community-mobile-app .community-feed-shell section[data-selection-comments="off"] > div.grid {
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
          }

          .community-mobile-app .community-feed-shell article {
            margin-bottom: 8px !important;
            border-color: var(--mobile-app-line) !important;
            border-radius: 16px !important;
            background: var(--mobile-app-panel) !important;
            box-shadow: var(--mobile-app-shadow) !important;
            padding: 10px !important;
          }

          .community-mobile-app .community-feed-shell article > div.relative {
            gap: 8px !important;
          }

          .community-mobile-app .community-feed-shell article img,
          .community-mobile-app .community-feed-shell article a > span.flex,
          .community-mobile-app .community-feed-shell article > div > div:first-child {
            height: 30px !important;
            width: 30px !important;
            font-size: 12px !important;
          }

          .community-mobile-app .community-feed-shell article h3,
          .community-mobile-app .community-feed-shell article a.rounded-md {
            font-size: 12px !important;
            line-height: 1.2 !important;
          }

          .community-mobile-app .community-feed-shell article span,
          .community-mobile-app .community-feed-shell article button,
          .community-mobile-app .community-feed-shell article a {
            font-size: 11px !important;
          }

          .community-mobile-app .community-feed-shell article .line-clamp-3 {
            margin-top: 6px !important;
            font-size: 12px !important;
            line-height: 1.5 !important;
            color: var(--mobile-app-muted) !important;
            -webkit-line-clamp: 2;
            max-height: 36px !important;
          }

          .community-mobile-app .community-feed-shell article .mt-5 {
            margin-top: 8px !important;
            padding-top: 8px !important;
          }

          .community-mobile-app .community-feed-shell article .min-h-\\[40px\\] {
            min-height: 30px !important;
          }

          .community-mobile-app .community-feed-shell article .rounded-full {
            border-radius: 999px !important;
          }

          .community-mobile-app .community-feed-shell article .mt-3.flex.flex-wrap,
          .community-mobile-app .community-feed-shell article .mt-4.flex.flex-wrap {
            display: none !important;
          }

          .community-mobile-app .community-feed-shell article .mt-5.grid {
            display: flex !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            gap: 8px !important;
            margin-top: 6px !important;
            overflow-x: auto !important;
            border-top: 0 !important;
            padding-top: 2px !important;
            scrollbar-width: none;
          }

          .community-mobile-app .community-feed-shell article .mt-5.grid > button:first-child,
          .community-mobile-app .community-feed-shell article .mt-5.grid > button:last-child {
            display: none !important;
          }
          .community-mobile-app .community-feed-shell article .mt-5.grid::-webkit-scrollbar {
            display: none;
          }

          .community-mobile-app .community-feed-shell > section > div.border-t {
            border: 0 !important;
            padding: 4px 0 12px !important;
          }
        }
      `}</style>
    </div>
  );
}

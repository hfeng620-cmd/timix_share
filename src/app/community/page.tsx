"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notification-bell";
import { OnlineIndicator } from "@/components/online-indicator";
import { CommunityPostPanel } from "@/components/community-post-panel";
import { DiscussionFeed } from "@/components/discussion-feed";
import { QqGroupModalButton } from "@/components/qq-group-modal-button";
import HotTopicsPanel from "@/components/hot-topics-panel";
import UserRankPanel from "@/components/user-rank-panel";
import { useForumAuth } from "@/lib/forum-auth";
import { siteLinks } from "@/lib/site-links";

const collaborationCards = [
  {
    title: "站内讨论区",
    description: "适合发短反馈、补价格变化、提试用线索，发完会直接出现在这页。",
    href: "#community-composer",
    external: false,
    accent: "bg-[var(--color-brand)] text-[var(--color-on-brand)]",
  },
  {
    title: "GitHub Discussions",
    description: "适合沉淀长期经验、模型口径和需要多人补证据的话题。",
    href: siteLinks.discussions,
    external: true,
    accent: "border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-ink)]",
  },
];

export default function CommunityPage() {
  const { isAdmin } = useForumAuth();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<"hot" | "rank" | null>(null);

  const handleTopicClick = useCallback((postId: string) => {
    const el = document.getElementById(postId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)] shadow-[0_10px_30px_var(--color-panel-glow)]">
              T
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timix观察站</p>
              <p className="text-sm text-[var(--color-muted)]">讨论区与共建入口</p>
            </div>
            <div className="hidden md:block">
              <QqGroupModalButton />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1 md:flex">
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/"
              >
                首页
              </Link>
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/stations"
              >
                中转站榜单
              </Link>
              <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]">
                论坛入口
              </span>
              {isAdmin ? (
                <Link
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                  href="/admin"
                >
                  管理面板
                </Link>
              ) : null}
            </nav>

            <OnlineIndicator />
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 lg:px-10">
        <div className="mb-5 overflow-hidden rounded-[30px] border border-[var(--color-line)] bg-[var(--surface-gradient)] shadow-[var(--shadow-card)]">
          <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                社区信号台
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                短反馈发站内，长期经验进 Discussions，实时线索回 QQ 群。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                这一页不只是一个外链入口，而是把站点反馈、价格波动、试用口径和社区共建收拢到同一处的观察台。你不需要先理解全部规则，先选对入口就够了。
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {collaborationCards.map((card) =>
                  card.external ? (
                    <a
                      key={card.title}
                      className={`rounded-[22px] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[var(--color-brand)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)] ${card.accent}`}
                      href={card.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <p className="text-base font-black">{card.title}</p>
                      <p className="mt-2 text-sm leading-6 opacity-80">{card.description}</p>
                    </a>
                  ) : (
                    <Link
                      key={card.title}
                      className={`rounded-[22px] px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)] ${card.accent}`}
                      href={card.href}
                    >
                      <p className="text-base font-black">{card.title}</p>
                      <p className="mt-2 text-sm leading-6 opacity-90">{card.description}</p>
                    </Link>
                  ),
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  三条协作路径
                </p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3">
                    <p className="text-sm font-bold text-[var(--color-ink)]">站内讨论区</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">更适合短反馈、补一条新价格、发一条临时观察。</p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3">
                    <p className="text-sm font-bold text-[var(--color-ink)]">GitHub Discussions</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">更适合长期沉淀、模型口径说明、多人持续跟进的话题。</p>
                  </div>
                  <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3">
                    <p className="text-sm font-bold text-[var(--color-ink)]">QQ 群 602190132</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">更适合第一时间报新站、活动、价格跳变和高峰异常。</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-brand-soft)] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                  移动端也别藏入口
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  你在手机上也可以直接发帖、进 Discussions 或叫出 QQ 群入口，不用先翻侧栏。
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    className="rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_12px_24px_var(--color-panel-glow)]"
                    href="#community-composer"
                  >
                    直接发帖
                  </Link>
                  <div className="md:hidden">
                    <QqGroupModalButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3 text-sm text-[var(--color-muted)]">
          <span>站点反馈、价格变化、试用线索。</span>
          <a
            className="font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
            href={siteLinks.discussions}
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub Discussions
          </a>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-3 xl:hidden">
          <Link
            className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
            href="#community-composer"
          >
            发站内反馈
          </Link>
          <a
            className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
            href={siteLinks.discussions}
            rel="noopener noreferrer"
            target="_blank"
          >
            去 Discussions
          </a>
          <div className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[var(--color-ink)]">QQ 群入口</span>
              <QqGroupModalButton />
            </div>
          </div>
        </div>

        {/* Mobile: toggle buttons for sidebar panels */}
        <div className="mb-4 flex gap-2 xl:hidden">
          <button
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition ${
              mobilePanel === "hot"
                ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                : "border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)]"
            }`}
            onClick={() => setMobilePanel(mobilePanel === "hot" ? null : "hot")}
            type="button"
          >
            热门
          </button>
          <button
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition ${
              mobilePanel === "rank"
                ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                : "border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)]"
            }`}
            onClick={() => setMobilePanel(mobilePanel === "rank" ? null : "rank")}
            type="button"
          >
            排行
          </button>
        </div>

        {/* Two-column layout: single column on mobile, sidebar appears at xl */}
        <div className="xl:flex xl:gap-6">
          {/* Left column: main content */}
          <div className="min-w-0 flex-1 space-y-5">
            <div id="community-composer" className="scroll-mt-24">
              <CommunityPostPanel onPostCreated={() => setFeedRefreshKey((value) => value + 1)} />
            </div>
            <DiscussionFeed
              key={feedRefreshKey}
              hideComposer
              title="讨论"
              limit={8}
            />
          </div>

          {/* Right sidebar: visible only on xl+ screens */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            <div className="sticky top-24 space-y-5">
              <HotTopicsPanel onTopicClick={handleTopicClick} />

              {/* QQ群入口 */}
              <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  QQ群入口
                </p>
                <p className="mt-3 text-lg font-black tracking-tight">群号 602190132</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  扫码或搜索群号加入，一起交流讨论
                </p>
              </div>

              {/* 贡献排行 */}
              <UserRankPanel />
            </div>
          </aside>
        </div>

        {/* Mobile: sidebar panels appear below main content based on toggle */}
        {mobilePanel === "hot" && (
          <div className="mt-5 space-y-5 xl:hidden">
            <HotTopicsPanel onTopicClick={handleTopicClick} />
            <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                QQ群入口
              </p>
              <p className="mt-3 text-lg font-black tracking-tight">群号 602190132</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                扫码或搜索群号加入，一起交流讨论
              </p>
              <div className="mt-4">
                <QqGroupModalButton />
              </div>
            </div>
          </div>
        )}
        {mobilePanel === "rank" && (
          <div className="mt-5 xl:hidden">
            <UserRankPanel />
          </div>
        )}
      </section>

    </main>
  );
}

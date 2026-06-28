"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Navbar } from "@/components/navbar";
import { CommunityPostPanel } from "@/components/community-post-panel";
import { DiscussionFeed } from "@/components/discussion-feed";
import HotTopicsPanel from "@/components/hot-topics-panel";
import UserRankPanel from "@/components/user-rank-panel";
import { siteLinks } from "@/lib/site-links";

const hubs = [
  { id: "01", title: "站内快反馈", summary: "补一句、报跳价、留试用。", href: "#community-composer", primary: true },
  { id: "02", title: "GitHub Discussions", summary: "专题归档、经验整理、长期追踪。", href: siteLinks.discussions, external: true },
  { id: "03", title: "QQ 群 602190132", summary: "急线索先同步，再回流站内。", qq: true },
  { id: "04", title: "AI新闻与动态", summary: "追踪前沿AI模型发布、行业重大资讯与技术前瞻。", href: "/models" },
];

export default function CommunityPage() {
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<"hot" | "rank" | null>(null);
  const [qqModalOpen, setQqModalOpen] = useState(false);

  const handleTopicClick = useCallback((postId: string) => {
    const el = document.getElementById(postId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="mx-auto max-w-[1680px] px-4 pt-28 sm:px-5 lg:px-8">
        <section className="mb-6 liquid-glass overflow-hidden rounded-[28px] p-5 sm:p-7">
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
            <div className="flex gap-3">
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
                    className="group flex flex-col justify-between rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 liquid-glass"
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
                  className={`group flex flex-col justify-between rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
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

        <div className="mb-5 flex gap-2 xl:hidden">
          {(["hot", "rank"] as const).map((key) => (
            <button
              key={key}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition font-body ${
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
          <div className="min-w-0 space-y-5">
            <div id="community-composer" className="scroll-mt-24">
              <CommunityPostPanel onPostCreated={() => setFeedRefreshKey((v) => v + 1)} />
            </div>
            <DiscussionFeed key={feedRefreshKey} hideComposer title="讨论工作台" limit={8} />
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xl px-4"
          onClick={() => setQqModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-white/8 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setQqModalOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition"
              type="button"
              aria-label="关闭"
            >
              ✕
            </button>

            {/* Content */}
            <div className="flex flex-col items-center px-8 py-10">
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
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Gift,
  MessageSquare,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { AiNewsPanel } from "@/components/ai-news-panel";
import { CoCreatorsWall } from "@/components/co-creators-wall";
import { HomeStationSnapshot } from "@/components/home-station-snapshot";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const stats = [
  { value: "15", label: "榜单站点" },
  { value: "0.055x", label: "当前最低倍率" },
  { value: "审核制", label: "普通用户编辑" },
  { value: "Live", label: "社区反馈" },
];

const signalCards = [
  {
    icon: Zap,
    label: "最低倍率",
    value: "启元AI 0.055x",
    body: "已放到榜单前排，后续补高峰稳定性。",
    href: "/stations",
    tone: "text-emerald-300",
  },
  {
    icon: MessageSquare,
    label: "社区热议",
    value: "讨论区反馈",
    body: "站点体验、避坑和价格变化集中沉淀。",
    href: "/community",
    tone: "text-blue-300",
  },
  {
    icon: Gift,
    label: "福利 Drop",
    value: "兑换码 / 活动",
    body: "限量福利、领取状态和活动审核集中管理。",
    href: "/drops",
    tone: "text-fuchsia-300",
  },
  {
    icon: BarChart3,
    label: "模型择优",
    value: "模型与站点联动",
    body: "把模型能力、价格和可用站点放在同一视图。",
    href: "/models",
    tone: "text-amber-300",
  },
];

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#09090b] font-sans text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[300px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-[115px]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_10%,rgba(52,211,153,0.14),transparent_26%),radial-gradient(circle_at_84%_4%,rgba(59,130,246,0.10),transparent_24%),linear-gradient(rgba(255,255,255,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[size:auto,auto,42px_42px,42px_42px]" />
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur sm:p-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              TiMix AI 观测站 · 社区共建
            </div>

            <h1 className="max-w-3xl bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
              把中转站筛到值得长期用
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              榜单、倍率、社区反馈、福利和审核流放在同一张桌面上。进站先看数据，不再先看空 Banner。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/stations"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold transition hover:bg-zinc-200"
                style={{ color: "#09090b" }}
              >
                直接看榜单
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.08]"
              >
                看社区讨论
              </Link>
              <a
                href="/release/TiMix-debug-latest.apk"
                download
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300/15"
              >
                下载 App
              </a>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-black/25 p-3.5">
                  <p className="text-2xl font-extrabold tracking-tight text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1115]/95 shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                  <Activity className="h-4 w-4" />
                  Relay Signal
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white">中转站榜单快照</h2>
              </div>
              <Link
                href="/stations"
                className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-300/15"
              >
                完整表格
              </Link>
            </div>

            <HomeStationSnapshot />
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {signalCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{card.label}</span>
                  <Icon className={`h-5 w-5 ${card.tone}`} />
                </div>
                <h2 className="mt-4 text-lg font-extrabold tracking-tight text-white">{card.value}</h2>
                <p className="mt-2 min-h-[40px] text-sm leading-6 text-zinc-500">{card.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-zinc-300 transition group-hover:text-white">
                  进入
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              审核流状态
            </div>
            <div className="grid gap-3 text-sm text-zinc-400">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                普通用户编辑正式站点：提交到待审核，不直接改正式榜单。
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                站主 / 管理员：可直接保存、排序、审核新增站点。
              </div>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
              >
                打开站主面板
              </Link>
            </div>
          </div>
          <CoCreatorsWall />
        </section>

        <section className="mt-8">
          <AiNewsPanel />
        </section>
      </main>
    </div>
  );
}

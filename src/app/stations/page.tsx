import Link from "next/link";

import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notification-bell";
import { OnlineIndicator } from "@/components/online-indicator";
import { StationsBoard } from "@/components/stations-board";

export default function StationsPage() {
  return (
    <main className="theme-stage min-h-screen bg-transparent text-[var(--color-ink)]">
      <section className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)] shadow-[0_10px_30px_var(--color-panel-glow)]">
              T
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timix观察站</p>
              <p className="text-sm text-[var(--color-muted)]">价格、倍率、入口，放在同一张判断桌上。</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1 lg:flex">
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/"
              >
                首页
              </Link>
              <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]">
                中转站榜单
              </span>
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/community"
              >
                论坛入口
              </Link>
            </nav>
            <OnlineIndicator />
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--color-line)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(255,255,255,0.18)_52%,rgba(255,255,255,0.08))]" />
        <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-brand-deep)]">
                Relay Benchmark Board
              </p>
              <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                先把候选站点压到 2 到 3 个，再决定长期用谁。
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                这里先给你一张快速判断桌，把价格、倍率、入口门槛和一句话口径并排放好，
                不用来回切页面就能先做第一轮筛选。
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/70 bg-white/78 px-4 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    第一步
                  </p>
                  <p className="mt-2 text-lg font-black text-[var(--color-ink)]">先看倍率</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">先把明显不合适的样本排出去。</p>
                </div>
                <div className="rounded-[22px] border border-white/70 bg-white/78 px-4 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    第二步
                  </p>
                  <p className="mt-2 text-lg font-black text-[var(--color-ink)]">再看门槛</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">对比试用、起充和可下手成本。</p>
                </div>
                <div className="rounded-[22px] border border-white/70 bg-white/78 px-4 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    第三步
                  </p>
                  <p className="mt-2 text-lg font-black text-[var(--color-ink)]">最后补反馈</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">拿着候选回社区做第二轮验证。</p>
                </div>
              </div>
            </div>

            <aside className="rounded-[30px] border border-white/70 bg-[color:color-mix(in_srgb,var(--color-panel)_84%,white)] p-6 shadow-[0_22px_64px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                  榜单先筛
                </span>
                <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">
                  社区再验
                </span>
                <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-xs font-bold text-[var(--color-muted)]">
                  模型收口
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight">
                看榜单时，先记住这三件事。
              </h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-[20px] border border-[var(--color-line)] bg-white/76 px-4 py-4">
                  <p className="text-sm font-black text-[var(--color-ink)]">倍率低，不等于长期稳。</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    先拿它做第一轮缩候选，不直接当最终答案。
                  </p>
                </div>
                <div className="rounded-[20px] border border-[var(--color-line)] bg-white/76 px-4 py-4">
                  <p className="text-sm font-black text-[var(--color-ink)]">试用和起充决定你愿不愿意先试。</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    门槛太高的站点，通常不适合当第一批验证样本。
                  </p>
                </div>
                <div className="rounded-[20px] border border-[var(--color-line)] bg-white/76 px-4 py-4">
                  <p className="text-sm font-black text-[var(--color-ink)]">最终判断要回社区补风险。</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    价格和倍率是起点，真实反馈才是最后收口。
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-black text-[var(--color-on-brand)] shadow-[0_12px_28px_var(--color-panel-glow)] transition hover:scale-105 hover:bg-[var(--color-brand-deep)]"
                  href="/community"
                >
                  去社区补反馈
                </Link>
                <Link
                  className="rounded-full border border-[var(--color-line)] bg-white/84 px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                  href="/models"
                >
                  继续看模型页
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <StationsBoard />
    </main>
  );
}

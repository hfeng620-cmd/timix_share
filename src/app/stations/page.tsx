import Link from "next/link";

import { stationComparisonRows } from "@/lib/site-data";

const filters = [
  "全部站点",
  "认证样例",
  "低倍率",
  "高在线率",
  "Claude 强",
  "GPT 强",
  "Gemini 强",
];

const sorts = ["精选", "价格最低", "倍率最低", "在线率最高", "延迟最低", "口碑优先"];

export default function StationsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="border-b border-[var(--color-line)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-white shadow-[0_10px_30px_rgba(18,201,105,0.28)]">
              Z
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">中转站观察站</p>
              <p className="text-sm text-[var(--color-muted)]">
                中转站价格、倍率、可用性与测评入口
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-white p-1 md:flex">
            <Link
              className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              href="/"
            >
              首页
            </Link>
            <span className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-white">
              中转站榜单
            </span>
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="rounded-[36px] border border-[var(--color-line)] bg-white p-7 shadow-[0_18px_60px_rgba(13,25,48,0.08)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-sm font-bold text-[var(--color-brand-deep)]">
                单一核心入口
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                先按数据筛，再按评论确认
              </h1>
              <p className="mt-4 text-lg leading-8 text-[var(--color-muted)]">
                这里集中看价格、倍率、延迟、在线率、模型支持和社区结论。首页的讨论是线索，这里才是做选择的地方。
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] bg-[var(--color-soft)] px-5 py-4">
                <p className="text-sm text-[var(--color-muted)]">本周最低倍率</p>
                <p className="mt-2 text-3xl font-black">0.92x</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Claude / GPT 混合样例</p>
              </div>
              <div className="rounded-[26px] bg-[var(--color-soft)] px-5 py-4">
                <p className="text-sm text-[var(--color-muted)]">社区重点关注</p>
                <p className="mt-2 text-3xl font-black">高峰稳定性</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">晚高峰掉线最容易踩坑</p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[32px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-muted)]">
                  API 地址或站点关键词
                </span>
                <input
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                  defaultValue="anthropic / claude / packy"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-muted)]">
                  目标模型
                </span>
                <div className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 font-medium">
                  Claude Sonnet 4.5
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-muted)]">
                  侧重点
                </span>
                <div className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 font-medium">
                  稳定 + 低倍率
                </div>
              </label>
              <button className="self-end rounded-full bg-[var(--color-brand)] px-7 py-3.5 text-base font-bold text-white shadow-[0_14px_36px_rgba(18,201,105,0.32)] transition hover:bg-[var(--color-brand-deep)]">
                开始筛选
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {filters.map((filter, index) => (
                <span
                  key={filter}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-[var(--color-brand)] text-white"
                      : "bg-white text-[var(--color-muted)] ring-1 ring-[var(--color-line)]"
                  }`}
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-10">
        <div className="rounded-[36px] border border-[var(--color-line)] bg-white p-7 shadow-[0_18px_60px_rgba(13,25,48,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                中转站比较
              </p>
              <h2 className="mt-2 text-3xl font-black">价格、倍率、在线率一眼横向对齐</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {sorts.map((sort, index) => (
                <span
                  key={sort}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-[var(--color-ink)] text-white"
                      : "bg-[var(--color-soft)] text-[var(--color-muted)]"
                  }`}
                >
                  {sort}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7 overflow-hidden rounded-[28px] border border-[var(--color-line)]">
            <div className="grid grid-cols-[1.25fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr] bg-[var(--color-soft)] px-5 py-4 text-sm font-bold text-[var(--color-muted)]">
              <span>站点</span>
              <span>模型覆盖</span>
              <span>价格</span>
              <span>倍率</span>
              <span>在线率</span>
              <span>延迟</span>
              <span>社区结论</span>
            </div>

            {stationComparisonRows.map((row, index) => (
              <article
                key={row.name}
                className={`grid grid-cols-[1.25fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.9fr] items-center px-5 py-5 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#fbfdfb]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                      {row.badge}
                    </span>
                    <h3 className="font-bold">{row.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{row.group}</p>
                </div>
                <div className="text-sm leading-6 text-[var(--color-muted)]">
                  {row.models}
                </div>
                <div className="font-bold">{row.price}</div>
                <div className="font-bold">{row.multiplier}</div>
                <div className="font-bold">{row.uptime}</div>
                <div className="font-bold">{row.latency}</div>
                <div>
                  <p className="font-bold">{row.verdict}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{row.note}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {stationComparisonRows.slice(0, 3).map((row) => (
              <article
                key={`${row.name}-detail`}
                className="rounded-[30px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black">{row.name}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                    {row.badge}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-[var(--color-brand-deep)]">
                  优点
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  {row.advantage}
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--color-brand-deep)]">
                  风险点
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  {row.risk}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

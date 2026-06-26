import Link from "next/link";

import { NotificationBell } from "@/components/notification-bell";
import {
  collaborationChannels,
  faqEntries,
  guideCards,
  guideSteps,
  resourceLinks,
} from "@/lib/site-data";

const quickGuideRoutes = [
  {
    title: "第一次来",
    description: "先看倍率、备注和试用入口，不要直接被最低价带走。",
    href: "#guide-flow",
  },
  {
    title: "我想先试用",
    description: "优先去看低门槛入口，再决定要不要长期用。",
    href: "#guide-resources",
  },
  {
    title: "我想参与共建",
    description: "分清 QQ 群、Discussions 和 Issues 各自该发什么。",
    href: "#guide-collaboration",
  },
  {
    title: "我只想快速找答案",
    description: "直接跳到 FAQ，把常见误区一次看完。",
    href: "#guide-faq",
  },
];

export default function GuidesPage() {
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
              <p className="text-sm text-[var(--color-muted)]">常见问题与更多指南</p>
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
                更多指南
              </span>
            </nav>
            <NotificationBell />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-6 overflow-hidden rounded-[34px] border border-[var(--color-line)] bg-[var(--surface-gradient)] shadow-[var(--shadow-card)]">
          <div className="grid gap-5 px-6 py-7 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                入门导航
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                别从最杂的地方开始，先按你现在想解决的事进入。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                这一页不只是 FAQ。它更像 Timix观察站 的使用地图，帮你判断先看榜单、先试用、先看社区反馈，还是先补一条纠错更划算。
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_12px_24px_var(--color-panel-glow)]"
                  href="/stations"
                >
                  先去看榜单
                </Link>
                <Link
                  className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                  href="/community"
                >
                  去看社区反馈
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {quickGuideRoutes.map((item) => (
                <a
                  key={item.title}
                  className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[var(--color-brand)] hover:shadow-[0_14px_32px_rgba(15,23,42,0.10)]"
                  href={item.href}
                >
                  <p className="text-base font-black text-[var(--color-ink)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.description}</p>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div id="guide-flow" className="scroll-mt-24 rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                先看这几个
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                先把第一次最容易问错的事讲清楚
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                首页先负责给你看榜单，这里负责把倍率怎么看、同站不同模型怎么拆、免费入口怎么判断，以及 QQ 群和 GitHub 共建入口分别拿来做什么说清楚。
              </p>
            </div>

            <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                先按这个顺序看
              </p>
              <div className="mt-5 grid gap-4">
                {guideSteps.map((step) => (
                  <article
                    key={step.index}
                    className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                      {step.index}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{step.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                新手指南
              </p>
              <div className="mt-5 grid gap-4">
                {guideCards.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                  >
                    <h2 className="text-xl font-bold">{card.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {card.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div id="guide-resources" className="scroll-mt-24 rounded-[32px] border border-[var(--color-line)] bg-[var(--color-soft)] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                试用入口
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                这几条入口更适合先试水，再结合群友反馈判断要不要长期用。
              </p>
              <div className="mt-4 grid gap-3">
                {resourceLinks.map((item) => (
                  item.href.startsWith("http") ? (
                    <a
                      key={item.title}
                      className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4 transition hover:border-[var(--color-brand)]"
                      href={item.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <p className="font-bold text-[var(--color-brand-deep)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {item.note}
                      </p>
                    </a>
                  ) : (
                    <Link
                      key={item.title}
                      className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4 transition hover:border-[var(--color-brand)]"
                      href={item.href}
                    >
                      <p className="font-bold text-[var(--color-brand-deep)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {item.note}
                      </p>
                    </Link>
                  )
                ))}
              </div>
            </div>

            <div id="guide-collaboration" className="scroll-mt-24 rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                共建入口
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                这站不是只读榜单。QQ 群负责第一时间发线索，Discussions 负责沉淀经验讨论，Issues 负责提交明确纠错，管理员审核后再把正式口径收进榜单。
              </p>
              <div className="mt-4 grid gap-3">
                {collaborationChannels.map((item) => (
                  <a
                    key={item.title}
                    className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 transition hover:border-[var(--color-brand)]"
                    href={item.href}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                  >
                    <p className="font-bold text-[var(--color-brand-deep)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {item.note}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div id="guide-faq" className="scroll-mt-24 rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              常见问题
            </p>
            <div className="mt-5 space-y-4">
              {faqEntries.map((item) => (
                <article
                  key={item.question}
                  className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                >
                  <h2 className="text-lg font-bold">{item.question}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

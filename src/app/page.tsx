import GuidesPage from "@/app/guides/page";

export default function Home() {
<<<<<<< HEAD
  return (
    <div className="bg-black text-white">
      <Navbar />

      <section className="relative overflow-visible" style={{ height: "1000px" }}>
        <VideoBackground mp4Src={HERO_VIDEO} poster="/bg-1-hd.jpg" topOffset="20%" className="z-0" />
        <div className="pointer-events-none absolute inset-0 z-0 bg-black/5" />
        <div
          className="pointer-events-none absolute bottom-0 z-0 h-[300px] w-full"
          style={{ background: "linear-gradient(to bottom, transparent, black)" }}
        />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:px-10" style={{ paddingTop: "150px" }}>
          <BlurIn delay={0.3}>
            <div className="liquid-glass inline-flex items-center gap-2 rounded-full px-1 py-1">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black font-body">新上线</span>
              <span className="pr-3 text-xs font-medium text-white font-body">社区共建的 AI 中转站观察平台</span>
            </div>
          </BlurIn>

          <BlurText
            text={`把中转站从"能用"，筛到"值得长期用"。`}
            className="mt-8 max-w-2xl"
            tagClassName="text-5xl font-heading italic leading-[1.08] text-white md:text-6xl lg:text-[5.5rem]"
            delay={100}
          />

          <BlurIn delay={0.8} className="mt-6 max-w-xl">
            <p className="text-sm font-light leading-relaxed text-white/70 md:text-base font-body">
              价格、倍率、试用、反馈放在同一张判断面上，帮你更快决定先试谁、避开什么。
            </p>
          </BlurIn>

          <BlurIn delay={1.1}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/stations"
                className="liquid-glass-strong group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:scale-105 font-body"
              >
                直接看榜单
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:text-white/80 font-body"
              >
                <Play className="h-4 w-4 fill-current" />
                看社区讨论
              </Link>
            </div>
          </BlurIn>

          <div className="mt-auto pb-8 pt-16">
            <div className="liquid-glass mb-6 inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
              覆盖主流 AI 模型
            </div>
            <div className="flex flex-wrap items-center gap-12 md:gap-16">
              {partners.map((name) => (
                <span key={name} className="text-2xl font-heading italic text-white/60 md:text-3xl">{name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="bg-black">
        <section className="relative overflow-hidden" style={{ minHeight: "500px" }}>
          <VideoBackground
            hlsSrc="https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="video-fade-top" />
          <div className="video-fade-bottom" />

          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 py-32 text-center">
            <div className="liquid-glass inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
              如何使用
            </div>
            <h2 className="mt-6 text-4xl font-heading italic leading-[1.12] text-white md:text-5xl lg:text-6xl">
              你负责判断，我们负责信息。
            </h2>
            <p className="mt-6 max-w-xl text-sm font-light leading-relaxed text-white/60 md:text-base font-body">
              打开榜单、看价格倍率、翻社区反馈、定主力站。整个判断链路已经压成三屏。
            </p>
            <Link
              href="/stations"
              className="liquid-glass-strong mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition hover:scale-105 font-body"
            >
              开始探索
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10">
          <div className="mb-16">
            <div className="liquid-glass mb-4 inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
              核心能力
            </div>
            <h2 className="text-4xl font-heading italic leading-[1.12] text-white md:text-5xl lg:text-6xl">
              专业功能。零复杂度。
            </h2>
          </div>

          <div className="mb-20 flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
            <div className="flex-1">
              <h3 className="text-3xl font-heading italic leading-[1.25] text-white md:text-4xl">
                为对比而设计。为判断而建。
              </h3>
              <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-white/60 md:text-base font-body">
                每个字段都经过筛选：倍率、价格、试用门槛、模型覆盖——只留对决策有用的信息，不堆砌噪音。
              </p>
              <Link
                href="/stations"
                className="liquid-glass-strong mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white font-body"
              >
                看完整榜单
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="liquid-glass flex-1 overflow-hidden rounded-2xl">
              <div className="flex h-80 items-center justify-center bg-white/5 text-white/30 text-sm font-body">
                榜单交互预览
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-10 lg:flex-row-reverse lg:gap-16">
            <div className="flex-1">
              <h3 className="text-3xl font-heading italic leading-[1.25] text-white md:text-4xl">
                信息持续更新。自动同步。
              </h3>
              <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-white/60 md:text-base font-body">
                社区反馈、站点状态、倍率变化——持续收录，管理员审核。你看到的是活的榜单，不是一次性文章。
              </p>
              <Link
                href="/community"
                className="liquid-glass-strong mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white font-body"
              >
                进入讨论区
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="liquid-glass flex-1 overflow-hidden rounded-2xl">
              <div className="flex h-80 items-center justify-center bg-white/5 text-white/30 text-sm font-body">
                社区讨论预览
              </div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10">
          <div className="mb-16">
            <div className="liquid-glass mb-4 inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
              为什么选我们
            </div>
            <h2 className="text-4xl font-heading italic leading-[1.12] text-white md:text-5xl lg:text-6xl">
              差异就是一切。
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="liquid-glass rounded-2xl p-6 transition hover:scale-[1.02]">
                  <div className="liquid-glass-strong flex h-10 w-10 items-center justify-center rounded-full">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-5 text-lg font-heading italic text-white">{card.title}</h3>
                  <p className="mt-3 text-sm font-light leading-relaxed text-white/60 font-body">{card.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative overflow-hidden" style={{ minHeight: "500px" }}>
          <VideoBackground
            hlsSrc="https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8"
            desaturated
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="video-fade-top" />
          <div className="video-fade-bottom" />

          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 py-32">
            <div className="liquid-glass w-full rounded-3xl p-12 md:p-16">
              <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                {[
                  { value: "20+", label: "收录站点" },
                  { value: "98%", label: "信息准确率" },
                  { value: "5 分钟", label: "平均判断时间" },
                  { value: "持续更新", label: "社区驱动" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-4xl font-heading italic text-white md:text-5xl lg:text-6xl">{stat.value}</p>
                    <p className="mt-2 text-sm font-light text-white/60 font-body">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10">
          <div className="mb-16">
            <div className="liquid-glass mb-4 inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
              用户怎么说
            </div>
            <h2 className="text-4xl font-heading italic leading-[1.12] text-white md:text-5xl lg:text-6xl">
              别只听我们说。
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="liquid-glass rounded-2xl p-8">
                <p className="text-sm font-light italic leading-relaxed text-white/80 font-body">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="mt-5 text-sm font-medium text-white font-body">{t.name}</p>
                <p className="mt-1 text-xs font-light text-white/50 font-body">{t.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden" style={{ minHeight: "600px" }}>
          <VideoBackground
            hlsSrc="https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="video-fade-top" />
          <div className="video-fade-bottom" />

          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 py-40 text-center">
            <h2 className="text-5xl font-heading italic leading-[1.1] text-white md:text-6xl lg:text-7xl">
              你的下一站判断，从这里开始。
            </h2>
            <p className="mt-8 max-w-xl text-sm font-light leading-relaxed text-white/70 md:text-base font-body">
              打开榜单，看价格、翻反馈、定主力。没有广告，没有软文，只有社区共建的真实信息。
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/stations"
                className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition hover:scale-105 font-body"
              >
                打开榜单
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-100 font-body"
              >
                进入社区
              </Link>
            </div>

            <div className="mt-32 w-full border-t border-white/10 pt-8">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-xs text-white/40 font-body">&copy; 2026 Timix观察站。社区共建。</p>
                <div className="flex items-center gap-6">
                  <Link href="/stations" className="text-xs text-white/40 transition hover:text-white/60 font-body">榜单</Link>
                  <Link href="/community" className="text-xs text-white/40 transition hover:text-white/60 font-body">社区</Link>
                  <Link href="/models" className="text-xs text-white/40 transition hover:text-white/60 font-body">模型</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <CoCreatorsWall />
        </section>
        <section className="relative mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <AiNewsPanel />
        </section>
      </div>
    </div>
  );
}
=======
  return <GuidesPage />;
}
>>>>>>> apk-build/debug-20260705-2005

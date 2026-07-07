import { Navbar } from "@/components/navbar";
import { DonateButton } from "@/components/donate-button";
import { MobileThemeToggle } from "@/components/mobile-theme-toggle";
import { StationMonitorPanel } from "@/components/station-monitor-panel";
import { StationsBoard } from "@/components/stations-board";

export default function StationsPage() {
  return (
    <div className="mobile-tab-scroll stations-mobile-app flex-1 min-h-0 h-full overflow-y-auto overscroll-y-contain pb-24 bg-[var(--mobile-app-bg,#09090b)] text-white lg:bg-transparent lg:text-white">
      <div className="hidden md:block"><Navbar /></div>
      <section className="relative z-10 mx-auto max-w-[1680px] px-2.5 pt-2 sm:px-5 md:pt-28">
        <div className="mb-2 rounded-b-[18px] border border-white/10 bg-white/[0.04] px-3 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--mobile-app-muted)] font-body">TiMix</p>
              <h1 className="mt-0.5 truncate text-base font-black tracking-tight text-[var(--mobile-app-ink)]">榜单</h1>
              <p className="mt-0.5 max-w-[10rem] text-[11px] leading-4 text-[var(--mobile-app-muted)] font-body">倍率、门槛、状态先扫完。</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <MobileThemeToggle />
              <DonateButton />
            </div>
          </div>
        </div>

        <div className="mb-6 hidden flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:flex">
          <div>
            <div className="liquid-glass mb-3 inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
              中转站榜单
            </div>
            <h1 className="text-3xl font-heading italic leading-[1.15] text-white md:text-4xl">
              先在榜单缩候选，再回社区补变化。
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base font-body">
              把倍率、门槛和入口放在一张桌面上，第一轮判断在这里完成，后面验证交给社区。
            </p>
          </div>
          <DonateButton />
        </div>

        <div className="mb-6 hidden gap-2 sm:grid-cols-3 lg:grid">
          {[
            { step: "先看", desc: "倍率 / 门槛" },
            { step: "再做", desc: "缩到 2-3 个" },
            { step: "最后", desc: "论坛补风险" },
          ].map((item) => (
            <div key={item.step} className="liquid-glass rounded-2xl px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 font-body">{item.step}</p>
              <p className="mt-1 text-sm font-semibold text-white">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 lg:gap-6">
          <div className="order-2 lg:order-1">
            <StationMonitorPanel />
          </div>

          <div className="order-1 overflow-visible rounded-[18px] border border-white/10 bg-white/[0.04] p-0 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur lg:order-2 lg:overflow-hidden lg:rounded-3xl lg:border-white/10 lg:bg-[#09090b]/30 lg:p-6 lg:shadow-2xl">
            <StationsBoard />
          </div>
        </div>
      </section>
    </div>
  );
}


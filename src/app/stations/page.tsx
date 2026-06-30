import { Navbar } from "@/components/navbar";
import { StationMonitorPanel } from "@/components/station-monitor-panel";
import { StationsBoard } from "@/components/stations-board";

export default function StationsPage() {
  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <section className="relative z-10 mx-auto max-w-[1680px] px-4 pt-28 sm:px-5 lg:px-8">
        <div className="mb-6">
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

        <div className="grid gap-2 mb-6 sm:grid-cols-3">
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

        <div className="mb-6">
          <StationMonitorPanel />
        </div>

        <div className="rounded-3xl bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl p-4 sm:p-6">
          <StationsBoard />
        </div>
      </section>
    </div>
  );
}

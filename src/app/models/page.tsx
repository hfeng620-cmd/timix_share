import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { modelGuideNotes, modelPreviewRows, modelRankings } from "@/lib/site-data";

const modelDecisionRoutes = [
  { title: "我要主力写作 / 代码", description: "先看通用模型，再回榜单页比真实长期成本。" },
  { title: "我要长文阅读 / 总结", description: "优先看长上下文和稳定输出，再判断是否值得长期充值。" },
  { title: "我想低成本先试一圈", description: "先挑低门槛入口和可试用站，再决定主力站。" },
];

export default function ModelsPage() {
  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pt-28 lg:px-10">
        <section className="mb-10">
          <div className="liquid-glass mb-3 inline-block rounded-full px-3.5 py-1 text-xs font-medium text-white font-body">
            模型择优
          </div>
          <h1 className="text-3xl font-heading italic leading-[1.15] text-white md:text-5xl">
            先把方向定下来，再回榜单选站。
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55 md:text-base font-body">
            不同任务适合不同模型。先确定你长期依赖的模型方向，再去榜单看哪个站的这个方向更稳。
          </p>
        </section>

        <div className="grid gap-3 mb-10 sm:grid-cols-3">
          {modelDecisionRoutes.map((route) => (
            <Link
              key={route.title}
              href="/stations"
              className="liquid-glass group rounded-2xl p-5 transition hover:-translate-y-0.5"
            >
              <h3 className="text-base font-heading italic text-white">{route.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55 font-body">{route.description}</p>
            </Link>
          ))}
        </div>

        <section className="liquid-glass mb-10 overflow-hidden rounded-[24px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-[0.18em] text-white/45 font-body">
                  <th className="px-5 py-4">排名</th>
                  <th className="px-5 py-4">模型</th>
                  <th className="px-5 py-4">提供商</th>
                  <th className="px-5 py-4">智能指数</th>
                  <th className="px-5 py-4">中位价格</th>
                </tr>
              </thead>
              <tbody>
                {modelRankings.slice(0, 8).map((model) => (
                  <tr key={model.rank} className="border-b border-white/5 last:border-0 transition hover:bg-white/[0.03]">
                    <td className="px-5 py-4 text-white/45 font-body">{model.rank}</td>
                    <td className="px-5 py-4 font-heading italic text-white">{model.name}</td>
                    <td className="px-5 py-4 text-white/55 font-body">{model.provider}</td>
                    <td className="px-5 py-4 text-white/55 font-body">{model.intelligenceIndex}</td>
                    <td className="px-5 py-4 text-white/45 font-body">{model.medianPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {modelPreviewRows.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-heading italic text-white mb-5">快速预览</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modelPreviewRows.slice(0, 6).map((row) => (
                <div key={row.rank} className="liquid-glass rounded-2xl p-5">
                  <h3 className="font-heading italic text-white">{row.family} — {row.scene}</h3>
                  <p className="mt-2 text-sm text-white/50 font-body">{row.focus}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {modelGuideNotes.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-heading italic text-white mb-5">模型指南</h2>
            <div className="space-y-4">
              {modelGuideNotes.slice(0, 5).map((note, idx) => (
                <div key={idx} className="liquid-glass rounded-2xl p-5">
                  <h3 className="font-heading italic text-white">{note.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55 font-body">{note.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

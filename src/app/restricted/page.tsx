import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "访问受限 | Timix观察站",
  robots: { index: false, follow: false },
};

export default function RestrictedPage() {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#09090b] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <section className="w-full max-w-3xl text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-emerald-300" aria-hidden="true" />
        <p className="mt-6 text-xs font-bold uppercase text-emerald-300">
          Timix Access Policy
        </p>
        <h1 className="mt-4 text-4xl font-extrabold text-white sm:text-5xl">
          访问受限
        </h1>
        <div className="mt-8 space-y-3 text-lg font-semibold leading-8 text-zinc-300 sm:text-xl">
          <p>本站坚决维护国家法律</p>
          <p>拒绝践踏法律红线</p>
          <p>抵制数据跨境</p>
        </div>
        <p className="mt-8 text-base leading-7 text-zinc-500">
          如有需求请前往项目 Share 板块
        </p>
        <Link
          href="/guides"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#09090b] transition hover:bg-zinc-200"
          style={{ color: "#09090b" }}
        >
          前往热门有趣项目 Share
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}

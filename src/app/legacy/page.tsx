import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { siteLinks } from "@/lib/site-links";

export default function LegacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen px-6 py-12 text-white lg:px-10">
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60 font-body">Legacy / 经典版</p>

          <h1 className="mt-5 max-w-2xl text-5xl font-heading italic leading-[1.1]">Legacy 经典版</h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/55 font-body">
            经典 Timix 观察站原始界面。老版 UI 是一个独立部署的单页应用，与本项目共享数据源但使用不同的前端技术栈。
          </p>

          <div className="liquid-glass mt-10 w-full max-w-xl rounded-2xl p-8 text-left">
            <h2 className="text-lg font-heading italic text-white">部署状态</h2>
            <p className="mt-3 text-sm leading-7 text-white/55 font-body">
              老版 UI 需要单独部署。请联系管理员配置 Nginx 反向代理将{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium text-white/70">/legacy</code>{" "}
              指向旧版应用。
            </p>

            <div className="mt-5 rounded-xl bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 font-body">Nginx 反向代理参考配置</p>
              <pre className="mt-3 overflow-x-auto text-xs leading-6 text-white/50 font-body">
{`location /legacy {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}`}
              </pre>
            </div>

            <div className="mt-4 rounded-xl bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 font-body">旧版源代码目录</p>
              <p className="mt-2 break-all text-sm text-white/55 font-body">
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">
                  C:\Users\Tian\Documents\Codex\2026-06-22\wo\work\api-test-and-forum
                </code>
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              className="rounded-full bg-white/15 px-5 py-3 text-sm font-bold text-white hover:bg-white/25 transition font-body"
              href="/"
            >
              返回新版首页
            </Link>
            <Link
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white hover:border-white/25 hover:text-white transition font-body"
              href="/stations"
            >
              打开榜单
            </Link>
            <a
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white hover:border-white/25 hover:text-white transition font-body"
              href={siteLinks.discussions}
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub Discussions
            </a>
          </div>

          <div className="mt-10 border-t border-white/10 pt-5 text-sm leading-7 text-white/40 font-body">
            <p>当前线上地址：{siteLinks.pages}</p>
            <p>GitHub 仓库：{siteLinks.repo}</p>
          </div>
        </section>
      </main>
    </>
  );
}

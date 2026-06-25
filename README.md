# Timix观察站

社区共建的 AI 中转站观察平台。用公开、可修正、可持续补充的方式，整理中转站的价格、倍率、模型覆盖、试用入口和真实体验。

在线地址：https://hfeng620-cmd.github.io/timin_api_test_and_forum/

---

## 这个项目做什么

**一句话**：一个 AI 中转站的"大众点评"——社区成员共同录入、维护、讨论各个中转站的价格、倍率、模型覆盖和真实使用反馈。

很多中转站信息散落在群聊、私聊和零碎截图里：
- 有的只写倍率，不写模型口径
- 有的有试用额度，但入口不固定
- 有的同一站不同套餐差异很大，被写成一个误导数字
- 有的"稳定"或"便宜"只是口头经验，没有统一整理

Timix 把这些分散信息收进一个可检索、可纠错、可持续更新的平台。

---

## 页面结构（6 个核心页面）

| 路径 | 功能 | 谁用 |
|------|------|------|
| `/` | 首页：中转站总览、速报、社区入口 | 所有人 |
| `/stations` | 榜单页：14 站价格/倍率/模型/备注、筛选搜索、提交补充 | 所有人 |
| `/community` | 论坛：发帖、回复、点赞、@提及、标签、讨论 | 注册用户 |
| `/models` | 模型页：GPT/Claude/Grok 等模型场景说明 | 所有人 |
| `/guides` | 指南页：新手路线、FAQ、共建入口 | 所有人 |
| `/admin` | 管理面板：审核帖子/新闻、管理站点、管理用户 | 管理员 |
| `/profile` | 个人主页：改昵称、换头像、查看发帖 | 注册用户 |

---

## 角色体系

| 角色 | 权限 |
|------|------|
| 游客 | 看榜单、看讨论、看指南 |
| 注册用户 | 发帖、回复、点赞、改昵称、换头像 |
| 管理员 | 审核帖子/新闻、管理站点数据、管理用户 |
| 站主 | 全部权限 + 任命/移除管理员 |

---

## 技术架构

```
用户浏览器 ──→ GitHub Pages（静态页面）
                    │
                    └──→ Supabase（数据库 + 认证 + 存储）
                             │
                             ├── forum_profiles   用户资料
                             ├── forum_posts      讨论帖
                             ├── forum_replies    回复
                             ├── forum_likes      点赞
                             ├── forum_admins     管理员
                             ├── site_owners      站主
                             ├── stations         站点数据
                             ├── station_reviews  站点评测
                             ├── ai_news          AI 新闻
                             └── user_presence    在线状态
```

- **前端**：Next.js 16 + React 19 + Tailwind CSS + TypeScript
- **后端**：Supabase（PostgreSQL + Auth + Storage + RLS）
- **部署**：GitHub Pages（静态导出） + VPS（standalone 模式，Docker/PM2 就绪）

---

## 社区论坛功能

- 邮箱注册/登录 + 密码设置 + 昵称（默认"噜噜"）
- 发帖（直接发，无需审核）+ 回复 + 编辑/删除
- 点赞（帖子和回复，红心）+ 收藏 + 置顶
- @提及解析 + 输入时自动补全
- 图片上传（Markdown 嵌入）
- 热门话题榜 + 用户贡献排行
- 搜索 + 标签筛选 + 分类 + 排序
- 防灌水（60 秒限流 + spam 关键词）
- 通知铃铛（Portal 渲染，Esc 关闭）
- 在线人数指示器

---

## 如何参与开发

### 环境准备

```bash
git clone https://github.com/hfeng620-cmd/timin_api_test_and_forum.git
cd timin_api_test_and_forum
npm install
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 Supabase 项目 URL 和 anon key。

### 本地运行

```bash
npm run dev -- -p 3001
```

打开 `http://127.0.0.1:3001`

### Supabase 初始化

1. 在 Supabase 仪表盘开启 Email 认证
2. SQL Editor 中运行 `supabase/forum-schema.sql`（创建表 + RLS）
3. 运行 `supabase/owner-schema.sql`（站主系统）
4. 运行 `supabase/presence-schema.sql`（在线状态）
5. 运行 `supabase/storage-setup.sql`（图片上传）

### 设为站主

```sql
insert into public.site_owners (user_id)
select id from auth.users where lower(email) = lower('你的邮箱@qq.com')
on conflict (user_id) do nothing;
```

### 协作流程

1. 从 `main` 拉分支
2. 改代码 / 加功能 / 修 bug
3. `npm run lint && npm run build` 确保通过
4. 提交 PR 到 `main`

---

## 站点数据贡献

不会写代码也能参与——在讨论区提交站点线索、价格变化、试用入口，管理员审核后录入榜单。

站点数据同时保存在 `src/lib/site-data.ts`（静态 fallback）和 Supabase `stations` 表（动态数据源）。

---

## 部署

- **GitHub Pages**：推 `main` 自动触发 GitHub Actions 部署
- **VPS**：`DEPLOY_TARGET=server npm run build` → PM2 启动
- **Docker**：`docker compose up -d`

详见 `DEPLOY.md`

---

## 现有功能清单

**UI/UX**：5 套主题 + 左下角配色按钮 + 鼠标光晕/粒子 + 卡片抬升 + 移动端适配

**站点**：14 站收录 + 搜索/筛选/排序 + 数据新鲜度 + 详情弹窗 + 评测评论 + 提交/审核

**社区**：注册/登录 + 发帖/回复/点赞/收藏/置顶 + @提及 + 搜索/标签/分类 + 热榜/排行

**管理**：三级角色 + 帖子审核 + 站点管理 + 新闻审核 + 用户管理 + 审计日志

**设施**：ErrorBoundary + SEO + Toast + 在线人数 + 头像上传

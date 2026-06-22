# 中转站观察站

一个面向多人协作维护的轻量原型站：

- 首页放讨论、经验分享和避坑内容
- `中转站榜单` 作为唯一核心入口
- 榜单页重点看 `价格`、`倍率`、`在线率`、`延迟`、`模型覆盖` 和 `社区结论`
- 后续适合接入 `GitHub Discussions`、`giscus`、`GitHub Actions`

## 现在有什么

- `src/app/page.tsx`
  首页原型，整体视觉参考了你喜欢的禾维系浅色绿风格，但没有照搬它的布局
- `src/app/stations/page.tsx`
  中转站统一入口页，负责筛选和比较
- `src/lib/site-data.ts`
  当前示例数据，后面可以逐步替换成真实数据或结构化文件

## 适合你的路线

第一阶段建议直接走：

- 前端：`Next.js`
- 协作：`GitHub Issues + Pull Requests + Discussions`
- 评论：`giscus`
- 自动检测：`GitHub Actions`
- 数据：先用仓库内 `JSON/YAML/TS` 结构化维护

这样适合你们 200 人群先协作起来，不需要先上复杂后端。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`

## 建议的后续目录规划

后面建议逐步加这些目录：

```text
.github/
  ISSUE_TEMPLATE/
  pull_request_template.md
  CODEOWNERS
data/
  stations/
  reports/
docs/
  contribution-guide.md
  review-policy.md
```

## 协作规则

建议你们群里统一走这条路径：

1. 新线索先进 `Discussions` 或 `Issue`
2. 需要收录时开 `Issue`
3. 真正改站内容只认 `PR`

一句话版本：

`讨论先进 Discussions，确定要做再进 Issues，最终入站只认 PR。`

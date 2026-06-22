export const tickerItems = [
  { label: "OpenAI 官方状态稳定", color: "#f59e0b" },
  { label: "Claude 高峰排队略上升", color: "#ef4444" },
  { label: "Gemini 价格更新待核验", color: "#12c969" },
  { label: "今日样例检测 9 站点已刷新", color: "#2563eb" },
];

export const guideSteps = [
  {
    index: "01",
    title: "先筛倍率",
    description: "先排掉高倍率和隐形加价，避免一上来就选贵了。",
  },
  {
    index: "02",
    title: "再看稳定性",
    description: "重点关注高峰在线率、错误率和晚间掉线反馈。",
  },
  {
    index: "03",
    title: "最后看口碑",
    description: "评论不决定一切，但能补上纯数据看不到的坑。",
  },
];

export const highlightMetrics = [
  { label: "已收录样例站点", value: "18", note: "价格、倍率、在线率统一口径展示" },
  { label: "本周新增讨论", value: "46", note: "主要集中在 Claude 线路与低倍率站" },
  { label: "最近刷新检测", value: "2h", note: "后续可接 GitHub Actions 自动更新" },
  { label: "社区参与维护", value: "200+", note: "适合直接转成 GitHub 协作流程" },
];

export const stationSnapshots = [
  {
    name: "PackyCode",
    group: "codex / Claude 样例",
    tag: "低倍率",
    price: "￥2.5",
    multiplier: "0.98x",
    uptime: "96%",
    latency: "9.1s",
  },
  {
    name: "GreenRoute",
    group: "GPT / Gemini 样例",
    tag: "模型全",
    price: "￥3.2",
    multiplier: "1.04x",
    uptime: "98%",
    latency: "6.4s",
  },
  {
    name: "CloudDock",
    group: "Claude 高峰样例",
    tag: "稳定",
    price: "￥3.8",
    multiplier: "1.01x",
    uptime: "99%",
    latency: "5.8s",
  },
];

export const communityPosts = [
  {
    category: "避坑",
    meta: "17 条回复 · 今天更新",
    title: "低倍率不等于真便宜，实际要把上下游映射和封顶规则一起看",
    summary:
      "这类帖子适合沉淀成站内指南，把“便宜”拆成官方价格、倍率、最小扣费单位和高峰期波动几个维度去看。",
  },
  {
    category: "高峰稳定性",
    meta: "9 条回复 · 2 小时前",
    title: "Claude 晚高峰会不会排队，哪些站点更稳？",
    summary:
      "群里最常见的话题之一就是高峰期体验差异。首页保留这种讨论，但真正做选择时回到榜单看在线率和评论截图。",
  },
  {
    category: "模型体验",
    meta: "13 条回复 · 昨天",
    title: "Sonnet、Opus、GPT-5.5 适合什么场景，怎么选才不浪费钱",
    summary:
      "讨论区更适合讲使用体验、场景建议和踩坑复盘，不必让用户先淹没在论坛信息流里。",
  },
];

export const stationComparisonRows = [
  {
    name: "PackyCode",
    badge: "精选",
    group: "codex / Claude 样例站",
    models: "Claude Sonnet 4.5 / GPT-5.5 / Gemini 2.5 Pro",
    price: "￥2.5",
    multiplier: "0.98x",
    uptime: "96%",
    latency: "9.1s",
    verdict: "便宜但要看波动",
    note: "价格友好，晚高峰稳定性一般",
    advantage: "倍率低、模型覆盖不错，适合成本敏感用户先试。",
    risk: "评论里提到晚间偶发排队，长任务体验需要继续观察。",
  },
  {
    name: "GreenRoute",
    badge: "模型全",
    group: "多上游聚合样例站",
    models: "GPT-5.4 / GPT-5.5 / Claude 4.x / Gemini 2.x",
    price: "￥3.2",
    multiplier: "1.04x",
    uptime: "98%",
    latency: "6.4s",
    verdict: "综合均衡",
    note: "适合新手，不容易踩大坑",
    advantage: "模型全，站点说明清楚，适合把多个模型统一放一起用。",
    risk: "价格不算最低，热门模型高峰时会有轻微溢价。",
  },
  {
    name: "CloudDock",
    badge: "稳定",
    group: "Claude 高峰样例站",
    models: "Claude Sonnet 4.5 / Opus 4.8 / GPT-5.4",
    price: "￥3.8",
    multiplier: "1.01x",
    uptime: "99%",
    latency: "5.8s",
    verdict: "稳定优先",
    note: "适合高频调用和晚高峰使用",
    advantage: "在线率高，延迟低，社区对高峰表现评价最好。",
    risk: "价格略高，适合重视稳定性的用户，不适合极限控成本。",
  },
  {
    name: "MintRelay",
    badge: "低延迟",
    group: "GPT 样例站",
    models: "GPT-5.5 / GPT-5.4 / o4-mini",
    price: "￥3.0",
    multiplier: "1.00x",
    uptime: "97%",
    latency: "4.9s",
    verdict: "响应快",
    note: "适合 IDE、聊天和轻工具接入",
    advantage: "首 token 快，适合交互型使用场景。",
    risk: "模型覆盖偏窄，Claude 相关需求不适合。",
  },
];

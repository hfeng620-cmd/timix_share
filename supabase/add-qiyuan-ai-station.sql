-- Add 启元AI to an existing Supabase project.
-- Safe to run multiple times. The stations.name column is not unique in the
-- current schema, so this uses update-then-insert instead of ON CONFLICT.

do $$
begin
  update public.stations
  set
    badge = '低倍率',
    group_name = 'ai.qystart.top',
    entry = '官网入口',
    package_type = '1:1 美元计价',
    status = '低倍率，待继续补稳定性样本',
    models = '主流模型待群补',
    price = '充值 1:1 刀，约 110 元可用约 10 亿 tokens',
    multiplier = '0.055x',
    uptime = '待补高峰样本',
    latency = '缺统一样本',
    source = '站主补充',
    verdict = '低成本优先观察',
    note = '倍率 0.055；充值 1:1 美元计价，人民币自己充值约 110 元，约可用 10 亿 tokens 左右。',
    advantage = '倍率和 tokens 成本口径都很低，适合放到前排重点比较。',
    risk = '仍需继续补高峰稳定性、模型覆盖和长期使用反馈。',
    url = 'https://ai.qystart.top',
    sort_order = 0
  where name = '启元AI';

  if not found then
    insert into public.stations (
      name,
      badge,
      group_name,
      entry,
      package_type,
      status,
      models,
      price,
      multiplier,
      uptime,
      latency,
      source,
      verdict,
      note,
      advantage,
      risk,
      url,
      sort_order
    )
    values (
      '启元AI',
      '低倍率',
      'ai.qystart.top',
      '官网入口',
      '1:1 美元计价',
      '低倍率，待继续补稳定性样本',
      '主流模型待群补',
      '充值 1:1 刀，约 110 元可用约 10 亿 tokens',
      '0.055x',
      '待补高峰样本',
      '缺统一样本',
      '站主补充',
      '低成本优先观察',
      '倍率 0.055；充值 1:1 美元计价，人民币自己充值约 110 元，约可用 10 亿 tokens 左右。',
      '倍率和 tokens 成本口径都很低，适合放到前排重点比较。',
      '仍需继续补高峰稳定性、模型覆盖和长期使用反馈。',
      'https://ai.qystart.top',
      0
    );
  end if;
end $$;

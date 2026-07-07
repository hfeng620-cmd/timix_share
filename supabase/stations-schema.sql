-- Supabase stations schema for Timin观察站 榜单协同编辑.
-- Run this in Supabase SQL editor after enabling Email auth.

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  url text not null default '',
  price text not null default '',
  multiplier text not null default '',
  entry text not null default '',
  package_type text not null default '倍率制',
  status text not null default '',
  models text not null default '',
  uptime text not null default '待补',
  latency text not null default '待补',
  source text not null default '',
  verdict text not null default '',
  note text not null default '',
  advantage text not null default '',
  risk text not null default '',
  badge text not null default '',
  group_name text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.station_edits (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references public.stations(id) on delete cascade,
  editor_id uuid not null references auth.users(id) on delete cascade,
  editor_name text not null default '',
  field_name text not null default '',
  old_value text not null default '',
  new_value text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists stations_name_idx on public.stations(name);
create index if not exists stations_sort_order_idx on public.stations(sort_order);
create index if not exists station_edits_station_created_idx on public.station_edits(station_id, created_at desc);

create or replace function public.set_stations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_stations_updated_at on public.stations;
create trigger set_stations_updated_at
before update on public.stations
for each row execute function public.set_stations_updated_at();

alter table public.stations enable row level security;
alter table public.station_edits enable row level security;

-- stations: select for everyone; direct insert/update/delete require admin/owner.
drop policy if exists "Stations are public" on public.stations;
create policy "Stations are public" on public.stations for select using (true);

drop policy if exists "Authenticated users create stations" on public.stations;
drop policy if exists "Admins create stations" on public.stations;
create policy "Admins create stations" on public.stations for insert
with check (public.is_forum_admin());

drop policy if exists "Authenticated users update stations" on public.stations;
drop policy if exists "Admins update stations" on public.stations;
create policy "Admins update stations" on public.stations for update
using (public.is_forum_admin())
with check (public.is_forum_admin());

drop policy if exists "Authenticated users delete stations" on public.stations;
create policy "Only admins delete stations" on public.stations for delete
using (public.is_forum_admin());

-- station_edits: select for everyone, insert requires auth.uid() = editor_id
drop policy if exists "Station edits are public" on public.station_edits;
create policy "Station edits are public" on public.station_edits for select using (true);

drop policy if exists "Users create their edits" on public.station_edits;
create policy "Users create their edits" on public.station_edits for insert
with check (auth.uid() = editor_id);

create or replace view public.stations_with_editor
with (security_invoker = true)
as
select distinct on (s.id)
  s.*,
  e.editor_id as last_editor_id,
  e.editor_name as last_editor_name,
  e.created_at as last_edit_at
from public.stations s
left join public.station_edits e on e.station_id = s.id
order by s.id, e.created_at desc;

grant select on public.stations_with_editor to anon, authenticated;
grant insert, update on public.stations to authenticated;
grant select, insert on public.station_edits to authenticated;

-- Seed data: initial station list for Supabase setup.
-- This seed can be bypassed if stations already exist in the table
-- (the ON CONFLICT DO NOTHING clause prevents overwriting existing rows).
-- Keep in sync with src/lib/site-data.ts stationComparisonRows.
insert into public.stations (name, badge, group_name, entry, package_type, status, models, price, multiplier, uptime, latency, source, verdict, note, advantage, risk, url, sort_order)
values
  ('启元AI', '低倍率', 'ai.qystart.top', '官网入口', '1:1 美元计价', '低倍率，待继续补稳定性样本', '主流模型待群补', '充值 1:1 刀，约 110 元可用约 10 亿 tokens', '0.055x', '待补高峰样本', '缺统一样本', '站主补充', '低成本优先观察', '倍率 0.055；充值 1:1 美元计价，人民币自己充值约 110 元，约可用 10 亿 tokens 左右。', '倍率和 tokens 成本口径都很低，适合放到前排重点比较。', '仍需继续补高峰稳定性、模型覆盖和长期使用反馈。', 'https://ai.qystart.top', 0),
  ('虎虎', '双口径', 'huhuai.xyz', '注册送额度入口', '倍率制', '试用信息清晰', '主流模型待群补', 'Plus 0.13 / Pro 0.16', '0.13x 起', '缺高峰样本', '缺统一样本', '注册链接 + 历史试用单 + QQ 群反馈', '先试再说', '当前走注册链接送额度；历史填表活动留档。', '试用入口清晰，适合新用户优先体验。', '实际长期价格和稳定性还要继续看群友反馈。', 'https://huhuai.xyz/register?aff=BCPA5AKW3KHX', 1),
  ('Aether', '常用', 'https://to-aether.com/dashboard', 'Dashboard 直链', '倍率制', '可调用 GPT 5.5 / 5.4，社区常用', '可调用 GPT 5.5 / 5.4', '0.263 倍率', '0.263x', '社区印象偏稳', '缺统一样本', '群友常用口径', '价格还行，口碑偏稳', '群里常用，价格不算最低但反馈偏稳。', '价格不差，当前备注里稳定性印象较好。', '缺少结构化实测数据，仍需要群友补高峰反馈。', 'https://to-aether.com/dashboard', 2),
  ('杂货铺', '双口径', 'https://api.dstopology.com/keys', 'Keys 页面', '模型分组计价', '需要分开理解', 'GPT / CC Max', 'GPT 0.058 / CC Max 0.89', '0.058x 起', '缺公开样本', '缺统一样本', '群友备注', '一定要按模型分开看', 'GPT 与 CC Max 分开计价，不要只看最低值。', '很适合展示同站不同模型收费完全不同的真实情况。', '如果只看最低值，很容易误读 CC Max 的实际价格。', 'https://api.dstopology.com/keys', 3),
  ('秋天中转站', '新收录', 'https://qiutian.live', '官网入口', '模型接入已确认 / 价格待补', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '待补录', '缺公开样本', '缺统一样本', '用户新增补充', '先收录官网入口', 'qiutian.live 已补入口，可调用 GPT 5.5 / 5.4。', '模型接入口径已明确，方便后续群友补测价格。', '当前仍缺可直接比较的价格和倍率信息。', 'https://qiutian.live', 4),
  ('dasuAPI', '待补测', 'https://dasuapi.com', '官网入口', '模型接入已确认 / 价格待补', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '待补录', '社区正向，但缺样本', '缺统一样本', '群友正向备注', '先挂上，等补体验', '入口明确，可调用 GPT 5.5 / 5.4，倍率和计费规则待补。', '模型接入口径已明确，适合继续补价格和高峰样本。', '缺少具体倍率与长期稳定性数据。', 'https://dasuapi.com', 5),
  ('Datopology', '未实测', 'https://api.dstopology.com/keys', 'Keys 页面', '模型接入已确认 / 价格待补', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '待补录', '未试', '未试', '群友待试', '先挂名，等第一手体验', '可调用 GPT 5.5 / 5.4，价格倍率待补。', '模型接入口径已明确，后续重点补价格、倍率和稳定性样本。', '价格与稳定性仍缺第一手数据，别写成确定推荐。', 'https://api.dstopology.com/keys', 6),
  ('WayX', '待补测', 'https://api.aiwxin.com/dashboard', 'Dashboard 直链', '模型接入已确认 / 价格待补', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '待补录', '缺公开样本', '缺统一样本', '用户最新整理表', '先收录，待继续反馈', '已收录入口，可调用 GPT 5.5 / 5.4。', '模型接入口径已明确，方便后续继续补价格和稳定性。', '没有明确价格和高峰期稳定性数据。', 'https://api.aiwxin.com/dashboard', 7),
  ('ai8.my', '低倍率', 'ai8.my', '域名入口', '倍率制', '低倍率，模型已确认', '可调用 GPT 5.5 / 5.4', '0.06 倍率', '0.06x', '缺高峰样本', '缺统一样本', '群友整理', '倍率比较亮眼', '倍率低，可调用 GPT 5.5 / 5.4，缺稳定性反馈。', '模型和倍率都有亮点，适合补进低倍率观察区。', '高峰期稳定性仍缺样本，别只因为价格低就直接推荐。', 'https://ai8.my', 8),
  ('Liary', '卡制', 'https://ai.liaryai.com/', '官网入口', '卡制 / 价格待补', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '待补录', '缺公开样本', '缺统一样本', '用户最新整理表', '先保留入口', '可调用 GPT 5.5 / 5.4。', '模型接入口径已明确，后续补价格后可以继续横向比较。', '价格和计费方式仍缺统一样本。', 'https://ai.liaryai.com/', 9),
  ('dazes.cc', '注册送额', 'https://cn.dazes.cc', '官网登录', '注册送额 / 价格待补', '新人友好，模型已确认', '可调用 GPT 5.5 / 5.4', '注册送额可试', '待补录', '群友口径稳定', '缺统一样本', '注册送额 + 邀请码', '新人友好', '注册送额，可调用 GPT 5.5 / 5.4，邀请码备注 dGSL。', '门槛低，模型接入口径明确，适合拿来先试。', '「稳定」目前更多是社区口径，缺少统一实测。', 'https://cn.dazes.cc', 10),
  ('viptoken站', '低倍率', 'https://www.viptoken.top/dashboard', 'Dashboard 直链', '模型分组计价', '已拆 GPT / Claude', 'GPT-5.5 / GPT-5.4 / Claude', 'GPT 0.2 / Claude 0.15', '0.15x 起', '缺高峰样本', '缺统一样本', '群友整理', '也需要按模型分开看', 'GPT 5.5 / 5.4 与 Claude 组倍率不同。', '模型和价格分组清楚，适合放进正式榜单做对比。', '仍缺高峰稳定性和长期使用反馈。', 'https://www.viptoken.top/dashboard', 11),
  ('Primdream', '待复核', 'https://primdream.store/login', '官网登录', '模型接入已确认 / 价格待补', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '待补录', '缺公开样本', '缺统一样本', '用户最新整理表', '等待新口径', '入口保留，可调用 GPT 5.5 / 5.4，倍率待补。', '模型接入口径已明确，后续更新价格比较方便。', '价格和稳定性还没有足够样本做明确判断。', 'https://primdream.store/login', 12),
  ('xiaoya-api', '待补测', 'https://xiaoya-api.xyz', '官网入口', '模型接入已确认 / 价格待补', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '可调用 GPT 5.5 / 5.4', '待补录', '缺公开样本', '缺统一样本', '群友整理', '先收录，等新口径', '入口保留，可调用 GPT 5.5 / 5.4，倍率待补。', '模型接入口径已明确，后续补价格方便。', '当前没有可直接比较的价格信息。', 'https://xiaoya-api.xyz', 13),
  ('星见雅公益', '免费', 'https://new.xinjianya.top/', '官网入口', '公益 / 免费入口', '免费入口 + Grok', 'Grok / 其他待补', '免费', '不适用', '规则待补', '缺统一样本', '群友整理', '适合单独关注', '免费入口，可调用 Grok。', '对新手非常友好，门槛最低，也有额外模型可试。', '免费不代表长期稳定，仍要看规则和高峰表现。', 'https://new.xinjianya.top/', 14)
on conflict do nothing;

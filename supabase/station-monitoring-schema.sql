-- ============================================================
-- Timix 观察站 · 实时倍率监测
-- 在 Supabase SQL Editor 中运行。
--
-- 设计：
-- 1) station_monitors 保存每个检测项的配置，例如站点、模型、分组和检测方式。
-- 2) station_metric_snapshots 保存每一次检测快照，用于最新状态和趋势图。
-- 3) station_monitor_latest 给前端读取最新一次检测结果。
--
-- 注意：
-- - 真实检测应由 VPS cron / Supabase Edge Function / GitHub Actions 写入快照表。
-- - 前端只读公开结果，不保存用户 Key，不执行真实探测请求。
-- ============================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.station_monitors (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references public.stations(id) on delete set null,
  station_name text not null check (char_length(trim(station_name)) between 1 and 80),
  station_group text not null default 'default',
  model_name text not null default 'GPT 5.5',
  provider_label text not null default '',
  badge text not null default '',
  is_verified boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  check_method text not null default 'manual'
    check (check_method in ('manual', 'api', 'browser', 'webhook')),
  target_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.station_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.station_monitors(id) on delete cascade,
  checked_at timestamptz not null default now(),
  price numeric(12, 4),
  price_label text not null default '',
  multiplier numeric(12, 4),
  multiplier_label text not null default '',
  price_change_percent numeric(8, 2),
  token_cost_level text not null default 'unknown'
    check (token_cost_level in ('less', 'normal', 'more', 'unknown')),
  online_rate numeric(5, 2),
  relay_rate_label text not null default '',
  latency_ms integer,
  status text not null default 'unknown'
    check (status in ('normal', 'degraded', 'offline', 'unknown')),
  status_message text not null default '',
  error_message text not null default '',
  source text not null default 'manual',
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists station_monitors_model_sort_idx
  on public.station_monitors(model_name, sort_order, station_name);

create unique index if not exists station_monitors_unique_target_idx
  on public.station_monitors(station_name, station_group, model_name);

create index if not exists station_metric_snapshots_monitor_checked_idx
  on public.station_metric_snapshots(monitor_id, checked_at desc);

create or replace function public.set_station_monitors_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_station_monitors_updated_at on public.station_monitors;
create trigger set_station_monitors_updated_at
before update on public.station_monitors
for each row execute function public.set_station_monitors_updated_at();

alter table public.station_monitors enable row level security;
alter table public.station_metric_snapshots enable row level security;

drop policy if exists "Station monitors are public" on public.station_monitors;
create policy "Station monitors are public"
  on public.station_monitors for select
  using (true);

drop policy if exists "Admins manage station monitors" on public.station_monitors;
create policy "Admins manage station monitors"
  on public.station_monitors for all
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

drop policy if exists "Station metric snapshots are public" on public.station_metric_snapshots;
create policy "Station metric snapshots are public"
  on public.station_metric_snapshots for select
  using (true);

drop policy if exists "Admins insert station metric snapshots" on public.station_metric_snapshots;
create policy "Admins insert station metric snapshots"
  on public.station_metric_snapshots for insert
  with check (public.is_forum_admin());

create or replace view public.station_monitor_latest
with (security_invoker = true)
as
select distinct on (m.id)
  m.id as monitor_id,
  m.station_id,
  m.station_name,
  m.station_group,
  m.model_name,
  m.provider_label,
  m.badge,
  m.is_verified,
  m.is_active,
  m.sort_order,
  m.check_method,
  m.target_url,
  m.notes,
  s.id as snapshot_id,
  s.checked_at,
  s.price,
  s.price_label,
  s.multiplier,
  s.multiplier_label,
  s.price_change_percent,
  s.token_cost_level,
  s.online_rate,
  s.relay_rate_label,
  s.latency_ms,
  s.status,
  s.status_message,
  s.error_message,
  s.source
from public.station_monitors m
left join public.station_metric_snapshots s on s.monitor_id = m.id
where m.is_active = true
order by m.id, s.checked_at desc nulls last;

grant select on public.station_monitor_latest to anon, authenticated;
grant select on public.station_monitors to anon, authenticated;
grant select on public.station_metric_snapshots to anon, authenticated;

-- 示例种子数据：先让前端面板有真实结构可展示。
-- 后续接入 VPS worker 后，只需要持续 insert station_metric_snapshots。
with inserted_monitors as (
  insert into public.station_monitors
    (station_name, station_group, model_name, provider_label, badge, is_verified, sort_order, check_method, target_url, notes)
  values
    ('虎虎', 'default', 'GPT 5.5', '企业', '可先试用', true, 1, 'manual', 'https://huhuai.xyz/register?aff=BCPA5AKW3KHX', '示例监测项，等待 worker 接入'),
    ('Aether', 'default', 'GPT 5.5', '企业', '常用', true, 2, 'manual', 'https://to-aether.com/dashboard', '示例监测项，等待 worker 接入'),
    ('杂货铺', 'GPT', 'GPT 5.5', '企业', '双口径', true, 3, 'manual', 'https://api.dstopology.com/keys', '示例监测项，等待 worker 接入'),
    ('viptoken站', 'Claude', 'Opus 4.8', '企业', '低倍率', false, 4, 'manual', 'https://www.viptoken.top/dashboard', '示例监测项，等待 worker 接入')
  on conflict do nothing
  returning id, station_name, model_name
)
insert into public.station_metric_snapshots
  (monitor_id, price, price_label, multiplier, multiplier_label, price_change_percent, token_cost_level, online_rate, relay_rate_label, latency_ms, status, status_message, source)
select
  id,
  case
    when station_name = '虎虎' then 0.13
    when station_name = 'Aether' then 0.263
    when station_name = '杂货铺' then 0.058
    else 0.15
  end,
  case
    when station_name = '虎虎' then 'Plus 0.13 / Pro 0.16'
    when station_name = 'Aether' then '0.263 倍率'
    when station_name = '杂货铺' then 'GPT 0.058'
    else 'Claude 0.15'
  end,
  case
    when station_name = '虎虎' then 0.13
    when station_name = 'Aether' then 0.263
    when station_name = '杂货铺' then 0.058
    else 0.15
  end,
  case
    when station_name = '虎虎' then '0.13x 起'
    when station_name = 'Aether' then '0.263x'
    when station_name = '杂货铺' then '0.058x'
    else '0.15x 起'
  end,
  0,
  case when station_name = '虎虎' then 'more' else 'normal' end,
  case when station_name = '虎虎' then 98 else 100 end,
  '几乎不',
  case
    when station_name = '虎虎' then 13300
    when station_name = 'Aether' then 15600
    when station_name = '杂货铺' then 10800
    else 12400
  end,
  'normal',
  '正常',
  'seed'
from inserted_monitors;

commit;

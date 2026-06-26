-- ========================================
-- Timix观察站 · 站点收藏功能
-- 在 Supabase SQL Editor 中运行
-- ========================================

-- 收藏表
create table if not exists public.station_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  station_name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, station_name)
);

-- RLS
alter table public.station_favorites enable row level security;

-- 用户只能看自己的收藏
create policy "Users can view own favorites"
  on public.station_favorites for select
  using (auth.uid() = user_id);

-- 用户只能添加自己的收藏
create policy "Users can insert own favorites"
  on public.station_favorites for insert
  with check (auth.uid() = user_id);

-- 用户只能删除自己的收藏
create policy "Users can delete own favorites"
  on public.station_favorites for delete
  using (auth.uid() = user_id);

-- 索引
create index if not exists idx_station_favorites_user
  on public.station_favorites(user_id);

-- 公开视图：每个站点的收藏数
create or replace view public.station_favorite_counts with (security_invoker = true) as
select station_name, count(*) as favorite_count
from public.station_favorites
group by station_name;

grant select on public.station_favorite_counts to anon, authenticated;

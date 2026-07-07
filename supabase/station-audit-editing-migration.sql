-- ========================================
-- Timix观察站 · 正式榜单审核制编辑迁移
-- 在 Supabase SQL Editor 中运行。
-- 目的：
-- 1) 管理员/站主可直接新增、修改、删除正式榜单。
-- 2) 普通用户不能直接写 stations，只能提交 station_pending_edits / station_submissions。
-- 3) 保留站点编辑历史与待审核字段白名单。
-- ========================================

begin;

alter table public.stations enable row level security;
alter table public.station_edits enable row level security;
alter table public.station_pending_edits enable row level security;

drop policy if exists "Authenticated users create stations" on public.stations;
drop policy if exists "Authenticated users update stations" on public.stations;
drop policy if exists "Authenticated users delete stations" on public.stations;
drop policy if exists "Only admins delete stations" on public.stations;
drop policy if exists "Admins create stations" on public.stations;
drop policy if exists "Admins update stations" on public.stations;
drop policy if exists "Admins delete stations" on public.stations;

create policy "Admins create stations" on public.stations
  for insert
  with check (public.is_forum_admin());

create policy "Admins update stations" on public.stations
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

create policy "Admins delete stations" on public.stations
  for delete
  using (public.is_forum_admin());

drop policy if exists "Station edits are public" on public.station_edits;
create policy "Station edits are public" on public.station_edits
  for select using (true);

drop policy if exists "Users create their edits" on public.station_edits;
create policy "Users create their edits" on public.station_edits
  for insert
  with check (auth.uid() = editor_id);

alter table public.station_pending_edits
  drop constraint if exists station_pending_edits_field_name_check;

alter table public.station_pending_edits
  add constraint station_pending_edits_field_name_check
  check (
    field_name in (
      'name',
      'url',
      'price',
      'multiplier',
      'entry',
      'package_type',
      'status',
      'models',
      'uptime',
      'latency',
      'source',
      'verdict',
      'note',
      'advantage',
      'risk',
      'badge',
      'group_name',
      'sort_order'
    )
  );

drop policy if exists "Anyone can submit pending edits" on public.station_pending_edits;
drop policy if exists "Authenticated can view pending edits" on public.station_pending_edits;
drop policy if exists "Admins can review pending edits" on public.station_pending_edits;

create policy "Anyone can submit pending edits" on public.station_pending_edits
  for insert
  with check (
    auth.uid() = editor_id
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "Authenticated can view pending edits" on public.station_pending_edits
  for select using (auth.role() = 'authenticated');

create policy "Admins can review pending edits" on public.station_pending_edits
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

grant insert, update on public.stations to authenticated;
grant select, insert on public.station_edits to authenticated;
grant insert on public.station_pending_edits to authenticated;
grant select on public.station_pending_edits to authenticated;
grant update on public.station_pending_edits to authenticated;

commit;

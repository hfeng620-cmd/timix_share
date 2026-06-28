-- ========================================
-- Timix观察站 · 正式榜单开放协作编辑
-- 在 Supabase SQL Editor 中运行。
-- 目的：
-- 1) 登录用户可直接新增/修改正式榜单，适合当前人少时快速共建。
-- 2) 删除仍只允许管理员/站主，避免误删。
-- 3) station_pending_edits 审核表继续保留，后续需要时可以切回审核流。
-- ========================================

begin;

alter table public.stations enable row level security;

drop policy if exists "Admins create stations" on public.stations;
drop policy if exists "Admins update stations" on public.stations;
drop policy if exists "Authenticated users create stations" on public.stations;
drop policy if exists "Authenticated users update stations" on public.stations;

create policy "Authenticated users create stations" on public.stations
  for insert
  with check (auth.uid() is not null);

create policy "Authenticated users update stations" on public.stations
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

grant insert, update on public.stations to authenticated;

commit;

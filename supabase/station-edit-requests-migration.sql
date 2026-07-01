-- ============================================================
-- Timix 观察站 · 中转站维基式修改申请
-- 用途：普通用户提交站点字段修改建议，管理员后续审核。
-- 注意：项目真实主表是 public.stations，用户资料表是 public.forum_profiles。
-- ============================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.station_edit_requests (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  user_id uuid not null references public.forum_profiles(id) on delete cascade,
  suggested_data jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.forum_profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text
);

alter table public.station_edit_requests enable row level security;

drop policy if exists "允许用户提交修改" on public.station_edit_requests;
create policy "允许用户提交修改"
on public.station_edit_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists "允许用户查看自己的申请" on public.station_edit_requests;
create policy "允许用户查看自己的申请"
on public.station_edit_requests
for select
using (auth.uid() = user_id);

drop policy if exists "允许管理员管理申请" on public.station_edit_requests;
create policy "允许管理员管理申请"
on public.station_edit_requests
for all
using (
  exists (select 1 from public.forum_admins where user_id = auth.uid())
  or exists (select 1 from public.site_owners where user_id = auth.uid())
)
with check (
  exists (select 1 from public.forum_admins where user_id = auth.uid())
  or exists (select 1 from public.site_owners where user_id = auth.uid())
);

grant select, insert, update on public.station_edit_requests to authenticated;

commit;

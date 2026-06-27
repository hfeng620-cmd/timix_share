-- ========================================
-- Timix观察站 · 用户投稿指南表
-- 在 Supabase SQL Editor 中运行
-- ========================================

-- 1. 创建指南表
create table if not exists public.user_guides (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 200),
  summary text not null check (char_length(trim(summary)) between 10 and 500),
  body text not null check (char_length(trim(body)) between 20 and 10000),
  category text not null default '入门指南' check (category in ('入门指南', '使用技巧', '避坑经验', '模型对比', '其他')),
  tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text not null default '',
  reviewed_by uuid references auth.users(id),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- 2. 索引
create index if not exists idx_user_guides_status on public.user_guides(status);
create index if not exists idx_user_guides_category on public.user_guides(category);
create index if not exists idx_user_guides_created on public.user_guides(created_at desc);
create index if not exists idx_user_guides_author on public.user_guides(author_id);

-- 3. RLS
alter table public.user_guides enable row level security;

-- 任何人都可以查看已审核的指南
drop policy if exists "Anyone can view approved guides" on public.user_guides;
create policy "Anyone can view approved guides" on public.user_guides
  for select using (status = 'approved' and is_hidden = false);

-- 登录用户可以查看自己的投稿
drop policy if exists "Authors can view own guides" on public.user_guides;
create policy "Authors can view own guides" on public.user_guides
  for select using (auth.uid() = author_id);

-- 管理员可以查看所有指南
drop policy if exists "Admins can view all guides" on public.user_guides;
create policy "Admins can view all guides" on public.user_guides
  for select using (public.is_forum_admin());

-- 登录用户可以投稿
drop policy if exists "Authenticated can submit guides" on public.user_guides;
create policy "Authenticated can submit guides" on public.user_guides
  for insert with check (auth.uid() = author_id);

-- 管理员可以更新指南状态
drop policy if exists "Admins can update guides" on public.user_guides;
create policy "Admins can update guides" on public.user_guides
  for update using (public.is_forum_admin());

-- 4. 权限
grant select on public.user_guides to anon, authenticated;
grant insert on public.user_guides to authenticated;
grant update on public.user_guides to authenticated;

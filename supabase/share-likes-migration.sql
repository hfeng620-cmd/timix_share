-- ═══════════════════════════════════════════════════════
-- Timix 观察站 · Share 点赞系统（社交化改造）
-- 用途：将 shared_posts 的 likes_count 计数器升级为关联表，
--       追踪"谁"赞过帖子和评论，支持社交化展示。
-- 在 Supabase SQL Editor 中运行。
-- ═══════════════════════════════════════════════════════

begin;

-- 1. 帖子点赞关联表（追踪谁赞了什么帖子）
create table if not exists public.share_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.shared_posts(id) on delete cascade,
  user_id uuid not null references public.forum_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create index if not exists idx_share_post_likes_post
  on public.share_post_likes(post_id);
create index if not exists idx_share_post_likes_user
  on public.share_post_likes(user_id);

-- 2. 评论点赞关联表（追踪谁赞了什么评论）
create table if not exists public.share_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.shared_post_comments(id) on delete cascade,
  user_id uuid not null references public.forum_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(comment_id, user_id)
);

create index if not exists idx_share_comment_likes_comment
  on public.share_comment_likes(comment_id);
create index if not exists idx_share_comment_likes_user
  on public.share_comment_likes(user_id);

-- 3. RLS 开启
alter table public.share_post_likes enable row level security;
alter table public.share_comment_likes enable row level security;

-- 4. RLS 策略 — 所有人可读，登录用户可增/删自己的赞
create policy "Anyone can read post likes" on public.share_post_likes
  for select using (true);

create policy "Auth users can like posts" on public.share_post_likes
  for insert with check (auth.uid() = user_id);

create policy "Auth users can unlike posts" on public.share_post_likes
  for delete using (auth.uid() = user_id);

create policy "Anyone can read comment likes" on public.share_comment_likes
  for select using (true);

create policy "Auth users can like comments" on public.share_comment_likes
  for insert with check (auth.uid() = user_id);

create policy "Auth users can unlike comments" on public.share_comment_likes
  for delete using (auth.uid() = user_id);

commit;

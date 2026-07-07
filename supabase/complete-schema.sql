-- ============================================================================
-- TimiX 观察站 — 完整数据库 Schema（一次性部署）
-- 合并自 supabase/ 目录下全部 25 个迁移文件
-- 可直接在 Supabase SQL Editor → Run，完全幂等可重复执行
-- 生成日期: 2026-06-29
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 第一部分：扩展 (Extensions)
-- 启用所有需要的 PostgreSQL 扩展
-- ════════════════════════════════════════════════════════════════════════════

-- pgcrypto: 提供 gen_random_uuid() 生成 UUID 主键
create extension if not exists pgcrypto;

-- pg_trgm: 提供 trigram 模糊匹配，用于论坛全文搜索
create extension if not exists pg_trgm;

-- pg_net: 可选扩展，用于异步 HTTP 调用发送邮件通知
-- 需先在 Supabase Dashboard → Extensions 中手动启用
-- create extension if not exists pg_net;


-- ════════════════════════════════════════════════════════════════════════════
-- 第二部分：核心数据表 (Tables)
-- 按依赖顺序排列：先创建被引用表，再创建引用表
-- auth.users 由 Supabase Auth 自动创建，无需手动定义
-- ════════════════════════════════════════════════════════════════════════════

-- 2.1 论坛用户资料表 —— 每个注册用户自动拥有一行
create table if not exists public.forum_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '噜噜' check (char_length(trim(display_name)) between 1 and 80),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),
  custom_title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.2 论坛管理员表 —— 在此表中的用户拥有管理权限
create table if not exists public.forum_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2.3 站点主表 —— 站点主拥有最高权限，且自动成为管理员
create table if not exists public.site_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2.4 中转站榜单主表 —— 协同编辑的中转站对比数据
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

-- 2.5 站点编辑历史表 —— 记录每次字段变更，用于追溯和展示最后编辑者
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

-- 2.6 站点待审核编辑表 —— 审核模式下的待处理字段变更
create table if not exists public.station_pending_edits (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  editor_id uuid not null references auth.users(id) on delete cascade,
  editor_name text not null,
  field_name text not null,
  old_value text not null default '',
  new_value text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text not null default '',
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- 2.7 中转站提交审核表 —— 用户提交新站点/纠错/补充备注
create table if not exists public.station_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('新站点', '纠错', '补充备注')),
  station_name text not null,
  url text not null default '',
  price_or_rate text not null default '',
  note text not null,
  contact text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text not null default '',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id)
);

-- 2.8 站点收藏表 —— 用户收藏感兴趣的中转站
create table if not exists public.station_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  station_name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, station_name)
);

-- 2.9 站点评价表 —— 用户对中转站的评分和评论
create table if not exists public.station_reviews (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  author_id uuid not null references public.forum_profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2.10 论坛帖子表 —— 社区讨论帖
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.forum_profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  station text not null default '',
  tags text[] not null default '{}',
  is_pinned boolean not null default false,
  is_hidden boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.11 论坛回复表 —— 帖子的回复（支持嵌套楼中楼）
create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references public.forum_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.12 论坛点赞表 —— 用户对帖子或回复的点赞（二选一）
create table if not exists public.forum_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.forum_profiles(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  reply_id uuid references public.forum_replies(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (post_id is not null and reply_id is null)
    or (post_id is null and reply_id is not null)
  )
);

-- 2.13 通知表 —— 站内实时通知
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('new_reply', 'new_like', 'post_approved', 'admin_announcement')),
  message text not null,
  post_id uuid references public.forum_posts(id) on delete set null,
  reply_id uuid references public.forum_replies(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2.14 用户在线状态表 —— 记录用户最后活跃时间
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now()
);

-- 2.15 AI 新闻表 —— 用户提交的 AI 行业快讯
create table if not exists public.ai_news (
  id bigint generated always as identity primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  summary text not null default '',
  source text not null default '',
  url text not null default '' check (url = '' or url ~* '^https?://'),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2.16 分享板块文件夹表 —— 用于树形分类组织分享项目
create table if not exists public.shared_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.shared_folders(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2.17 分享板块帖子表 —— 树形文件夹下的项目分享帖
create table if not exists public.shared_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  body text not null default '',
  folder_id uuid references public.shared_folders(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);

-- 2.18 分享帖点赞表 —— 每个用户对每个分享帖只能点赞一次
create table if not exists public.shared_post_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.shared_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

-- 2.19 分享帖评论表 —— 支持嵌套评论（楼中楼）
create table if not exists public.shared_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.shared_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  parent_comment_id uuid references public.shared_post_comments(id) on delete cascade,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2.20 编辑日志表 —— 记录分享板块的编辑操作
create table if not exists public.edit_logs (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('folder', 'post')),
  target_id uuid not null,
  editor_id uuid not null references auth.users(id) on delete cascade,
  action_summary text not null,
  created_at timestamptz not null default now()
);

-- 2.21 论坛审核日志表 —— 记录管理员审核操作（审批、隐藏、置顶等）
create table if not exists public.forum_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('approve','reject','delete','hide','pin','unpin','edit')),
  target_type text not null check (target_type in ('post','reply')),
  target_id uuid not null,
  reason text,
  old_status jsonb,
  new_status jsonb,
  created_at timestamptz not null default now()
);

-- 2.22 论坛垃圾关键词表 —— 自动审核时检查帖子内容是否包含这些词
create table if not exists public.forum_spam_keywords (
  keyword text primary key,
  created_at timestamptz not null default now()
);

-- 2.23 用户投稿指南表 —— 用户提交的使用指南/教程
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


-- ════════════════════════════════════════════════════════════════════════════
-- 第二部分附：前置函数（被后续 ALTER TABLE CHECK 约束引用，必须提前定义）
-- ════════════════════════════════════════════════════════════════════════════

-- 验证用户标签函数 —— 用于 forum_profiles.tags 的 CHECK 约束
create or replace function public.validate_profile_tags(tags text[])
returns boolean
language plpgsql
immutable
as $$
declare
  t text;
begin
  if tags is null or array_length(tags, 1) is null then
    return true;
  end if;
  if array_length(tags, 1) > 5 then
    return false;
  end if;
  foreach t in array tags loop
    if char_length(t) > 20 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 第三部分：表结构变更 (ALTER TABLE)
-- 补充分散在各个迁移文件中的新增列和约束
-- 全部使用 IF NOT EXISTS 确保幂等
-- ════════════════════════════════════════════════════════════════════════════

-- 3.1 forum_posts: 补充 station 和 tags 列（forum-schema.sql 中已包含在 CREATE TABLE 内，此处防御性补充）
alter table public.forum_posts add column if not exists station text not null default '';
alter table public.forum_posts add column if not exists tags text[] not null default '{}';

-- 3.2 forum_replies: 嵌套回复支持 —— 添加 parent_reply_id 列
alter table public.forum_replies
  add column if not exists parent_reply_id uuid
  references public.forum_replies(id) on delete cascade;

-- 3.3 shared_folders: 补充 description 和 creator_id 列
alter table public.shared_folders
  add column if not exists description text not null default '';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shared_folders' and column_name = 'creator_id'
  ) then
    alter table public.shared_folders add column creator_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- 3.4 shared_posts: 补充 url 列
alter table public.shared_posts
  add column if not exists url text not null default '';

-- 3.5 forum_profiles: 补充 tags（用户自定义标签）、total_replies（回复计数）、last_sign_in_at（最后登录时间）
alter table public.forum_profiles
  add column if not exists tags text[] not null default '{}';

alter table public.forum_profiles
  add column if not exists total_replies int not null default 0;

alter table public.forum_profiles
  add column if not exists last_sign_in_at timestamptz;

-- 3.6 station_pending_edits: 添加字段白名单约束，防止审核时写入非预期列
alter table public.station_pending_edits
  drop constraint if exists station_pending_edits_field_name_check;

alter table public.station_pending_edits
  add constraint station_pending_edits_field_name_check
  check (
    field_name in (
      'name', 'url', 'price', 'multiplier', 'entry', 'package_type',
      'status', 'models', 'uptime', 'latency', 'source', 'verdict',
      'note', 'advantage', 'risk', 'badge', 'group_name', 'sort_order'
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 第四部分：索引 (Indexes)
-- 所有索引使用 IF NOT EXISTS 确保幂等
-- ════════════════════════════════════════════════════════════════════════════

-- 4.1 站点表索引
create index if not exists stations_name_idx on public.stations(name);
create index if not exists stations_sort_order_idx on public.stations(sort_order);

-- 4.2 站点编辑历史索引
create index if not exists station_edits_station_created_idx on public.station_edits(station_id, created_at desc);

-- 4.3 站点待审核编辑索引
create index if not exists idx_station_pending_edits_status on public.station_pending_edits(status);
create index if not exists idx_station_pending_edits_station on public.station_pending_edits(station_id);
create index if not exists idx_station_pending_edits_created on public.station_pending_edits(created_at desc);

-- 4.4 站点提交审核索引
create index if not exists idx_station_submissions_status on public.station_submissions(status);
create index if not exists idx_station_submissions_submitted_at on public.station_submissions(submitted_at desc);

-- 4.5 站点收藏索引
create index if not exists idx_station_favorites_user on public.station_favorites(user_id);

-- 4.6 站点评价索引
create index if not exists station_reviews_station_id_idx on public.station_reviews(station_id, created_at desc);
create index if not exists station_reviews_approved_idx on public.station_reviews(station_id, created_at desc)
  where is_approved = true;

-- 4.7 论坛用户资料索引
create index if not exists forum_profiles_created_at_idx on public.forum_profiles(created_at desc);

-- 4.8 论坛帖子索引
create index if not exists forum_posts_created_at_idx on public.forum_posts(created_at desc);
create index if not exists forum_posts_author_id_idx on public.forum_posts(author_id);
create index if not exists forum_posts_visible_idx on public.forum_posts(is_hidden, is_pinned desc, created_at desc);

-- 4.9 论坛回复索引
create index if not exists forum_replies_post_id_created_at_idx on public.forum_replies(post_id, created_at asc);
create index if not exists forum_replies_author_id_idx on public.forum_replies(author_id);

-- 4.10 论坛回复嵌套索引
create index if not exists forum_replies_parent_idx on public.forum_replies(parent_reply_id)
  where parent_reply_id is not null;

-- 4.11 论坛点赞唯一索引（每个用户对同一帖子/回复只能点赞一次）
create unique index if not exists forum_likes_post_unique_idx
  on public.forum_likes(user_id, post_id) where post_id is not null;
create unique index if not exists forum_likes_reply_unique_idx
  on public.forum_likes(user_id, reply_id) where reply_id is not null;

-- 4.12 通知索引
create index if not exists notifications_user_id_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, created_at desc)
  where read = false;
-- 公告迁移中定义的额外索引（防御性）
create index if not exists idx_notifications_user_id on public.notifications(user_id);

-- 4.13 用户在线状态索引
create index if not exists user_presence_last_seen_idx on public.user_presence(last_seen desc);

-- 4.14 AI 新闻索引
create index if not exists ai_news_approved_idx on public.ai_news(created_at desc)
  where is_approved = true;
create index if not exists ai_news_author_id_idx on public.ai_news(author_id);

-- 4.15 分享板块索引
create index if not exists idx_shared_folders_parent on public.shared_folders(parent_id);
create index if not exists idx_shared_posts_folder on public.shared_posts(folder_id);
create index if not exists idx_shared_posts_created on public.shared_posts(created_at desc);

-- 4.16 分享帖点赞索引
create index if not exists idx_shared_likes_post on public.shared_post_likes(post_id);
create index if not exists idx_shared_likes_user on public.shared_post_likes(user_id);

-- 4.17 分享帖评论索引
create index if not exists idx_shared_comments_post on public.shared_post_comments(post_id, created_at asc);
create index if not exists idx_shared_comments_author on public.shared_post_comments(author_id);
create index if not exists idx_shared_comments_parent on public.shared_post_comments(parent_comment_id)
  where parent_comment_id is not null;

-- 4.18 编辑日志索引
create index if not exists idx_edit_logs_target on public.edit_logs(target_type, target_id, created_at desc);

-- 4.19 论坛审核日志索引
create index if not exists forum_audit_actor_idx on public.forum_audit_log(actor_id);
create index if not exists forum_audit_created_idx on public.forum_audit_log(created_at desc);

-- 4.20 用户投稿指南索引
create index if not exists idx_user_guides_status on public.user_guides(status);
create index if not exists idx_user_guides_category on public.user_guides(category);
create index if not exists idx_user_guides_created on public.user_guides(created_at desc);
create index if not exists idx_user_guides_author on public.user_guides(author_id);

-- 4.21 全文搜索 trigram 索引
create index if not exists forum_posts_body_trgm_idx
  on public.forum_posts using gin (body gin_trgm_ops);
create index if not exists forum_posts_station_trgm_idx
  on public.forum_posts using gin (station gin_trgm_ops);
create index if not exists forum_posts_tags_gin_idx
  on public.forum_posts using gin (tags);


-- ════════════════════════════════════════════════════════════════════════════
-- 第五部分：函数 (Functions)
-- 所有函数使用 CREATE OR REPLACE，可安全重复执行
-- RLS 策略依赖 is_forum_admin 和 is_site_owner，必须在策略之前定义
-- ════════════════════════════════════════════════════════════════════════════

-- 5.1 验证用户标签函数 —— 用于 forum_profiles.tags 的 CHECK 约束
create or replace function public.validate_profile_tags(tags text[])
returns boolean
language plpgsql
immutable
as $$
declare
  t text;
begin
  if tags is null or array_length(tags, 1) is null then
    return true;
  end if;
  if array_length(tags, 1) > 5 then
    return false;
  end if;
  foreach t in array tags loop
    if char_length(t) > 20 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- 5.2 判断是否为站点主 —— security definer 避免 RLS 递归
create or replace function public.is_site_owner(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_owners where user_id = check_user_id
  );
$$;

-- 5.3 判断是否为论坛管理员 —— 站点主自动属于管理员
create or replace function public.is_forum_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.forum_admins where user_id = check_user_id
  ) or exists (
    select 1 from public.site_owners where user_id = check_user_id
  );
$$;

-- 5.4 自动为新增 auth.users 创建 forum_profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.forum_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', '噜噜'))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5.5 通用 updated_at 自动更新函数（论坛表共用）
create or replace function public.set_forum_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 5.6 站点表 updated_at 自动更新函数
create or replace function public.set_stations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 5.7 防止非管理员提升帖子权限 —— 普通用户不能修改 author_id/is_hidden/is_pinned
create or replace function public.prevent_forum_post_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_forum_admin() then
    return new;
  end if;

  if new.author_id is distinct from old.author_id
    or new.is_hidden is distinct from old.is_hidden
    or new.is_pinned is distinct from old.is_pinned then
    raise exception 'Only forum admins can change post moderation fields.';
  end if;

  return new;
end;
$$;

-- 5.8 防止非管理员提升回复权限 —— 普通用户不能修改 author_id/is_hidden
create or replace function public.prevent_forum_reply_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_forum_admin() then
    return new;
  end if;

  if new.author_id is distinct from old.author_id
    or new.is_hidden is distinct from old.is_hidden then
    raise exception 'Only forum admins can change reply moderation fields.';
  end if;

  return new;
end;
$$;

-- 5.9 新回复通知 —— 帖子作者收到站内通知
create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  post_title text;
  replier_name text;
begin
  select p.author_id, p.title
  into post_author_id, post_title
  from public.forum_posts p
  where p.id = new.post_id;

  if post_author_id = new.author_id then
    return new;
  end if;

  select pr.display_name
  into replier_name
  from public.forum_profiles pr
  where pr.id = new.author_id;

  insert into public.notifications (user_id, type, message, post_id, reply_id)
  values (
    post_author_id,
    'new_reply',
    replier_name || ' 回复了你的帖子「' || coalesce(post_title, '讨论') || '」',
    new.post_id,
    new.id
  );

  return new;
end;
$$;

-- 5.10 帖子点赞通知 —— 帖子作者收到站内通知
create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  post_title text;
  liker_name text;
begin
  if new.post_id is null then
    return new;
  end if;

  select p.author_id, p.title
  into post_author_id, post_title
  from public.forum_posts p
  where p.id = new.post_id;

  if post_author_id = new.user_id then
    return new;
  end if;

  select pr.display_name
  into liker_name
  from public.forum_profiles pr
  where pr.id = new.user_id;

  insert into public.notifications (user_id, type, message, post_id)
  values (
    post_author_id,
    'new_like',
    liker_name || ' 赞了你的帖子「' || coalesce(post_title, '讨论') || '」',
    new.post_id
  );

  return new;
end;
$$;

-- 5.11 回复点赞通知 —— 回复作者收到站内通知
create or replace function public.notify_on_reply_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reply_author uuid;
  reply_body_snippet text;
begin
  if new.reply_id is null then return new; end if;

  select r.author_id, left(r.body, 80)
  into reply_author, reply_body_snippet
  from public.forum_replies r
  where r.id = new.reply_id;

  if reply_author is null or reply_author = new.user_id then return new; end if;

  insert into public.notifications (user_id, type, message, reply_id)
  values (
    reply_author,
    'new_like',
    '有人赞了你的回复：' || reply_body_snippet || '…',
    new.reply_id
  );

  return new;
end;
$$;

-- 5.12 帖子审核通过通知
create or replace function public.notify_on_post_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_hidden = true and new.is_hidden = false then
    insert into public.notifications (user_id, type, message, post_id)
    values (
      new.author_id,
      'post_approved',
      '你的帖子「' || coalesce(new.title, '讨论') || '」已通过审核',
      new.id
    );
  end if;
  return new;
end;
$$;

-- 5.13 管理员全站广播通知 —— 向所有用户发送通知
create or replace function public.broadcast_notification(
  p_content text,
  p_link_url text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_count integer;
begin
  v_admin_id := auth.uid();

  if not (
    exists (select 1 from public.forum_admins where user_id = v_admin_id)
    or exists (select 1 from public.site_owners where user_id = v_admin_id)
  ) then
    raise exception 'permission denied: only admins can broadcast notifications';
  end if;

  insert into public.notifications (user_id, type, message, post_id)
  select
    fp.id as user_id,
    'admin_announcement'::text as type,
    p_content as message,
    null::uuid as post_id
  from public.forum_profiles fp;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 5.14 获取管理员列表 RPC —— 站点主专用
create or replace function public.get_admin_list()
returns table (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_site_owner() then
    return;
  end if;

  return query
  select
    fa.user_id,
    u.email,
    coalesce(fp.display_name, '噜噜') as display_name,
    fa.created_at
  from public.forum_admins fa
  join auth.users u on u.id = fa.user_id
  left join public.forum_profiles fp on fp.id = fa.user_id
  order by fa.created_at asc;
end;
$$;

-- 5.15 通过邮箱添加管理员 RPC —— 站点主专用
create or replace function public.add_admin_by_email(target_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if not public.is_site_owner() then
    return false;
  end if;

  select id into target_id
  from auth.users
  where lower(email) = lower(target_email);

  if target_id is null then
    return false;
  end if;

  insert into public.forum_admins (user_id)
  values (target_id)
  on conflict (user_id) do nothing;

  return true;
end;
$$;

-- 5.16 移除管理员 RPC —— 站点主专用（不能移除站点主）
create or replace function public.remove_admin(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_owner() then
    return false;
  end if;

  if exists (select 1 from public.site_owners where user_id = target_user_id) then
    return false;
  end if;

  delete from public.forum_admins where user_id = target_user_id;
  return true;
end;
$$;

-- 5.17 管理员用户列表 RPC —— 含在线状态、回复数、最后登录时间
create or replace function public.get_admin_user_list()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz,
  last_seen timestamptz,
  is_online boolean,
  total_replies int,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    u.email::text,
    p.created_at,
    pr.last_seen,
    (pr.last_seen > now() - interval '5 minutes') as is_online,
    p.total_replies,
    p.last_sign_in_at
  from public.forum_profiles p
  join auth.users u on u.id = p.id
  left join public.user_presence pr on pr.user_id = p.id
  order by p.created_at desc
  limit 100;
$$;

-- 5.18 垃圾内容检测函数 —— 检查内容是否包含垃圾关键词
create or replace function public.check_spam_content(content text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.forum_spam_keywords
    where lower(content) like '%' || lower(keyword) || '%'
  );
end;
$$;

-- 5.19 论坛全文搜索 RPC —— 支持关键词、标签、站点筛选和排序
create or replace function public.search_forum_posts(
  query text,
  tag_filter text default null,
  sort_by text default 'latest',
  page_size int default 20,
  page_cursor timestamptz default null,
  station_filter text default null
)
returns table (
  id uuid,
  author_id uuid,
  author_display_name text,
  author_avatar_url text,
  title text,
  body text,
  station text,
  tags text[],
  is_pinned boolean,
  created_at timestamptz,
  updated_at timestamptz,
  reply_count bigint,
  like_count bigint,
  rank real,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select
      p.id,
      p.author_id,
      pr.display_name as author_display_name,
      pr.avatar_url as author_avatar_url,
      p.title,
      p.body,
      p.station,
      p.tags,
      p.is_pinned,
      p.created_at,
      p.updated_at,
      count(distinct r.id) filter (where r.is_hidden = false) as reply_count,
      count(distinct l.user_id) filter (where l.post_id is not null) as like_count,
      case
        when query is null or trim(query) = '' then 1.0
        else
          greatest(
            similarity(p.body, query),
            similarity(p.station, query),
            similarity(p.title, query)
          ) * (case when p.is_pinned then 2.0 else 1.0 end)
      end as rank,
      count(*) over () as total_count
    from public.forum_posts p
    join public.forum_profiles pr on pr.id = p.author_id
    left join public.forum_replies r on r.post_id = p.id
    left join public.forum_likes l on l.post_id = p.id
    where p.is_hidden = false
      and (station_filter is null or p.station = station_filter)
      and (
        query is null
        or trim(query) = ''
        or p.body ilike '%' || query || '%'
        or p.station ilike '%' || query || '%'
        or p.title ilike '%' || query || '%'
        or exists (
          select 1 from unnest(p.tags) t
          where t ilike '%' || query || '%'
        )
        or similarity(p.body, query) > 0.05
        or similarity(p.station, query) > 0.05
      )
      and (tag_filter is null or tag_filter = any(p.tags))
    group by p.id, pr.display_name, pr.avatar_url
  )
  select *
  from filtered
  where
    (page_cursor is null or created_at < page_cursor)
  order by
    is_pinned desc,
    case
      when sort_by = 'mostLikes' then like_count
      when sort_by = 'mostReplies' then reply_count
      else 0
    end desc,
    created_at desc
  limit page_size;
$$;

-- 5.20 标签搜索 RPC —— 用于自动补全和标签推荐
create or replace function public.search_tags(
  query text,
  limit_count int default 10
)
returns table (tag text, usage_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    unnest_tag as tag,
    count(*) as usage_count
  from public.forum_posts,
    unnest(tags) as unnest_tag
  where is_hidden = false
    and unnest_tag ilike '%' || query || '%'
  group by unnest_tag
  order by usage_count desc
  limit limit_count;
$$;

-- 5.21 获取编辑日志 RPC —— 含累计贡献次数
create or replace function public.get_edit_logs(p_target_id uuid, p_target_type text)
returns table (
  id uuid,
  action_summary text,
  created_at timestamptz,
  editor_id uuid,
  editor_name text,
  editor_avatar text,
  total_contributions bigint
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.action_summary,
    e.created_at,
    e.editor_id,
    pf.display_name as editor_name,
    pf.avatar_url as editor_avatar,
    count(*) over (partition by e.editor_id, e.target_id) as total_contributions
  from public.edit_logs e
  left join public.forum_profiles pf on pf.id = e.editor_id
  where e.target_id = p_target_id and e.target_type = p_target_type
  order by e.created_at desc;
$$;

-- 5.22 获取板块创建者 RPC
create or replace function public.get_folder_creator(p_folder_id uuid)
returns table (user_id uuid, display_name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select p.id as user_id, p.display_name, p.avatar_url
  from public.shared_folders f
  join public.forum_profiles p on p.id = f.creator_id
  where f.id = p_folder_id;
$$;

-- 5.23 获取板块贡献者 RPC —— 在该板块下发过帖子的所有用户
create or replace function public.get_folder_contributors(p_folder_id uuid)
returns table (user_id uuid, display_name text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select distinct p.id as user_id, p.display_name, p.avatar_url
  from public.shared_posts sp
  join public.forum_profiles p on p.id = sp.author_id
  where sp.folder_id = p_folder_id
  order by p.display_name;
$$;

-- 5.24 分享帖点赞计数器更新
create or replace function public.update_shared_post_likes_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.shared_posts
    set likes_count = likes_count + 1
    where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.shared_posts
    set likes_count = greatest(0, likes_count - 1)
    where id = old.post_id;
  end if;
  return null;
end;
$$;

-- 5.25 分享帖评论计数器更新
create or replace function public.update_shared_post_comments_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.shared_posts
    set comments_count = comments_count + 1
    where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.shared_posts
    set comments_count = greatest(0, comments_count - 1)
    where id = old.post_id;
  end if;
  return null;
end;
$$;

-- 5.26 用户回复计数更新
create or replace function public.update_profile_reply_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.forum_profiles set total_replies = total_replies + 1 where id = new.author_id;
  elsif (tg_op = 'DELETE') then
    update public.forum_profiles set total_replies = greatest(0, total_replies - 1) where id = old.author_id;
  end if;
  return null;
end;
$$;

-- 5.27 同步最后登录时间到 forum_profiles
create or replace function public.sync_last_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forum_profiles
  set last_sign_in_at = new.last_sign_in_at
  where id = new.id;
  return new;
end;
$$;

-- 5.28 发送邮件通知 —— 通过 pg_net 调用 Edge Function
-- 需要 Supabase Dashboard 中启用 pg_net 扩展并部署 send-email Edge Function
create or replace function public.send_email_notification(
  recipient_email text,
  subject text,
  html_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 调用 Edge Function 发送邮件（异步，不等待响应）
  -- 如果 pg_net 未启用，此调用会失败，但不影响其他功能
  perform net.http_post(
    url := 'https://svksgdsuquhkwyliavfn.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object(
      'to', recipient_email,
      'subject', subject,
      'html', html_body
    )
  );
end;
$$;

-- 5.29 新回复邮件通知触发器函数 —— 30 分钟内同一用户只发一封
create or replace function public.email_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
  post_title text;
  post_id_val uuid;
  replier_name text;
  author_email text;
  last_email timestamptz;
begin
  select p.author_id, p.title, p.id
  into post_author_id, post_title, post_id_val
  from public.forum_posts p
  where p.id = new.post_id;

  if post_author_id = new.author_id then
    return new;
  end if;

  select u.email into author_email
  from auth.users u
  where u.id = post_author_id;

  if author_email is null then
    return new;
  end if;

  select max(created_at) into last_email
  from public.notifications
  where user_id = post_author_id
    and type = 'new_reply'
    and created_at > now() - interval '30 minutes';

  if last_email is not null then
    return new;
  end if;

  select pr.display_name into replier_name
  from public.forum_profiles pr
  where pr.id = new.author_id;

  perform public.send_email_notification(
    recipient_email := author_email,
    subject := '🔔 ' || replier_name || ' 回复了你的帖子',
    html_body := format(
      '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2563EB;">Timix 观察站</h2>
        <p>%s 在「%s」中回复了你：</p>
        <blockquote style="border-left: 3px solid #E1E6EF; margin: 16px 0; padding: 8px 16px; color: #6B7280;">
          %s
        </blockquote>
        <a href="http://www.1bex.com/community" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">
          查看回复
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #9CA3AF;">
          此邮件由 Timix 观察站自动发送。你可以在个人设置中关闭邮件通知。
        </p>
      </div>',
      replier_name,
      coalesce(post_title, '讨论'),
      left(new.body, 300)
    )
  );

  return new;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 第五部分附：依赖函数的 CHECK 约束（必须在函数定义之后）
-- ════════════════════════════════════════════════════════════════════════════

-- forum_profiles.tags 校验约束 —— 最多 5 个标签，每个最长 20 字符
alter table public.forum_profiles
  drop constraint if exists forum_profiles_tags_check;

alter table public.forum_profiles
  add constraint forum_profiles_tags_check
  check (public.validate_profile_tags(tags));


-- ════════════════════════════════════════════════════════════════════════════
-- 第六部分：行级安全策略 (RLS Policies)
-- 先启用 RLS，再创建策略。所有策略使用 DROP IF EXISTS + CREATE 确保幂等。
-- 依赖的函数（is_forum_admin / is_site_owner）已在上一步定义。
-- ════════════════════════════════════════════════════════════════════════════

-- ── 6.0 启用所有表的 RLS ──
alter table public.forum_profiles enable row level security;
alter table public.forum_admins enable row level security;
alter table public.site_owners enable row level security;
alter table public.stations enable row level security;
alter table public.station_edits enable row level security;
alter table public.station_pending_edits enable row level security;
alter table public.station_submissions enable row level security;
alter table public.station_favorites enable row level security;
alter table public.station_reviews enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;
alter table public.forum_likes enable row level security;
alter table public.notifications enable row level security;
alter table public.user_presence enable row level security;
alter table public.ai_news enable row level security;
alter table public.shared_folders enable row level security;
alter table public.shared_posts enable row level security;
alter table public.shared_post_likes enable row level security;
alter table public.shared_post_comments enable row level security;
alter table public.edit_logs enable row level security;
alter table public.forum_audit_log enable row level security;
alter table public.user_guides enable row level security;

-- ── 6.1 forum_profiles 策略 ──
drop policy if exists "Profiles are public" on public.forum_profiles;
create policy "Profiles are public" on public.forum_profiles
  for select using (true);

drop policy if exists "Users create their profile" on public.forum_profiles;
create policy "Users create their profile" on public.forum_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users update their profile" on public.forum_profiles;
create policy "Users update their profile" on public.forum_profiles
  for update
  using (auth.uid() = id or public.is_forum_admin())
  with check (auth.uid() = id or public.is_forum_admin());

-- ── 6.2 forum_admins 策略 ──
drop policy if exists "Admins can read admins" on public.forum_admins;
create policy "Admins can read admins" on public.forum_admins
  for select using (public.is_forum_admin());

drop policy if exists "Owners can insert admins" on public.forum_admins;
create policy "Owners can insert admins" on public.forum_admins
  for insert with check (public.is_site_owner());

drop policy if exists "Owners can delete admins" on public.forum_admins;
create policy "Owners can delete admins" on public.forum_admins
  for delete using (public.is_site_owner());

-- ── 6.3 site_owners 策略 ──
drop policy if exists "Owners can read owners" on public.site_owners;
create policy "Owners can read owners" on public.site_owners
  for select using (true);

drop policy if exists "Owners can insert owners" on public.site_owners;
create policy "Owners can insert owners" on public.site_owners
  for insert with check (public.is_site_owner());

drop policy if exists "Owners can delete owners" on public.site_owners;
create policy "Owners can delete owners" on public.site_owners
  for delete using (public.is_site_owner());

-- ── 6.4 stations 策略 ──
drop policy if exists "Stations are public" on public.stations;
create policy "Stations are public" on public.stations
  for select using (true);

drop policy if exists "Authenticated users create stations" on public.stations;
drop policy if exists "Admins create stations" on public.stations;
create policy "Admins create stations" on public.stations
  for insert
  with check (public.is_forum_admin());

drop policy if exists "Authenticated users update stations" on public.stations;
drop policy if exists "Admins update stations" on public.stations;
create policy "Admins update stations" on public.stations
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

drop policy if exists "Admins delete stations" on public.stations;
create policy "Admins delete stations" on public.stations
  for delete
  using (public.is_forum_admin());

-- ── 6.5 station_edits 策略 ──
drop policy if exists "Station edits are public" on public.station_edits;
create policy "Station edits are public" on public.station_edits
  for select using (true);

drop policy if exists "Users create their edits" on public.station_edits;
create policy "Users create their edits" on public.station_edits
  for insert
  with check (auth.uid() = editor_id);

-- ── 6.6 station_pending_edits 策略 ──
drop policy if exists "Anyone can submit pending edits" on public.station_pending_edits;
create policy "Anyone can submit pending edits" on public.station_pending_edits
  for insert
  with check (
    auth.uid() = editor_id
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

drop policy if exists "Authenticated can view pending edits" on public.station_pending_edits;
create policy "Authenticated can view pending edits" on public.station_pending_edits
  for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can review pending edits" on public.station_pending_edits;
create policy "Admins can review pending edits" on public.station_pending_edits
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

-- ── 6.7 station_submissions 策略 ──
drop policy if exists "Anyone can submit" on public.station_submissions;
create policy "Anyone can submit" on public.station_submissions
  for insert with check (true);

drop policy if exists "Admins can view submissions" on public.station_submissions;
create policy "Admins can view submissions" on public.station_submissions
  for select using (public.is_forum_admin());

drop policy if exists "Admins can update submissions" on public.station_submissions;
create policy "Admins can update submissions" on public.station_submissions
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

-- ── 6.8 station_favorites 策略 ──
drop policy if exists "Users can view own favorites" on public.station_favorites;
create policy "Users can view own favorites" on public.station_favorites for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own favorites" on public.station_favorites;
create policy "Users can insert own favorites" on public.station_favorites for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.station_favorites;
create policy "Users can delete own favorites" on public.station_favorites for delete using (auth.uid() = user_id);

-- ── 6.9 station_reviews 策略 ──
drop policy if exists "Approved reviews are public" on public.station_reviews;
create policy "Approved reviews are public" on public.station_reviews
  for select
  using (
    is_approved = true
    or author_id = auth.uid()
    or public.is_forum_admin()
  );

drop policy if exists "Authenticated users submit reviews" on public.station_reviews;
create policy "Authenticated users submit reviews" on public.station_reviews
  for insert
  with check (
    auth.uid() = author_id
    and is_approved = false
  );

drop policy if exists "Admins update reviews" on public.station_reviews;
create policy "Admins update reviews" on public.station_reviews
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

drop policy if exists "Admins delete reviews" on public.station_reviews;
create policy "Admins delete reviews" on public.station_reviews
  for delete
  using (public.is_forum_admin());

-- ── 6.10 forum_posts 策略 ──
drop policy if exists "Visible posts are public" on public.forum_posts;
create policy "Visible posts are public" on public.forum_posts
  for select
  using (is_hidden = false or author_id = auth.uid() or public.is_forum_admin());

drop policy if exists "Users submit posts for review" on public.forum_posts;
create policy "Users submit posts for review" on public.forum_posts
  for insert
  with check (
    auth.uid() = author_id
    and (is_pinned = false or public.is_forum_admin())
  );

drop policy if exists "Authors update posts" on public.forum_posts;
create policy "Authors update posts" on public.forum_posts
  for update
  using (author_id = auth.uid() or public.is_forum_admin())
  with check (
    author_id = auth.uid()
    or public.is_forum_admin()
  );

drop policy if exists "Authors delete posts" on public.forum_posts;
create policy "Authors delete posts" on public.forum_posts
  for delete
  using (author_id = auth.uid() or public.is_forum_admin());

-- ── 6.11 forum_replies 策略 ──
drop policy if exists "Visible replies are public" on public.forum_replies;
create policy "Visible replies are public" on public.forum_replies
  for select
  using (is_hidden = false or author_id = auth.uid() or public.is_forum_admin());

drop policy if exists "Users create replies on visible posts" on public.forum_replies;
create policy "Users create replies on visible posts" on public.forum_replies
  for insert
  with check (
    auth.uid() = author_id
    and is_hidden = false
    and exists (select 1 from public.forum_posts where id = post_id and is_hidden = false)
  );

drop policy if exists "Authors update replies" on public.forum_replies;
create policy "Authors update replies" on public.forum_replies
  for update
  using (author_id = auth.uid() or public.is_forum_admin())
  with check ((author_id = auth.uid() and is_hidden = false) or public.is_forum_admin());

drop policy if exists "Authors delete replies" on public.forum_replies;
create policy "Authors delete replies" on public.forum_replies
  for delete
  using (author_id = auth.uid() or public.is_forum_admin());

-- ── 6.12 forum_likes 策略 ──
drop policy if exists "Likes are public" on public.forum_likes;
create policy "Likes are public" on public.forum_likes
  for select using (true);

drop policy if exists "Users create their likes" on public.forum_likes;
create policy "Users create their likes" on public.forum_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete their likes" on public.forum_likes;
create policy "Users delete their likes" on public.forum_likes
  for delete using (auth.uid() = user_id or public.is_forum_admin());

-- ── 6.13 notifications 策略 ──
drop policy if exists "Users see own notifications" on public.notifications;
create policy "Users see own notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "System inserts notifications" on public.notifications;
create policy "System inserts notifications" on public.notifications
  for insert with check (true);

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

-- ── 6.14 user_presence 策略 ──
drop policy if exists "Anyone can read presence" on public.user_presence;
create policy "Anyone can read presence" on public.user_presence
  for select using (true);

drop policy if exists "Users upsert their presence" on public.user_presence;
create policy "Users upsert their presence" on public.user_presence
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their presence" on public.user_presence;
create policy "Users update their presence" on public.user_presence
  for update using (auth.uid() = user_id);

-- ── 6.15 ai_news 策略 ──
drop policy if exists "Approved news are public" on public.ai_news;
create policy "Approved news are public" on public.ai_news
  for select using (is_approved = true);

drop policy if exists "Users submit news" on public.ai_news;
create policy "Users submit news" on public.ai_news
  for insert
  with check (
    auth.uid() = author_id
    and is_approved = false
  );

drop policy if exists "Authors see own submissions" on public.ai_news;
create policy "Authors see own submissions" on public.ai_news
  for select
  using (
    is_approved = false
    and auth.uid() = author_id
  );

drop policy if exists "Admins manage news" on public.ai_news;
create policy "Admins manage news" on public.ai_news
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

drop policy if exists "Admins delete news" on public.ai_news;
create policy "Admins delete news" on public.ai_news
  for delete
  using (public.is_forum_admin());

-- ── 6.16 shared_folders 策略 ──
drop policy if exists "Folders are public" on public.shared_folders;
create policy "Folders are public" on public.shared_folders
  for select using (true);

drop policy if exists "Auth users create folders" on public.shared_folders;
create policy "Auth users create folders" on public.shared_folders
  for insert with check (auth.uid() is not null);

drop policy if exists "Creator or admin updates folders" on public.shared_folders;
create policy "Creator or admin updates folders" on public.shared_folders
  for update
  using (auth.uid() = creator_id or public.is_forum_admin());

drop policy if exists "Creator or admin deletes folders" on public.shared_folders;
create policy "Creator or admin deletes folders" on public.shared_folders
  for delete
  using (auth.uid() = creator_id or public.is_forum_admin());

-- ── 6.17 shared_posts 策略 ──
drop policy if exists "Posts are public" on public.shared_posts;
create policy "Posts are public" on public.shared_posts
  for select using (true);

drop policy if exists "Auth users create posts" on public.shared_posts;
create policy "Auth users create posts" on public.shared_posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "Author updates own posts" on public.shared_posts;
drop policy if exists "Author or admin updates posts" on public.shared_posts;
create policy "Author or admin updates posts" on public.shared_posts
  for update
  using (auth.uid() = author_id or public.is_forum_admin());

drop policy if exists "Author deletes own posts" on public.shared_posts;
create policy "Author deletes own posts" on public.shared_posts
  for delete using (auth.uid() = author_id);

drop policy if exists "Admin deletes any post" on public.shared_posts;
create policy "Admin deletes any post" on public.shared_posts
  for delete using (public.is_forum_admin());

-- ── 6.18 shared_post_likes 策略 ──
drop policy if exists "Shared likes are public" on public.shared_post_likes;
create policy "Shared likes are public" on public.shared_post_likes
  for select using (true);

drop policy if exists "Users create shared likes" on public.shared_post_likes;
create policy "Users create shared likes" on public.shared_post_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete shared likes" on public.shared_post_likes;
create policy "Users delete shared likes" on public.shared_post_likes
  for delete using (auth.uid() = user_id);

-- ── 6.19 shared_post_comments 策略 ──
drop policy if exists "Shared comments are public" on public.shared_post_comments;
create policy "Shared comments are public" on public.shared_post_comments
  for select using (true);

drop policy if exists "Auth users create comments" on public.shared_post_comments;
create policy "Auth users create comments" on public.shared_post_comments
  for insert with check (auth.uid() = author_id);

drop policy if exists "Authors delete comments" on public.shared_post_comments;
create policy "Authors delete comments" on public.shared_post_comments
  for delete using (auth.uid() = author_id or public.is_forum_admin());

-- ── 6.20 edit_logs 策略 ──
drop policy if exists "Edit logs are public" on public.edit_logs;
create policy "Edit logs are public" on public.edit_logs
  for select using (true);

drop policy if exists "System inserts edit logs" on public.edit_logs;
create policy "System inserts edit logs" on public.edit_logs
  for insert with check (true);

-- ── 6.21 forum_audit_log 策略 ──
drop policy if exists "Admins can read audit log" on public.forum_audit_log;
create policy "Admins can read audit log" on public.forum_audit_log for select using (public.is_forum_admin());

drop policy if exists "Admins can insert audit log" on public.forum_audit_log;
create policy "Admins can insert audit log" on public.forum_audit_log for insert with check (public.is_forum_admin());

-- ── 6.22 user_guides 策略 ──
drop policy if exists "Anyone can view approved guides" on public.user_guides;
create policy "Anyone can view approved guides" on public.user_guides
  for select using (status = 'approved' and is_hidden = false);

drop policy if exists "Authors can view own guides" on public.user_guides;
create policy "Authors can view own guides" on public.user_guides
  for select using (auth.uid() = author_id);

drop policy if exists "Admins can view all guides" on public.user_guides;
create policy "Admins can view all guides" on public.user_guides
  for select using (public.is_forum_admin());

drop policy if exists "Authenticated can submit guides" on public.user_guides;
create policy "Authenticated can submit guides" on public.user_guides
  for insert with check (auth.uid() = author_id);

drop policy if exists "Admins can update guides" on public.user_guides;
create policy "Admins can update guides" on public.user_guides
  for update using (public.is_forum_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- 第七部分：视图 (Views)
-- 所有视图使用 CREATE OR REPLACE，可安全重复执行
-- ════════════════════════════════════════════════════════════════════════════

-- 7.1 站点榜单视图 —— 含最后编辑者信息
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

-- 7.2 站点评价公开视图 —— 带用户名
create or replace view public.station_reviews_public
with (security_invoker = true)
as
select
  r.id,
  r.station_id,
  r.author_id,
  pr.display_name as author_name,
  r.rating,
  r.body,
  r.created_at
from public.station_reviews r
join public.forum_profiles pr on pr.id = r.author_id
where r.is_approved = true
order by r.created_at desc;

-- 7.3 站点收藏计数视图
create or replace view public.station_favorite_counts
with (security_invoker = true)
as
select station_name, count(*) as favorite_count
from public.station_favorites
group by station_name;

-- 7.4 论坛公开帖子视图 —— 含作者信息和统计
create or replace view public.forum_posts_public
with (security_invoker = true)
as
select
  p.id,
  p.author_id,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url,
  p.title,
  p.body,
  p.station,
  p.tags,
  p.is_pinned,
  p.created_at,
  p.updated_at,
  count(distinct r.id) filter (where r.is_hidden = false) as reply_count,
  count(distinct l.user_id) filter (where l.post_id is not null) as like_count
from public.forum_posts p
join public.forum_profiles pr on pr.id = p.author_id
left join public.forum_replies r on r.post_id = p.id
left join public.forum_likes l on l.post_id = p.id
where p.is_hidden = false
group by p.id, pr.display_name, pr.avatar_url;

-- 7.5 论坛公开帖子视图（兼容旧名）
create or replace view public.forum_public_posts
with (security_invoker = true)
as select * from public.forum_posts_public;

-- 7.6 论坛公开回复视图 —— 含作者信息和点赞数
create or replace view public.forum_public_replies
with (security_invoker = true)
as
select
  r.id,
  r.post_id,
  r.author_id,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url,
  r.body,
  r.created_at,
  r.updated_at,
  count(l.user_id) filter (where l.reply_id is not null) as like_count
from public.forum_replies r
join public.forum_profiles pr on pr.id = r.author_id
left join public.forum_likes l on l.reply_id = r.id
where r.is_hidden = false
group by r.id, pr.display_name, pr.avatar_url;

-- 7.7 论坛热帖视图 —— 综合点赞 + 回复 + 新帖加权
create or replace view public.forum_hot_topics
with (security_invoker = true)
as
select
  p.id,
  p.title,
  p.station,
  p.tags,
  p.is_hidden,
  p.created_at,
  pr.display_name as author_name,
  count(distinct r.id) filter (where r.is_hidden = false) as reply_count,
  count(distinct l.user_id) filter (where l.post_id is not null) as like_count,
  greatest(p.created_at, max(r.created_at)) as last_activity,
  (
    count(distinct l.user_id) * 3
    + count(distinct r.id) * 2
    + case when p.created_at > now() - interval '7 days' then 1 else 0 end
  ) as hot_score
from public.forum_posts p
join public.forum_profiles pr on pr.id = p.author_id
left join public.forum_replies r on r.post_id = p.id and r.is_hidden = false
left join public.forum_likes l on l.post_id = p.id
where p.is_hidden = false
  and p.created_at > now() - interval '30 days'
group by p.id, pr.display_name
order by hot_score desc, p.created_at desc
limit 20;

-- 7.8 论坛统计视图 —— 仪表盘概览数据
create or replace view public.forum_stats
with (security_invoker = true)
as
select
  (select count(*) from public.forum_posts where is_hidden = false) as visible_posts,
  (select count(*) from public.forum_posts where is_hidden = true) as pending_posts,
  (select count(*) from public.forum_replies where is_hidden = false) as visible_replies,
  (select count(*) from public.forum_likes) as total_likes,
  (select count(distinct author_id) from public.forum_posts) as active_authors;

-- 7.9 论坛用户排名视图 —— 基于发帖数 + 回复数 + 被赞数
create or replace view public.forum_user_ranks
with (security_invoker = true)
as
select
  pr.id,
  pr.display_name,
  pr.avatar_url,
  pr.created_at,
  coalesce(pc.post_count, 0) as post_count,
  coalesce(rc.reply_count, 0) as reply_count,
  coalesce(lr.likes_received, 0) as likes_received,
  (coalesce(pc.post_count, 0) * 3 + coalesce(rc.reply_count, 0) * 1 + coalesce(lr.likes_received, 0) * 2) as reputation
from public.forum_profiles pr
left join lateral (
  select count(*) as post_count from public.forum_posts p
  where p.author_id = pr.id and p.is_hidden = false
) pc on true
left join lateral (
  select count(*) as reply_count from public.forum_replies r
  where r.author_id = pr.id and r.is_hidden = false
) rc on true
left join lateral (
  select count(*) as likes_received
  from public.forum_likes l
  join public.forum_posts p on p.id = l.post_id and p.author_id = pr.id
  where l.post_id is not null
) lr on true
order by reputation desc;

-- 7.10 AI 新闻公开视图
create or replace view public.ai_news_public
with (security_invoker = true)
as
select
  id,
  author_id,
  title,
  summary,
  source,
  url,
  created_at
from public.ai_news
where is_approved = true
order by created_at desc;


-- ════════════════════════════════════════════════════════════════════════════
-- 第八部分：触发器 (Triggers)
-- 所有触发器使用 DROP IF EXISTS + CREATE，可安全重复执行
-- ════════════════════════════════════════════════════════════════════════════

-- 8.1 站点表自动更新 updated_at
drop trigger if exists set_stations_updated_at on public.stations;
create trigger set_stations_updated_at
  before update on public.stations
  for each row execute function public.set_stations_updated_at();

-- 8.2 论坛表自动更新 updated_at
drop trigger if exists set_forum_profiles_updated_at on public.forum_profiles;
create trigger set_forum_profiles_updated_at
  before update on public.forum_profiles
  for each row execute function public.set_forum_updated_at();

drop trigger if exists set_forum_posts_updated_at on public.forum_posts;
create trigger set_forum_posts_updated_at
  before update on public.forum_posts
  for each row execute function public.set_forum_updated_at();

drop trigger if exists set_forum_replies_updated_at on public.forum_replies;
create trigger set_forum_replies_updated_at
  before update on public.forum_replies
  for each row execute function public.set_forum_updated_at();

-- 8.3 论坛帖子权限防提升
drop trigger if exists prevent_forum_post_privilege_escalation on public.forum_posts;
create trigger prevent_forum_post_privilege_escalation
  before update on public.forum_posts
  for each row execute function public.prevent_forum_post_privilege_escalation();

-- 8.4 论坛回复权限防提升
drop trigger if exists prevent_forum_reply_privilege_escalation on public.forum_replies;
create trigger prevent_forum_reply_privilege_escalation
  before update on public.forum_replies
  for each row execute function public.prevent_forum_reply_privilege_escalation();

-- 8.5 新用户自动创建 profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8.6 新回复站内通知
drop trigger if exists on_forum_reply_created on public.forum_replies;
create trigger on_forum_reply_created
  after insert on public.forum_replies
  for each row execute function public.notify_on_reply();

-- 8.7 帖子点赞站内通知
drop trigger if exists on_forum_like_created on public.forum_likes;
create trigger on_forum_like_created
  after insert on public.forum_likes
  for each row
  when (new.post_id is not null)
  execute function public.notify_on_post_like();

-- 8.8 回复点赞站内通知
drop trigger if exists on_forum_like_created_reply on public.forum_likes;
create trigger on_forum_like_created_reply
  after insert on public.forum_likes
  for each row
  when (new.reply_id is not null)
  execute function public.notify_on_reply_like();

-- 8.9 帖子审核通过站内通知
drop trigger if exists on_forum_post_approved on public.forum_posts;
create trigger on_forum_post_approved
  after update on public.forum_posts
  for each row execute function public.notify_on_post_approved();

-- 8.10 分享帖点赞计数更新
drop trigger if exists on_shared_like_change on public.shared_post_likes;
create trigger on_shared_like_change
  after insert or delete on public.shared_post_likes
  for each row execute function public.update_shared_post_likes_count();

-- 8.11 分享帖评论计数更新
drop trigger if exists on_shared_comment_change on public.shared_post_comments;
create trigger on_shared_comment_change
  after insert or delete on public.shared_post_comments
  for each row execute function public.update_shared_post_comments_count();

-- 8.12 用户回复计数更新
drop trigger if exists on_reply_count_change on public.forum_replies;
create trigger on_reply_count_change
  after insert or delete on public.forum_replies
  for each row execute function public.update_profile_reply_count();

-- 8.13 同步最后登录时间
drop trigger if exists on_auth_sign_in on auth.users;
create trigger on_auth_sign_in
  after update of last_sign_in_at on auth.users
  for each row
  when (new.last_sign_in_at is distinct from old.last_sign_in_at)
  execute function public.sync_last_sign_in();

-- 8.14 新回复邮件通知（需启用 pg_net 扩展和 send-email Edge Function）
drop trigger if exists on_reply_send_email on public.forum_replies;
create trigger on_reply_send_email
  after insert on public.forum_replies
  for each row execute function public.email_on_reply();


-- ════════════════════════════════════════════════════════════════════════════
-- 第九部分：权限授予 (GRANT)
-- ════════════════════════════════════════════════════════════════════════════

-- 9.1 视图权限
grant select on public.stations_with_editor to anon, authenticated;
grant select on public.station_reviews_public to anon, authenticated;
grant select on public.station_favorite_counts to anon, authenticated;
grant select on public.forum_posts_public to anon, authenticated;
grant select on public.forum_public_posts to anon, authenticated;
grant select on public.forum_public_replies to anon, authenticated;
grant select on public.forum_hot_topics to anon, authenticated;
grant select on public.forum_stats to anon, authenticated;
grant select on public.forum_user_ranks to anon, authenticated;
grant select on public.ai_news_public to anon, authenticated;

-- 9.2 函数执行权限
grant execute on function public.get_admin_list() to authenticated;
grant execute on function public.broadcast_notification(text, text) to authenticated;
grant execute on function public.get_admin_user_list() to authenticated;

-- 9.3 表操作权限
grant insert, update on public.stations to authenticated;
grant select, insert on public.station_edits to authenticated;
grant insert on public.station_pending_edits to authenticated;
grant select on public.station_pending_edits to authenticated;
grant update on public.station_pending_edits to authenticated;
grant insert on public.station_submissions to anon, authenticated;
grant select on public.station_submissions to authenticated;
grant update on public.station_submissions to authenticated;
grant select on public.user_presence to anon, authenticated;
grant insert on public.user_presence to authenticated;
grant update on public.user_presence to authenticated;
grant select on public.user_guides to anon, authenticated;
grant insert on public.user_guides to authenticated;
grant update on public.user_guides to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 第十部分：存储桶及策略 (Storage Buckets)
-- 供论坛图片和头像上传使用
-- 需要 Supabase Storage 扩展已启用
-- ════════════════════════════════════════════════════════════════════════════

-- 10.1 创建论坛图片存储桶
insert into storage.buckets (id, name, public)
values ('forum-images', 'forum-images', true)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
where id = 'forum-images';

-- 10.2 创建论坛头像存储桶
insert into storage.buckets (id, name, public)
values ('forum-avatars', 'forum-avatars', true)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
where id = 'forum-avatars';

-- 10.3 存储对象读取策略
drop policy if exists "Public can view forum images" on storage.objects;
create policy "Public can view forum images"
  on storage.objects for select
  using (bucket_id = 'forum-images');

drop policy if exists "Public can view forum avatars" on storage.objects;
create policy "Public can view forum avatars"
  on storage.objects for select
  using (bucket_id = 'forum-avatars');

-- 10.4 论坛图片上传策略 —— 只能上传到自己的用户文件夹
drop policy if exists "Authenticated users can upload forum images" on storage.objects;
create policy "Authenticated users can upload forum images"
  on storage.objects for insert
  with check (
    bucket_id = 'forum-images'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 10.5 头像上传策略
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'forum-avatars'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 10.6 论坛图片删除策略
drop policy if exists "Users can delete own forum images" on storage.objects;
create policy "Users can delete own forum images"
  on storage.objects for delete
  using (
    bucket_id = 'forum-images'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 10.7 论坛图片更新策略
drop policy if exists "Users can update own forum images" on storage.objects;
create policy "Users can update own forum images"
  on storage.objects for update
  using (
    bucket_id = 'forum-images'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'forum-images'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 10.8 头像删除策略
drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
  on storage.objects for delete
  using (
    bucket_id = 'forum-avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 10.9 头像更新策略（avatar 上传使用 upsert）
drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'forum-avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'forum-avatars'
    and auth.uid() = owner
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ════════════════════════════════════════════════════════════════════════════
-- 第十一部分：种子数据 (Seed Data)
-- 使用 ON CONFLICT DO NOTHING 确保幂等，不会覆盖已有数据
-- ════════════════════════════════════════════════════════════════════════════

-- 11.1 中转站榜单初始数据 —— 与 src/lib/site-data.ts stationComparisonRows 保持同步
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

-- 11.2 默认垃圾关键词（中文）
insert into public.forum_spam_keywords (keyword) values
  ('加微信'), ('免费领取'), ('点击链接'), ('日赚'),
  ('兼职'), ('刷单'), ('代理'), ('广告')
on conflict (keyword) do nothing;

-- 11.3 站主 Bootstrap —— 替换为实际站主邮箱后在 Supabase SQL Editor 运行
-- insert into public.site_owners (user_id)
-- select id from auth.users where lower(email) = lower('1938355142@qq.com')
-- on conflict (user_id) do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- 第十二部分：Realtime 配置（需在 Supabase Dashboard 手动操作）
-- ════════════════════════════════════════════════════════════════════════════

-- 以下命令需要 superuser 权限，请在 Supabase Dashboard → Database → Replication 中手动添加：
-- alter publication supabase_realtime add table public.notifications;

-- ============================================================================
-- 完整 Schema 部署完毕。
-- 可安全重复执行：所有语句均使用 IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS / ON CONFLICT DO NOTHING。
-- ============================================================================

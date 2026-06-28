-- ============================================================
-- Timix 观察站 — 合并迁移脚本（一次性运行）
-- 复制到 Supabase SQL Editor → Run
-- ============================================================

-- ═══════════════════════════════════════════
-- PART 1: 通知系统（notifications-schema.sql）
-- ═══════════════════════════════════════════

create extension if not exists pgcrypto;

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

create index if not exists notifications_user_id_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications(user_id, created_at desc)
  where read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users see own notifications" on public.notifications;
create policy "Users see own notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "System inserts notifications" on public.notifications;
create policy "System inserts notifications" on public.notifications
  for insert with check (true);

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

-- 新回复通知触发器
create or replace function public.notify_on_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author_id uuid; post_title text; replier_name text;
begin
  select p.author_id, p.title into post_author_id, post_title
  from public.forum_posts p where p.id = new.post_id;
  if post_author_id = new.author_id then return new; end if;
  select pr.display_name into replier_name from public.forum_profiles pr where pr.id = new.author_id;
  insert into public.notifications (user_id, type, message, post_id, reply_id)
  values (post_author_id, 'new_reply', replier_name || ' 回复了你的帖子「' || coalesce(post_title, '讨论') || '」', new.post_id, new.id);
  return new;
end; $$;

drop trigger if exists on_forum_reply_created on public.forum_replies;
create trigger on_forum_reply_created
  after insert on public.forum_replies
  for each row execute function public.notify_on_reply();

-- 帖子点赞通知触发器
create or replace function public.notify_on_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author_id uuid; post_title text; liker_name text;
begin
  if new.post_id is null then return new; end if;
  select p.author_id, p.title into post_author_id, post_title
  from public.forum_posts p where p.id = new.post_id;
  if post_author_id = new.user_id then return new; end if;
  select pr.display_name into liker_name from public.forum_profiles pr where pr.id = new.user_id;
  insert into public.notifications (user_id, type, message, post_id)
  values (post_author_id, 'new_like', liker_name || ' 赞了你的帖子「' || coalesce(post_title, '讨论') || '」', new.post_id);
  return new;
end; $$;

drop trigger if exists on_forum_like_created on public.forum_likes;
create trigger on_forum_like_created
  after insert on public.forum_likes
  for each row when (new.post_id is not null)
  execute function public.notify_on_post_like();

-- 帖子审核通过通知
create or replace function public.notify_on_post_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.is_hidden = true and new.is_hidden = false then
    insert into public.notifications (user_id, type, message, post_id)
    values (new.author_id, 'post_approved', '你的帖子「' || coalesce(new.title, '讨论') || '」已通过审核', new.id);
  end if;
  return new;
end; $$;

drop trigger if exists on_forum_post_approved on public.forum_posts;
create trigger on_forum_post_approved
  after update on public.forum_posts
  for each row execute function public.notify_on_post_approved();

-- ═══════════════════════════════════════════
-- PART 2: 热门项目 Share 板块（shared-projects-schema.sql）
-- ═══════════════════════════════════════════

create table if not exists public.shared_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.shared_folders(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

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

create index if not exists idx_shared_folders_parent on public.shared_folders(parent_id);
create index if not exists idx_shared_posts_folder on public.shared_posts(folder_id);
create index if not exists idx_shared_posts_created on public.shared_posts(created_at desc);

alter table public.shared_folders enable row level security;
alter table public.shared_posts enable row level security;

drop policy if exists "Folders are public" on public.shared_folders;
create policy "Folders are public" on public.shared_folders for select using (true);
drop policy if exists "Auth users create folders" on public.shared_folders;
create policy "Auth users create folders" on public.shared_folders for insert with check (auth.uid() is not null);

drop policy if exists "Posts are public" on public.shared_posts;
create policy "Posts are public" on public.shared_posts for select using (true);
drop policy if exists "Auth users create posts" on public.shared_posts;
create policy "Auth users create posts" on public.shared_posts for insert with check (auth.uid() = author_id);
drop policy if exists "Author deletes own posts" on public.shared_posts;
create policy "Author deletes own posts" on public.shared_posts for delete using (auth.uid() = author_id);

-- ═══════════════════════════════════════════
-- PART 3: 社区缺口补齐（community-gaps-migration.sql）
-- ═══════════════════════════════════════════

-- 3a. 嵌套回复（楼中楼）
alter table public.forum_replies
  add column if not exists parent_reply_id uuid
  references public.forum_replies(id) on delete cascade;

create index if not exists forum_replies_parent_idx
  on public.forum_replies(parent_reply_id)
  where parent_reply_id is not null;

-- 3b. 分享帖点赞表
create table if not exists public.shared_post_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.shared_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

create index if not exists idx_shared_likes_post on public.shared_post_likes(post_id);
create index if not exists idx_shared_likes_user on public.shared_post_likes(user_id);

alter table public.shared_post_likes enable row level security;

drop policy if exists "Shared likes are public" on public.shared_post_likes;
create policy "Shared likes are public" on public.shared_post_likes for select using (true);
drop policy if exists "Users create shared likes" on public.shared_post_likes;
create policy "Users create shared likes" on public.shared_post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Users delete shared likes" on public.shared_post_likes;
create policy "Users delete shared likes" on public.shared_post_likes for delete using (auth.uid() = user_id);

-- 3c. 分享帖评论表（支持嵌套）
create table if not exists public.shared_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.shared_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  parent_comment_id uuid references public.shared_post_comments(id) on delete cascade,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_comments_post on public.shared_post_comments(post_id, created_at asc);
create index if not exists idx_shared_comments_author on public.shared_post_comments(author_id);
create index if not exists idx_shared_comments_parent on public.shared_post_comments(parent_comment_id) where parent_comment_id is not null;

alter table public.shared_post_comments enable row level security;

drop policy if exists "Shared comments are public" on public.shared_post_comments;
create policy "Shared comments are public" on public.shared_post_comments for select using (true);
drop policy if exists "Auth users create comments" on public.shared_post_comments;
create policy "Auth users create comments" on public.shared_post_comments for insert with check (auth.uid() = author_id);
drop policy if exists "Authors delete comments" on public.shared_post_comments;
create policy "Authors delete comments" on public.shared_post_comments for delete using (auth.uid() = author_id or public.is_forum_admin());

-- 3d. 回复点赞通知触发器
create or replace function public.notify_on_reply_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  reply_author uuid; reply_body_snippet text;
begin
  if new.reply_id is null then return new; end if;
  select r.author_id, left(r.body, 80) into reply_author, reply_body_snippet
  from public.forum_replies r where r.id = new.reply_id;
  if reply_author is null or reply_author = new.user_id then return new; end if;
  insert into public.notifications (user_id, type, message, reply_id)
  values (reply_author, 'new_like', '有人赞了你的回复：' || reply_body_snippet || '…', new.reply_id);
  return new;
end; $$;

drop trigger if exists on_forum_like_created_reply on public.forum_likes;
create trigger on_forum_like_created_reply
  after insert on public.forum_likes
  for each row when (new.reply_id is not null)
  execute function public.notify_on_reply_like();

-- 3e. shared_posts 补充 UPDATE + 管理员 DELETE
drop policy if exists "Author updates own posts" on public.shared_posts;
create policy "Author updates own posts" on public.shared_posts for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Admin deletes any post" on public.shared_posts;
create policy "Admin deletes any post" on public.shared_posts for delete
  using (public.is_forum_admin());

-- 3f. shared_posts 点赞/评论计数器触发器
create or replace function public.update_shared_post_likes_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.shared_posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.shared_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists on_shared_like_change on public.shared_post_likes;
create trigger on_shared_like_change
  after insert or delete on public.shared_post_likes
  for each row execute function public.update_shared_post_likes_count();

create or replace function public.update_shared_post_comments_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.shared_posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.shared_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists on_shared_comment_change on public.shared_post_comments;
create trigger on_shared_comment_change
  after insert or delete on public.shared_post_comments
  for each row execute function public.update_shared_post_comments_count();

-- ═══════════════════════════════════════════
-- PART 4: 补充字段
-- ═══════════════════════════════════════════

alter table public.shared_folders
  add column if not exists description text not null default '';

alter table public.shared_posts
  add column if not exists url text not null default '';

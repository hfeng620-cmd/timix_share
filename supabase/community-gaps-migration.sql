-- =============================================================================
-- Community Gaps Migration — 补齐社区互动系统的关键缺失
-- Run in Supabase SQL Editor
-- =============================================================================

-- ── 1. 嵌套回复（楼中楼）──
alter table public.forum_replies
  add column if not exists parent_reply_id uuid
  references public.forum_replies(id) on delete cascade;

create index if not exists forum_replies_parent_idx
  on public.forum_replies(parent_reply_id)
  where parent_reply_id is not null;

-- ── 2. 分享帖点赞表 ──
create table if not exists public.shared_post_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.shared_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);

create index if not exists idx_shared_likes_post
  on public.shared_post_likes(post_id);

create index if not exists idx_shared_likes_user
  on public.shared_post_likes(user_id);

alter table public.shared_post_likes enable row level security;

drop policy if exists "Shared likes are public" on public.shared_post_likes;
create policy "Shared likes are public"
  on public.shared_post_likes for select using (true);

drop policy if exists "Users create shared likes" on public.shared_post_likes;
create policy "Users create shared likes"
  on public.shared_post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete shared likes" on public.shared_post_likes;
create policy "Users delete shared likes"
  on public.shared_post_likes for delete
  using (auth.uid() = user_id);

-- ── 3. 分享帖评论表 ──
create table if not exists public.shared_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.shared_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  parent_comment_id uuid references public.shared_post_comments(id) on delete cascade,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_comments_post
  on public.shared_post_comments(post_id, created_at asc);

create index if not exists idx_shared_comments_author
  on public.shared_post_comments(author_id);

create index if not exists idx_shared_comments_parent
  on public.shared_post_comments(parent_comment_id)
  where parent_comment_id is not null;

alter table public.shared_post_comments enable row level security;

drop policy if exists "Shared comments are public" on public.shared_post_comments;
create policy "Shared comments are public"
  on public.shared_post_comments for select using (true);

drop policy if exists "Auth users create comments" on public.shared_post_comments;
create policy "Auth users create comments"
  on public.shared_post_comments for insert
  with check (auth.uid() = author_id);

drop policy if exists "Authors delete comments" on public.shared_post_comments;
create policy "Authors delete comments"
  on public.shared_post_comments for delete
  using (auth.uid() = author_id or public.is_forum_admin());

-- ── 4. 回复点赞通知触发器 ──
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
  -- Only fire for reply likes (post_id is null)
  if new.reply_id is null then return new; end if;

  select r.author_id, left(r.body, 80)
  into reply_author, reply_body_snippet
  from public.forum_replies r
  where r.id = new.reply_id;

  -- Don't notify self-likes
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

drop trigger if exists on_forum_like_created_reply on public.forum_likes;
create trigger on_forum_like_created_reply
  after insert on public.forum_likes
  for each row
  when (new.reply_id is not null)
  execute function public.notify_on_reply_like();

-- ── 5. shared_posts UPDATE/DELETE 补充策略 ──
drop policy if exists "Author updates own posts" on public.shared_posts;
create policy "Author updates own posts"
  on public.shared_posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Admin deletes any post" on public.shared_posts;
create policy "Admin deletes any post"
  on public.shared_posts for delete
  using (public.is_forum_admin());

-- ── 6. 更新 shared_posts 计数器触发器 ──
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

drop trigger if exists on_shared_like_change on public.shared_post_likes;
create trigger on_shared_like_change
  after insert or delete on public.shared_post_likes
  for each row execute function public.update_shared_post_likes_count();

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

drop trigger if exists on_shared_comment_change on public.shared_post_comments;
create trigger on_shared_comment_change
  after insert or delete on public.shared_post_comments
  for each row execute function public.update_shared_post_comments_count();

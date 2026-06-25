-- Real-time notifications system for Timix观察站.
-- Run in Supabase SQL editor.

-- 1. Enable pgcrypto if not already enabled
create extension if not exists pgcrypto;

-- 2. Notifications table
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

-- Indexes for fast queries
create index if not exists notifications_user_id_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications(user_id, created_at desc)
  where read = false;

-- 3. Enable RLS
alter table public.notifications enable row level security;

-- Users can only see their own notifications
drop policy if exists "Users see own notifications" on public.notifications;
create policy "Users see own notifications" on public.notifications
  for select using (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- System/triggers insert notifications
drop policy if exists "System inserts notifications" on public.notifications;
create policy "System inserts notifications" on public.notifications
  for insert with check (true);

-- Users can delete their own notifications
drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

-- 4. Enable Realtime (run in Supabase Dashboard → Replication)
-- Add public.notifications to the publication: supabase_realtime

-- 5. Auto-notify on new reply
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
  -- Find the post author
  select p.author_id, p.title
  into post_author_id, post_title
  from public.forum_posts p
  where p.id = new.post_id;

  -- Don't notify self-replies
  if post_author_id = new.author_id then
    return new;
  end if;

  -- Get replier display name
  select pr.display_name
  into replier_name
  from public.forum_profiles pr
  where pr.id = new.author_id;

  -- Create notification
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

drop trigger if exists on_forum_reply_created on public.forum_replies;
create trigger on_forum_reply_created
  after insert on public.forum_replies
  for each row execute function public.notify_on_reply();

-- 6. Auto-notify on new like (post)
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

  -- Find the post author
  select p.author_id, p.title
  into post_author_id, post_title
  from public.forum_posts p
  where p.id = new.post_id;

  -- Don't notify self-likes
  if post_author_id = new.user_id then
    return new;
  end if;

  -- Get liker display name
  select pr.display_name
  into liker_name
  from public.forum_profiles pr
  where pr.id = new.user_id;

  -- Create notification
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

drop trigger if exists on_forum_like_created on public.forum_likes;
create trigger on_forum_like_created
  after insert on public.forum_likes
  for each row
  when (new.post_id is not null)
  execute function public.notify_on_post_like();

-- 7. Auto-notify when admin approves a post
create or replace function public.notify_on_post_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire when is_hidden changes from true to false
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

drop trigger if exists on_forum_post_approved on public.forum_posts;
create trigger on_forum_post_approved
  after update on public.forum_posts
  for each row execute function public.notify_on_post_approved();

-- 8. Enable realtime for the notifications table
-- This requires superuser; run in Supabase Dashboard → Database → Replication
-- Add `public.notifications` to the `supabase_realtime` publication
-- Or run:
-- alter publication supabase_realtime add table public.notifications;

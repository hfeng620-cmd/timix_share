-- ============================================================
-- Timix 观察站 · 历史公告通知回填
-- 用途：
-- 1. 把以前已经发布的公告帖补写进通知中心。
-- 2. 更新 broadcast_notification，让以后公告通知带 post_id，方便点击跳转。
-- 在 Supabase SQL Editor 中运行，可重复执行，不会重复回填同一公告。
-- ============================================================

begin;

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
  v_admin_id uuid := auth.uid();
  v_count integer;
  v_post_id uuid;
begin
  if not (
    exists (select 1 from public.forum_admins where user_id = v_admin_id)
    or exists (select 1 from public.site_owners where user_id = v_admin_id)
  ) then
    raise exception 'permission denied: only admins can broadcast notifications';
  end if;

  if p_link_url ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_post_id := p_link_url::uuid;
  end if;

  insert into public.notifications (user_id, type, message, post_id)
  select
    fp.id,
    'admin_announcement',
    p_content,
    v_post_id
  from public.forum_profiles fp
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = fp.id
      and n.type = 'admin_announcement'
      and (
        (v_post_id is not null and n.post_id = v_post_id)
        or n.message = p_content
      )
  );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

insert into public.notifications (user_id, type, message, post_id, read, created_at)
select
  fp.id,
  'admin_announcement',
  p.title,
  p.id,
  false,
  p.created_at
from public.forum_posts p
cross join public.forum_profiles fp
where p.is_hidden = false
  and p.tags @> array['公告']::text[]
  and not exists (
    select 1
    from public.notifications n
    where n.user_id = fp.id
      and n.type = 'admin_announcement'
      and (
        n.post_id = p.id
        or n.message = p.title
      )
  );

grant execute on function public.broadcast_notification(text, text) to authenticated;

commit;

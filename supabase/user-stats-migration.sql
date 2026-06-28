-- ============================================================
-- 用户统计与在线状态增强
-- 复制到 Supabase SQL Editor → Run
-- ============================================================

-- 1. forum_profiles 加计数器列 + 最后登录时间
alter table public.forum_profiles
  add column if not exists total_replies int not null default 0;
alter table public.forum_profiles
  add column if not exists last_sign_in_at timestamptz;

-- 2. 回复计数触发器（INSERT → +1）
create or replace function public.update_profile_reply_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.forum_profiles set total_replies = total_replies + 1 where id = new.author_id;
  elsif (tg_op = 'DELETE') then
    update public.forum_profiles set total_replies = greatest(0, total_replies - 1) where id = old.author_id;
  end if;
  return null;
end; $$;

drop trigger if exists on_reply_count_change on public.forum_replies;
create trigger on_reply_count_change
  after insert or delete on public.forum_replies
  for each row execute function public.update_profile_reply_count();

-- 3. 同步 last_sign_in_at（用户登录时更新）
create or replace function public.sync_last_sign_in()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.forum_profiles
  set last_sign_in_at = new.last_sign_in_at
  where id = new.id;
  return new;
end; $$;

drop trigger if exists on_auth_sign_in on auth.users;
create trigger on_auth_sign_in
  after update of last_sign_in_at on auth.users
  for each row
  when (new.last_sign_in_at is distinct from old.last_sign_in_at)
  execute function public.sync_last_sign_in();

-- 4. 更新 get_admin_user_list RPC（加入计数 + last_sign_in）
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

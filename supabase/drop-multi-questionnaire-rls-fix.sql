-- ============================================================
-- Timix 观察站 · Drop 多题问卷 + 管理员发布 RLS 修复
-- 用途：
-- 1. 允许论坛管理员 / 站主创建活动和批量写入兑换码。
-- 2. 继续复用 campaigns.custom_question/custom_options 存动态问卷配置。
-- 3. 放宽 claim_promo_code 的 ui_rating 长度，支持多题答案 JSON。
-- 在 Supabase SQL Editor 中运行。
-- ============================================================

begin;

create table if not exists public.forum_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.site_owners (user_id)
select id
from auth.users
where lower(email) = lower('1938355142@qq.com')
on conflict (user_id) do nothing;

create or replace function public.is_site_owner(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_owners where user_id = check_user_id
  );
$$;

create or replace function public.is_forum_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.forum_admins where user_id = check_user_id
  )
  or exists (
    select 1 from public.site_owners where user_id = check_user_id
  );
$$;

alter table public.campaigns
  add column if not exists custom_question text,
  add column if not exists custom_options text;

alter table public.drop_submissions
  add column if not exists favorite_station text,
  add column if not exists ui_rating text,
  add column if not exists timix_feedback text,
  drop constraint if exists drop_submissions_rating_check,
  drop constraint if exists drop_submissions_ui_rating_check;

alter table public.drop_submissions
  alter column rating set default 'NPC',
  alter column suggestion set default '';

create or replace view public.campaign_summary as
select
  c.id,
  c.title,
  c.sponsor_name,
  c.sponsor_url,
  c.description,
  c.total_codes,
  c.is_active,
  c.starts_at,
  c.ends_at,
  c.custom_question,
  c.custom_options,
  c.created_at,
  c.updated_at,
  count(pc.id) filter (where pc.is_claimed = false)::integer as remaining_codes,
  count(pc.id) filter (where pc.is_claimed = true)::integer as claimed_codes,
  count(pc.id)::integer as total_code_records
from public.campaigns c
left join public.promo_codes pc on pc.campaign_id = c.id
group by c.id;

alter table public.campaigns enable row level security;
alter table public.promo_codes enable row level security;
alter table public.drop_submissions enable row level security;
alter table public.forum_admins enable row level security;
alter table public.site_owners enable row level security;

drop policy if exists "Admins can read admins" on public.forum_admins;
create policy "Admins can read admins" on public.forum_admins
  for select using (public.is_forum_admin());

drop policy if exists "Owners can insert admins" on public.forum_admins;
create policy "Owners can insert admins" on public.forum_admins
  for insert with check (public.is_site_owner());

drop policy if exists "Owners can delete admins" on public.forum_admins;
create policy "Owners can delete admins" on public.forum_admins
  for delete using (public.is_site_owner());

drop policy if exists "Owners can read owners" on public.site_owners;
create policy "Owners can read owners" on public.site_owners
  for select using (public.is_forum_admin());

drop policy if exists "Admins can manage campaigns" on public.campaigns;
drop policy if exists "Admins and owners can manage campaigns" on public.campaigns;
create policy "Admins and owners can manage campaigns" on public.campaigns
  for all
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

drop policy if exists "Admins can manage promo codes" on public.promo_codes;
drop policy if exists "Admins and owners can manage promo codes" on public.promo_codes;
create policy "Admins and owners can manage promo codes" on public.promo_codes
  for all
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

drop function if exists public.claim_promo_code(uuid, uuid, text, text, text);
drop function if exists public.claim_promo_code(uuid, uuid, text, text, text, text);

create or replace function public.claim_promo_code(
  p_campaign_id uuid,
  p_user_id uuid,
  p_registered_account text,
  p_favorite_station text,
  p_ui_rating text,
  p_timix_feedback text
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_code_id uuid;
  v_code_text text;
  v_registered_account text := trim(coalesce(p_registered_account, ''));
  v_favorite_station text := trim(coalesce(p_favorite_station, ''));
  v_ui_rating text := trim(coalesce(p_ui_rating, ''));
  v_timix_feedback text := trim(coalesce(p_timix_feedback, ''));
begin
  if v_auth_user_id is null then
    raise exception '请先登录后再领取福利';
  end if;

  if p_user_id is distinct from v_auth_user_id then
    raise exception '登录状态不匹配，请刷新后重试';
  end if;

  if char_length(v_registered_account) < 1 or char_length(v_registered_account) > 200 then
    raise exception '请填写有效的目标平台注册账号';
  end if;

  if char_length(v_favorite_station) < 1 or char_length(v_favorite_station) > 1000 then
    raise exception '请填写您认为更好用、更稳定的中转站反馈';
  end if;

  if char_length(v_ui_rating) < 1 or char_length(v_ui_rating) > 4000 then
    raise exception '请选择有效的互动问卷选项';
  end if;

  if char_length(v_timix_feedback) < 1 or char_length(v_timix_feedback) > 1000 then
    raise exception '请填写对 TiMix 的建议';
  end if;

  if not exists (
    select 1
    from public.forum_profiles fp
    where fp.id = v_auth_user_id
  ) then
    raise exception '请先完成论坛资料初始化后再领取福利';
  end if;

  if not exists (
    select 1
    from public.campaigns c
    where c.id = p_campaign_id
      and c.is_active = true
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at > now())
  ) then
    raise exception '该活动不存在或已结束';
  end if;

  if exists (
    select 1
    from public.drop_submissions ds
    where ds.campaign_id = p_campaign_id
      and ds.user_id = v_auth_user_id
  ) then
    raise exception '您已经领取过该福利';
  end if;

  select pc.id, pc.code
    into v_code_id, v_code_text
  from public.promo_codes pc
  where pc.campaign_id = p_campaign_id
    and pc.is_claimed = false
  order by pc.id
  for update skip locked
  limit 1;

  if v_code_id is null then
    raise exception '手慢了，兑换码已被抢空';
  end if;

  update public.promo_codes
  set is_claimed = true,
      claimed_by_user_id = v_auth_user_id,
      claimed_at = now()
  where id = v_code_id;

  insert into public.drop_submissions (
    campaign_id,
    user_id,
    promo_code_id,
    sponsor_account,
    favorite_station,
    ui_rating,
    timix_feedback,
    rating,
    suggestion
  )
  values (
    p_campaign_id,
    v_auth_user_id,
    v_code_id,
    v_registered_account,
    v_favorite_station,
    v_ui_rating,
    v_timix_feedback,
    left(v_ui_rating, 120),
    v_timix_feedback
  );

  return v_code_text;
exception
  when unique_violation then
    raise exception '您已经领取过该福利';
end;
$$;

grant select on public.campaigns to anon, authenticated;
grant select on public.campaign_summary to anon, authenticated;
grant insert, update, delete on public.campaigns to authenticated;
grant insert, update, delete on public.promo_codes to authenticated;
grant select on public.drop_submissions to authenticated;
grant select on public.site_owners to anon, authenticated;
grant select on public.forum_admins to authenticated;
grant execute on function public.is_site_owner(uuid) to anon, authenticated;
grant execute on function public.is_forum_admin(uuid) to anon, authenticated;
grant execute on function public.claim_promo_code(uuid, uuid, text, text, text, text) to authenticated;

commit;

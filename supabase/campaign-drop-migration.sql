-- ============================================================
-- Timix 观察站 · Campaign / Drop 福利系统
-- 用途：赞助商活动、限量兑换码库存、用户领取反馈，以及原子领取 RPC。
-- 并发保障：claim_promo_code 使用 FOR UPDATE SKIP LOCKED，避免超发。
-- 安全保障：兑换码明文不对普通 select 暴露，只由 SECURITY DEFINER RPC 返回。
-- 在 Supabase SQL Editor 中运行。
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- 1. 活动表：记录每次 Drop 活动的基本信息。
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  sponsor_name text not null check (char_length(trim(sponsor_name)) between 1 and 80),
  sponsor_url text not null check (sponsor_url ~ '^https?://'),
  description text not null default '',
  total_codes integer not null default 0 check (total_codes >= 0),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- 让旧库重复运行迁移时也能补齐新增字段。
alter table public.campaigns
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

-- 2. 兑换码表：核心库存，每条记录是一枚可领取的码。
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  code text not null check (char_length(trim(code)) >= 1),
  is_claimed boolean not null default false,
  claimed_by_user_id uuid references public.forum_profiles(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(campaign_id, code),
  check (
    (is_claimed = false and claimed_by_user_id is null and claimed_at is null)
    or
    (is_claimed = true and claimed_by_user_id is not null and claimed_at is not null)
  )
);

alter table public.promo_codes
  add column if not exists created_at timestamptz not null default now();

-- 每位用户每个活动最多绑定一枚码，配合 drop_submissions 唯一约束双保险防重复领取。
create unique index if not exists promo_codes_one_claim_per_user
  on public.promo_codes(campaign_id, claimed_by_user_id)
  where claimed_by_user_id is not null;

create index if not exists promo_codes_available_idx
  on public.promo_codes(campaign_id, id)
  where is_claimed = false;

create index if not exists promo_codes_claimed_by_user_idx
  on public.promo_codes(claimed_by_user_id, campaign_id)
  where is_claimed = true;

-- 3. 反馈表：用户领取时提交的赞助商账号和体验反馈。
create table if not exists public.drop_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.forum_profiles(id) on delete cascade,
  promo_code_id uuid references public.promo_codes(id) on delete set null,
  sponsor_account text not null check (char_length(trim(sponsor_account)) between 1 and 200),
  rating text not null check (rating in ('神级体验', '非常实用', '还有欠缺')),
  suggestion text not null default '' check (char_length(suggestion) <= 1000),
  created_at timestamptz not null default now(),
  unique(campaign_id, user_id),
  unique(promo_code_id)
);

alter table public.drop_submissions
  add column if not exists promo_code_id uuid references public.promo_codes(id) on delete set null;

create unique index if not exists drop_submissions_promo_code_unique_idx
  on public.drop_submissions(promo_code_id)
  where promo_code_id is not null;

create index if not exists drop_submissions_user_idx
  on public.drop_submissions(user_id, created_at desc);

create index if not exists drop_submissions_campaign_idx
  on public.drop_submissions(campaign_id, created_at desc);

-- 4. 公共摘要视图：前端活动列表只读取统计，不读取兑换码明文。
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
  c.created_at,
  c.updated_at,
  count(pc.id) filter (where pc.is_claimed = false)::integer as remaining_codes,
  count(pc.id) filter (where pc.is_claimed = true)::integer as claimed_codes,
  count(pc.id)::integer as total_code_records
from public.campaigns c
left join public.promo_codes pc on pc.campaign_id = c.id
group by c.id;

-- 5. 原子 RPC：认证校验 -> 活动校验 -> 锁库存 -> 扣码 -> 写反馈 -> 返回码。
create or replace function public.claim_promo_code(
  p_campaign_id uuid,
  p_user_id uuid,
  p_sponsor_account text,
  p_rating text,
  p_suggestion text default ''
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_code_id uuid;
  v_code_text text;
  v_sponsor_account text := trim(coalesce(p_sponsor_account, ''));
  v_suggestion text := trim(coalesce(p_suggestion, ''));
begin
  if v_auth_user_id is null then
    raise exception '请先登录后再领取福利';
  end if;

  if p_user_id is distinct from v_auth_user_id then
    raise exception '登录状态不匹配，请刷新后重试';
  end if;

  if char_length(v_sponsor_account) < 1 or char_length(v_sponsor_account) > 200 then
    raise exception '请填写有效的赞助商平台账号';
  end if;

  if p_rating not in ('神级体验', '非常实用', '还有欠缺') then
    raise exception '请选择有效的使用体验评价';
  end if;

  if char_length(v_suggestion) > 1000 then
    raise exception '意见与建议不能超过 1000 个字符';
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
    raise exception 'CAMPAIGN_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.drop_submissions ds
    where ds.campaign_id = p_campaign_id
      and ds.user_id = v_auth_user_id
  ) then
    raise exception 'ALREADY_CLAIMED';
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
    raise exception 'SOLD_OUT';
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
    rating,
    suggestion
  )
  values (
    p_campaign_id,
    v_auth_user_id,
    v_code_id,
    v_sponsor_account,
    p_rating,
    v_suggestion
  );

  return v_code_text;
exception
  when unique_violation then
    raise exception '您已经领取过该福利';
end;
$$;

-- 6. RLS：前端只读活动摘要和自己的提交；库存表不开放普通 select，防止码泄漏。
alter table public.campaigns enable row level security;
alter table public.promo_codes enable row level security;
alter table public.drop_submissions enable row level security;

drop policy if exists "Campaigns are publicly readable" on public.campaigns;
create policy "Campaigns are publicly readable" on public.campaigns
  for select
  using (true);

drop policy if exists "Anyone can read unclaimed code existence" on public.promo_codes;
drop policy if exists "Claimed users can read own promo code row" on public.promo_codes;
-- 不创建 promo_codes select policy：码明文只能通过 claim_promo_code 的返回值获得。

drop policy if exists "Users can read own submissions" on public.drop_submissions;
create policy "Users can read own submissions" on public.drop_submissions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own submissions" on public.drop_submissions;
-- 写入统一走 claim_promo_code，避免客户端绕过库存扣减。

grant select on public.campaigns to anon, authenticated;
grant select on public.campaign_summary to anon, authenticated;
grant select on public.drop_submissions to authenticated;
grant execute on function public.claim_promo_code(uuid, uuid, text, text, text) to authenticated;

commit;

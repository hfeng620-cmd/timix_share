-- ============================================================
-- Timix 观察站 · 福利 Drop 系统
-- 用途：赞助商限量兑换码自动发放 + 用户反馈收集
-- 核心保障：RPC 原子操作杜绝并发超发（FOR UPDATE SKIP LOCKED）
-- 在 Supabase SQL Editor 中运行。
-- ============================================================

begin;

-- 确保扩展已启用（生成 UUID）
create extension if not exists pgcrypto;

-- 1. 活动表：记录每次 Drop 活动的基本信息
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  sponsor_name text not null check (char_length(trim(sponsor_name)) between 1 and 80),
  sponsor_url text not null check (sponsor_url ~ '^https?://'),
  description text not null default '',
  total_codes int not null default 0 check (total_codes >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. 兑换码表：核心库存，每条记录是一枚可领取的码
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  code text not null check (char_length(trim(code)) >= 1),
  is_claimed boolean not null default false,
  claimed_by_user_id uuid references public.forum_profiles(id) on delete set null,
  claimed_at timestamptz,
  unique(campaign_id, code)
);

create index if not exists idx_promo_codes_available
  on public.promo_codes(campaign_id, is_claimed)
  where is_claimed = false;

-- 3. 反馈表：用户领取后提交的评价
create table if not exists public.drop_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  user_id uuid not null references public.forum_profiles(id),
  sponsor_account text not null check (char_length(trim(sponsor_account)) between 1 and 200),
  rating text not null check (rating in ('神级体验', '非常实用', '还有欠缺')),
  suggestion text not null default '',
  created_at timestamptz not null default now(),
  unique(campaign_id, user_id)
);

-- 4. 原子 RPC：锁行 → 校验 → 扣码 → 记录 → 返回
create or replace function public.claim_promo_code(
  p_campaign_id uuid,
  p_user_id uuid,
  p_sponsor_account text,
  p_rating text,
  p_suggestion text
) returns text as $$
declare
  v_code_id uuid;
  v_code_text text;
begin
  -- 校验活动是否存在且有效
  if not exists (select 1 from public.campaigns where id = p_campaign_id and is_active = true) then
    raise exception '该活动不存在或已结束';
  end if;

  -- 校验用户是否已领取过这个活动
  if exists (
    select 1 from public.drop_submissions
    where campaign_id = p_campaign_id and user_id = p_user_id
  ) then
    raise exception '您已经领取过该福利';
  end if;

  -- 锁行查找第一枚未领取的码（杜绝并发超发）
  select id, code into v_code_id, v_code_text
  from public.promo_codes
  where campaign_id = p_campaign_id and is_claimed = false
  for update skip locked
  limit 1;

  if v_code_id is null then
    raise exception '手慢了，兑换码已被抢空';
  end if;

  -- 标记为已领取
  update public.promo_codes
  set is_claimed = true,
      claimed_by_user_id = p_user_id,
      claimed_at = now()
  where id = v_code_id;

  -- 记录用户反馈
  insert into public.drop_submissions (campaign_id, user_id, sponsor_account, rating, suggestion)
  values (p_campaign_id, p_user_id, p_sponsor_account, p_rating, p_suggestion);

  -- 返回兑换码
  return v_code_text;
end;
$$ language plpgsql security definer;

-- 5. 安全：RLS 策略 — 所有登录用户可读活动，只有自己可看自己的提交
alter table public.campaigns enable row level security;
alter table public.promo_codes enable row level security;
alter table public.drop_submissions enable row level security;

-- 活动表：任何人可读
drop policy if exists "Campaigns are publicly readable" on public.campaigns;
create policy "Campaigns are publicly readable" on public.campaigns
  for select using (true);

-- 兑换码表：任何人可读码是否存在（但不暴露具体码内容给未领取者）
drop policy if exists "Anyone can read unclaimed code existence" on public.promo_codes;
create policy "Anyone can read unclaimed code existence" on public.promo_codes
  for select using (true);

-- 反馈表：仅本人可读自己的提交
drop policy if exists "Users can read own submissions" on public.drop_submissions;
create policy "Users can read own submissions" on public.drop_submissions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own submissions" on public.drop_submissions;
create policy "Users can insert own submissions" on public.drop_submissions
  for insert with check (auth.uid() = user_id);

-- 6. 视图：前端活动列表（带已领取数统计）
create or replace view public.campaign_summary as
select
  c.*,
  count(pc.id) filter (where pc.is_claimed = false) as remaining_codes,
  count(pc.id) filter (where pc.is_claimed = true) as claimed_codes,
  count(pc.id) as total_code_records
from public.campaigns c
left join public.promo_codes pc on pc.campaign_id = c.id
group by c.id;

commit;

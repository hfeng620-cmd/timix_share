-- ============================================================
-- Timix 观察站 · Drop 领取问卷升级
-- 用途：稳定中转站反馈 + TiMix UI 俚语评分 + TiMix 改进建议。
-- 在 Supabase SQL Editor 中运行。
-- ============================================================

begin;

-- 1. 新问卷字段。sponsor_account 保留为数据库字段名，用于兼容旧表结构。
alter table public.drop_submissions
  add column if not exists favorite_station text,
  add column if not exists ui_rating text,
  add column if not exists timix_feedback text;

-- 2. 兼容旧表结构：
-- 旧版 drop_submissions 里 rating / suggestion 是 NOT NULL 且 RPC 插入时需要写入。
-- 新版仍保留旧字段用于历史数据兼容，但新的有效数据写入 ui_rating / timix_feedback。
alter table public.drop_submissions
  alter column rating set default 'NPC',
  alter column suggestion set default '';

-- ui_rating 的选项与前端保持一致。
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drop_submissions_ui_rating_check'
      and conrelid = 'public.drop_submissions'::regclass
  ) then
    alter table public.drop_submissions
      add constraint drop_submissions_ui_rating_check
      check (
        ui_rating is null
        or ui_rating in ('夯爆了', 'NPC', '拉完了')
      );
  end if;
end $$;

-- 3. 重写原子领取 RPC：认证校验 -> 活动校验 -> 锁库存 -> 扣码 -> 写问卷 -> 返回码。
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

  if p_ui_rating not in ('夯爆了', 'NPC', '拉完了') then
    raise exception '请选择有效的 TiMix UI 界面评价';
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
    p_ui_rating,
    v_timix_feedback,
    p_ui_rating,
    v_timix_feedback
  );

  return v_code_text;
exception
  when unique_violation then
    raise exception '您已经领取过该福利';
end;
$$;

grant execute on function public.claim_promo_code(uuid, uuid, text, text, text, text) to authenticated;

commit;

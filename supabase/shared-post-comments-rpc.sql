-- ═══════════════════════════════════════════════════════
-- 分享帖评论 RPC — 用 SECURITY DEFINER 确保 auth.uid() 一致性
-- 在 Supabase SQL Editor 中执行
-- ═══════════════════════════════════════════════════════

-- 创建评论 RPC（auth.uid() 在 PostgreSQL 服务端求值，杜绝 RLS 不匹配）
create or replace function public.insert_shared_comment(
  p_post_id uuid,
  p_body text,
  p_parent_comment_id uuid default null
)
returns setof public.shared_post_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
begin
  v_author_id := auth.uid();
  if v_author_id is null then
    raise exception '请先登录后再评论。';
  end if;

  return query
  insert into public.shared_post_comments (post_id, author_id, body, parent_comment_id)
  values (p_post_id, v_author_id, p_body, p_parent_comment_id)
  returning *;
end;
$$;

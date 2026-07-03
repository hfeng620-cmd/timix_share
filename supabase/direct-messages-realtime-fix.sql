-- ============================================================
-- Timix 观察站 · 私信实时弹窗 Realtime 修复
-- 用途：
-- 1. 确保 direct_messages 表加入 Supabase Realtime publication。
-- 2. 补齐 direct_messages 的基础权限，避免订阅和收件箱读取被 RLS/GRANT 拦住。
-- 在 Supabase SQL Editor 中运行。
-- ============================================================

begin;

alter table public.direct_messages enable row level security;

drop policy if exists "允许用户查看自己的私信" on public.direct_messages;
create policy "允许用户查看自己的私信"
on public.direct_messages
for select
using (
  auth.uid() = sender_id
  or auth.uid() = receiver_id
  or public.is_forum_admin()
);

drop policy if exists "允许用户发送私信" on public.direct_messages;
create policy "允许用户发送私信"
on public.direct_messages
for insert
with check (
  auth.uid() = sender_id
  and receiver_id is not null
  and sender_id <> receiver_id
);

drop policy if exists "允许接收者标记已读" on public.direct_messages;
create policy "允许接收者标记已读"
on public.direct_messages
for update
using (
  auth.uid() = receiver_id
  or public.is_forum_admin()
)
with check (
  auth.uid() = receiver_id
  or public.is_forum_admin()
);

grant select, insert, update on public.direct_messages to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;

commit;

begin;

create extension if not exists pgcrypto;

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.forum_profiles(id) on delete cascade,
  receiver_id uuid not null references public.forum_profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create index if not exists direct_messages_conversation_created_idx
  on public.direct_messages(sender_id, receiver_id, created_at);

create index if not exists direct_messages_receiver_unread_idx
  on public.direct_messages(receiver_id, created_at desc)
  where is_read = false;

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

commit;

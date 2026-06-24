-- AI News submission schema for Timin观察站.
-- Run this in Supabase SQL editor.

-- ============================================================
-- Table: ai_news
-- ============================================================
create table if not exists public.ai_news (
  id bigint generated always as identity primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  summary text not null default '',
  source text not null default '',
  url text not null default '' check (url = '' or url ~* '^https?://'),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists ai_news_approved_idx
  on public.ai_news(created_at desc)
  where is_approved = true;

create index if not exists ai_news_author_id_idx
  on public.ai_news(author_id);

-- ============================================================
-- RLS: enable on the table
-- ============================================================
alter table public.ai_news enable row level security;

-- Policy: Anyone can read approved news
drop policy if exists "Approved news are public" on public.ai_news;
create policy "Approved news are public" on public.ai_news
  for select
  using (is_approved = true);

-- Policy: Authenticated users can submit news (their own)
drop policy if exists "Users submit news" on public.ai_news;
create policy "Users submit news" on public.ai_news
  for insert
  with check (
    auth.uid() = author_id
    and is_approved = false
  );

-- Policy: Authors can see their own pending submissions
drop policy if exists "Authors see own submissions" on public.ai_news;
create policy "Authors see own submissions" on public.ai_news
  for select
  using (
    is_approved = false
    and auth.uid() = author_id
  );

-- Policy: Admins can approve/reject (update is_approved) and delete
drop policy if exists "Admins manage news" on public.ai_news;
create policy "Admins manage news" on public.ai_news
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

drop policy if exists "Admins delete news" on public.ai_news;
create policy "Admins delete news" on public.ai_news
  for delete
  using (public.is_forum_admin());

-- ============================================================
-- View: ai_news_public — only approved news, safe for anon
-- ============================================================
create or replace view public.ai_news_public
  with (security_invoker = true)
as
select
  id,
  author_id,
  title,
  summary,
  source,
  url,
  created_at
from public.ai_news
where is_approved = true
order by created_at desc;

grant select on public.ai_news_public to anon, authenticated;

-- Supabase station reviews schema for Timin观察站.
-- Run this in Supabase SQL editor after the stations-schema.sql and forum-schema.sql are in place.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.station_reviews (
  id uuid primary key default gen_random_uuid(),
  station_id text not null,
  author_id uuid not null references public.forum_profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists station_reviews_station_id_idx
  on public.station_reviews(station_id, created_at desc);

create index if not exists station_reviews_approved_idx
  on public.station_reviews(station_id, created_at desc)
  where is_approved = true;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.station_reviews enable row level security;

-- Anyone can read approved reviews
drop policy if exists "Approved reviews are public" on public.station_reviews;
create policy "Approved reviews are public" on public.station_reviews
  for select
  using (is_approved = true);

-- Authenticated users can submit reviews (their own)
drop policy if exists "Authenticated users submit reviews" on public.station_reviews;
create policy "Authenticated users submit reviews" on public.station_reviews
  for insert
  with check (
    auth.uid() = author_id
    and is_approved = false
  );

-- Admins can update reviews (e.g. approve them)
drop policy if exists "Admins update reviews" on public.station_reviews;
create policy "Admins update reviews" on public.station_reviews
  for update
  using (public.is_forum_admin())
  with check (public.is_forum_admin());

-- Admins can delete reviews
drop policy if exists "Admins delete reviews" on public.station_reviews;
create policy "Admins delete reviews" on public.station_reviews
  for delete
  using (public.is_forum_admin());

-- ---------------------------------------------------------------------------
-- Public view (joins forum_profiles for display names)
-- ---------------------------------------------------------------------------

create or replace view public.station_reviews_public
  with (security_invoker = true)
as
select
  r.id,
  r.station_id,
  r.author_id,
  pr.display_name as author_name,
  r.rating,
  r.body,
  r.created_at
from public.station_reviews r
join public.forum_profiles pr on pr.id = r.author_id
where r.is_approved = true
order by r.created_at desc;

grant select on public.station_reviews_public to anon, authenticated;

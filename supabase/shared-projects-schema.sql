-- Shared Projects Schema — tree-folder navigation for project sharing
-- Run this in Supabase SQL editor.

create table if not exists public.shared_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.shared_folders(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  body text not null default '',
  folder_id uuid references public.shared_folders(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_folders_parent on public.shared_folders(parent_id);
create index if not exists idx_shared_posts_folder on public.shared_posts(folder_id);
create index if not exists idx_shared_posts_created on public.shared_posts(created_at desc);

alter table public.shared_folders enable row level security;
alter table public.shared_posts enable row level security;

drop policy if exists "Folders are public" on public.shared_folders;
create policy "Folders are public" on public.shared_folders for select using (true);

drop policy if exists "Auth users create folders" on public.shared_folders;
create policy "Auth users create folders" on public.shared_folders for insert with check (auth.uid() is not null);

drop policy if exists "Posts are public" on public.shared_posts;
create policy "Posts are public" on public.shared_posts for select using (true);

drop policy if exists "Auth users create posts" on public.shared_posts;
create policy "Auth users create posts" on public.shared_posts for insert with check (auth.uid() = author_id);

drop policy if exists "Author deletes own posts" on public.shared_posts;
create policy "Author deletes own posts" on public.shared_posts for delete using (auth.uid() = author_id);

-- Study & Revision Planner schema.
-- Run once in the Supabase SQL editor (or with `supabase db push`).
-- Security model: every row belongs to owner_id, and RLS only lets the single
-- user listed in app_owner touch anything. Anonymous visitors get nothing.

-- ---------------------------------------------------------------------------
-- Owner lock
-- ---------------------------------------------------------------------------
create table public.app_owner (
  user_id uuid primary key references auth.users (id) on delete cascade
);
-- RLS on with no policies: the browser can never read or change this table.
-- You add your own user id once from the SQL editor (see README).
alter table public.app_owner enable row level security;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_owner where user_id = auth.uid());
$$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.learning_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  subject text,
  notes text,
  learned_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.learning_items (id) on delete cascade,
  round int not null check (round >= 1),
  due_on date not null,
  done_at timestamptz,
  unique (item_id, round)
);
create index revisions_owner_due_idx on public.revisions (owner_id, due_on);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  due_on date not null default current_date,
  done_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index todos_owner_due_idx on public.todos (owner_id, due_on);

create table public.settings (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  long_term_review boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Row Level Security: owner only, enforced on the server
-- ---------------------------------------------------------------------------
alter table public.learning_items enable row level security;
alter table public.revisions enable row level security;
alter table public.todos enable row level security;
alter table public.settings enable row level security;

create policy "owner only" on public.learning_items for all to authenticated
  using (auth.uid() = owner_id and public.is_owner())
  with check (auth.uid() = owner_id and public.is_owner());

create policy "owner only" on public.revisions for all to authenticated
  using (auth.uid() = owner_id and public.is_owner())
  with check (auth.uid() = owner_id and public.is_owner());

create policy "owner only" on public.todos for all to authenticated
  using (auth.uid() = owner_id and public.is_owner())
  with check (auth.uid() = owner_id and public.is_owner());

create policy "owner only" on public.settings for all to authenticated
  using (auth.uid() = owner_id and public.is_owner())
  with check (auth.uid() = owner_id and public.is_owner());

-- Belt and braces: logged-out (anon) requests have no table privileges at all.
revoke all on public.app_owner, public.learning_items, public.revisions, public.todos, public.settings from anon;

-- ---------------------------------------------------------------------------
-- Atomic helpers (security invoker, so the RLS policies above still apply)
-- ---------------------------------------------------------------------------

-- Creates a learning item and all of its revisions in one transaction,
-- so an item never exists without its schedule.
create or replace function public.add_learning_item(p_item jsonb, p_revisions jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into learning_items (id, title, subject, notes, learned_on)
  values (
    (p_item ->> 'id')::uuid,
    p_item ->> 'title',
    nullif(p_item ->> 'subject', ''),
    nullif(p_item ->> 'notes', ''),
    (p_item ->> 'learned_on')::date
  );

  insert into revisions (id, item_id, round, due_on)
  select (r ->> 'id')::uuid, (p_item ->> 'id')::uuid, (r ->> 'round')::int, (r ->> 'due_on')::date
  from jsonb_array_elements(p_revisions) as r;
end;
$$;

-- "Didn't remember it": replaces an item's revisions with a fresh schedule.
create or replace function public.restart_item(p_item_id uuid, p_revisions jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from revisions where item_id = p_item_id;

  insert into revisions (id, item_id, round, due_on)
  select (r ->> 'id')::uuid, p_item_id, (r ->> 'round')::int, (r ->> 'due_on')::date
  from jsonb_array_elements(p_revisions) as r;
end;
$$;

revoke all on function public.add_learning_item(jsonb, jsonb) from public, anon;
revoke all on function public.restart_item(uuid, jsonb) from public, anon;
grant execute on function public.add_learning_item(jsonb, jsonb) to authenticated;
grant execute on function public.restart_item(uuid, jsonb) to authenticated;

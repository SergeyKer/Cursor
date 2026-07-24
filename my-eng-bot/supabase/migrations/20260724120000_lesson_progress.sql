-- lesson_progress: local-first cloud replica for Engvo (schema_version = 1)
-- Apply in Supabase SQL Editor before enabling LESSON_PROGRESS_SYNC.

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  schema_version smallint not null default 1 check (schema_version = 1),
  payload jsonb not null,
  client_updated_at timestamptz not null,
  client_revision bigint not null check (client_revision >= 1),
  updated_at timestamptz not null default now(),
  constraint lesson_progress_payload_size check (octet_length(payload::text) <= 102400),
  primary key (user_id, lesson_id)
);

create index if not exists lesson_progress_user_updated_idx
  on public.lesson_progress (user_id, updated_at desc);

alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_progress_select_own" on public.lesson_progress;
create policy "lesson_progress_select_own"
  on public.lesson_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own"
  on public.lesson_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
create policy "lesson_progress_update_own"
  on public.lesson_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No DELETE policy / privilege on purpose.

revoke all on table public.lesson_progress from anon;
grant select, insert, update on table public.lesson_progress to authenticated;

create or replace function public.set_lesson_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lesson_progress_set_updated_at on public.lesson_progress;
create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row
  execute function public.set_lesson_progress_updated_at();

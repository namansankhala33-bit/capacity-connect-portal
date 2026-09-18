-- ============================================================
-- MIGRATION: TRAINEE <-> TRAINER FEEDBACK SUPPORT CHANNEL
-- Paste this whole block into Supabase -> SQL Editor -> Run.
-- If you already ran it once, it is idempotent (safe to re-run).
-- ============================================================

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  sender_name text not null,
  receiver_id text not null,
  content text not null,
  timestamp text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback_messages enable row level security;

drop policy if exists "feedback_read_all" on public.feedback_messages;
create policy "feedback_read_all"
  on public.feedback_messages
  for select
  using (true);

drop policy if exists "feedback_insert_all" on public.feedback_messages;
create policy "feedback_insert_all"
  on public.feedback_messages
  for insert
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feedback_messages'
  ) then
    alter publication supabase_realtime add table public.feedback_messages;
  end if;
end
$$;
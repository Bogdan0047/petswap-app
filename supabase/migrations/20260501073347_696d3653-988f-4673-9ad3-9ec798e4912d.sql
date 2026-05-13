create table if not exists public.pending_email_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email_type text not null,
  template_data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pending_email_jobs_unique_per_dedupe
  on public.pending_email_jobs (user_id, email_type, coalesce(dedupe_key, ''));

create index if not exists pending_email_jobs_due_idx
  on public.pending_email_jobs (status, scheduled_for);

alter table public.pending_email_jobs enable row level security;

create policy "Service role manages pending email jobs"
  on public.pending_email_jobs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Admins read pending email jobs"
  on public.pending_email_jobs
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create policy "Users insert their own pending email jobs"
  on public.pending_email_jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users insert pending email jobs for matched bookings"
  on public.pending_email_jobs
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.chat_bookings cb
      where (cb.helper_id = auth.uid() or cb.owner_id = auth.uid())
        and (cb.helper_id = pending_email_jobs.user_id or cb.owner_id = pending_email_jobs.user_id)
    )
  );
-- Photo optimizer run log (run once in the Supabase SQL editor).
-- api/optimize-photos.js writes one row per run (weekly cron or the admin "Run now" button)
-- using the service-role key; only admins can read the rows.

create table if not exists public.photo_optimization_runs (
  id          uuid primary key default gen_random_uuid(),
  ran_at      timestamptz not null default now(),
  trigger     text not null default 'cron' check (trigger in ('cron', 'manual')),
  scanned     int  not null default 0,   -- original photos found in the bucket
  optimized   int  not null default 0,   -- photos that got at least one new copy this run
  copies_made int  not null default 0,   -- 640 / 960 / 1280 copies written
  failed      int  not null default 0,
  remaining   int  not null default 0,   -- photos still waiting (batch limit reached)
  duration_ms int  not null default 0,
  error       text
);

create index if not exists photo_optimization_runs_ran_at_idx
  on public.photo_optimization_runs (ran_at desc);

alter table public.photo_optimization_runs enable row level security;

drop policy if exists "admins read photo runs" on public.photo_optimization_runs;
create policy "admins read photo runs" on public.photo_optimization_runs
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policies: only the service-role key (server) writes.

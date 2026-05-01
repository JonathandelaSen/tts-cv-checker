create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "Admins can read admin users"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()));

create table public.processing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  cv_id uuid references public.cvs(id) on delete set null,
  analysis_id uuid references public.analyses(id) on delete set null,
  request_id text not null,
  stage text not null,
  status text not null check (status in ('started', 'success', 'warning', 'error')),
  source text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  file_size bigint check (file_size is null or file_size >= 0),
  text_length integer check (text_length is null or text_length >= 0),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.processing_events enable row level security;

create policy "Admins can read processing events"
on public.processing_events for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users admins
    where admins.user_id = (select auth.uid())
  )
);

create index processing_events_created_idx
on public.processing_events (created_at desc);

create index processing_events_request_idx
on public.processing_events (request_id, created_at);

create index processing_events_cv_idx
on public.processing_events (cv_id, created_at desc)
where cv_id is not null;

create index processing_events_analysis_idx
on public.processing_events (analysis_id, created_at desc)
where analysis_id is not null;

create index processing_events_status_stage_idx
on public.processing_events (status, stage, created_at desc);

grant select on public.admin_users to authenticated;
grant select on public.processing_events to authenticated;

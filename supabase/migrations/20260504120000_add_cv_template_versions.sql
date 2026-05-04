create table if not exists public.cv_template_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_cv_id uuid not null references public.cvs(id) on delete cascade,
  name text not null,
  template_id text not null,
  template_locale text not null default 'es',
  schema_version text not null,
  source_text_hash text not null,
  ai_model text not null,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cv_template_versions enable row level security;

create policy "Users can read their CV template versions"
on public.cv_template_versions for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.cvs
    where cvs.id = cv_template_versions.source_cv_id
      and cvs.user_id = (select auth.uid())
  )
);

create policy "Users can create their CV template versions"
on public.cv_template_versions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.cvs
    where cvs.id = cv_template_versions.source_cv_id
      and cvs.user_id = (select auth.uid())
  )
);

create policy "Users can update their CV template versions"
on public.cv_template_versions for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.cvs
    where cvs.id = cv_template_versions.source_cv_id
      and cvs.user_id = (select auth.uid())
  )
);

create policy "Users can delete their CV template versions"
on public.cv_template_versions for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists cv_template_versions_user_created_idx
on public.cv_template_versions (user_id, created_at desc);

create index if not exists cv_template_versions_source_cv_idx
on public.cv_template_versions (source_cv_id);

create trigger cv_template_versions_set_updated_at
before update on public.cv_template_versions
for each row
execute function public.set_updated_at();

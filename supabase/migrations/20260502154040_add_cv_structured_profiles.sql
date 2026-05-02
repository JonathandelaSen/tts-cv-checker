create table public.cv_structured_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_id uuid not null references public.cvs(id) on delete cascade,
  schema_version text not null,
  source_text_hash text not null,
  ai_model text not null,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cv_id, schema_version)
);

alter table public.cv_structured_profiles enable row level security;

create policy "Users can read their structured CV profiles"
on public.cv_structured_profiles for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.cvs
    where cvs.id = cv_structured_profiles.cv_id
      and cvs.user_id = (select auth.uid())
  )
);

create policy "Users can create their structured CV profiles"
on public.cv_structured_profiles for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.cvs
    where cvs.id = cv_structured_profiles.cv_id
      and cvs.user_id = (select auth.uid())
  )
);

create policy "Users can update their structured CV profiles"
on public.cv_structured_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.cvs
    where cvs.id = cv_structured_profiles.cv_id
      and cvs.user_id = (select auth.uid())
  )
);

create policy "Users can delete their structured CV profiles"
on public.cv_structured_profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

create index cv_structured_profiles_user_created_idx
on public.cv_structured_profiles (user_id, created_at desc);

create index cv_structured_profiles_cv_idx
on public.cv_structured_profiles (cv_id);

create trigger cv_structured_profiles_set_updated_at
before update on public.cv_structured_profiles
for each row
execute function public.set_updated_at();

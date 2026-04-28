create extension if not exists "pgcrypto";

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  file_size bigint,
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  text_python text,
  text_pdfjs text,
  text_node text,
  extract_error_python text,
  extract_error_pdfjs text,
  extract_error_node text,
  ai_model text,
  job_description text,
  ai_score integer,
  ai_feedback text,
  ai_keywords jsonb,
  ai_improvements jsonb,
  ai_analyzed_at timestamptz
);

alter table public.analyses enable row level security;

create policy "Users can read their analyses"
on public.analyses for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their analyses"
on public.analyses for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their analyses"
on public.analyses for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their analyses"
on public.analyses for delete
to authenticated
using ((select auth.uid()) = user_id);

create index analyses_user_created_idx
on public.analyses (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger analyses_set_updated_at
before update on public.analyses
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cv-pdfs', 'cv-pdfs', false, 52428800, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read their CV PDFs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cv-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can upload their CV PDFs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cv-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can update their CV PDFs"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cv-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'cv-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their CV PDFs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cv-pdfs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

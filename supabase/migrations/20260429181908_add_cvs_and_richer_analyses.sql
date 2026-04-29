create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
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
  extract_error_node text
);

alter table public.cvs enable row level security;

create policy "Users can read their CVs"
on public.cvs for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their CVs"
on public.cvs for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their CVs"
on public.cvs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their CVs"
on public.cvs for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists cvs_user_created_idx
on public.cvs (user_id, created_at desc);

drop trigger if exists cvs_set_updated_at on public.cvs;
create trigger cvs_set_updated_at
before update on public.cvs
for each row
execute function public.set_updated_at();

alter table public.analyses
  add column if not exists cv_id uuid,
  add column if not exists title text,
  add column if not exists job_url text,
  add column if not exists job_key_data jsonb,
  add column if not exists job_keywords jsonb,
  add column if not exists cv_keywords jsonb,
  add column if not exists matching_keywords jsonb,
  add column if not exists missing_keywords jsonb;

do $$
declare
  analysis_row public.analyses%rowtype;
  new_cv_id uuid;
begin
  for analysis_row in
    select * from public.analyses where cv_id is null
  loop
    insert into public.cvs (
      user_id,
      name,
      filename,
      file_size,
      pdf_storage_path,
      created_at,
      updated_at,
      text_python,
      text_pdfjs,
      text_node,
      extract_error_python,
      extract_error_pdfjs,
      extract_error_node
    )
    values (
      analysis_row.user_id,
      regexp_replace(analysis_row.filename, '\.pdf$', '', 'i'),
      analysis_row.filename,
      analysis_row.file_size,
      analysis_row.pdf_storage_path,
      analysis_row.created_at,
      analysis_row.updated_at,
      analysis_row.text_python,
      analysis_row.text_pdfjs,
      analysis_row.text_node,
      analysis_row.extract_error_python,
      analysis_row.extract_error_pdfjs,
      analysis_row.extract_error_node
    )
    returning id into new_cv_id;

    update public.analyses
    set
      cv_id = new_cv_id,
      title = coalesce(
        title,
        case
          when analysis_row.analysis_mode = 'general' then 'Análisis CV - ' || regexp_replace(analysis_row.filename, '\.pdf$', '', 'i')
          else 'Oferta - ' || regexp_replace(analysis_row.filename, '\.pdf$', '', 'i')
        end
      ),
      cv_keywords = coalesce(cv_keywords, ai_keywords)
    where id = analysis_row.id;
  end loop;
end $$;

alter table public.analyses
  alter column title set default 'Análisis sin nombre';

update public.analyses
set title = 'Análisis sin nombre'
where title is null;

alter table public.analyses
  alter column title set not null;

alter table public.analyses
  alter column cv_id set not null;

alter table public.analyses
  add constraint analyses_cv_id_fkey
  foreign key (cv_id) references public.cvs(id) on delete restrict;

create index if not exists analyses_user_mode_created_idx
on public.analyses (user_id, analysis_mode, created_at desc);

create index if not exists analyses_cv_id_idx
on public.analyses (cv_id);

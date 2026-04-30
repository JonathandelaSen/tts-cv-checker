alter table public.cvs
  add constraint cvs_pdf_storage_path_user_prefix
  check (
    pdf_storage_path is null
    or split_part(pdf_storage_path, '/', 1) = user_id::text
  );

alter table public.analyses
  add constraint analyses_pdf_storage_path_user_prefix
  check (
    pdf_storage_path is null
    or split_part(pdf_storage_path, '/', 1) = user_id::text
  );

drop policy if exists "Users can create their analyses" on public.analyses;
create policy "Users can create their analyses"
on public.analyses for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.cvs
    where cvs.id = analyses.cv_id
      and cvs.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update their analyses" on public.analyses;
create policy "Users can update their analyses"
on public.analyses for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.cvs
    where cvs.id = analyses.cv_id
      and cvs.user_id = (select auth.uid())
  )
);

alter table public.processing_events
  drop constraint if exists processing_events_user_id_fkey,
  drop constraint if exists processing_events_cv_id_fkey,
  drop constraint if exists processing_events_analysis_id_fkey;

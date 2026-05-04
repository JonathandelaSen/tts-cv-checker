-- Unify cv_template_versions into cvs table with a type discriminator

-- 1. Add new columns to cvs
ALTER TABLE public.cvs
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS source_cv_id uuid REFERENCES public.cvs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS template_locale text,
  ADD COLUMN IF NOT EXISTS schema_version text,
  ADD COLUMN IF NOT EXISTS source_text_hash text,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS profile jsonb;

ALTER TABLE public.cvs
  ADD CONSTRAINT cvs_type_check CHECK (type IN ('uploaded', 'template'));

-- 2. Make pdf_storage_path and filename nullable (template CVs don't have PDFs)
ALTER TABLE public.cvs
  ALTER COLUMN pdf_storage_path DROP NOT NULL,
  ALTER COLUMN filename DROP NOT NULL;

-- 3. Migrate data from cv_template_versions → cvs
INSERT INTO public.cvs (
  id, user_id, name, type, source_cv_id, template_id, template_locale,
  schema_version, source_text_hash, ai_model, profile, created_at, updated_at
)
SELECT
  id, user_id, name, 'template', source_cv_id, template_id, template_locale,
  schema_version, source_text_hash, ai_model, profile, created_at, updated_at
FROM public.cv_template_versions;

-- 4. Drop cv_template_versions (policies, triggers, indexes go with it)
DROP TABLE IF EXISTS public.cv_template_versions CASCADE;

-- 5. Index for source_cv_id lookups
CREATE INDEX IF NOT EXISTS cvs_source_cv_id_idx
  ON public.cvs (source_cv_id) WHERE source_cv_id IS NOT NULL;

-- 6. Index for type filtering
CREATE INDEX IF NOT EXISTS cvs_type_idx ON public.cvs (user_id, type, created_at DESC);

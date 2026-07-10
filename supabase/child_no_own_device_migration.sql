-- Kind ohne eigenes Gerät: Eltern können sich vorübergehend als Kind einloggen.

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS no_own_device boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';

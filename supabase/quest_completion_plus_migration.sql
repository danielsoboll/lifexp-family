-- PLUS: Quest-Abschluss mit Fotos (Assignee) und Avatar-Reaktion (Ersteller)
-- Im Supabase SQL Editor ausführen.

-- 1) Fotos der erledigenden Person (max. 2 pro Abschluss)
CREATE TABLE IF NOT EXISTS public.quest_completion_assignee_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id uuid NOT NULL REFERENCES public.quest_completions (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order smallint NOT NULL CHECK (sort_order BETWEEN 1 AND 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quest_completion_assignee_photos_completion_sort_uidx UNIQUE (completion_id, sort_order)
);

CREATE INDEX IF NOT EXISTS quest_completion_assignee_photos_completion_idx
  ON public.quest_completion_assignee_photos (completion_id);

CREATE INDEX IF NOT EXISTS quest_completion_assignee_photos_family_idx
  ON public.quest_completion_assignee_photos (family_id);

-- 2) Reaktion des Quest-Erstellers (Text + Portrait-Ausschnitt)
CREATE TABLE IF NOT EXISTS public.quest_completion_creator_reactions (
  completion_id uuid PRIMARY KEY REFERENCES public.quest_completions (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  creator_kind text NOT NULL CHECK (creator_kind IN ('parent', 'child')),
  creator_parent_id uuid REFERENCES public.parent_profiles (id) ON DELETE SET NULL,
  creator_child_id uuid REFERENCES public.child_profiles (id) ON DELETE SET NULL,
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 280),
  portrait_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quest_completion_creator_reactions_creator_chk CHECK (
    (creator_kind = 'parent' AND creator_parent_id IS NOT NULL AND creator_child_id IS NULL)
    OR (creator_kind = 'child' AND creator_child_id IS NOT NULL AND creator_parent_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS quest_completion_creator_reactions_family_idx
  ON public.quest_completion_creator_reactions (family_id);

COMMENT ON TABLE public.quest_completion_assignee_photos IS
  'PLUS: Bis zu 2 Beweisfotos pro Quest-Abschluss (z. B. aufgeräumtes Zimmer).';
COMMENT ON TABLE public.quest_completion_creator_reactions IS
  'PLUS: Ersteller-Reaktion mit Kurztext und gewähltem Portrait (Gesichtsausschnitt).';

-- 3) RLS (MVP: anon — wie übrige Family-Tabellen)
ALTER TABLE public.quest_completion_assignee_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_completion_creator_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quest_completion_assignee_photos_anon_all ON public.quest_completion_assignee_photos;
CREATE POLICY quest_completion_assignee_photos_anon_all
  ON public.quest_completion_assignee_photos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quest_completion_creator_reactions_anon_all ON public.quest_completion_creator_reactions;
CREATE POLICY quest_completion_creator_reactions_anon_all
  ON public.quest_completion_creator_reactions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quest_completion_assignee_photos_authenticated_all ON public.quest_completion_assignee_photos;
CREATE POLICY quest_completion_assignee_photos_authenticated_all
  ON public.quest_completion_assignee_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quest_completion_creator_reactions_authenticated_all ON public.quest_completion_creator_reactions;
CREATE POLICY quest_completion_creator_reactions_authenticated_all
  ON public.quest_completion_creator_reactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4) Storage-Bucket für Quest-Fotos (privat — Zugriff über signed URLs / anon policy)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quest-completion-photos',
  'quest-completion-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS quest_completion_photos_anon_all ON storage.objects;
CREATE POLICY quest_completion_photos_anon_all
  ON storage.objects FOR ALL TO anon
  USING (bucket_id = 'quest-completion-photos')
  WITH CHECK (bucket_id = 'quest-completion-photos');

DROP POLICY IF EXISTS quest_completion_photos_authenticated_all ON storage.objects;
CREATE POLICY quest_completion_photos_authenticated_all
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'quest-completion-photos')
  WITH CHECK (bucket_id = 'quest-completion-photos');

NOTIFY pgrst, 'reload schema';

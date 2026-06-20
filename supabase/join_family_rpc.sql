-- RPC: Familie per Einladungscode beitreten (MVP ohne Auth)
-- Im Supabase SQL Editor ausführen, falls join_family_with_invite_code noch fehlt.

CREATE OR REPLACE FUNCTION public.join_family_with_invite_code(
  p_invite_code text,
  p_parent_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_family_id uuid;
BEGIN
  IF char_length(trim(p_invite_code)) < 1 THEN
    RAISE EXCEPTION 'Einladungscode fehlt';
  END IF;
  IF char_length(trim(p_parent_name)) < 1 THEN
    RAISE EXCEPTION 'Elternname fehlt';
  END IF;

  SELECT id INTO v_family_id
  FROM public.families
  WHERE lower(trim(invite_code)) = lower(trim(p_invite_code))
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Einladungscode ungültig';
  END IF;

  INSERT INTO public.parent_profiles (display_name)
  VALUES (trim(p_parent_name))
  RETURNING id INTO v_parent_id;

  INSERT INTO public.family_members (family_id, parent_id, role)
  VALUES (v_family_id, v_parent_id, 'parent');

  RETURN json_build_object('family_id', v_family_id, 'parent_id', v_parent_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_family_with_invite_code(text, text) TO anon, authenticated;

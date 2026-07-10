-- Behebt Stack-Overflow durch RLS-Rekursion in lifexp_* Hilfsfunktionen.

CREATE OR REPLACE FUNCTION public.lifexp_session_is_valid()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fam uuid;
  mem uuid;
  kind text;
BEGIN
  fam := nullif(lifexp_header('x-lifexp-family-id'), '')::uuid;
  mem := nullif(lifexp_header('x-lifexp-member-id'), '')::uuid;
  kind := nullif(lifexp_header('x-lifexp-member-kind'), '');

  IF fam IS NULL OR mem IS NULL OR kind NOT IN ('parent', 'child') THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  IF kind = 'parent' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = fam
        AND fm.parent_id = mem
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    WHERE cp.family_id = fam
      AND cp.id = mem
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_invite_family_match(row_family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  code := lifexp_invite_code_header();
  IF code IS NULL OR row_family_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.families f
    WHERE f.id = row_family_id
      AND f.invite_code IS NOT NULL
      AND lower(trim(f.invite_code)) = lower(trim(code))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_parent_in_family(parent_id uuid, family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF parent_id IS NULL OR family_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.parent_id = lifexp_parent_in_family.parent_id
      AND fm.family_id = lifexp_parent_in_family.family_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_parent_visible(parent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  recovery text;
BEGIN
  IF parent_id IS NULL THEN
    RETURN false;
  END IF;

  IF lifexp_is_service_role() THEN
    RETURN true;
  END IF;

  IF lifexp_session_is_valid()
    AND lifexp_parent_in_family(parent_id, lifexp_session_family_id()) THEN
    RETURN true;
  END IF;

  code := lifexp_invite_code_header();
  recovery := lifexp_recovery_code_header();

  PERFORM set_config('row_security', 'off', true);

  IF code IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.family_members fm
      JOIN public.families f ON f.id = fm.family_id
      WHERE fm.parent_id = lifexp_parent_visible.parent_id
        AND f.invite_code IS NOT NULL
        AND lower(trim(f.invite_code)) = lower(trim(code))
    );
  END IF;

  IF recovery IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.parent_profiles pp
      WHERE pp.id = lifexp_parent_visible.parent_id
        AND pp.rec_code IS NOT NULL
        AND upper(trim(pp.rec_code)) = upper(trim(recovery))
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_child_visible(row_family_id uuid, child_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recovery text;
BEGIN
  IF row_family_id IS NULL OR child_id IS NULL THEN
    RETURN false;
  END IF;

  IF lifexp_is_service_role() OR lifexp_same_family(row_family_id) OR lifexp_invite_family_match(row_family_id) THEN
    RETURN true;
  END IF;

  recovery := lifexp_recovery_code_header();
  IF recovery IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    WHERE cp.id = child_id
      AND cp.family_id = row_family_id
      AND cp.rec_code IS NOT NULL
      AND upper(trim(cp.rec_code)) = upper(trim(recovery))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lifexp_session_is_valid() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_invite_family_match(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_parent_in_family(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_parent_visible(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_child_visible(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.lifexp_session_is_valid() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_invite_family_match(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_parent_in_family(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_parent_visible(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_child_visible(uuid, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

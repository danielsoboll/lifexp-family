-- Behebt „column reference parent_id is ambiguous“ in RLS-Hilfsfunktionen und -Policies.

CREATE OR REPLACE FUNCTION public.lifexp_parent_already_in_any_family(check_parent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_parent_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.parent_id = lifexp_parent_already_in_any_family.check_parent_id
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

DROP POLICY IF EXISTS family_rls_family_members ON public.family_members;
CREATE POLICY family_rls_family_members ON public.family_members FOR ALL TO anon, authenticated
  USING (
    lifexp_is_service_role()
    OR lifexp_same_family(family_id)
    OR lifexp_invite_family_match(family_id)
  )
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_same_family(family_id)
    OR (
      lifexp_onboarding_mode() = 'create'
      AND NOT lifexp_parent_already_in_any_family(parent_id)
    )
    OR (
      lifexp_onboarding_mode() = 'join'
      AND lifexp_invite_family_match(family_id)
      AND NOT lifexp_parent_already_in_any_family(parent_id)
    )
  );

REVOKE ALL ON FUNCTION public.lifexp_parent_already_in_any_family(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lifexp_parent_already_in_any_family(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

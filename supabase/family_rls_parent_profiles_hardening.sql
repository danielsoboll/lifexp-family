-- RLS-Härtung: parent_profiles nur für Admins ändern/löschen (nicht jedes Familienmitglied).
-- Orphan-Löschung nach Familien-Delete bleibt über Admin-Session vor dem Family-Delete möglich.

DROP POLICY IF EXISTS family_rls_parent_profiles ON public.parent_profiles;
DROP POLICY IF EXISTS family_rls_parent_profiles_select ON public.parent_profiles;
DROP POLICY IF EXISTS family_rls_parent_profiles_insert ON public.parent_profiles;
DROP POLICY IF EXISTS family_rls_parent_profiles_update ON public.parent_profiles;
DROP POLICY IF EXISTS family_rls_parent_profiles_delete ON public.parent_profiles;

CREATE POLICY family_rls_parent_profiles_select ON public.parent_profiles
  FOR SELECT TO anon, authenticated
  USING (
    lifexp_parent_visible(id)
    OR (
      lifexp_session_is_family_admin()
      AND NOT lifexp_parent_already_in_any_family(id)
    )
  );

CREATE POLICY family_rls_parent_profiles_insert ON public.parent_profiles
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_onboarding_write_allowed()
    OR (
      lifexp_session_is_valid()
      AND lifexp_session_member_kind() = 'parent'
      AND id = lifexp_session_member_id()
    )
    OR lifexp_session_is_family_admin()
  );

CREATE POLICY family_rls_parent_profiles_update ON public.parent_profiles
  FOR UPDATE TO anon, authenticated
  USING (
    lifexp_parent_visible(id)
    OR (
      lifexp_session_is_family_admin()
      AND NOT lifexp_parent_already_in_any_family(id)
    )
  )
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_onboarding_write_allowed()
    OR (
      lifexp_session_is_valid()
      AND lifexp_session_member_kind() = 'parent'
      AND id = lifexp_session_member_id()
    )
    OR (
      lifexp_session_is_family_admin()
      AND lifexp_parent_in_family(id, lifexp_session_family_id())
    )
    OR (
      lifexp_session_is_family_admin()
      AND NOT lifexp_parent_already_in_any_family(id)
    )
  );

CREATE POLICY family_rls_parent_profiles_delete ON public.parent_profiles
  FOR DELETE TO anon, authenticated
  USING (
    lifexp_is_service_role()
    OR lifexp_onboarding_write_allowed()
    OR (
      lifexp_session_is_family_admin()
      AND lifexp_parent_in_family(id, lifexp_session_family_id())
    )
    OR (
      lifexp_session_is_family_admin()
      AND NOT lifexp_parent_already_in_any_family(id)
    )
  );

-- child_profiles: Schreiben/Löschen nur für sich selbst oder Admin (nicht Geschwister).

DROP POLICY IF EXISTS family_rls_child_profiles ON public.child_profiles;
DROP POLICY IF EXISTS family_rls_child_profiles_select ON public.child_profiles;
DROP POLICY IF EXISTS family_rls_child_profiles_insert ON public.child_profiles;
DROP POLICY IF EXISTS family_rls_child_profiles_update ON public.child_profiles;
DROP POLICY IF EXISTS family_rls_child_profiles_delete ON public.child_profiles;

CREATE POLICY family_rls_child_profiles_select ON public.child_profiles
  FOR SELECT TO anon, authenticated
  USING (lifexp_child_visible(family_id, id));

CREATE POLICY family_rls_child_profiles_insert ON public.child_profiles
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_same_family(family_id)
    OR lifexp_onboarding_write_allowed()
    OR lifexp_session_is_family_admin()
  );

CREATE POLICY family_rls_child_profiles_update ON public.child_profiles
  FOR UPDATE TO anon, authenticated
  USING (lifexp_child_visible(family_id, id))
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_onboarding_write_allowed()
    OR (
      lifexp_session_is_valid()
      AND lifexp_session_member_kind() = 'child'
      AND id = lifexp_session_member_id()
      AND lifexp_same_family(family_id)
    )
    OR (
      lifexp_session_is_family_admin()
      AND lifexp_same_family(family_id)
    )
  );

CREATE POLICY family_rls_child_profiles_delete ON public.child_profiles
  FOR DELETE TO anon, authenticated
  USING (
    lifexp_is_service_role()
    OR lifexp_onboarding_write_allowed()
    OR (
      lifexp_session_is_family_admin()
      AND lifexp_same_family(family_id)
    )
  );

NOTIFY pgrst, 'reload schema';

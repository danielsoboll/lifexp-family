-- Admin darf neue parent_profiles anlegen und direkt zurücklesen (vor family_members-Link).

DROP POLICY IF EXISTS family_rls_parent_profiles ON public.parent_profiles;
CREATE POLICY family_rls_parent_profiles ON public.parent_profiles FOR ALL TO anon, authenticated
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
      lifexp_session_is_valid()
      AND lifexp_parent_in_family(id, lifexp_session_family_id())
    )
    OR lifexp_session_is_family_admin()
  );

DROP FUNCTION IF EXISTS public.lifexp_debug_admin_check();

NOTIFY pgrst, 'reload schema';

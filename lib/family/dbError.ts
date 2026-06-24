export function familyDbError(message: string): Error {
  const needsMigration =
    message.includes('parent_profiles_id_fkey') ||
    message.includes("'parent_id'") ||
    (message.includes('parent_id') && message.includes('family_members')) ||
    message.includes('schema cache') ||
    message.includes('parent_profiles_gender_check')

  if (needsMigration) {
    return new Error(
      'Datenbank-Schema passt noch nicht zur App. Im SQL Editor einmal supabase/pending_migrations.sql ausführen.',
    )
  }
  return new Error(message)
}

import { getStoredFamilyId } from '../familySession'
import { supabase } from '../supabase'

export async function deleteFamilyById(familyId: string): Promise<{ error: Error | null }> {
  const storedFamilyId = getStoredFamilyId()
  if (!storedFamilyId || storedFamilyId !== familyId) {
    return { error: new Error('Keine gültige Familien-Session.') }
  }

  const { error } = await supabase.from('families').delete().eq('id', familyId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function deleteChildById(childId: string, familyId: string): Promise<{ error: Error | null }> {
  const storedFamilyId = getStoredFamilyId()
  if (!storedFamilyId || storedFamilyId !== familyId) {
    return { error: new Error('Keine gültige Familien-Session.') }
  }

  const { error } = await supabase.from('child_profiles').delete().eq('id', childId).eq('family_id', familyId)
  if (error) return { error: new Error(error.message) }
  return { error: null }
}

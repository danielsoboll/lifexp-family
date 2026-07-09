import { supabase } from '../supabase'
import type { AvatarPortraitId } from './memberAvatar'
import { isPortraitId } from './memberAvatar'

export const QUEST_COMPLETION_PHOTOS_BUCKET = 'quest-completion-photos'

export type QuestCompletionPhoto = {
  id: string
  completionId: string
  storagePath: string
  sortOrder: number
  url: string
}

export type QuestCompletionCreatorReaction = {
  completionId: string
  message: string
  portraitId: AvatarPortraitId
  creatorKind: 'parent' | 'child'
  creatorParentId: string | null
  creatorChildId: string | null
  createdAt: string
}

export type QuestCompletionEnrichment = {
  photos: QuestCompletionPhoto[]
  assigneeMessage: string | null
  reaction: QuestCompletionCreatorReaction | null
}

function isMissingPlusTableError(error: { message?: string; code?: string }): boolean {
  return Boolean(
    error.message?.includes('quest_completion_assignee_photos') ||
      error.message?.includes('quest_completion_creator_reactions') ||
      error.message?.includes('schema cache') ||
      error.code === 'PGRST205',
  )
}

export function questCompletionPhotoPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(QUEST_COMPLETION_PHOTOS_BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

/** Signed URL für privaten Bucket (1 h gültig). */
export async function questCompletionPhotoSignedUrl(
  storagePath: string,
): Promise<{ url: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(QUEST_COMPLETION_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error) return { url: null, error: new Error(error.message) }
  return { url: data?.signedUrl ?? null, error: null }
}

function mapPhotoRow(row: {
  id: string
  completion_id: string
  storage_path: string
  sort_order: number
}): Omit<QuestCompletionPhoto, 'url'> {
  return {
    id: row.id,
    completionId: row.completion_id,
    storagePath: row.storage_path,
    sortOrder: row.sort_order,
  }
}

export async function fetchQuestCompletionEnrichment(
  completionIds: readonly string[],
): Promise<{ byCompletionId: Map<string, QuestCompletionEnrichment>; error: Error | null }> {
  const byCompletionId = new Map<string, QuestCompletionEnrichment>()
  if (completionIds.length === 0) return { byCompletionId, error: null }

  const ids = [...new Set(completionIds)]

  const [{ data: photoRows, error: photoError }, { data: reactionRows, error: reactionError }, { data: completionRows, error: completionError }] =
    await Promise.all([
      supabase
        .from('quest_completion_assignee_photos')
        .select('id, completion_id, storage_path, sort_order')
        .in('completion_id', ids)
        .order('sort_order', { ascending: true }),
      supabase
        .from('quest_completion_creator_reactions')
        .select(
          'completion_id, message, portrait_id, creator_kind, creator_parent_id, creator_child_id, created_at',
        )
        .in('completion_id', ids),
      supabase.from('quest_completions').select('id, note').in('id', ids),
    ])

  if (photoError && !isMissingPlusTableError(photoError)) {
    return { byCompletionId, error: new Error(photoError.message) }
  }
  if (reactionError && !isMissingPlusTableError(reactionError)) {
    return { byCompletionId, error: new Error(reactionError.message) }
  }
  if (completionError) {
    return { byCompletionId, error: new Error(completionError.message) }
  }

  for (const id of ids) {
    byCompletionId.set(id, { photos: [], assigneeMessage: null, reaction: null })
  }

  for (const row of completionRows ?? []) {
    const completionId = row.id as string
    const entry = byCompletionId.get(completionId)
    if (!entry) continue
    const note = typeof row.note === 'string' ? row.note.trim() : ''
    entry.assigneeMessage = note.length > 0 ? note : null
  }

  const photoEntries: Omit<QuestCompletionPhoto, 'url'>[] = []
  for (const row of photoRows ?? []) {
    photoEntries.push(
      mapPhotoRow(row as { id: string; completion_id: string; storage_path: string; sort_order: number }),
    )
  }

  const signedUrls = await Promise.all(
    photoEntries.map((entry) => questCompletionPhotoSignedUrl(entry.storagePath)),
  )

  photoEntries.forEach((mapped, index) => {
    const entry = byCompletionId.get(mapped.completionId)
    const signed = signedUrls[index]
    if (!entry || !signed?.url) return
    entry.photos.push({ ...mapped, url: signed.url })
  })

  for (const row of reactionRows ?? []) {
    const portraitId = row.portrait_id as string
    if (!isPortraitId(portraitId)) continue
    const completionId = row.completion_id as string
    const entry = byCompletionId.get(completionId)
    if (!entry) continue
    entry.reaction = {
      completionId,
      message: row.message as string,
      portraitId: portraitId as AvatarPortraitId,
      creatorKind: row.creator_kind as 'parent' | 'child',
      creatorParentId: (row.creator_parent_id as string | null) ?? null,
      creatorChildId: (row.creator_child_id as string | null) ?? null,
      createdAt: row.created_at as string,
    }
  }

  return { byCompletionId, error: null }
}

export async function uploadQuestCompletionAssigneePhotos(input: {
  familyId: string
  completionId: string
  files: readonly File[]
}): Promise<{ photos: QuestCompletionPhoto[]; error: Error | null }> {
  const trimmed = input.files.filter((file) => file.size > 0).slice(0, 2)
  if (trimmed.length === 0) return { photos: [], error: null }

  const uploaded: QuestCompletionPhoto[] = []

  for (let index = 0; index < trimmed.length; index += 1) {
    const file = trimmed[index]!
    const sortOrder = index + 1
    const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
    const storagePath = `${input.familyId}/${input.completionId}/${sortOrder}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(QUEST_COMPLETION_PHOTOS_BUCKET)
      .upload(storagePath, file, { upsert: true, contentType: file.type || undefined })

    if (uploadError) {
      return { photos: uploaded, error: new Error(uploadError.message) }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('quest_completion_assignee_photos')
      .upsert(
        {
          completion_id: input.completionId,
          family_id: input.familyId,
          storage_path: storagePath,
          sort_order: sortOrder,
        },
        { onConflict: 'completion_id,sort_order' },
      )
      .select('id, completion_id, storage_path, sort_order')
      .single()

    if (insertError) {
      if (isMissingPlusTableError(insertError)) {
        return { photos: uploaded, error: new Error('PLUS-Fotos sind noch nicht eingerichtet. Bitte Migration ausführen.') }
      }
      return { photos: uploaded, error: new Error(insertError.message) }
    }

    const mapped = mapPhotoRow(
      inserted as { id: string; completion_id: string; storage_path: string; sort_order: number },
    )
    const { url } = await questCompletionPhotoSignedUrl(mapped.storagePath)
    uploaded.push({ ...mapped, url: url ?? '' })
  }

  return { photos: uploaded, error: null }
}

export async function saveQuestCompletionAssigneeMessage(input: {
  familyId: string
  completionId: string
  message: string
}): Promise<{ error: Error | null }> {
  const trimmed = input.message.trim()
  if (trimmed.length === 0) return { error: null }
  if (trimmed.length > 280) {
    return { error: new Error('Maximal 280 Zeichen.') }
  }

  const { error } = await supabase
    .from('quest_completions')
    .update({ note: trimmed })
    .eq('id', input.completionId)
    .eq('family_id', input.familyId)

  if (error) return { error: new Error(error.message) }
  return { error: null }
}

export async function saveQuestCompletionAssigneeContent(input: {
  familyId: string
  completionId: string
  message?: string
  files?: readonly File[]
}): Promise<{ photos: QuestCompletionPhoto[]; error: Error | null }> {
  const messageError = input.message
    ? (await saveQuestCompletionAssigneeMessage({
        familyId: input.familyId,
        completionId: input.completionId,
        message: input.message,
      })).error
    : null
  if (messageError) return { photos: [], error: messageError }

  const files = input.files ?? []
  if (files.length === 0) return { photos: [], error: null }

  return uploadQuestCompletionAssigneePhotos({
    familyId: input.familyId,
    completionId: input.completionId,
    files,
  })
}

export async function saveQuestCompletionCreatorReaction(input: {
  familyId: string
  completionId: string
  message: string
  portraitId: AvatarPortraitId
  creatorKind: 'parent' | 'child'
  creatorParentId: string | null
  creatorChildId: string | null
}): Promise<{ error: Error | null }> {
  const trimmed = input.message.trim()
  if (trimmed.length === 0) {
    return { error: new Error('Bitte einen kurzen Text eingeben.') }
  }
  if (!isPortraitId(input.portraitId)) {
    return { error: new Error('Bitte ein Portrait wählen.') }
  }

  const { error } = await supabase.from('quest_completion_creator_reactions').upsert(
    {
      completion_id: input.completionId,
      family_id: input.familyId,
      creator_kind: input.creatorKind,
      creator_parent_id: input.creatorParentId,
      creator_child_id: input.creatorChildId,
      message: trimmed,
      portrait_id: input.portraitId,
    },
    { onConflict: 'completion_id' },
  )

  if (error) {
    if (isMissingPlusTableError(error)) {
      return { error: new Error('PLUS-Reaktionen sind noch nicht eingerichtet. Bitte Migration ausführen.') }
    }
    return { error: new Error(error.message) }
  }

  return { error: null }
}

export async function fetchAssigneePhotosForCompletion(
  completionId: string,
): Promise<{ photos: QuestCompletionPhoto[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('quest_completion_assignee_photos')
    .select('id, completion_id, storage_path, sort_order')
    .eq('completion_id', completionId)
    .order('sort_order', { ascending: true })

  if (error) {
    if (isMissingPlusTableError(error)) return { photos: [], error: null }
    return { photos: [], error: new Error(error.message) }
  }

  const photos: QuestCompletionPhoto[] = []
  for (const row of data ?? []) {
    const mapped = mapPhotoRow(row as { id: string; completion_id: string; storage_path: string; sort_order: number })
    const { url } = await questCompletionPhotoSignedUrl(mapped.storagePath)
    if (url) photos.push({ ...mapped, url })
  }

  return { photos, error: null }
}

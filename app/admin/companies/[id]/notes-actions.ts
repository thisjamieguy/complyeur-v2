'use server'

import { requireSuperAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction, ADMIN_ACTIONS } from '@/lib/admin/audit'
import { revalidatePath } from 'next/cache'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import {
  companyIdSchema,
  addNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  type AddNoteData,
  type UpdateNoteData,
} from '@/lib/validations/admin'

async function requireAdminCompanyAccess(companyId: string): Promise<void> {
  const supabase = await createClient()
  await requireCompanyAccess(supabase, companyId, { allowSuperadmin: true })
}

export async function addNote(companyId: string, data: AddNoteData) {
  // Validate company ID
  const companyIdResult = companyIdSchema.safeParse(companyId)
  if (!companyIdResult.success) {
    return { success: false, error: 'Invalid company ID format' }
  }

  // Validate note data
  const dataResult = addNoteSchema.safeParse(data)
  if (!dataResult.success) {
    const errors = dataResult.error.issues.map((e) => e.message).join(', ')
    return { success: false, error: errors }
  }

  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyIdResult.data)
  const supabase = createAdminClient()

  const { data: note, error } = await supabase
    .from('company_notes')
    .insert({
      company_id: companyIdResult.data,
      admin_user_id: user.id,
      note_content: dataResult.data.note_content,
      category: dataResult.data.category,
      is_pinned: dataResult.data.is_pinned,
      follow_up_date: dataResult.data.follow_up_date || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to add note:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyIdResult.data,
    action: ADMIN_ACTIONS.NOTE_CREATED,
    details: {
      note_id: note.id,
      category: dataResult.data.category,
    },
  })

  revalidatePath(`/admin/companies/${companyIdResult.data}`)
  return { success: true, note }
}

export async function updateNote(
  noteId: string,
  companyId: string,
  data: UpdateNoteData
) {
  // Validate note ID
  const noteIdResult = noteIdSchema.safeParse(noteId)
  if (!noteIdResult.success) {
    return { success: false, error: 'Invalid note ID format' }
  }

  // Validate company ID
  const companyIdResult = companyIdSchema.safeParse(companyId)
  if (!companyIdResult.success) {
    return { success: false, error: 'Invalid company ID format' }
  }

  // Validate update data
  const dataResult = updateNoteSchema.safeParse(data)
  if (!dataResult.success) {
    const errors = dataResult.error.issues.map((e) => e.message).join(', ')
    return { success: false, error: errors }
  }

  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyIdResult.data)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('company_notes')
    .update({
      ...dataResult.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteIdResult.data)

  if (error) {
    console.error('Failed to update note:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyIdResult.data,
    action: ADMIN_ACTIONS.NOTE_UPDATED,
    details: { note_id: noteIdResult.data },
  })

  revalidatePath(`/admin/companies/${companyIdResult.data}`)
  return { success: true }
}

export async function deleteNote(noteId: string, companyId: string) {
  // Validate note ID
  const noteIdResult = noteIdSchema.safeParse(noteId)
  if (!noteIdResult.success) {
    return { success: false, error: 'Invalid note ID format' }
  }

  // Validate company ID
  const companyIdResult = companyIdSchema.safeParse(companyId)
  if (!companyIdResult.success) {
    return { success: false, error: 'Invalid company ID format' }
  }

  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyIdResult.data)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('company_notes')
    .delete()
    .eq('id', noteIdResult.data)

  if (error) {
    console.error('Failed to delete note:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyIdResult.data,
    action: ADMIN_ACTIONS.NOTE_DELETED,
    details: { note_id: noteIdResult.data },
  })

  revalidatePath(`/admin/companies/${companyIdResult.data}`)
  return { success: true }
}

export async function togglePinNote(
  noteId: string,
  companyId: string,
  isPinned: boolean
) {
  // Validate note ID
  const noteIdResult = noteIdSchema.safeParse(noteId)
  if (!noteIdResult.success) {
    return { success: false, error: 'Invalid note ID format' }
  }

  // Validate company ID
  const companyIdResult = companyIdSchema.safeParse(companyId)
  if (!companyIdResult.success) {
    return { success: false, error: 'Invalid company ID format' }
  }

  const { user } = await requireSuperAdmin()
  await requireAdminCompanyAccess(companyIdResult.data)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('company_notes')
    .update({
      is_pinned: isPinned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteIdResult.data)

  if (error) {
    console.error('Failed to toggle pin:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    adminUserId: user.id,
    targetCompanyId: companyIdResult.data,
    action: isPinned ? ADMIN_ACTIONS.NOTE_PINNED : ADMIN_ACTIONS.NOTE_UNPINNED,
    details: { note_id: noteIdResult.data },
  })

  revalidatePath(`/admin/companies/${companyIdResult.data}`)
  return { success: true }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
})

export type UpdatePasswordResult = 
  | { success: true; message: string }
  | { success: false; error: string }

export async function updatePasswordAction(
  prevState: any, 
  formData: FormData
): Promise<UpdatePasswordResult> {
  const supabase = await createClient()

  // 1. Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user || !user.email) {
    return { success: false, error: 'Not authenticated' }
  }

  // 2. Parse and validate inputs
  const rawData = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
  }

  const result = updatePasswordSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  const { currentPassword, newPassword } = result.data

  // 3. Verify current password by attempting a sign-in
  // This is a crucial security step (re-authentication)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (signInError) {
    return { success: false, error: 'Incorrect current password' }
  }

  // 4. Update the password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath('/settings')
  return { success: true, message: 'Password updated successfully' }
}

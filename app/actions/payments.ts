'use server'

import { auth } from '@clerk/nextjs/server'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'

export async function getCoachPayments() {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase = createClerkSupabaseClient(getToken)

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      tournaments (title)
    `)
    .eq('coach_user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}

export async function uploadPaymentProof(paymentId: string, formData: FormData) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase = createClerkSupabaseClient(getToken)
  const file = formData.get('file') as File

  if (!file) return { error: 'No file provided' }

  const fileExt = file.name.split('.').pop()
  const filePath = `${userId}/${paymentId}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(filePath, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('payment-proofs')
    .getPublicUrl(filePath)

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      proof_image_url: publicUrl,
      status: 'pending' // Reset to pending if re-uploading
    })
    .eq('id', paymentId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/dashboard/coach/payments')
  return { success: true }
}

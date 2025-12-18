"use server"

import { revalidatePath } from "next/cache"
import { createPayment, updatePaymentStatus } from "@/lib/db/queries/payments"
import { PaymentInsert } from "@/types/models"

export async function submitPaymentAction(data: PaymentInsert, path: string) {
  try {
    await createPayment(data)
    revalidatePath(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function verifyPaymentAction(
  paymentId: string,
  status: 'verified' | 'rejected',
  context: { teamId: string, tournamentId: string },
  path: string
) {
  try {
    await updatePaymentStatus(paymentId, status, context)
    revalidatePath(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

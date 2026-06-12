import { Resend } from 'resend'
import { logger } from '@/lib/logger'

// Lazily construct the Resend client. The constructor throws when the API key
// is absent, so instantiating at module load crashes any import path that pulls
// this module in an env without RESEND_API_KEY (e.g. tests). Every caller below
// already guards on the key being present before reaching getResend().
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = process.env.RESEND_FROM_EMAIL || 'TourneyDo <notifications@tourneydo.com>'

/**
 * Generic email send utility.
 * Falls back to a console log in dev when RESEND_API_KEY is missing or Resend returns an error.
 */
export async function sendEmail(to: string | string[], subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      logger.info({ to, subject }, '[email:dev] Sending via mock')
      return { success: true }
    }
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const { error } = await getResend().emails.send({ from: FROM, to, subject, html })
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn({ error: error.message, to, subject }, '[email:dev] Resend error — falling back to dev mode')
        return { success: true }
      }
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

interface SendStaffInvitationParams {
  email: string
  role: string
  tournamentName: string
  tournamentId: string
  inviterName?: string
}

export async function sendStaffInvitationEmail({
  email,
  role,
  tournamentName,
  tournamentId,
  inviterName = 'The Organizer',
}: SendStaffInvitationParams) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('Email skipped: RESEND_API_KEY is not set')
    return { success: false, error: 'Missing API Key' }
  }

  const subject = `Invitation to manage ${tournamentName}`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been invited!</h2>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to help manage the tournament <strong>"${tournamentName}"</strong> as a <strong>${role}</strong>.</p>
      <p>Click the button below to accept your invitation and access the tournament management tools.</p>
      <div style="margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?email=${encodeURIComponent(email)}&tournament=${tournamentId}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
      </div>
      <p style="color: #666; font-size: 14px;">If you don't have an account yet, you'll be guided through the sign-up process.</p>
    </div>
  `

  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Acme Tournaments <onboarding@resend.dev>',
      to: email,
      subject: subject,
      html: html,
    })

    if (error) {
      // Dev Mode Fallback
      if (process.env.NODE_ENV !== 'production') {
        logger.info({ to: email, subject, htmlLength: html.length, originalError: error.message }, '[email:dev] Fallback — email not sent, logged instead')

        return {
          success: true,
          data: { id: 'dev-mode-fallback' },
          warning: 'Dev Mode: Email logged to console (check server logs).'
        }
      }

      logger.error({ error }, 'Resend error')
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    logger.error({ error }, 'Failed to send email')
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

interface SendPaymentApprovalParams {
  email: string
  coachName: string
  tournamentName: string
  teamName: string
  amount: number
  referenceNumber: string
}

export async function sendPaymentApprovalEmail({
  email,
  coachName,
  tournamentName,
  teamName,
  amount,
  referenceNumber,
}: SendPaymentApprovalParams) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('Email skipped: RESEND_API_KEY is not set')
    return { success: false, error: 'Missing API Key' }
  }

  const subject = `Payment Approved for ${tournamentName}`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Payment Approved ✓</h2>
      <p>Hello ${coachName},</p>
      <p>Your payment for <strong>${tournamentName}</strong> has been approved!</p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Team:</strong> ${teamName}</p>
        <p style="margin: 8px 0 0 0;"><strong>Amount:</strong> ₱${amount.toFixed(2)}</p>
        <p style="margin: 8px 0 0 0;"><strong>Reference:</strong> ${referenceNumber}</p>
      </div>
      
      <p>Your team's registration status has been updated to <strong>Paid</strong>.</p>
      <p>Thank you for your prompt payment!</p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, please contact the tournament organizer.</p>
    </div>
  `

  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Acme Tournaments <onboarding@resend.dev>',
      to: email,
      subject: subject,
      html: html,
    })

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.info({ to: email, subject, htmlLength: html.length, originalError: error.message }, '[email:dev] Fallback — email not sent, logged instead')
        return { success: true, data: { id: 'dev-mode-fallback' }, warning: 'Dev Mode: Email logged to console.' }
      }
      logger.error({ error }, 'Resend error')
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    logger.error({ error }, 'Failed to send email')
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

interface SendPaymentRejectionParams {
  email: string
  coachName: string
  tournamentName: string
  teamName: string
  amount: number
  referenceNumber: string
  rejectionReason: string
}

export async function sendPaymentRejectionEmail({
  email,
  coachName,
  tournamentName,
  teamName,
  amount,
  referenceNumber,
  rejectionReason,
}: SendPaymentRejectionParams) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('Email skipped: RESEND_API_KEY is not set')
    return { success: false, error: 'Missing API Key' }
  }

  const subject = `Payment Rejected for ${tournamentName}`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Payment Rejected</h2>
      <p>Hello ${coachName},</p>
      <p>Unfortunately, your payment for <strong>${tournamentName}</strong> has been rejected.</p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Team:</strong> ${teamName}</p>
        <p style="margin: 8px 0 0 0;"><strong>Amount:</strong> ₱${amount.toFixed(2)}</p>
        <p style="margin: 8px 0 0 0;"><strong>Reference:</strong> ${referenceNumber}</p>
      </div>
      
      <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold;">Reason for Rejection:</p>
        <p style="margin: 8px 0 0 0;">${rejectionReason}</p>
      </div>
      
      <p>Please review the rejection reason above and submit a new payment with the correct information.</p>
      <p>If you have any questions, please contact the tournament organizer.</p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">Thank you for your understanding.</p>
    </div>
  `

  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Acme Tournaments <onboarding@resend.dev>',
      to: email,
      subject: subject,
      html: html,
    })

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.info({ to: email, subject, htmlLength: html.length, originalError: error.message }, '[email:dev] Fallback — email not sent, logged instead')
        return { success: true, data: { id: 'dev-mode-fallback' }, warning: 'Dev Mode: Email logged to console.' }
      }
      logger.error({ error }, 'Resend error')
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    logger.error({ error }, 'Failed to send email')
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendStaffInvitationParams {
  email: string
  role: string
  tournamentName: string
  inviterName?: string
}

export async function sendStaffInvitationEmail({
  email,
  role,
  tournamentName,
  inviterName = 'The Organizer',
}: SendStaffInvitationParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping email.')
    return { success: false, error: 'Missing API Key' }
  }

  const subject = `Invitation to manage ${tournamentName}`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been invited!</h2>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to help manage the tournament <strong>"${tournamentName}"</strong> as a <strong>${role}</strong>.</p>
      <p>Please log in to the dashboard to access the tournament management tools.</p>
      <div style="margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tournament-organizer" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Go to Dashboard</a>
      </div>
      <p style="color: #666; font-size: 14px;">If you don't have an account yet, please sign up with this email address.</p>
    </div>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Acme Tournaments <onboarding@resend.dev>',
      to: email,
      subject: subject,
      html: html,
    })

    if (error) {
      // Dev Mode Fallback
      if (process.env.NODE_ENV !== 'production') {
        console.log('--- DEV MODE EMAIL FALLBACK ---')
        console.log(`To: ${email}`)
        console.log(`Subject: ${subject}`)
        console.log('--- HTML CONTENT ---')
        console.log(html)
        console.log('--- END EMAIL CONTENT ---')
        console.warn(`Original Resend Error: ${error.message}`)

        return {
          success: true,
          data: { id: 'dev-mode-fallback' },
          warning: 'Dev Mode: Email logged to console (check server logs).'
        }
      }

      console.error('Resend Error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Failed to send email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

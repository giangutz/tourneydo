import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, text, from } = await req.json() as EmailRequest;

    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get environment variables
    const SMTP_HOST = Deno.env.get('SMTP_HOST')
    const SMTP_PORT = Deno.env.get('SMTP_PORT') || '587'
    const SMTP_USER = Deno.env.get('SMTP_USER')
    const SMTP_PASS = Deno.env.get('SMTP_PASS')
    const FROM_EMAIL = from || Deno.env.get('FROM_EMAIL') || 'noreply@tourneydo.com'

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error('Missing SMTP configuration')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create email payload for SMTP service
    const emailPayload = {
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    // Send email using SMTP (you can use any SMTP service here)
    // For this example, we'll use a simple fetch to an SMTP API service
    const smtpResponse = await fetch(`https://api.smtp2go.com/v3/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': SMTP_PASS, // Assuming SMTP_PASS contains the API key
      },
      body: JSON.stringify({
        api_key: SMTP_PASS,
        to: [to],
        sender: FROM_EMAIL,
        subject: subject,
        html_body: html,
        text_body: text || html.replace(/<[^>]*>/g, ''),
      }),
    })

    if (!smtpResponse.ok) {
      const errorData = await smtpResponse.text()
      console.error('SMTP Error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await smtpResponse.json()
    console.log('Email sent successfully:', result)

    // Log email to database for tracking (optional)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Insert email log
    await supabase
      .from('email_logs')
      .insert({
        to_email: to,
        subject: subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_response: result,
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: result.data?.email_id || 'unknown'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Email function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

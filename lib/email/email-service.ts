import { createClient } from "@/lib/supabase/server";

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

class EmailService {
  private fromEmail = process.env.NEXT_PUBLIC_FROM_EMAIL || "noreply@tourneydo.com";
  private fromName = "TourneyDo";

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // Use Supabase Edge Function for sending emails
      const supabase = await createClient();
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          from: emailData.from || `${this.fromName} <${this.fromEmail}>`,
        }
      });

      if (error) {
        console.error('Email sending error:', error);
        return false;
      }

      console.log('Email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  async sendMemberInvitation(memberData: {
    email: string;
    name: string;
    organizerName: string;
    role: string;
    inviteLink?: string;
  }): Promise<boolean> {
    const template = this.getMemberInvitationTemplate(memberData);
    return this.sendEmail({
      to: memberData.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendTournamentNotification(notificationData: {
    email: string;
    name: string;
    tournamentName: string;
    message: string;
    type: 'created' | 'updated' | 'cancelled' | 'reminder';
    tournamentDate?: string;
    location?: string;
  }): Promise<boolean> {
    const template = this.getTournamentNotificationTemplate(notificationData);
    return this.sendEmail({
      to: notificationData.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendRegistrationConfirmation(registrationData: {
    email: string;
    athleteName: string;
    tournamentName: string;
    tournamentDate: string;
    location: string;
    division?: string;
    entryFee?: number;
  }): Promise<boolean> {
    const template = this.getRegistrationConfirmationTemplate(registrationData);
    return this.sendEmail({
      to: registrationData.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendResultNotification(resultData: {
    email: string;
    athleteName: string;
    tournamentName: string;
    placement: number;
    division: string;
    medalType?: string;
  }): Promise<boolean> {
    const template = this.getResultNotificationTemplate(resultData);
    return this.sendEmail({
      to: resultData.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private getMemberInvitationTemplate(data: {
    email: string;
    name: string;
    organizerName: string;
    role: string;
    inviteLink?: string;
  }): EmailTemplate {
    const roleDescriptions = {
      admin: "full access to manage tournaments and team members",
      bracket_manager: "ability to manage tournament brackets and match results",
      standard_member: "view-only access to tournament schedules and results"
    };

    const roleDescription = roleDescriptions[data.role as keyof typeof roleDescriptions] || "access to tournament information";

    return {
      subject: `You've been invited to join ${data.organizerName}'s tournament team`,
      html: this.getBaseTemplate({
        title: "Team Invitation",
        preheader: `${data.organizerName} has invited you to join their tournament management team`,
        content: `
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1f2937; font-size: 28px; font-weight: bold; margin: 0;">
              You're Invited! 🏆
            </h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hi ${data.name},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            <strong>${data.organizerName}</strong> has invited you to join their tournament management team on TourneyDo. 
            As a <strong>${data.role.replace('_', ' ')}</strong>, you'll have ${roleDescription}.
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin: 32px 0;">
            <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
              Your Role: ${data.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
              ${roleDescription.charAt(0).toUpperCase() + roleDescription.slice(1)}
            </p>
          </div>
          
          ${data.inviteLink ? `
            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.inviteLink}" 
                 style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 16px 32px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                Accept Invitation
              </a>
            </div>
          ` : ''}
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Welcome to the team! We're excited to have you help manage tournaments and create amazing experiences for athletes.
          </p>
        `
      }),
      text: `You've been invited to join ${data.organizerName}'s tournament team\n\nHi ${data.name},\n\n${data.organizerName} has invited you to join their tournament management team on TourneyDo. As a ${data.role.replace('_', ' ')}, you'll have ${roleDescription}.\n\n${data.inviteLink ? `Accept your invitation: ${data.inviteLink}\n\n` : ''}Welcome to the team!`
    };
  }

  private getTournamentNotificationTemplate(data: {
    email: string;
    name: string;
    tournamentName: string;
    message: string;
    type: 'created' | 'updated' | 'cancelled' | 'reminder';
    tournamentDate?: string;
    location?: string;
  }): EmailTemplate {
    const typeConfig = {
      created: { emoji: "🆕", title: "New Tournament Created", color: "#10b981" },
      updated: { emoji: "📝", title: "Tournament Updated", color: "#3b82f6" },
      cancelled: { emoji: "❌", title: "Tournament Cancelled", color: "#ef4444" },
      reminder: { emoji: "⏰", title: "Tournament Reminder", color: "#f59e0b" }
    };

    const config = typeConfig[data.type];

    return {
      subject: `${config.emoji} ${data.tournamentName} - ${config.title}`,
      html: this.getBaseTemplate({
        title: config.title,
        preheader: `${data.tournamentName} - ${data.message}`,
        content: `
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="background: ${config.color}; color: white; width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px;">
              ${config.emoji}
            </div>
            <h1 style="color: #1f2937; font-size: 28px; font-weight: bold; margin: 0;">
              ${config.title}
            </h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hi ${data.name},
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin: 32px 0;">
            <h3 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
              ${data.tournamentName}
            </h3>
            ${data.tournamentDate ? `
              <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">
                📅 <strong>Date:</strong> ${new Date(data.tournamentDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            ` : ''}
            ${data.location ? `
              <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">
                📍 <strong>Location:</strong> ${data.location}
              </p>
            ` : ''}
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            ${data.message}
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tournaments" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                      color: white; 
                      text-decoration: none; 
                      padding: 16px 32px; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      display: inline-block;
                      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
              View Tournament Details
            </a>
          </div>
        `
      }),
      text: `${config.title}: ${data.tournamentName}\n\nHi ${data.name},\n\n${data.message}\n\n${data.tournamentDate ? `Date: ${new Date(data.tournamentDate).toLocaleDateString()}\n` : ''}${data.location ? `Location: ${data.location}\n` : ''}\nView details: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tournaments`
    };
  }

  private getRegistrationConfirmationTemplate(data: {
    email: string;
    athleteName: string;
    tournamentName: string;
    tournamentDate: string;
    location: string;
    division?: string;
    entryFee?: number;
  }): EmailTemplate {
    return {
      subject: `Registration Confirmed: ${data.tournamentName}`,
      html: this.getBaseTemplate({
        title: "Registration Confirmed",
        preheader: `${data.athleteName} is registered for ${data.tournamentName}`,
        content: `
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="background: #10b981; color: white; width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px;">
              ✅
            </div>
            <h1 style="color: #1f2937; font-size: 28px; font-weight: bold; margin: 0;">
              Registration Confirmed!
            </h1>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Great news! <strong>${data.athleteName}</strong> has been successfully registered for the tournament.
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin: 32px 0;">
            <h3 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
              Tournament Details
            </h3>
            <div style="border-left: 4px solid #3b82f6; padding-left: 16px;">
              <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 8px 0;">
                ${data.tournamentName}
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">
                📅 ${new Date(data.tournamentDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">
                📍 ${data.location}
              </p>
              ${data.division ? `
                <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">
                  🥋 Division: ${data.division}
                </p>
              ` : ''}
              ${data.entryFee ? `
                <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">
                  💰 Entry Fee: ₱${data.entryFee}
                </p>
              ` : ''}
            </div>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>Important:</strong> Please arrive at least 30 minutes before your scheduled matches. 
              Bring your athlete's identification and any required equipment.
            </p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tournaments" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                      color: white; 
                      text-decoration: none; 
                      padding: 16px 32px; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      display: inline-block;
                      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
              View Tournament Details
            </a>
          </div>
        `
      }),
      text: `Registration Confirmed: ${data.tournamentName}\n\n${data.athleteName} has been successfully registered!\n\nTournament: ${data.tournamentName}\nDate: ${new Date(data.tournamentDate).toLocaleDateString()}\nLocation: ${data.location}\n${data.division ? `Division: ${data.division}\n` : ''}${data.entryFee ? `Entry Fee: ₱${data.entryFee}\n` : ''}\nPlease arrive 30 minutes early and bring required identification.\n\nView details: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tournaments`
    };
  }

  private getResultNotificationTemplate(data: {
    email: string;
    athleteName: string;
    tournamentName: string;
    placement: number;
    division: string;
    medalType?: string;
  }): EmailTemplate {
    const placementEmoji = data.placement === 1 ? "🥇" : data.placement === 2 ? "🥈" : data.placement === 3 ? "🥉" : "🏅";
    const placementText = data.placement === 1 ? "1st Place" : data.placement === 2 ? "2nd Place" : data.placement === 3 ? "3rd Place" : `${data.placement}th Place`;

    return {
      subject: `${placementEmoji} Tournament Results: ${data.athleteName} - ${placementText}`,
      html: this.getBaseTemplate({
        title: "Tournament Results",
        preheader: `${data.athleteName} placed ${placementText} in ${data.tournamentName}`,
        content: `
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; box-shadow: 0 8px 16px rgba(245, 158, 11, 0.3);">
              ${placementEmoji}
            </div>
            <h1 style="color: #1f2937; font-size: 28px; font-weight: bold; margin: 0;">
              Tournament Results Are In!
            </h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; text-align: center; border: 2px solid #f59e0b;">
            <h2 style="color: #92400e; font-size: 24px; font-weight: bold; margin: 0 0 16px 0;">
              🎉 Congratulations! 🎉
            </h2>
            <p style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 8px 0;">
              <strong>${data.athleteName}</strong>
            </p>
            <p style="color: #92400e; font-size: 18px; margin: 8px 0;">
              ${placementText} in ${data.division}
            </p>
            ${data.medalType ? `
              <p style="color: #6b7280; font-size: 16px; margin: 8px 0;">
                ${data.medalType} Medal Winner
              </p>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; margin: 32px 0;">
            <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
              Tournament: ${data.tournamentName}
            </h3>
            <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">
              🥋 <strong>Division:</strong> ${data.division}
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">
              🏆 <strong>Final Placement:</strong> ${placementText}
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            What an incredible performance! ${data.athleteName} should be proud of this achievement. 
            Keep up the excellent work and continue training hard for future competitions.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tournaments" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                      color: white; 
                      text-decoration: none; 
                      padding: 16px 32px; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      display: inline-block;
                      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
              View Full Results
            </a>
          </div>
        `
      }),
      text: `Tournament Results: ${data.athleteName} - ${placementText}\n\nCongratulations! ${data.athleteName} placed ${placementText} in the ${data.division} division at ${data.tournamentName}.\n\n${data.medalType ? `Medal: ${data.medalType}\n\n` : ''}What an incredible performance! Keep up the excellent work.\n\nView full results: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tournaments`
    };
  }

  private getBaseTemplate(data: {
    title: string;
    preheader: string;
    content: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title} - TourneyDo</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <!-- Preheader -->
        <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f9fafb;">
          ${data.preheader}
        </div>
        
        <!-- Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              
              <!-- Main Email Content -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px 12px 0 0;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                      <div style="background: rgba(255, 255, 255, 0.2); padding: 12px; border-radius: 12px; margin-right: 12px;">
                        <div style="width: 32px; height: 32px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                          <span style="color: #3b82f6; font-size: 20px; font-weight: bold;">🏆</span>
                        </div>
                      </div>
                      <h1 style="color: white; font-size: 24px; font-weight: bold; margin: 0;">
                        TourneyDo
                      </h1>
                    </div>
                    <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 0;">
                      Professional Tournament Management
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    ${data.content}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                    <div style="text-align: center;">
                      <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0 0 16px 0;">
                        This email was sent by TourneyDo. If you have any questions, please contact our support team.
                      </p>
                      <div style="margin-bottom: 16px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #3b82f6; text-decoration: none; font-size: 12px; margin: 0 8px;">Visit TourneyDo</a>
                        <span style="color: #d1d5db;">|</span>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color: #3b82f6; text-decoration: none; font-size: 12px; margin: 0 8px;">Email Preferences</a>
                        <span style="color: #d1d5db;">|</span>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/support" style="color: #3b82f6; text-decoration: none; font-size: 12px; margin: 0 8px;">Support</a>
                      </div>
                      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                        © ${new Date().getFullYear()} TourneyDo. All rights reserved.
                      </p>
                    </div>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();

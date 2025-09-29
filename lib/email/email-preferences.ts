import { createClient } from "@/lib/supabase/server";

export interface EmailPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  tournament_reminders: boolean;
  registration_updates: boolean;
  result_notifications: boolean;
  marketing_communications: boolean;
  created_at: string;
  updated_at: string;
}

export class EmailPreferencesService {
  private supabase = createClient();

  async getUserPreferences(userId: string): Promise<EmailPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching email preferences:', error);
      return null;
    }
  }

  async createDefaultPreferences(userId: string): Promise<EmailPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('email_preferences')
        .insert({
          user_id: userId,
          email_notifications: true,
          tournament_reminders: true,
          registration_updates: true,
          result_notifications: false,
          marketing_communications: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default email preferences:', error);
      return null;
    }
  }

  async updatePreferences(userId: string, preferences: Partial<EmailPreferences>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('email_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating email preferences:', error);
      return false;
    }
  }

  async shouldSendEmail(userId: string, emailType: keyof EmailPreferences): Promise<boolean> {
    try {
      let preferences = await this.getUserPreferences(userId);
      
      // If no preferences exist, create default ones
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      if (!preferences) return false;

      // Check if the specific email type is enabled
      return Boolean(preferences[emailType]);
    } catch (error) {
      console.error('Error checking email preferences:', error);
      return false; // Default to not sending if there's an error
    }
  }

  async getEmailEnabledUsers(emailType: keyof EmailPreferences, userIds?: string[]): Promise<string[]> {
    try {
      let query = this.supabase
        .from('email_preferences')
        .select('user_id')
        .eq(emailType, true);

      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.map(pref => pref.user_id) || [];
    } catch (error) {
      console.error('Error getting email enabled users:', error);
      return [];
    }
  }
}

export const emailPreferencesService = new EmailPreferencesService();

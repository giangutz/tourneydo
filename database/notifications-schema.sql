-- Comprehensive Notification System Schema for TourneyDo

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'payment_approved',
        'payment_rejected', 
        'user_id' UUID NOT NULL REFERENCES profiles(id)
        'registration_confirmed',
        'tournament_reminder',
        'division_assigned',
        'bracket_generated',
        'check_in_reminder',
        'weigh_in_reminder',
        'system_announcement',
        'tournament_update',
        'results_available',
        'certificate_ready'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data for the notification
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    action_url TEXT, -- Optional URL for action buttons
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5) -- 1=low, 5=urgent
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Create notification preferences table
CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    tournament_reminders BOOLEAN DEFAULT TRUE,
    payment_updates BOOLEAN DEFAULT TRUE,
    registration_updates BOOLEAN DEFAULT TRUE,
    bracket_updates BOOLEAN DEFAULT TRUE,
    system_announcements BOOLEAN DEFAULT TRUE,
    email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification templates table for consistent messaging
CREATE TABLE notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    default_priority INTEGER DEFAULT 1,
    default_expires_hours INTEGER, -- Hours until expiration
    variables JSONB, -- Available template variables
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default notification templates
INSERT INTO notification_templates (type, name, title_template, message_template, default_priority, default_expires_hours, variables) VALUES
('payment_approved', 'Payment Approved', 'Payment Approved - {{tournament_name}}', 'Your payment of ₱{{amount}} for {{tournament_name}} has been approved. Your athletes are now confirmed for the tournament.', 2, 168, '{"tournament_name": "string", "amount": "number", "athlete_count": "number"}'),

('payment_rejected', 'Payment Rejected', 'Payment Rejected - {{tournament_name}}', 'Your payment submission for {{tournament_name}} has been rejected. Reason: {{reason}}. Please contact the organizer or submit a new payment.', 4, 72, '{"tournament_name": "string", "reason": "string", "contact_email": "string"}'),

('registration_confirmed', 'Registration Confirmed', 'Registration Confirmed - {{athlete_name}}', '{{athlete_name}} has been successfully registered for {{tournament_name}}. Registration ID: {{registration_id}}', 2, 168, '{"athlete_name": "string", "tournament_name": "string", "registration_id": "string"}'),

('tournament_reminder', 'Tournament Reminder', 'Tournament Reminder - {{tournament_name}}', 'Reminder: {{tournament_name}} is coming up on {{tournament_date}}. Make sure your athletes are prepared!', 3, 24, '{"tournament_name": "string", "tournament_date": "date", "location": "string"}'),

('division_assigned', 'Division Assignment', 'Division Assigned - {{athlete_name}}', '{{athlete_name}} has been assigned to {{division_name}} for {{tournament_name}}. Check the tournament page for bracket information.', 2, 168, '{"athlete_name": "string", "division_name": "string", "tournament_name": "string"}'),

('bracket_generated', 'Brackets Available', 'Tournament Brackets Generated - {{tournament_name}}', 'Competition brackets for {{tournament_name}} are now available. Check your athletes'' divisions and match schedules.', 3, 168, '{"tournament_name": "string", "division_count": "number"}'),

('check_in_reminder', 'Check-in Reminder', 'Check-in Reminder - {{tournament_name}}', 'Don''t forget to check in your athletes for {{tournament_name}}. Check-in closes at {{check_in_deadline}}.', 4, 12, '{"tournament_name": "string", "check_in_deadline": "datetime", "location": "string"}'),

('weigh_in_reminder', 'Weigh-in Reminder', 'Weigh-in Reminder - {{tournament_name}}', 'Weigh-in for {{tournament_name}} is scheduled for {{weigh_in_date}}. Make sure your athletes are ready.', 4, 24, '{"tournament_name": "string", "weigh_in_date": "datetime", "location": "string"}'),

('system_announcement', 'System Announcement', '{{title}}', '{{message}}', 2, NULL, '{"title": "string", "message": "string"}'),

('tournament_update', 'Tournament Update', 'Update: {{tournament_name}}', 'Important update for {{tournament_name}}: {{update_message}}', 3, 72, '{"tournament_name": "string", "update_message": "string"}'),

('results_available', 'Results Available', 'Results Available - {{tournament_name}}', 'Competition results for {{tournament_name}} are now available. Check the tournament page to view results and rankings.', 2, 168, '{"tournament_name": "string", "division_name": "string"}'),

('certificate_ready', 'Certificate Ready', 'Certificate Ready - {{athlete_name}}', 'The certificate for {{athlete_name}} from {{tournament_name}} is ready for download.', 1, 720, '{"athlete_name": "string", "tournament_name": "string", "achievement": "string"}');

-- Create function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user notification preferences
CREATE TRIGGER create_notification_preferences_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to send notification using template
CREATE OR REPLACE FUNCTION create_notification_from_template(
    p_user_id UUID,
    p_template_type TEXT,
    p_variables JSONB DEFAULT '{}'::JSONB,
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    template_record notification_templates%ROWTYPE;
    notification_id UUID;
    processed_title TEXT;
    processed_message TEXT;
    expires_at_val TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get template
    SELECT * INTO template_record
    FROM notification_templates
    WHERE type = p_template_type AND active = TRUE
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notification template not found for type: %', p_template_type;
    END IF;
    
    -- Process template variables (simple string replacement)
    processed_title := template_record.title_template;
    processed_message := template_record.message_template;
    
    -- Replace variables in title and message
    FOR key, value IN SELECT * FROM jsonb_each_text(p_variables) LOOP
        processed_title := replace(processed_title, '{{' || key || '}}', value);
        processed_message := replace(processed_message, '{{' || key || '}}', value);
    END LOOP;
    
    -- Calculate expiration
    IF template_record.default_expires_hours IS NOT NULL THEN
        expires_at_val := NOW() + (template_record.default_expires_hours || ' hours')::INTERVAL;
    END IF;
    
    -- Create notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        priority,
        expires_at,
        action_url
    ) VALUES (
        p_user_id,
        p_template_type,
        processed_title,
        processed_message,
        p_variables,
        template_record.default_priority,
        expires_at_val,
        p_action_url
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function for bulk notifications
CREATE OR REPLACE FUNCTION create_bulk_notifications_from_template(
    p_user_ids UUID[],
    p_template_type TEXT,
    p_variables JSONB DEFAULT '{}'::JSONB,
    p_action_url TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    user_id UUID;
    created_count INTEGER := 0;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids LOOP
        PERFORM create_notification_from_template(
            user_id,
            p_template_type,
            p_variables,
            p_action_url
        );
        created_count := created_count + 1;
    END LOOP;
    
    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- System can create notifications for any user
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage own preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Everyone can view notification templates
CREATE POLICY "Everyone can view templates" ON notification_templates
    FOR SELECT USING (active = true);

-- Only admins can manage templates
CREATE POLICY "Admins can manage templates" ON notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create updated_at trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for notification_templates
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for notification preferences
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create indexes for notification templates
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_active ON notification_templates(active);

COMMENT ON TABLE notifications IS 'Stores user notifications with support for different types, priorities, and expiration';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery and timing';
COMMENT ON TABLE notification_templates IS 'Templates for consistent notification messaging with variable substitution';
COMMENT ON FUNCTION create_notification_from_template IS 'Creates a notification using a predefined template with variable substitution';
COMMENT ON FUNCTION create_bulk_notifications_from_template IS 'Creates notifications for multiple users using a template';
COMMENT ON FUNCTION cleanup_expired_notifications IS 'Removes expired notifications to keep the table clean';

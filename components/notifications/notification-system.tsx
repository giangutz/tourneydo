/* eslint-disable  @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  CheckCircle,
  Info,
  Trophy,
  CreditCard,
  Calendar,
} from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  type: 'payment_approved' | 'payment_rejected' | 'registration_confirmed' | 'tournament_reminder' | 'division_assigned' | 'bracket_generated' | 'check_in_reminder' | 'weigh_in_reminder' | 'system_announcement';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  expires_at?: string;
}

interface NotificationSystemProps {
  userId: string;
  className?: string;
}

export function NotificationSystem({ userId, className }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(notif => 
                notif.id === payload.new.id ? payload.new as Notification : notif
              )
            );
            if ((payload.new as Notification).read && !(payload.old as Notification).read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => 
              prev.filter(notif => notif.id !== payload.old.id)
            );
            if (!(payload.old as Notification).read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_approved':
      case 'payment_rejected':
        return <CreditCard className="h-4 w-4" />;
      case 'registration_confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'tournament_reminder':
      case 'check_in_reminder':
      case 'weigh_in_reminder':
        return <Calendar className="h-4 w-4" />;
      case 'division_assigned':
      case 'bracket_generated':
        return <Trophy className="h-4 w-4" />;
      case 'system_announcement':
        return <Info className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_approved':
      case 'registration_confirmed':
        return 'text-green-600';
      case 'payment_rejected':
        return 'text-red-600';
      case 'tournament_reminder':
      case 'check_in_reminder':
      case 'weigh_in_reminder':
        return 'text-amber-600';
      case 'division_assigned':
      case 'bracket_generated':
        return 'text-blue-600';
      case 'system_announcement':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  function formatDistanceToNow(date: Date, options: { addSuffix: boolean }) {
    return formatDistanceToNow(date, options);
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 px-2 text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-border last:border-b-0 ${
                  !notification.read ? 'bg-muted/50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium truncate">
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Notification creation helper functions
export const createNotification = async (
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  data?: any,
  expiresAt?: Date
) => {
  const supabase = createClient();
  
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        expires_at: expiresAt?.toISOString(),
        read: false
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Bulk notification creation for tournaments
export const createTournamentNotifications = async (
  userIds: string[],
  type: Notification['type'],
  title: string,
  message: string,
  data?: any
) => {
  const supabase = createClient();
  
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type,
      title,
      message,
      data,
      read: false
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;
  } catch (error) {
    console.error('Error creating tournament notifications:', error);
  }
};

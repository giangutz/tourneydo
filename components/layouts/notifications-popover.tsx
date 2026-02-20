'use client'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'
import { Bell, CreditCard, UserPlus, CheckCheck, Trophy, CheckCircle, XCircle } from 'lucide-react'

interface Activity {
  id: string
  type: 'registration' | 'payment' | 'coach-registration' | 'coach-payment'
  created_at: string
  status: string
  player_name: string
  tournament_name: string
  tournament_id: string
  data?: any
}

interface NotificationsPopoverProps {
  initialActivities: Activity[]
}

export function NotificationsPopover({ initialActivities }: NotificationsPopoverProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (initialActivities.length === 0) {
      setUnreadCount(0)
      return
    }

    const lastSeen = localStorage.getItem('notifications_last_seen')
    
    // Calculate unread count
    if (!lastSeen) {
      setUnreadCount(initialActivities.length)
    } else {
      const lastSeenTime = new Date(lastSeen).getTime()
      const newCount = initialActivities.filter(activity => 
        new Date(activity.created_at).getTime() > lastSeenTime
      ).length
      setUnreadCount(newCount)
    }
  }, [initialActivities])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
  }

  const markAllAsRead = () => {
    const now = new Date().toISOString()
    localStorage.setItem('notifications_last_seen', now)
    setUnreadCount(0)
    setIsOpen(false)
  }
  
  // Render a static button during SSR/Hydration to prevent ID mismatches
  if (!isMounted) {
     return (
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Notifications</span>
        </Button>
     )
  }

  const handleNotificationClick = (activity: Activity) => {
    setIsOpen(false)
    if (activity.type === 'registration') {
      router.push(`/dashboard/tournament-organizer/tournaments/${activity.tournament_id}/participants`)
    } else if (activity.type === 'payment') {
      router.push(`/dashboard/tournament-organizer/tournaments/${activity.tournament_id}/payments`)
    } else if (activity.type === 'coach-registration') {
      // Coach: Go to the registration management page
      router.push(`/dashboard/coach/tournaments/${activity.tournament_id}/register`)
    } else if (activity.type === 'coach-payment') {
      // Coach: Go to the payments page
      router.push(`/dashboard/coach/tournaments/${activity.tournament_id}/payment`) 
    }
  }

  const getIcon = (type: string, status: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="h-4 w-4" />
      case 'registration':
        return <UserPlus className="h-4 w-4" />
      case 'coach-registration':
        return <Trophy className="h-4 w-4" />
      case 'coach-payment':
        return status === 'verified' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getIconColor = (type: string, status: string) => {
    switch (type) {
      case 'payment':
        return 'bg-green-100 text-green-600'
      case 'registration':
        return 'bg-blue-100 text-blue-600'
      case 'coach-registration':
        return 'bg-purple-100 text-purple-600'
      case 'coach-payment':
        return status === 'verified' 
          ? 'bg-green-100 text-green-600' 
          : status === 'rejected' 
            ? 'bg-red-100 text-red-600' 
            : 'bg-yellow-100 text-yellow-600'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white animate-in zoom-in-50 duration-300">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
           <div className="flex items-center gap-2">
             <h4 className="font-semibold text-sm">Notifications</h4>
             {unreadCount > 0 && (
               <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                 {unreadCount} new
               </span>
             )}
           </div>
           {unreadCount > 0 && (
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={markAllAsRead} 
               className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
             >
               <CheckCheck className="h-3 w-3 mr-1" />
               Mark read
             </Button>
           )}
        </div>
        <ScrollArea className="h-[300px]">
           {initialActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground">
                 <Bell className="h-8 w-8 mb-2 opacity-20" />
                 <p className="text-sm">No recent activity</p>
              </div>
           ) : (
             <div className="flex flex-col">
               {initialActivities.map((activity) => {
                 const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('notifications_last_seen') : null
                 const isReallyUnread = !lastSeen || new Date(activity.created_at).getTime() > new Date(lastSeen).getTime()

                 return (
                   <div 
                      key={activity.id} 
                      className={`p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group relative ${isReallyUnread ? 'bg-muted/30' : ''}`}
                      onClick={() => handleNotificationClick(activity)}
                   >
                      {isReallyUnread && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform origin-left" />
                      )}
                      
                      <div className="flex items-start gap-3">
                         <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mt-0.5 shrink-0 transition-colors ${getIconColor(activity.type, activity.status)}`}>
                            {getIcon(activity.type, activity.status)}
                         </div>
                         <div className="space-y-1">
                            <p className={`text-sm leading-snug ${isReallyUnread ? 'font-medium' : ''}`}>
                               {activity.type === 'payment' && (
                                 <>
                                   <span className="font-semibold text-foreground">{activity.player_name}</span> submitted a payment for <span className="font-medium text-foreground/80">{activity.tournament_name}</span>
                                 </>
                               )}
                               {activity.type === 'registration' && (
                                 <>
                                   <span className="font-semibold text-foreground">{activity.player_name}</span> registered for <span className="font-medium text-foreground/80">{activity.tournament_name}</span>
                                 </>
                               )}
                               {activity.type === 'coach-registration' && (
                                 <>
                                   You registered <span className="font-semibold text-foreground">{activity.player_name}</span> for <span className="font-medium text-foreground/80">{activity.tournament_name}</span>
                                 </>
                               )}
                               {activity.type === 'coach-payment' && (
                                 <>
                                   Payment for <span className="font-semibold text-foreground">{activity.player_name}</span> in <span className="font-medium text-foreground/80">{activity.tournament_name}</span> is <span className={`font-semibold ${activity.status === 'verified' ? 'text-green-600' : activity.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{activity.status}</span>
                                 </>
                               )}
                            </p>
                            <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                               {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                         </div>
                      </div>
                   </div>
                 )
               })}
             </div>
           )}
        </ScrollArea>
        <div className="p-2 border-t bg-muted/40">
          <Button 
            variant="ghost" 
            className="w-full text-xs h-8 text-muted-foreground hover:text-primary"
            onClick={() => {
              setIsOpen(false)
              router.push('/dashboard/tournament-organizer/notifications')
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}


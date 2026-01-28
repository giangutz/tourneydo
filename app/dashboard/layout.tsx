import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UserButton } from "@clerk/nextjs"
import { ModeToggle } from "@/components/layouts/mode-toggle"
import { ConnectionMonitor } from '@/components/ConnectionMonitor'
import { NotificationsNav } from "@/components/layouts/notifications-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background/95 transition-all duration-300 p-2 md:p-3 overflow-hidden">
        <div className="flex flex-col h-full w-full rounded-xl border bg-card text-card-foreground shadow-sm dark:bg-[#000000] dark:border-zinc-800 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 transition-[width,height] ease-linear bg-transparent">
            <div className="flex items-center gap-2">
               <SidebarTrigger className="-ml-1" />
            </div>
            <div className="flex items-center gap-3">
              <ModeToggle />
              <NotificationsNav />
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-8 w-8"
                  }
                }}
              />
            </div>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-6 bg-transparent">
             {children}
          </div>
        </div>
        <ConnectionMonitor />
      </SidebarInset>
    </SidebarProvider>
  )
}

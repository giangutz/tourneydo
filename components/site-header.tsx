

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/layouts/mode-toggle"
import { NotificationsNav } from "@/components/layouts/notifications-nav"
import { UserButton } from "@clerk/nextjs" // We still need the UserButton, maybe in the header or sidebar. The reference puts user in sidebar footer, but let's keep it here for now or decide where it goes. 
// User reference shows NavUser in sidebar footer. I should probably move UserButton there.
// But wait, the user reference SiteHeader DOES have a github button.
// For now, I'll put the ModeToggle and Notifications in the header.

export function SiteHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 h-4"
        />
        {/* We can add Breadcrumbs here later */}
        <div className="ml-auto flex items-center gap-2">
           <ModeToggle />
           <NotificationsNav />
        </div>
      </div>
    </header>
  )
}

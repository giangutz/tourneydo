import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { UserButton } from "@clerk/nextjs"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <div className="flex items-center justify-between border-b p-4">
          <SidebarTrigger />
          <UserButton afterSignOutUrl="/" />
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}

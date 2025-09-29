import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserButton } from "@clerk/nextjs";


export function DashboardHeader() {
  return (
    <header className="flex items-center justify-end space-x-2 sm:space-x-4 p-4">
      {/* Notifications */}
      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
        <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>

      {/* Theme Switcher */}
      <div className="hidden sm:block">
        <ThemeSwitcher />
      </div>

      {/* Clerk User Button */}
      <UserButton 
        appearance={{
          elements: {
            avatarBox: "h-7 w-7 sm:h-8 sm:w-8",
          }
        }}
        afterSignOutUrl="/"
      />
    </header>
  );
}

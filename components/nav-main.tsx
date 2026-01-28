"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  items?: {
    title: string
    url: string
  }[]
}

export function NavMain({
  items,
  label,
}: {
  items: NavItem[]
  label?: string
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  // Track expanded state for each item
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])

  // Initialize expanded items based on active route
  React.useEffect(() => {
    const activeParent = items.find(item => 
      item.items?.some(sub => sub.url === pathname)
    )
    if (activeParent && !expandedItems.includes(activeParent.title)) {
      setExpandedItems(prev => [...prev, activeParent.title])
    }
  }, [pathname, items])

  const toggleExpand = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    )
  }

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
           const isActive = pathname === item.url || item.items?.some(sub => sub.url === pathname)
           const isExpanded = expandedItems.includes(item.title)
           const hasSubMenu = item.items && item.items.length > 0

           // If collapsed, we treat parents as links to their main page because sub-menus are hidden/hard to access
           if (hasSubMenu && !isCollapsed) {
               return (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                        tooltip={item.title} 
                        isActive={isActive}
                        onClick={() => toggleExpand(item.title)}
                        className="justify-between"
                    >
                        <div className="flex items-center gap-2">
                            {item.icon && <item.icon className="size-4" />}
                            <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </div>
                        <ChevronRight className={cn(
                            "transition-transform duration-200 size-4 group-data-[collapsible=icon]:hidden",
                            isExpanded ? "rotate-90" : ""
                        )} />
                    </SidebarMenuButton>
                    <AnimatePresence initial={false}>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <SidebarMenuSub>
                                    {item.items?.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                            <Link href={subItem.url}>
                                                <span>{subItem.title}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </SidebarMenuItem>
               )
           }

           // Render as simple link (Leaf node OR Parent in collapsed mode)
           return (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                    <Link href={item.url}>
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
           )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

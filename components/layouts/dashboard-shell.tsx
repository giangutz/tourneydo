/**
 * Dashboard Shell Layout
 * 
 * Consistent layout wrapper for dashboard pages
 */

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardShellProps {
  children: ReactNode
  className?: string
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {children}
    </div>
  )
}

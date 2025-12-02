/**
 * Page Header Component
 * 
 * Reusable component for page headers with title, description, and optional action
 */

import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center items-start justify-between ">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <h2 className="text-muted-foreground mt-2">{description}</h2>
        )}
      </div>
      {action && <div className="mb-4">{action}</div>}
    </div>
  )
}

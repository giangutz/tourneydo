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
    <div className="flex flex-col gap-4 md:flex-row md:items-center items-start justify-between mb-6">
      <div className="flex-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>
      {action && <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </div>
  )
}

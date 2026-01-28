import { DashboardShell } from "@/components/layouts/dashboard-shell"
import { PageHeader } from "@/components/ui/page-header"

export default async function CourtsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  
  return (
    <DashboardShell>
      <PageHeader 
        title="Courts Management" 
        description="Manage tournament courts and assignments." 
      />
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg border-dashed">
        <p>Court management features coming soon.</p>
      </div>
    </DashboardShell>
  )
}

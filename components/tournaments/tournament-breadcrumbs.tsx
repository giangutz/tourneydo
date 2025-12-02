import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { routes } from "@/config/routes"

interface TournamentBreadcrumbsProps {
  tournamentName?: string
  tournamentId?: string
  pageName?: string
  hideParent?: boolean
}

export function TournamentBreadcrumbs({ tournamentName, tournamentId, pageName, hideParent }: TournamentBreadcrumbsProps) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {!hideParent && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={routes.organizer.tournaments}>Tournaments</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}
        {tournamentName && tournamentId && (
          <>
            <BreadcrumbItem>
              {pageName ? (
                <BreadcrumbLink href={routes.organizer.tournamentDetail(tournamentId)}>
                  {tournamentName}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{tournamentName}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
        {pageName && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

'use client'

import { TournamentSearch } from "../tournament-search"
import { TournamentFilters } from "../tournament-filters"

export function TournamentsToolbar() {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8 p-1 md:p-2 bg-background/50 backdrop-blur-sm border rounded-2xl shadow-sm">
       <div className="w-full md:flex-1">
          <TournamentSearch /> 
       </div>
       <div className="w-full md:w-auto flex-shrink-0">
          <TournamentFilters />
       </div>
    </div>
  )
}

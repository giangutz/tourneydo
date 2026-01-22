"use client"

import { useState, useMemo, useEffect } from "react"
import { Tournament, Team, Player, TournamentRegistration, BeltLevel } from "@/types/models"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, AlertCircle, ChevronLeft, ChevronRight, Users, Trophy } from "lucide-react"
import { calculateAge } from "@/lib/constants/divisions"
import { BELT_ORDER, BELT_GROUPS } from "@/lib/constants/belts"
import { toast } from "sonner"
import { manageTournamentRegistrations } from "../../actions"
import { useRouter } from "next/navigation"

const ITEMS_PER_PAGE = 10

interface RegistrationClientProps {
  tournament: Tournament
  teams: Team[]
  players: Player[]
  divisions: any[]
  existingRegistrations: Map<string, any> // Query returns joined data, not strict TournamentRegistration
  coachId: string
}

export function RegistrationClient({ 
  tournament, 
  teams, 
  players, 
  divisions,
  existingRegistrations,
  coachId 
}: RegistrationClientProps) {
  const router = useRouter()
  
  // Set default to first team if available, otherwise empty string to force selection if desired, 
  // or just force user to pick one. 
  // User explicitly asked "Select team first", so let's default to empty string.
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  
  const [searchQuery, setSearchQuery] = useState("")
  // Edits are player-centric, they can stay as is
  const [edits, setEdits] = useState<Record<string, Partial<Player>>>({})

  // plannedRegistrations: teamId -> playerIds[]
  // This persists across team switches in the current session.
  const [plannedRegistrations, setPlannedRegistrations] = useState<Record<string, string[]>>({})

  // Initialize planned registrations on mount or when existingRegistrations/teams change
  useEffect(() => {
    const initial: Record<string, string[]> = {}
    
    // Group existing registrations by team
    Array.from(existingRegistrations.values()).forEach(reg => {
      if (!initial[reg.team_id]) initial[reg.team_id] = []
      initial[reg.team_id].push(reg.player_id)
    })
    
    setPlannedRegistrations(initial)
  }, [existingRegistrations])

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)

  // Reset pagination when team changes, but NOT selections
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTeam])

  // Compute filtered players
  // STRICTLY filter by the selected Team.
  const filteredPlayers = useMemo(() => {
    if (!selectedTeam) return []
    
    return players
      .filter(p => {
        // 1. Team Filter: Player MUST belong to the selected team
        const userTeams = (p as any).teams || []
        if (!userTeams.some((t: Team) => t.id === selectedTeam)) return false
        
        // 2. Search Filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return (
            p.first_name.toLowerCase().includes(q) ||
            p.last_name.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => a.last_name.localeCompare(b.last_name))
  }, [players, selectedTeam, searchQuery])

  // Pagination Logic
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE)
  const paginatedPlayers = filteredPlayers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  )

  // Validation Logic
  const getPlayerStatus = (player: Player, currentEdits: Partial<Player>) => {
    const gender = currentEdits.gender || player.gender
    const belt = (currentEdits.belt_level || player.belt_level) as BeltLevel
    const dob = currentEdits.dob || player.dob
    const weight = currentEdits.weight || player.weight
    const height = currentEdits.height || player.height

    const issues: string[] = []

    // 1. Gender check
    if (tournament.gender_preference !== 'mixed') {
       if (gender !== tournament.gender_preference) {
         issues.push(`Gender (${gender}) mismatch`)
       }
    }

    // 2. Belt Check
    if (tournament.allowed_belt_groups && tournament.allowed_belt_groups.length > 0) {
       const playerGroup = Object.entries(BELT_GROUPS).find(([group, belts]) => 
          belts.includes(belt)
       )?.[0]

       if (!playerGroup || !tournament.allowed_belt_groups.includes(playerGroup)) {
          issues.push(`Belt (${belt}) not allowed`)
       }
    }
    
    // 3. Age/Division & Weight/Height Check
    let age = 0
    if (dob) {
      age = calculateAge(dob)
      const eligibleDivisions = divisions.filter(d => {
        const minFn = d.min_age === null || age >= d.min_age
        const maxFn = d.max_age === null || age <= d.max_age
        return minFn && maxFn && d.enabled
      })
      
      if (eligibleDivisions.length === 0) {
        issues.push(`No division for age ${age}`)
      } else {
        const isGradeschool = eligibleDivisions.some(d => d.name.toLowerCase().includes('gradeschool'))
        const isStandard = eligibleDivisions.some(d => !d.name.toLowerCase().includes('gradeschool'))
        
        if (isGradeschool && !height) issues.push("Height required")
        if (isStandard && !weight) issues.push("Weight required")
      }
    } else {
      issues.push("Missing DOB")
    }
    
    if (issues.length > 0) return { valid: false, issues }
    return { valid: true }
  }

  // Cross-team logic: which team is this player planned for?
  const getPlannedTeamForPlayer = (playerId: string) => {
    for (const [teamId, playerIds] of Object.entries(plannedRegistrations)) {
      if (playerIds.includes(playerId)) return teamId
    }
    return null
  }

  const toggleSelection = (playerId: string) => {
    if (!selectedTeam) return

    // Prevent toggling if already paid/verified
    const reg = existingRegistrations.get(playerId)
    if (reg && (reg.status === 'paid' || reg.status === 'verified')) {
      return
    }

    setPlannedRegistrations(prev => {
      const currentTeamSelections = prev[selectedTeam] || []
      const alreadyInThisTeam = currentTeamSelections.includes(playerId)
      
      const nextPlan = { ...prev }

      if (alreadyInThisTeam) {
        // Remove from this team
        nextPlan[selectedTeam] = currentTeamSelections.filter(id => id !== playerId)
      } else {
        // Add to this team, BUT first remove from ANY other team to prevent duplicates
        Object.keys(nextPlan).forEach(tId => {
          nextPlan[tId] = (nextPlan[tId] || []).filter(id => id !== playerId)
        })
        nextPlan[selectedTeam] = [...currentTeamSelections, playerId]
      }

      return nextPlan
    })
  }

  const handleSelectAllPage = () => {
    if (!selectedTeam) return

    const currentTeamSelections = plannedRegistrations[selectedTeam] || []
    
    // validPageIds: players on this page who are NOT registered with another team IN THE DB
    // actually, we should also filter out players who are already planned for another team in UI
    const toggleableIds = paginatedPlayers
        .filter(p => {
             const reg = existingRegistrations.get(p.id)
             if (reg && (reg.status === 'paid' || reg.status === 'verified')) return false
             
             // Check if registered with ANOTHER team in DB
             const isOtherTeamDB = reg && reg.team_id !== selectedTeam
             if (isOtherTeamDB) return false

             return true
        })
        .map(p => p.id)

    const allOnPageSelected = toggleableIds.every(id => currentTeamSelections.includes(id))
    
    setPlannedRegistrations(prev => {
      const nextPlan = { ...prev }
      const currentSelections = prev[selectedTeam] || []

      if (allOnPageSelected) {
        // Unselect page toggleables
        nextPlan[selectedTeam] = currentSelections.filter(id => !toggleableIds.includes(id))
      } else {
        // Select all toggleable on page
        // First, ensure these players are removed from any OTHER teams in the plan
        Object.keys(nextPlan).forEach(tId => {
          if (tId !== selectedTeam) {
            nextPlan[tId] = (nextPlan[tId] || []).filter(id => !toggleableIds.includes(id))
          }
        })
        nextPlan[selectedTeam] = [...new Set([...currentSelections, ...toggleableIds])]
      }

      return nextPlan
    })
  }

  const handleEdit = (playerId: string, field: keyof Player, value: any) => {
    setEdits(prev => ({
      ...prev,
      [playerId]: { ...(prev[playerId] || {}), [field]: value }
    }))
  }

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
     setIsSaving(true)
     try {
       const result = await manageTournamentRegistrations(
         tournament.id, 
         plannedRegistrations,
         edits
       )

       if (result.success) {
          toast.success("Changes saved successfully!")
          router.refresh()
       } else {
          toast.error(result.error)
       }
     } catch (err) {
       toast.error("An unexpected error occurred")
     } finally {
       setIsSaving(false)
     }
  }

  const getChangeCount = () => {
      let added = 0
      let removed = 0
      const edited = Object.keys(edits).length

      // Compare plannedRegistrations with existingRegistrations
      const existingMap = new Map<string, string>() // playerId -> teamId
      Array.from(existingRegistrations.values()).forEach(r => existingMap.set(r.player_id, r.team_id))

      const plannedMap = new Map<string, string>() // playerId -> teamId
      Object.entries(plannedRegistrations).forEach(([tId, pIds]) => {
          pIds.forEach(pId => plannedMap.set(pId, tId))
      })

      // Added or Moved
      plannedMap.forEach((tId, pId) => {
          if (!existingMap.has(pId)) added++
          else if (existingMap.get(pId) !== tId) added++ // Count moves as "added" to new team (simpler visual)
      })

      // Removed
      existingMap.forEach((tId, pId) => {
          if (!plannedMap.has(pId)) removed++
      })
      
      return { added, removed, edited }
  }
  
  const changes = getChangeCount()
  const hasChanges = changes.added > 0 || changes.removed > 0 || changes.edited > 0

  return (
    <div className="space-y-6">
       {/* Filters */}
       <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
         <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Select Team</label>
            <div className="flex gap-2">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No teams found</div>
                  ) : (
                      teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
         </div>
         
         {selectedTeam && (
             <div className="flex-1 space-y-2">
                 <label className="text-sm font-medium">Search Players</label>
                 <div className="relative">
                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                     placeholder="Name..." 
                     className="pl-8"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                   />
                 </div>
             </div>
         )}
       </div>

       {/* Empty State / Player Table */}
       {!selectedTeam ? (
           <Card className="border-dashed">
               <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                   <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                   <h3 className="text-lg font-semibold">Select a Team</h3>
                   <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">
                       Please select a team from the dropdown above to view eligible players and manage their registration for this tournament.
                   </p>
                   {teams.length === 0 && (
                       <Badge variant="destructive">You haven't created any teams yet</Badge>
                   )}
               </CardContent>
           </Card>
       ) : (
           <>
           <div className="border rounded-lg overflow-hidden min-h-[400px]">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="border-b">
                     <th className="p-4 w-[40px]">
                        <Checkbox 
                          checked={paginatedPlayers.length > 0 && paginatedPlayers
                            .filter(p => !existingRegistrations.get(p.id) || existingRegistrations.get(p.id)?.team_id === selectedTeam)
                            .every(p => plannedRegistrations[selectedTeam]?.includes(p.id))}
                          onCheckedChange={handleSelectAllPage}
                        />
                     </th>
                     <th className="p-4 text-left">Player</th>
                     <th className="p-4 text-left">Belt</th>
                     <th className="p-4 text-left text-xs text-muted-foreground hidden md:table-cell">Age / DOB</th>
                     <th className="p-4 text-left text-xs text-muted-foreground hidden md:table-cell">Weight (kg)</th>
                     <th className="p-4 text-left text-xs text-muted-foreground hidden md:table-cell">Height (cm)</th>
                     <th className="p-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-background">
                   {paginatedPlayers.length === 0 ? (
                     <tr>
                       <td colSpan={7} className="p-8 text-center text-muted-foreground">
                         No players found in this team.
                       </td>
                     </tr>
                   ) : (
                      paginatedPlayers.map(player => {
                        const registration = existingRegistrations.get(player.id)
                        const isRegisteredElsewhere = registration && registration.team_id !== selectedTeam
                        const isRegisteredHere = registration && registration.team_id === selectedTeam
                        const isPaidOrVerified = registration && (registration.status === 'paid' || registration.status === 'verified')
                        
                        // If registered elsewhere, find that team name
                        const otherTeamName = isRegisteredElsewhere 
                            ? teams.find(t => t.id === registration!.team_id)?.name 
                            : null

                        const edit = edits[player.id] || {}
                        const status = getPlayerStatus(player, edit)
                        const isSelectedInCurrentTeam = plannedRegistrations[selectedTeam]?.includes(player.id)
                        const plannedTeamId = getPlannedTeamForPlayer(player.id)
                        const isSelectedElsewhere = plannedTeamId && plannedTeamId !== selectedTeam
                        
                        return (
                          <tr key={player.id} className={isSelectedInCurrentTeam ? 'bg-primary/5' : ''}>
                             <td className="p-4 align-top">
                                <Checkbox 
                                  checked={isSelectedInCurrentTeam}
                                  disabled={!!isRegisteredElsewhere || isPaidOrVerified || (!!isSelectedElsewhere && !isSelectedInCurrentTeam)}
                                  onCheckedChange={() => toggleSelection(player.id)}
                                />
                             </td>
                             <td className="p-4 align-top">
                               <div className="font-medium">{player.first_name} {player.last_name}</div>
                               <div className="text-xs text-muted-foreground capitalize mb-1">{edit.gender || player.gender}</div>
                                {isRegisteredElsewhere && (
                                    <Badge variant="outline" className="text-[10px] h-5 border-amber-200 bg-amber-50 text-amber-700">
                                        Registered with {otherTeamName || 'Another Team'}
                                    </Badge>
                                )}
                                {isPaidOrVerified && (
                                    <Badge variant="outline" className="text-[10px] h-5 border-blue-200 bg-blue-50 text-blue-700">
                                        {registration?.status === 'verified' ? 'Verified' : 'Paid - Locked'}
                                    </Badge>
                                )}
                                {isSelectedElsewhere && !isRegisteredElsewhere && (
                                    <Badge variant="outline" className="text-[10px] h-5 border-purple-200 bg-purple-50 text-purple-700">
                                        Planned: {teams.find(t => t.id === plannedTeamId)?.name}
                                    </Badge>
                                )}
                              </td>
                             <td className="p-4 align-top">
                               <Select 
                                 value={edit.belt_level || player.belt_level || ''} 
                                 onValueChange={(val) => handleEdit(player.id, 'belt_level', val)}
                                 disabled={!!isRegisteredElsewhere}
                               >
                                 <SelectTrigger className="h-8 w-[100px] md:w-[110px]">
                                   <SelectValue placeholder="Belt" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   {BELT_ORDER.map(b => (
                                     <SelectItem key={b} value={b}>{b}</SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                             </td>
                             <td className="p-4 align-top hidden md:table-cell">
                                <div className="text-xs">
                                   {player.dob ? calculateAge(player.dob) : 'N/A'} yrs
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                   {player.dob ? new Date(player.dob).getFullYear() : '-'}
                                </div>
                             </td>
                             
                             <td className="p-4 align-top hidden md:table-cell">
                               <Input 
                                  type="number"
                                  className={`h-8 w-[80px] ${status.issues?.some(i => i.includes('Weight')) ? 'border-red-500 bg-red-50' : ''}`}
                                  value={edit.weight ?? player.weight ?? ''}
                                  onChange={e => handleEdit(player.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                                  placeholder="kg"
                                  disabled={!!isRegisteredElsewhere}
                               />
                             </td>
                             
                             <td className="p-4 align-top hidden md:table-cell">
                               <Input 
                                  type="number"
                                  className={`h-8 w-[80px] ${status.issues?.some(i => i.includes('Height')) ? 'border-red-500 bg-red-50' : ''}`}
                                  value={edit.height ?? player.height ?? ''}
                                  onChange={e => handleEdit(player.id, 'height', e.target.value ? parseFloat(e.target.value) : null)}
                                  placeholder="cm"
                                  disabled={!!isRegisteredElsewhere}
                               />
                             </td>
                             
                             <td className="p-4 align-top">
                                {/* Mobile Stack */}
                                <div className="md:hidden space-y-2 mb-2">
                                   {status.issues?.some(i => i.includes('Weight')) && !isRegisteredElsewhere && (
                                       <Input 
                                          type="number"
                                          className="h-8 w-full border-red-500 bg-red-50"
                                          value={edit.weight ?? player.weight ?? ''}
                                          onChange={e => handleEdit(player.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                                          placeholder="Weight (kg)"
                                       />
                                   )}
                                   {status.issues?.some(i => i.includes('Height')) && !isRegisteredElsewhere && (
                                       <Input 
                                          type="number"
                                          className="h-8 w-full border-red-500 bg-red-50"
                                          value={edit.height ?? player.height ?? ''}
                                          onChange={e => handleEdit(player.id, 'height', e.target.value ? parseFloat(e.target.value) : null)}
                                          placeholder="Height (cm)"
                                       />
                                   )}
                                </div>

                                {status.valid ? (
                                   <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Eligible</Badge>
                                ) : (
                                   <div className="flex items-center text-xs text-red-600">
                                     <AlertCircle className="w-3 h-3 mr-1" />
                                     Invalid
                                   </div>
                                )}
                                
                                {!status.valid && status.issues && (
                                   <div className="text-[10px] text-red-500 mt-1 max-w-[150px]">
                                      {status.issues.join(', ')}
                                   </div>
                                )}
                             </td>
                          </tr>
                        )
                      })
                   )}
                </tbody>
              </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/50">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
           </div>

           {/* Floating Footer */}
           <div className="flex justify-between md:justify-end items-center pt-4 bg-background sticky bottom-0 border-t p-4 mt-8 shadow-lg gap-4">
              <div className="text-sm text-muted-foreground hidden md:block">
                  <span className="font-semibold text-primary">{teams.find(t=>t.id===selectedTeam)?.name}:</span> {changes.added} added/moved, {changes.removed} to remove, {changes.edited} profiles updated
              </div>
              <Button 
                 size="lg" 
                 disabled={!hasChanges || isSaving}
                 onClick={handleSave}
              >
                 {isSaving ? "Saving..." : "Save Changes"}
              </Button>
           </div>
           </>
       )}
    </div>
  )
}

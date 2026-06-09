'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BracketView } from '@/components/tournaments/bracket-view'
import { MatchResultDialog } from '@/components/tournaments/match-result-dialog'
import { MatchReadinessDialog } from '@/components/tournaments/match-readiness-dialog'
import { EditMatchDialog } from '@/components/tournaments/edit-match-dialog'
import { generateTournamentBracket } from '@/lib/actions/brackets'
import { regenerateBracketSchedule } from '@/lib/actions/regenerate-bracket-schedule'
import { Match, Tournament, MatchWithReadiness } from '@/types/models'
import { toast } from 'sonner'
import { Loader2, Trophy, Users, Activity, Layers, Calendar } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'



import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight, Calculator, FileText, Printer, Ticket, Trash2 } from 'lucide-react'
import { deleteTournamentBracket } from '@/lib/actions/brackets'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { TournamentRole } from '@/types/models'

interface BracketPageClientProps {
  tournament: Tournament
  participants: any[]
  matches: MatchWithReadiness[]
  userRole?: TournamentRole | 'admin' | null
  placementGroups?: PlacementGroup[]
}

import { useAdminChannel } from '@/lib/realtime/admin-channel'
import { BracketGenerationModal } from './bracket/bracket-generation-modal'
import { BracketValidationDialog } from './bracket/bracket-validation-dialog'
import { DivisionBreakdown } from './shared/division-breakdown'
import { PlacementsView } from './placements-view'
import type { PlacementGroup } from '@/lib/db/queries/placements'
import { ScheduleInfeasibilityDialog } from './schedule-infeasibility-dialog'
import { ScheduleSuccessSummaryDialog } from './schedule-success-summary-dialog'
import { getBeltSkillCategory, getCategoryDisplayName } from '@/lib/utils'
import { BELT_GROUPS } from '@/lib/constants/belts'
const SKILL_ORDER = [...Object.keys(BELT_GROUPS), 'Unknown']

export function BracketPageClient({ tournament, participants, matches, userRole, placementGroups = [] }: BracketPageClientProps) {
  const { isPending: realtimePending, markManualRefresh } = useAdminChannel(tournament.id)
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showGenerationModal, setShowGenerationModal] = useState(false)
  const [generationType, setGenerationType] = useState<'bracket' | 'schedule'>('bracket')
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  // Validation Error State
  const [validationErrorOpen, setValidationErrorOpen] = useState(false)
  const [validationErrorType, setValidationErrorType] = useState<'unweighed' | 'unassigned' | 'general' | 'invalid_belt'>('general')

  const [validationParticipants, setValidationParticipants] = useState<{id: string, name: string, reason?: string}[]>([])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generatingSchedule, setGeneratingSchedule] = useState(false)
  const [scheduleValidation, setScheduleValidation] = useState<any>(null)
  const [scheduleInfeasibleDialogOpen, setScheduleInfeasibleDialogOpen] = useState(false)
  const [scheduleSummary, setScheduleSummary] = useState<any>(null)
  const [scheduleSuccessDialogOpen, setScheduleSuccessDialogOpen] = useState(false)

  const handleDeleteBracket = async () => {
    setDeleting(true)
    try {
      const result = await deleteTournamentBracket(tournament.id)
      
      if (result.success) {
        toast.success("Bracket deleted successfully")
        markManualRefresh()
        startTransition(() => { router.refresh() })
        window.location.reload()
      } else {
        toast.error(result.error || "Failed to delete bracket")
      }
    } catch (error) {
       toast.error("An unexpected error occurred")
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenerationType('bracket')
    setShowGenerationModal(true)
    
    // Small delay to let modal open and show first step
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const result = await generateTournamentBracket(tournament.id)
      
      if (!result.success) {
        // Handle specific validation errors with the dialog
        if (result.errorType === 'unweighed' || result.errorType === 'unassigned' || result.errorType === 'invalid_belt') {
          // Close generation modal first
          setShowGenerationModal(false)
          
          // Set validation state
          setValidationErrorType(result.errorType)
          setValidationParticipants(result.participants || [])
          setValidationErrorOpen(true)
        } else {
          // General error, show toast
          toast.error(result.error)
        }
      } else {
        toast.success("Bracket generated successfully")
        markManualRefresh()
        startTransition(() => { router.refresh() })
      }
    } catch (err) {
      toast.error("Failed to generate bracket")
    } finally {
      if (!validationErrorOpen) {
          setGenerating(false)
          setShowGenerationModal(false)
      } else {
           setGenerating(false)
      }
    }
  }

  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true)
    setGenerationType('schedule')
    setShowGenerationModal(true)

    // Small delay to let modal open and show first step
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const result = await regenerateBracketSchedule(tournament.id)
      
      if (result.success) {
        // Show success summary dialog
        if ('data' in result && result.data && typeof result.data === 'object') {
          setScheduleSummary(result.data)
          setScheduleSuccessDialogOpen(true)
        } else {
          toast.success(hasMatchNumbers ? 'Schedule regenerated successfully' : 'Schedule generated successfully')
        }
        markManualRefresh()
        startTransition(() => { router.refresh() })
      } else {
        // Check if we have validation data
        if ('data' in result && result.data && !result.data.feasible) {
          // Close generation modal first, then show infeasibility dialog
          setGeneratingSchedule(false)
          setShowGenerationModal(false)
          
          // Small delay to ensure generation modal closes before opening infeasibility dialog
          setTimeout(() => {
            setScheduleValidation(result.data)
            setScheduleInfeasibleDialogOpen(true)
          }, 300)
        } else {
          toast.error(result.error || 'Failed to generate schedule')
        }
      }
    } catch (err) {
      toast.error('Failed to generate schedule')
    } finally {
      setGeneratingSchedule(false)
      setShowGenerationModal(false)
    }
  }

  // Check if matches have match numbers assigned
  const hasMatchNumbers = matches.length > 0 && matches.some(m => m.match_number_formatted)

  // Click handler to open match details dialog for readiness management
  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match)
    setDialogOpen(true)
  }

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [matchToEdit, setMatchToEdit] = useState<Match | null>(null)

  const handleEditMatch = (match: Match) => {
    setMatchToEdit(match)
    setEditDialogOpen(true)
  }

  // Filter matches to only include relevant lifecycle states
  const relevantMatches = matches.filter((m: any) => {
    const state = m.lifecycle_state
    return state === 'WAITING' || state === 'CONTEST' || state === 'IN_PROGRESS' || state === 'COMPLETED' || state === 'AUTO_ADVANCE' || state === null || state === undefined
  })

  // Calculate Stats
  const uniquePlayers = new Set<string>()
  const divisionStats: Record<string, { 
    players: Set<string>, 
    matches: number,
    rows: Map<string, { category: string, skill: string, playerCount: Set<string>, matchCount: number, completedCount: number }>
  }> = {}

  if (relevantMatches.length > 0) {
    relevantMatches.forEach((match: any) => {
      if (match.player1_id) uniquePlayers.add(match.player1_id)
      if (match.player2_id) uniquePlayers.add(match.player2_id)

      const divName = match.tournament_divisions?.name
      const catName = match.tournament_categories?.name
      
      // Skip matches without division/category data
      if (!divName || !catName) return
      
      // Get skill level directly from match (set during bracket generation)
      let skill = (match as any).skill_level || 'Unknown'
      // Skip matches with Unknown/null skill (Open Belt tournaments or old data)
      if (!skill || skill === 'Unknown') return
      
      // Include all matches - organizers need to see everything
      
      if (!divisionStats[divName]) {
        divisionStats[divName] = { players: new Set(), matches: 0, rows: new Map() }
      }
      
      if (match.player1_id) divisionStats[divName].players.add(match.player1_id)
      if (match.player2_id) divisionStats[divName].players.add(match.player2_id)
      divisionStats[divName].matches++
      
      const normalizedCatName = getCategoryDisplayName(catName)
      const rowKey = `${normalizedCatName}-${skill}`
      if (!divisionStats[divName].rows.has(rowKey)) {
        divisionStats[divName].rows.set(rowKey, {
          category: normalizedCatName,
          skill: skill,
          playerCount: new Set(),
          matchCount: 0,
          completedCount: 0
        })
      }
      
      const row = divisionStats[divName].rows.get(rowKey)!
      if (match.player1_id) row.playerCount.add(match.player1_id)
      if (match.player2_id) row.playerCount.add(match.player2_id)
      row.matchCount++
      if (match.lifecycle_state === 'COMPLETED') row.completedCount++
    })
  }

  const sortedDivisionNames = Object.keys(divisionStats).sort()
  const totalDivisions = sortedDivisionNames.length
  const matchesOnly = relevantMatches.filter((m: any) => m.lifecycle_state !== 'AUTO_ADVANCE')
  const totalMatches = matchesOnly.length
  const completedMatches = matchesOnly.filter((m: any) => m.lifecycle_state === 'COMPLETED').length
  const progressVal = totalMatches > 0 
    ? Math.round((completedMatches / totalMatches) * 100) 
    : (relevantMatches.length > 0 ? 100 : 0)

  // Set default selection if empty
  const activeDivision = selectedDivision || (sortedDivisionNames.length > 0 ? sortedDivisionNames[0] : '')

  const showRefreshIndicator = isRefreshing || realtimePending

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden relative">
      {showRefreshIndicator && (
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="h-1 w-full bg-primary/20 overflow-hidden rounded-full">
            <div className="h-full bg-primary animate-pulse w-1/2" />
          </div>
        </div>
      )}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Printer className="h-4 w-4" />
                  Print / Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Print Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.open(`/print/tournament/${tournament.id}?mode=brackets`, '_blank')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Print Brackets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`/print/tournament/${tournament.id}?mode=slips`, '_blank')}>
                  <Ticket className="mr-2 h-4 w-4" />
                  Print Match Slips
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {userRole !== 'bracket_manager' && matches.length > 0 && (
               <Button 
                variant="destructive" 
                onClick={() => {
                  setDeleteDialogOpen(true)
                }}
                disabled={generating || deleting}
                className="gap-2 w-full sm:w-auto"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Bracket
              </Button>
            )}

            {userRole !== 'bracket_manager' && matches.length > 0 && (
              <Button 
                onClick={handleGenerateSchedule} 
                disabled={generating || deleting || generatingSchedule}
                variant="secondary"
                className="gap-2 w-full sm:w-auto"
              >
                {generatingSchedule && <Loader2 className="h-4 w-4 animate-spin" />}
                {!generatingSchedule && <Calendar className="h-4 w-4" />}
                {hasMatchNumbers ? 'Regenerate Schedule' : 'Generate Schedule'}
              </Button>
            )}

            {userRole !== 'bracket_manager' && (
              <Button 
                onClick={handleGenerate} 
                disabled={generating || deleting || generatingSchedule}
                className="w-full sm:w-auto"
              >
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {matches.length > 0 ? 'Regenerate Bracket' : 'Generate Bracket'}
              </Button>
            )}
      </div>

      {matches.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            title="Total Players"
            value={participants.filter((p: any) => p.status === 'verified' && !p.disqualified).length}
            icon={Users}
            description={`${uniquePlayers.size} in bracket`}
          />
          <StatCard
            title="Active Divisions"
            value={totalDivisions}
            icon={Layers}
            description="Divisions with brackets"
          />
          <StatCard
            title="Total Matches"
            value={totalMatches} 
            icon={Trophy}
            description={`${completedMatches} completed`}
          />
            <StatCard
            title="Tournament Progress"
            value={`${progressVal}%`}
            icon={Activity}
            description="Matches completed"
          />

          <DivisionBreakdown matches={matches} participants={participants} />
        </div>
      )}

      {matches.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No bracket generated"
          description="Generate a bracket to start the tournament."
          action={{
            label: 'Generate Bracket',
            onClick: handleGenerate
          }}
        />
      ) : (
        <BracketView 
          matches={matches} 
          participants={participants} 
          onMatchClick={handleMatchClick}
          isOrganizer={true}
          onEditMatch={handleEditMatch}
          courts={tournament.courts || 0}
          tournamentType={tournament.tournament_type as 'standard' | 'open-belt'}
          canScore={userRole !== 'bracket_manager'}
          canManageParticipants={userRole !== 'bracket_manager'}
        />
      )}

      {/* Medal standings — shown once any division bracket completes */}
      {placementGroups.length > 0 && (
        <div className="mt-6">
          <PlacementsView groups={placementGroups} />
        </div>
      )}

      {/* Match Readiness Dialog - readiness management only */}
      <MatchReadinessDialog 
        match={selectedMatch} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        participants={participants}
      />

      <EditMatchDialog
        match={matchToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        participants={participants}
        tournamentId={tournament.id}
      />
      
      <BracketGenerationModal 
        open={showGenerationModal} 
        onOpenChange={setShowGenerationModal} 
        participantCount={participants.length}
        matchCount={matches.length}
        type={generationType}
      />

      <BracketValidationDialog
        open={validationErrorOpen}
        onOpenChange={setValidationErrorOpen}
        errorType={validationErrorType}
        participants={validationParticipants}
        tournamentId={tournament.id}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the current bracket and all match data. 
              You will need to re-generate the bracket to start over.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDeleteBracket()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Bracket"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScheduleInfeasibilityDialog
        open={scheduleInfeasibleDialogOpen}
        onOpenChange={setScheduleInfeasibleDialogOpen}
        validation={scheduleValidation}
        currentConfig={{
          courts: tournament.courts || 0,
          dailyHours: 9, // Calculate from schedule config if available
          tournamentDays: tournament.start_date && tournament.end_date
            ? Math.ceil((new Date(tournament.end_date).getTime() - new Date(tournament.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : 0
        }}
      />

      <ScheduleSuccessSummaryDialog
        open={scheduleSuccessDialogOpen}
        onOpenChange={setScheduleSuccessDialogOpen}
        summary={scheduleSummary}
      />
    </div>
  )
}


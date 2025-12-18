'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BracketView } from '@/components/tournaments/bracket-view'
import { MatchResultDialog } from '@/components/tournaments/match-result-dialog'
import { EditMatchDialog } from '@/components/tournaments/edit-match-dialog'
import { generateTournamentBracket } from '@/lib/actions/brackets'
import { Match, Tournament } from '@/types/models'
import { toast } from 'sonner'
import { Loader2, Trophy, Users, Activity, Layers } from 'lucide-react'
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
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface BracketPageClientProps {
  tournament: Tournament
  participants: any[]
  matches: Match[]
}

import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'
import { BracketGenerationModal } from './bracket/bracket-generation-modal'
import { BracketValidationDialog } from './bracket/bracket-validation-dialog'
import { DivisionBreakdown } from './shared/division-breakdown'

function getBeltSkillCategory(beltLevel: string | null | undefined): string {
  if (!beltLevel) return 'Unknown'
  const belt = beltLevel.toLowerCase()
  
  if (belt.includes('white') || belt.includes('orange')) return 'Beginner'
  if (belt.includes('yellow') || belt.includes('green') || belt.includes('blue')) return 'Novice I'
  if (belt.includes('red') || belt.includes('brown')) return 'Novice II'
  if (belt.includes('black') || belt.includes('poom') || belt.includes('dan')) return 'Advanced'
  
  return 'Unknown'
}

const SKILL_ORDER = ['Beginner', 'Novice I', 'Novice II', 'Advanced', 'Unknown']

export function BracketPageClient({ tournament, participants, matches }: BracketPageClientProps) {
  useTournamentRealtime(tournament.id)
  const router = useRouter()
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showGenerationModal, setShowGenerationModal] = useState(false)
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  // Validation Error State
  const [validationErrorOpen, setValidationErrorOpen] = useState(false)
  const [validationErrorType, setValidationErrorType] = useState<'unweighed' | 'unassigned' | 'general'>('general')
  const [validationParticipants, setValidationParticipants] = useState<{id: string, name: string, reason?: string}[]>([])

  const handleGenerate = async () => {
    setGenerating(true)
    setShowGenerationModal(true)
    
    // Small delay to let modal open and show first step
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const result = await generateTournamentBracket(tournament.id)
      
      if (!result.success) {
        // Handle specific validation errors with the dialog
        if (result.errorType === 'unweighed' || result.errorType === 'unassigned') {
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
        router.refresh() // Refresh to show new matches
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

  // Calculate Stats
  const uniquePlayers = new Set<string>()
  const divisionStats: Record<string, { 
    players: Set<string>, 
    matches: number,
    rows: Map<string, { category: string, skill: string, playerCount: Set<string>, matchCount: number, completedCount: number }>
  }> = {}

  if (matches.length > 0) {
    matches.forEach((match: any) => {
      if (match.player1_id) uniquePlayers.add(match.player1_id)
      if (match.player2_id) uniquePlayers.add(match.player2_id)

      const divName = match.tournament_divisions?.name || 'Unknown'
      const catName = match.tournament_categories?.name || 'Unassigned'
      
      const p1Belt = match.player1?.belt_level
      const skill = getBeltSkillCategory(p1Belt)
      
      if (!divisionStats[divName]) {
        divisionStats[divName] = { players: new Set(), matches: 0, rows: new Map() }
      }
      
      if (match.player1_id) divisionStats[divName].players.add(match.player1_id)
      if (match.player2_id) divisionStats[divName].players.add(match.player2_id)
      divisionStats[divName].matches++
      
      const rowKey = `${catName}-${skill}`
      if (!divisionStats[divName].rows.has(rowKey)) {
        divisionStats[divName].rows.set(rowKey, {
          category: catName,
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
      if (match.status === 'completed') row.completedCount++
    })
  }

  const sortedDivisionNames = Object.keys(divisionStats).sort()
  const totalDivisions = sortedDivisionNames.length
  const totalMatches = matches.length
  const completedMatches = matches.filter((m: any) => m.status === 'completed').length
  const progressVal = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0

  // Set default selection if empty
  const activeDivision = selectedDivision || (sortedDivisionNames.length > 0 ? sortedDivisionNames[0] : '')

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {matches.length > 0 ? 'Regenerate Bracket' : 'Generate Bracket'}
        </Button>
      </div>

      {matches.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            title="Total Players"
            value={uniquePlayers.size}
            icon={Users}
            description="Active participants"
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

          <DivisionBreakdown matches={matches} />
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
        />
      )}

      <MatchResultDialog 
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
      />

      <BracketValidationDialog
        open={validationErrorOpen}
        onOpenChange={setValidationErrorOpen}
        errorType={validationErrorType}
        participants={validationParticipants}
        tournamentId={tournament.id}
      />
    </div>
  )
}


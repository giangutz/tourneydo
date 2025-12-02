'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AddParticipantDialog } from './add-participant-dialog'
import { EditParticipantDialog } from './edit-participant-dialog'
import { WeighInDialog } from './weigh-in-dialog'
import { Team } from '@/types/models'
import { Pencil, MoreHorizontal, Search, Check, X, DollarSign, Loader2, Scale, CheckCircle2, AlertTriangle, ArrowUpDown, Filter } from 'lucide-react'
import { updateParticipantStatus } from '@/lib/actions/participants'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Participant {
  id: string
  tournament_id: string
  status: 'pending' | 'verified' | 'paid'
  actual_weight: number | null
  actual_height: number | null
  disqualified: boolean
  disqualification_reason: string | null
  weighed_in_at: string | null
  created_at: string
  player: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    belt_level: string | null
    weight: number | null
    height: number | null
    dob: string
    gender: 'male' | 'female'
  }
  team: {
    name: string
  }
  division_id?: string | null
  category_id?: string | null
}

interface ParticipantListProps {
  participants: Participant[]
  tournamentId: string
  tournamentType?: 'standard' | 'open-belt'
  teams: Team[]
}

type SortKey = 'name' | 'team' | 'belt' | 'status' | 'weighIn'
type SortDirection = 'asc' | 'desc'

export function ParticipantList({ participants, tournamentId, tournamentType = 'standard', teams }: ParticipantListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [weighingParticipant, setWeighingParticipant] = useState<Participant | null>(null)
  
  // Filter states
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [filterBelt, setFilterBelt] = useState<string>('all')
  const [filterWeighIn, setFilterWeighIn] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }
  
  const filteredParticipants = participants.filter((p) => {
    if (!p.player || !p.team) return false
    
    // Search query
    const fullName = `${p.player.first_name} ${p.player.last_name}`.toLowerCase()
    const teamName = p.team.name.toLowerCase()
    const query = searchQuery.toLowerCase()
    const matchesSearch = fullName.includes(query) || teamName.includes(query)

    // Team filter
    const matchesTeam = filterTeam === 'all' || p.team.name === filterTeam

    // Belt filter
    const matchesBelt = filterBelt === 'all' || p.player.belt_level === filterBelt

    // Status filter
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus

    // Weigh-in filter
    let matchesWeighIn = true
    if (filterWeighIn === 'completed') {
      matchesWeighIn = !!p.weighed_in_at
    } else if (filterWeighIn === 'pending') {
      matchesWeighIn = !p.weighed_in_at && (p.status === 'verified' || p.status === 'paid')
    } else if (filterWeighIn === 'not-required') {
      matchesWeighIn = !p.weighed_in_at && p.status !== 'verified' && p.status !== 'paid'
    }

    return matchesSearch && matchesTeam && matchesBelt && matchesStatus && matchesWeighIn
  }).sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1
    
    switch (sortKey) {
      case 'name':
        return direction * `${a.player.first_name} ${a.player.last_name}`.localeCompare(`${b.player.first_name} ${b.player.last_name}`)
      case 'team':
        return direction * a.team.name.localeCompare(b.team.name)
      case 'belt':
        return direction * (a.player.belt_level || '').localeCompare(b.player.belt_level || '')
      case 'status':
        return direction * a.status.localeCompare(b.status)
      case 'weighIn':
        const aWeighed = !!a.weighed_in_at
        const bWeighed = !!b.weighed_in_at
        if (aWeighed === bWeighed) return 0
        return direction * (aWeighed ? -1 : 1) // Completed first if asc
      default:
        return 0
    }
  })

  const handleStatusUpdate = async (id: string, status: 'verified' | 'paid') => {
    // If marking as verified, open weigh-in dialog
    if (status === 'verified') {
      const participant = participants.find(p => p.id === id)
      if (participant) {
        setWeighingParticipant(participant)
        return
      }
    }

    const result = await updateParticipantStatus(id, tournamentId, status)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success(`Participant marked as ${status}`)
    }
  }

  const handleBulkStatusUpdate = async (status: 'verified' | 'paid') => {
    if (selectedIds.length === 0) return
    
    setIsUpdating(true)
    try {
      const results = await Promise.all(
        selectedIds.map(id => updateParticipantStatus(id, tournamentId, status))
      )
      
      const failed = results.filter(r => !r.success)
      if (failed.length === 0) {
        toast.success(`${selectedIds.length} participants marked as ${status}`)
        setSelectedIds([])
      } else {
        toast.error(`Failed to update ${failed.length} participants`)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredParticipants.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredParticipants.map(p => p.id))
    }
  }

  // Get unique belt levels and teams for filters
  const uniqueBelts = Array.from(new Set(participants.map(p => p.player.belt_level).filter(Boolean)))
  const uniqueTeams = Array.from(new Set(participants.map(p => p.team.name)))

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {selectedIds.length} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Bulk Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('verified')}>
                    <Check className="mr-2 h-4 w-4" /> Mark as Verified
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('paid')}>
                    <DollarSign className="mr-2 h-4 w-4" /> Mark as Paid
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <AddParticipantDialog tournamentId={tournamentId} teams={teams} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>
        
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {uniqueTeams.map(team => (
              <SelectItem key={team} value={team}>{team}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tournamentType === 'standard' && (
          <Select value={filterBelt} onValueChange={setFilterBelt}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Belt Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Belts</SelectItem>
              {uniqueBelts.map(belt => (
                <SelectItem key={belt as string} value={belt as string}>{belt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterWeighIn} onValueChange={setFilterWeighIn}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Weigh-In Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weigh-In</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending (Verified/Paid)</SelectItem>
            <SelectItem value="not-required">Not Required Yet</SelectItem>
          </SelectContent>
        </Select>

        {(filterTeam !== 'all' || filterBelt !== 'all' || filterStatus !== 'all' || filterWeighIn !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setFilterTeam('all')
              setFilterBelt('all')
              setFilterStatus('all')
              setFilterWeighIn('all')
            }}
            className="h-8 px-2 text-xs"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredParticipants.length} participants found
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredParticipants.length && filteredParticipants.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  Name {sortKey === 'name' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('team')}>
                <div className="flex items-center gap-1">
                  Team {sortKey === 'team' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('belt')}>
                <div className="flex items-center gap-1">
                  Belt {sortKey === 'belt' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead>Height/Weight</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('weighIn')}>
                <div className="flex items-center gap-1">
                  Weigh-In {sortKey === 'weighIn' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">
                  Status {sortKey === 'status' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No participants found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredParticipants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(participant.id)}
                      onCheckedChange={() => toggleSelection(participant.id)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {participant.player?.first_name} {participant.player?.last_name}
                  </TableCell>
                  <TableCell>{participant.team?.name || 'Unknown Team'}</TableCell>
                  <TableCell>{participant.player?.belt_level || '–'}</TableCell>
                  <TableCell>
                    {(() => {
                      const weight = participant.player?.weight ? `${participant.player.weight} kg` : null
                      const height = participant.player?.height ? `${participant.player.height} cm` : null
                      if (weight && height) return `${weight} / ${height}`
                      if (weight) return weight
                      if (height) return height
                      return '–'
                    })()}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            {participant.weighed_in_at ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : participant.status === 'verified' || participant.status === 'paid' ? (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {participant.weighed_in_at ? (
                            <div className="text-xs">
                              <div>Weighed in</div>
                              {participant.actual_weight && <div>Weight: {participant.actual_weight}kg</div>}
                              {participant.actual_height && <div>Height: {participant.actual_height}cm</div>}
                            </div>
                          ) : participant.status === 'verified' || participant.status === 'paid' ? (
                            'Weigh-in required'
                          ) : (
                            'Not verified yet'
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        participant.status === 'paid'
                          ? 'default'
                          : participant.status === 'verified'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {participant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setEditingParticipant(participant)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        {(participant.status === 'verified' || participant.status === 'paid') && (
                          <DropdownMenuItem onClick={() => setWeighingParticipant(participant)}>
                            <Scale className="mr-2 h-4 w-4" /> Weigh In
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusUpdate(participant.id, 'verified')}>
                          <Check className="mr-2 h-4 w-4" /> Mark as Verified
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusUpdate(participant.id, 'paid')}>
                          <DollarSign className="mr-2 h-4 w-4" /> Mark as Paid
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingParticipant && (
        <EditParticipantDialog
          participant={editingParticipant}
          tournamentId={tournamentId}
          open={!!editingParticipant}
          onOpenChange={(open) => !open && setEditingParticipant(null)}
        />
      )}

      {weighingParticipant && (
        <WeighInDialog
          participant={weighingParticipant}
          tournamentId={tournamentId}
          tournamentType={tournamentType}
          open={!!weighingParticipant}
          onOpenChange={(open) => !open && setWeighingParticipant(null)}
        />
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
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
import { Pencil, MoreHorizontal, Search, Check, X, DollarSign, Loader2, Scale, CheckCircle2, AlertTriangle, ArrowUpDown, Filter, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { updateParticipantStatus, bulkWeighIn, deleteParticipant, bulkDeleteParticipants } from '@/lib/actions/participants'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useDebouncedCallback } from 'use-debounce'

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
  count: number
  page: number
  limit: number
  totalPages: number
  tournamentId: string
  tournamentType?: 'standard' | 'open-belt'
  teams: Team[]
}

import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'

export function ParticipantList({ 
  participants, 
  count, 
  page, 
  limit, 
  totalPages, 
  tournamentId, 
  tournamentType = 'standard', 
  teams 
}: ParticipantListProps) {
  useTournamentRealtime(tournamentId)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [weighingParticipant, setWeighingParticipant] = useState<Participant | null>(null)
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  
  // URL Params state
  const searchQuery = searchParams.get('q') || ''
  const filterTeam = searchParams.get('team') || 'all'
  const filterBelt = searchParams.get('belt') || 'all'
  const filterStatus = searchParams.get('status') || 'all'
  const filterWeighIn = searchParams.get('weighIn') || 'all'
  const sortKey = searchParams.get('sort') || 'created_at'
  const sortDirection = searchParams.get('order') || 'desc'

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') {
      params.delete(name)
    } else {
      params.set(name, value)
    }
    // Reset page when filtering
    if (name !== 'page' && name !== 'sort' && name !== 'order') {
      params.set('page', '1')
    }
    return params.toString()
  }

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }, 300)

  const handleSort = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sortKey === key) {
      params.set('order', sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sort', key)
      params.set('order', 'asc')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleFilterChange = (key: string, value: string) => {
    router.push(`${pathname}?${createQueryString(key, value)}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', newLimit)
    params.set('page', '1') // Reset to page 1
    router.push(`${pathname}?${params.toString()}`)
  }

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
      router.refresh()
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
        router.refresh()
      } else {
        toast.error(`Failed to update ${failed.length} participants`)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkWeighIn = async () => {
    if (selectedIds.length === 0) return
    
    setIsUpdating(true)
    try {
      const result = await bulkWeighIn(selectedIds, tournamentId)
      
      if (result?.success) {
        toast.success(`${selectedIds.length} participants weighed in`)
        setSelectedIds([])
        router.refresh()
      } else {
        toast.error(result?.error || 'Failed to weigh in participants')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteParticipant = async () => {
    if (!deletingParticipant) return
    
    setIsUpdating(true)
    try {
      const result = await deleteParticipant(deletingParticipant.id, tournamentId)
      
      if (result.success) {
        toast.success('Participant deleted successfully')
        setDeletingParticipant(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete participant')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    
    setIsUpdating(true)
    try {
      const result = await bulkDeleteParticipants(selectedIds, tournamentId)
      
      if (result.success) {
        toast.success(`${selectedIds.length} participants deleted successfully`)
        setSelectedIds([])
        setShowBulkDeleteDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete participants')
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
    if (selectedIds.length === participants.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(participants.map(p => p.id))
    }
  }

  // Get unique belt levels and teams for filters (from ALL teams, not just current page)
  // Note: For teams, we use the `teams` prop which contains all teams.
  // For belts, we can hardcode standard BJJ belts or fetch from DB. For now, hardcoded is safer or use unique from current page + standard.
  const standardBelts = ['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black']

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            defaultValue={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBulkWeighIn}>
                    <Scale className="mr-2 h-4 w-4" /> Bulk Weigh-In
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
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
        
        <Select value={filterTeam} onValueChange={(val) => handleFilterChange('team', val)}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tournamentType === 'standard' && (
          <Select value={filterBelt} onValueChange={(val) => handleFilterChange('belt', val)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Belt Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Belts</SelectItem>
              {standardBelts.map(belt => (
                <SelectItem key={belt} value={belt}>{belt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterStatus} onValueChange={(val) => handleFilterChange('status', val)}>
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

        <Select value={filterWeighIn} onValueChange={(val) => handleFilterChange('weighIn', val)}>
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

        {(filterTeam !== 'all' || filterBelt !== 'all' || filterStatus !== 'all' || filterWeighIn !== 'all' || searchQuery) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push(pathname)}
            className="h-8 px-2 text-xs"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {count} participants found
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === participants.length && participants.length > 0}
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
            {participants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No participants found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              participants.map((participant) => (
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingParticipant(participant)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={limit.toString()}
              onValueChange={handleLimitChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100, 500].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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

      {/* Individual Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingParticipant}
        onOpenChange={(open) => !open && setDeletingParticipant(null)}
        onConfirm={handleDeleteParticipant}
        participantCount={1}
        participantNames={deletingParticipant ? [`${deletingParticipant.player?.first_name} ${deletingParticipant.player?.last_name}`] : []}
      />

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        onConfirm={handleBulkDelete}
        participantCount={selectedIds.length}
        participantNames={participants
          .filter(p => selectedIds.includes(p.id))
          .map(p => `${p.player?.first_name} ${p.player?.last_name}`)}
      />
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { routes } from '@/config/routes'
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
import { Team } from '@/types/models'
import { Pencil, MoreHorizontal, Search, Check, X, DollarSign, Loader2, Scale, CheckCircle2, AlertTriangle, ArrowUpDown, Filter, ChevronLeft, ChevronRight, Trash2, Download } from 'lucide-react'
import { updateParticipantStatus, bulkWeighIn, deleteParticipant, bulkDeleteParticipants, weighInParticipant } from '@/lib/actions/participants'
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
  weighed_in_by_user?: {
    first_name: string | null
    last_name: string | null
  } | null
  tournament_divisions?: {
    id: string
    name: string
  } | null
  tournament_categories?: {
    id: string
    name: string
    gender: string
    min_weight: number | null
    max_weight: number | null
    min_height: number | null
    max_height: number | null
  } | null
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

import { useAdminChannel } from '@/lib/realtime/admin-channel'


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
  useAdminChannel(tournamentId)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

  
  const selectedVerifiedCount = useMemo(() => {
    return selectedIds.filter(id => {
      const p = participants.find(p => p.id === id)
      return p?.status === 'verified'
    }).length
  }, [selectedIds, participants])
  
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
    
    const verifiedIds = selectedIds.filter(id => {
      const p = participants.find(p => p.id === id)
      return p?.status === 'verified'
    })

    if (verifiedIds.length !== selectedIds.length) {
      toast.error("Only verified participants can be bulk weighed in. Please ensure all selected participants are verified.")
      return
    }

    setIsUpdating(true)
    try {
      const result = await bulkWeighIn(selectedIds, tournamentId)
      
      if (result?.success) {
        toast.success(`${verifiedIds.length} participants weighed in`)
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


  const handleExportCSV = async () => {
    setIsUpdating(true)
    try {
       // Import action dynamically
       const { exportParticipants } = await import('@/lib/actions/participants')
       
       const filters = {
          query: searchQuery,
          teamId: filterTeam,
          belt: filterBelt,
          status: filterStatus,
          weighInStatus: filterWeighIn,
          sort: sortKey,
          order: sortDirection as 'asc' | 'desc'
       }

       const result = await exportParticipants(tournamentId, filters)
       
       if (result.success) {
          if (result.data) {
             // Convert to CSV
             const headers = ['First Name', 'Last Name', 'Team', 'Belt', 'Gender', 'DOB', 'Weight (Reg)', 'Height (Reg)', 'Status', 'Weigh-In Status', 'Actual Weight', 'Actual Height']
             const rows = result.data.map((p: any) => [
                p.player?.first_name || '',
                p.player?.last_name || '',
                p.team?.name || '',
                p.player?.belt_level || '',
                p.player?.gender || '',
                p.player?.dob || '',
                p.player?.weight || '',
                p.player?.height || '',
                p.status,
                p.weighed_in_at ? 'Completed' : 'Pending',
                p.actual_weight || '',
                p.actual_height || ''
             ])
             
             const csvContent = [
                headers.join(','),
                ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
             ].join('\n')
             
             const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
             const url = URL.createObjectURL(blob)
             const link = document.createElement('a')
             link.setAttribute('href', url)
             link.setAttribute('download', `participants_export_${new Date().toISOString().split('T')[0]}.csv`)
             link.style.visibility = 'hidden'
             document.body.appendChild(link)
             link.click()
             document.body.removeChild(link)
             
             toast.success(`Exported ${rows.length} participants`)
          }
       } else {
          toast.error(result.error || 'Failed to export participants')
       }
    } catch (error) {
       toast.error('An error occurred during export')
    } finally {
       setIsUpdating(false)
    }
  }

  // Bulk Delete Confirmation
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
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
            {isUpdating ? 'Exporting...' : 'Export CSV'}
          </Button>

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
                   <DropdownMenuItem 
                    onClick={handleBulkWeighIn}
                    disabled={selectedVerifiedCount !== selectedIds.length || selectedIds.length === 0}
                  >
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
            <SelectItem value="pending">Not Weighed In (Pending)</SelectItem>
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

      <div className="rounded-md border hidden md:block">
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
                            {participant.disqualified ? (
                              <X className="h-4 w-4 text-destructive" />
                            ) : participant.weighed_in_at ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : participant.status === 'verified' || participant.status === 'paid' ? (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <span className="text-muted-foreground">–</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {participant.disqualified ? (
                            <div className="text-xs space-y-1">
                              <div className="font-semibold text-destructive">Disqualified</div>
                              {participant.disqualification_reason && (
                                <div className="text-muted-foreground">{participant.disqualification_reason}</div>
                              )}
                              {(() => {
                                const age = participant.player?.dob ? new Date().getFullYear() - new Date(participant.player.dob).getFullYear() : null
                                const isHeightBased = age !== null && age < 12
                                return (
                                  <>
                                    {isHeightBased && participant.actual_height && <div>Height: {participant.actual_height}cm</div>}
                                    {!isHeightBased && participant.actual_weight && <div>Weight: {participant.actual_weight}kg</div>}
                                  </>
                                )
                              })()}
                              {participant.weighed_in_by_user && (
                                <div className="mt-1 pt-1 border-t border-border/50 text-muted-foreground">
                                  by {participant.weighed_in_by_user.first_name || ''} {participant.weighed_in_by_user.last_name || ''}
                                </div>
                              )}
                            </div>
                          ) : participant.weighed_in_at ? (
                            <div className="text-xs space-y-1">
                              <div className="font-semibold">Weighed In</div>
                              {(() => {
                                const age = participant.player?.dob ? new Date().getFullYear() - new Date(participant.player.dob).getFullYear() : null
                                const isHeightBased = age !== null && age < 12
                                return (
                                  <>
                                    {isHeightBased && participant.actual_height && <div>Height: {participant.actual_height}cm</div>}
                                    {!isHeightBased && participant.actual_weight && <div>Weight: {participant.actual_weight}kg</div>}
                                  </>
                                )
                              })()}
                              {participant.tournament_divisions && participant.tournament_categories && (
                                <div className="text-muted-foreground">
                                  {participant.tournament_divisions.name} - {participant.tournament_categories.name}
                                </div>
                              )}
                              {participant.weighed_in_by_user && (
                                <div className="mt-1 pt-1 border-t border-border/50 text-muted-foreground">
                                  by {participant.weighed_in_by_user.first_name || ''} {participant.weighed_in_by_user.last_name || ''}
                                </div>
                              )}
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
                        {participant.status === 'verified' && (
                          <DropdownMenuItem asChild>
                            <Link href={routes.organizer.participantWeighIn(tournamentId, participant.id)}>
                              <Scale className="mr-2 h-4 w-4" /> Weigh In
                            </Link>
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {participants.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">No participants found</p>
          </div>
        ) : (
          participants.map((participant) => (
            <div key={participant.id} className="border rounded-lg bg-card p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                     <Checkbox
                      checked={selectedIds.includes(participant.id)}
                      onCheckedChange={() => toggleSelection(participant.id)}
                      aria-label="Select participant"
                    />
                    <div>
                      <div className="font-semibold text-base">
                        {participant.player?.first_name} {participant.player?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {participant.team?.name || 'Unknown Team'}
                      </div>
                    </div>
                  </div>
                  
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
                         {participant.status === 'verified' && (
                          <DropdownMenuItem asChild>
                            <Link href={routes.organizer.participantWeighIn(tournamentId, participant.id)}>
                              <Scale className="mr-2 h-4 w-4" /> Weigh In
                            </Link>
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
                </div>
                
                <div className="flex items-center justify-between text-sm">
                   <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{participant.player?.belt_level || 'No Belt'}</Badge>
                      {participant.player?.weight && <Badge variant="secondary">{participant.player.weight}kg</Badge>}
                   </div>
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
                </div>
            </div>
          ))
        )}
      </div>
      
      {/* Pagination Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2 py-4">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Rows per page</span>
            <span className="text-sm text-muted-foreground sm:hidden">Rows</span>
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
        <div className="flex items-center w-full sm:w-auto gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="flex-1 sm:flex-none order-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex-1 sm:flex-none order-2"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
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

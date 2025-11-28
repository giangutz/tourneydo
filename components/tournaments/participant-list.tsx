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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Search, Check, X, DollarSign, Loader2 } from 'lucide-react'
import { updateParticipantStatus } from '@/lib/actions/participants'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

interface Participant {
  id: string
  tournament_id: string
  status: 'pending' | 'verified' | 'paid'
  created_at: string
  player: {
    first_name: string
    last_name: string
    email: string | null
    belt_level: string | null
    weight: number | null
    height: number | null
  }
  team: {
    name: string
  }
}

interface ParticipantListProps {
  participants: Participant[]
  tournamentId: string
}

export function ParticipantList({ participants, tournamentId }: ParticipantListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  
  const filteredParticipants = participants.filter((p) => {
    if (!p.player || !p.team) return false
    const fullName = `${p.player.first_name} ${p.player.last_name}`.toLowerCase()
    const teamName = p.team.name.toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || teamName.includes(query)
  })

  const handleStatusUpdate = async (id: string, status: 'verified' | 'paid') => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
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
        <div className="text-sm text-muted-foreground">
          {filteredParticipants.length} participants
        </div>
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
              <TableHead>Name</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Belt</TableHead>
              <TableHead>Height/Weight</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No participants found.
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
    </div>
  )
}

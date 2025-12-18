'use client'

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WeighInDialog } from './weigh-in-dialog'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

// Types for props (simplified from models)
interface Participant {
  id: string
  first_name: string
  last_name: string
  team_name?: string
  division_id?: string
  category_id?: string
  weigh_in_selected: boolean
  weighed_in_at: string | null
  disqualified: boolean
  disqualification_reason: string | null
  actual_weight: number | null
  player?: {
    first_name: string
    last_name: string
  }
  team?: {
    name: string
  }
}

interface Division {
  id: string
  name: string
  tournament_categories: Array<{
    id: string
    name: string
    max_weight?: number | null
  }>
}

interface WeighInListProps {
  participants: any[] 
  divisions: any[]
  tournamentId: string
}

export function WeighInList({ participants, divisions, tournamentId }: WeighInListProps) {
  // Filter for selected participants
  const selectedParticipants = participants.filter((p: Participant) => p.weigh_in_selected)

  if (selectedParticipants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Participants Selected</CardTitle>
          <CardDescription>
            Generate a random list to begin the surprise weigh-in checks.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getCategoryDetails = (divisionId?: string, categoryId?: string) => {
    const div = divisions.find((d: Division) => d.id === divisionId)
    const cat = div?.tournament_categories.find((c: any) => c.id === categoryId)
    return {
      divisionName: div?.name || 'Unknown',
      categoryName: cat?.name || 'Unknown',
      maxWeight: cat?.max_weight
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prescheduled Weigh-Ins</CardTitle>
        <CardDescription>
          Surprise check list for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Athlete</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Max Weight</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedParticipants.map((p: Participant) => {
              const details = getCategoryDetails(p.division_id, p.category_id)
              const fullName = p.player 
                ? `${p.player.first_name} ${p.player.last_name}`
                : `${p.first_name} ${p.last_name}` // Fallback if flattened
              const teamName = p.team?.name || p.team_name || '-'

              let statusBadge = <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>
              if (p.disqualified && p.disqualification_reason?.includes('Weigh-in')) {
                 statusBadge = <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>
              } else if (p.weighed_in_at && !p.disqualified) {
                 statusBadge = <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</Badge>
              } else if (p.disqualified) {
                 statusBadge = <Badge variant="destructive">Disqualified (Other)</Badge>
              }

              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{fullName}</div>
                    <div className="text-xs text-muted-foreground">{teamName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{details.divisionName}</div>
                    <div className="text-xs text-muted-foreground">{details.categoryName}</div>
                  </TableCell>
                  <TableCell>{statusBadge}</TableCell>
                  <TableCell className="text-right">
                    {details.maxWeight ? `${details.maxWeight}kg` : 'Open'}
                  </TableCell>
                  <TableCell className="text-right">
                    <WeighInDialog
                      registrationId={p.id}
                      participantName={fullName}
                      maxWeight={details.maxWeight}
                      tournamentId={tournamentId}
                      currentWeight={p.actual_weight}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

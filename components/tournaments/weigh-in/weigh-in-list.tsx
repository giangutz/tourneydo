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

import { startTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'

export function WeighInList({ participants, divisions, tournamentId }: WeighInListProps) {
  const [isExporting, setIsExporting] = useState(false)

  // Filter for selected participants
  const selectedParticipants = participants.filter((p: Participant) => p.weigh_in_selected)

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      // Import action dynamically
      const { exportParticipants } = await import('@/lib/actions/participants')
       
      const filters = {
        weighInSelected: true,
        limit: 10000 
      }

      const result = await exportParticipants(tournamentId, filters)
       
      if (result.success) {
        if (result.data) {
          // Convert to CSV
          const headers = ['First Name', 'Last Name', 'Team', 'Division', 'Category', 'Max Weight', 'Status', 'Weigh-In Status', 'Actual Weight', 'Actual Height']
          const rows = result.data.map((p: any) => {
              const div = divisions.find((d: Division) => d.id === p.division_id)
              const cat = div?.tournament_categories.find((c: any) => c.id === p.category_id)
              return [
                p.player?.first_name || '',
                p.player?.last_name || '',
                p.team?.name || '',
                div?.name || '',
                cat?.name || '',
                cat?.max_weight || 'Open',
                p.status,
                p.weighed_in_at ? 'Completed' : 'Pending',
                p.actual_weight || '',
                p.actual_height || ''
              ]
          })
            
          const csvContent = [
            headers.join(','),
            ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          ].join('\n')
            
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.setAttribute('href', url)
          link.setAttribute('download', `random_weigh_in_export_${new Date().toISOString().split('T')[0]}.csv`)
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
      setIsExporting(false)
    }
  }

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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Prescheduled Weigh-Ins</CardTitle>
          <CardDescription>
            Surprise check list for today.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
            {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
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

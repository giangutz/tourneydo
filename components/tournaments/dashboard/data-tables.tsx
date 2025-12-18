"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

// --- TEAM REGISTRATIONS ---
export function TeamRegistrations({ participants }: { participants: any[] }) {
  const teams = new Map<string, number>()
  
  participants.forEach(p => {
    const name = p.team?.name || 'Unattached'
    teams.set(name, (teams.get(name) || 0) + 1)
  })

  const sorted = Array.from(teams.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const totalPages = Math.ceil(sorted.length / itemsPerPage)
  
  const paginatedData = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Rosters</CardTitle>
        <CardDescription>Registered players per team.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Athletes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((t) => (
                <TableRow key={t.name}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-right">{t.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// --- DIVISION HEALTH ---
interface DivisionHealthProps {
  participants: any[]
  divisions: { id: string, name: string }[] 
}

export function DivisionHealth({ participants, divisions }: DivisionHealthProps) {
  // Map division ID to stats
  // Group participants by division_id
  const divStats = new Map<string, number>()
  
  participants.forEach(p => {
    if (p.division_id) {
       divStats.set(p.division_id, (divStats.get(p.division_id) || 0) + 1)
    }
  })

  // Combine with known divisions (showing 0 count ones is useful too?)
  // Actually, usually we only care about divisions that HAVE people
  // But spotting ghost divisions implies seeing ones with 1 person.
  
  // Let's iterate all divisions (if passed) or just iterate what we found
  // If we only have participant data, we might not know division names unless passed.
  // We'll rely on the `divisions` prop being passed from server.

  const healthData = divisions.map(d => {
    const count = divStats.get(d.id) || 0
    const matches = count > 1 ? count - 1 : 0
    
    // Duration Logic
    // Senior: 3 mins (2m round + 1m break)
    // Junior/Cadet: 2.25 mins (1.5m round + 45s break)
    // Gradeschool: 1.5 mins (1m round + 30s break)
    let minsPerMatch = 3 // default to Senior/Adult
    
    const nameLower = d.name.toLowerCase()
    if (nameLower.includes('junior') || nameLower.includes('cadet')) {
        minsPerMatch = 2.25
    } else if (nameLower.includes('grade')) {
        minsPerMatch = 1.5
    }

    const totalMins = Math.ceil(matches * minsPerMatch)
    const duration = count > 1 
      ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`
      : '-'

    // Format for display: e.g. "2h 15m" or just "45m"
    const displayDuration = count > 1
        ? totalMins >= 60 
            ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`
            : `${totalMins}m`
        : '-'

    return {
      id: d.id,
      name: d.name,
      count,
      duration: displayDuration,
      status: count === 0 ? 'Empty' : count === 1 ? 'Ghost' : 'Healthy'
    }
  }).sort((a, b) => {
    // Sort logic: Ghost first (action needed), then Healthy desc, then Empty
    if (a.status === 'Ghost' && b.status !== 'Ghost') return -1
    if (b.status === 'Ghost' && a.status !== 'Ghost') return 1
    return b.count - a.count
  })

  // Filter out Empty if list is too long? Maybe keep them to show what's inactive.
  const activeOrGhost = healthData.filter(d => d.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Division Health</CardTitle>
        <CardDescription>Monitor division sizes and viability.</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-auto">
         <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Division</TableHead>
              <TableHead className="text-right">Athletes</TableHead>
              <TableHead className="text-right">Est. Duration</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeOrGhost.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-right">{d.count}</TableCell>
                <TableCell className="text-right text-muted-foreground">{d.duration}</TableCell>
                <TableCell className="text-right">
                  {d.status === 'Ghost' ? (
                     <div className="flex items-center justify-end gap-1 text-orange-500 font-medium">
                       <AlertTriangle className="h-4 w-4" />
                       <span>Action</span>
                     </div>
                  ) : (
                     <div className="flex items-center justify-end gap-1 text-green-600">
                       <CheckCircle2 className="h-4 w-4" />
                       <span>Good</span>
                     </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {activeOrGhost.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No active divisions.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

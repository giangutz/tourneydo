"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface TeamBalance {
  teamName: string
  unpaidCount: number
  totalOwed: number
}

export function OutstandingBalances({ participants, entryFee }: { participants: any[], entryFee: number }) {
  // Group by team and calculate owed
  const teamsMap = new Map<string, CheckData>()
  type CheckData = { unpaid: number, name: string }

  participants.forEach(p => {
    if (!['pending', 'verified', 'paid'].includes(p.status)) return // Only count valid registrations
    
    // Check if paid
    const isPaid = p.status === 'paid' || p.payment_status === 'paid'
    if (isPaid) return 

    const teamName = p.team?.name || 'Unattached'
    const curr = teamsMap.get(teamName) || { unpaid: 0, name: teamName }
    
    curr.unpaid += 1
    teamsMap.set(teamName, curr)
  })

  // Sort by owed amount descending
  const outstanding = Array.from(teamsMap.values())
    .map(t => ({
      teamName: t.name,
      unpaidCount: t.unpaid,
      totalOwed: t.unpaid * entryFee
    }))
    .filter(t => t.totalOwed > 0)
    .sort((a, b) => b.totalOwed - a.totalOwed)

  if (outstanding.length === 0) {
    return (
      <Card>
        <CardHeader>
           <CardTitle>Outstanding Team Balances</CardTitle>
           <CardDescription>No outstanding balances.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const totalPages = Math.ceil(outstanding.length / itemsPerPage)
  
  const paginatedData = outstanding.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding Team Balances</CardTitle>
        <CardDescription>Teams with unpaid registration fees.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Unpaid Athletes</TableHead>
                <TableHead className="text-right">Amount Owed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((t) => (
                <TableRow key={t.teamName}>
                  <TableCell className="font-medium">{t.teamName}</TableCell>
                  <TableCell className="text-right">{t.unpaidCount}</TableCell>
                  <TableCell className="text-right font-bold text-destructive">
                    {formatMoney(t.totalOwed)}
                  </TableCell>
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

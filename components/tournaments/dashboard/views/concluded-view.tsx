"use client"

import { useEffect, useState } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { KPICard } from '../kpi-card'
import { DollarSign, Trophy, UserCheck, Calculator, Pencil, Trash2, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Database } from '@/lib/supabase/types'
import { ConcludedViewSkeleton } from './skeletons'


interface ConcludedViewProps {
  tournamentId: string
}

type Registration = Database['public']['Tables']['tournament_registrations']['Row']

export function ConcludedView({ tournamentId }: ConcludedViewProps) {
  const { session } = useSession()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    showRate: 0
  })
  const [teamLeaderboard, setTeamLeaderboard] = useState<{name: string, gold: number, silver: number, bronze: number, points: number}[]>([])
  
  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<{id: string, category: string, amount: number, description: string | null} | null>(null)
  const [newExpense, setNewExpense] = useState({ category: '', amount: '', description: '' })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<{id: string, category: string, amount: number, description: string | null}[]>([])

  const fetchData = async () => {
    if (!session) return

    setLoading(true)
    const supabase = createClerkSupabaseClient({ session })

    // 1. Fetch Financials (Regs + Expenses) & Matches for Leaderboard
    const { data: regsData } = await supabase.from('tournament_registrations').select('*, teams(name)').eq('tournament_id', tournamentId)
    const { data: expData } = await (supabase as any)
      .from('tournament_expenses')
      .select('*')
      .eq('tournament_id', tournamentId)
    const { data: matchesData } = await supabase.from('matches').select('*').eq('tournament_id', tournamentId)
    const { data: tournamentData } = await (supabase as any).from('tournaments').select('entry_fee').eq('id', tournamentId).single()

    const regs = regsData as Registration[] | null
    const exp = expData as any[] | null
    const matches = matchesData as any[] | null
    const entryFee = tournamentData?.entry_fee || 0

    // Calculate Revenue
    const revenue = (regs?.filter((r) => r.status === 'paid' || r.status === 'verified').length || 0) * entryFee 
    
    // Calculate Expenses
    const expenseTotal = exp?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0
    setExpenses(exp || [])

    // Show Rate
    const checkedIn = regs?.filter((r) => r.weighed_in_at).length || 0
    const totalRegs = regs?.length || 1
    const showRate = Math.round((checkedIn / totalRegs) * 100)

    // Calculate Team Leaderboard
    const teamStats: Record<string, {name: string, gold: number, silver: number, bronze: number, points: number}> = {}
    
    if (regs && matches) {
        // Map Player -> Team Name
        const playerTeamMap = new Map<string, string>()
        regs.forEach((r: any) => {
            if (r.teams?.name && r.player_id) {
                playerTeamMap.set(r.player_id, r.teams.name)
            }
        })

        // Helper to init team stats
        const initTeam = (teamName: string) => {
            if (!teamStats[teamName]) {
                teamStats[teamName] = { name: teamName, gold: 0, silver: 0, bronze: 0, points: 0 }
            }
        }

        // Identify Finals and Semi-Finals
        const matchMap = new Map(matches.map(m => [m.id, m]))
        
        matches.forEach(m => {
            if (m.status !== 'completed' || !m.winner_id) return

            // Logic:
            // Final: next_match_id is null
            // Semi: next_match_id points to a Final
            
            const isFinal = !m.next_match_id
            let isSemi = false
            if (m.next_match_id) {
                const nextMatch = matchMap.get(m.next_match_id)
                if (nextMatch && !nextMatch.next_match_id) {
                    isSemi = true
                }
            }

            const winnerTeam = playerTeamMap.get(m.winner_id)
            const loserId = m.winner_id === m.player1_id ? m.player2_id : m.player1_id
            const loserTeam = loserId ? playerTeamMap.get(loserId) : null

            if (isFinal) {
                // Gold for Winner
                if (winnerTeam) {
                    initTeam(winnerTeam)
                    teamStats[winnerTeam].gold++
                    teamStats[winnerTeam].points += 5
                }
                // Silver for Loser
                if (loserTeam) {
                    initTeam(loserTeam)
                    teamStats[loserTeam].silver++
                    teamStats[loserTeam].points += 3
                }
            } else if (isSemi) {
                // Bronze for Loser
                if (loserTeam) {
                    initTeam(loserTeam)
                    teamStats[loserTeam].bronze++
                    teamStats[loserTeam].points += 1
                }
            }
        })
    }
    
    const leaderboard = Object.values(teamStats).sort((a,b) => b.points - a.points)
    setTeamLeaderboard(leaderboard) // No longer mock

    setStats({
      totalRevenue: revenue,
      totalExpenses: expenseTotal,
      netProfit: revenue - expenseTotal,
      showRate
    })

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [tournamentId, session])

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.category || !session) return

    const supabase = createClerkSupabaseClient({ session })
    
    if (editingExpense) {
      // Update existing expense
      const { error } = await (supabase as any).from('tournament_expenses')
        .update({
          category: newExpense.category,
          amount: Number(newExpense.amount),
          description: newExpense.description
        })
        .eq('id', editingExpense.id)
      
      if (!error) {
        setNewExpense({ category: '', amount: '', description: '' })
        setEditingExpense(null)
        setIsExpenseModalOpen(false)
        fetchData()
      } else {
        toast.error('Failed to update expense: ' + error.message)
      }
    } else {
      // Insert new expense
      const { error } = await (supabase as any).from('tournament_expenses').insert({
        tournament_id: tournamentId,
        category: newExpense.category,
        amount: Number(newExpense.amount),
        description: newExpense.description
      })

      if (!error) {
        setNewExpense({ category: '', amount: '', description: '' })
        setIsExpenseModalOpen(false)
        fetchData()
      } else {
        toast.error('Failed to add expense: ' + error.message)
      }
    }
  }

  const handleEditExpense = (expense: typeof expenses[0]) => {
    setEditingExpense(expense)
    setNewExpense({
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description || ''
    })
    setIsExpenseModalOpen(true)
  }

  const handleDeleteExpense = async () => {
    if (!session || !expenseToDelete) return

    const supabase = createClerkSupabaseClient({ session })
    const { error } = await (supabase as any).from('tournament_expenses')
      .delete()
      .eq('id', expenseToDelete)

    if (!error) {
      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
      fetchData()
    }
  }

  const openDeleteDialog = (expenseId: string) => {
    setExpenseToDelete(expenseId)
    setDeleteDialogOpen(true)
  }

  const handleCloseExpenseModal = () => {
    setIsExpenseModalOpen(false)
    setEditingExpense(null)
    setNewExpense({ category: '', amount: '', description: '' })
  }



  if (loading) return <ConcludedViewSkeleton />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Net Profit" 
          value={`₱${stats.netProfit.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
          trend={`${stats.netProfit > 0 ? '+' : ''}${Math.round((stats.netProfit / (stats.totalRevenue || 1)) * 100)}% Margin`}
          trendDirection={stats.netProfit > 0 ? 'up' : 'down'}
        />
        <KPICard 
          title="Total Revenue" 
          value={`₱${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-blue-500" />}
        />
        <KPICard 
          title="Total Expenses" 
          value={`₱${stats.totalExpenses.toLocaleString()}`}
          icon={<Calculator className="h-4 w-4 text-orange-500" />}
        />
        <KPICard 
          title="Show Rate" 
          value={`${stats.showRate}%`}
          icon={<UserCheck className="h-4 w-4 text-purple-500" />}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <a href={`/api/tournaments/${tournamentId}/export?format=csv&type=participants`} download>
            <Download className="mr-2 h-4 w-4" /> Participants CSV
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/tournaments/${tournamentId}/export?format=csv&type=results`} download>
            <Download className="mr-2 h-4 w-4" /> Results CSV
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/tournaments/${tournamentId}/export?format=pdf&type=results`} download>
            <Download className="mr-2 h-4 w-4" /> Results PDF
          </a>
        </Button>
        <Button variant="outline" onClick={() => setIsExpenseModalOpen(true)}>
          <Calculator className="mr-2 h-4 w-4" /> Add Expense
        </Button>
        <Dialog open={isExpenseModalOpen} onOpenChange={(open) => { if (!open) handleCloseExpenseModal() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit' : 'Add'} Tournament Expense</DialogTitle>
              <DialogDescription>
                Track venue costs, medals, staffing, etc. to calculate true profit.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <Input id="category" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="col-span-3" placeholder="e.g. Venue, Medals" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <Input id="amount" type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="col-span-3" placeholder="0.00" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="desc" className="text-right">Description</Label>
                <Input id="desc" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddExpense}>{editingExpense ? 'Update' : 'Save'} Expense</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Gold</TableHead>
                    <TableHead>Silver</TableHead>
                    <TableHead>Bronze</TableHead>
                    <TableHead>Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamLeaderboard.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No medal results yet. Standings appear once finals and semi-finals are completed.
                      </TableCell>
                    </TableRow>
                  ) : teamLeaderboard.map((team, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell className="text-yellow-600">{team.gold}</TableCell>
                      <TableCell className="text-gray-400">{team.silver}</TableCell>
                      <TableCell className="text-amber-700">{team.bronze}</TableCell>
                      <TableCell className="font-bold">{team.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No expenses recorded</TableCell>
                    </TableRow>
                  ) : expenses.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-medium">{e.category}</div>
                        {e.description && (
                          <div className="text-xs text-muted-foreground">{e.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">₱{e.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExpense(e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(e.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


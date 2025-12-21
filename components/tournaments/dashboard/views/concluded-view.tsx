"use client"

import { useEffect, useState } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { KPICard } from '../kpi-card'
import { DollarSign, Trophy, UserCheck, Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [newExpense, setNewExpense] = useState({ category: '', amount: '', description: '' })
  const [expenses, setExpenses] = useState<{category: string, amount: number, description: string | null}[]>([])

  const fetchData = async () => {
    if (!session) return

    setLoading(true)
    const supabase = createClerkSupabaseClient({ session })

    // 1. Fetch Financials (Regs + Expenses)
    const { data: regsData } = await supabase.from('tournament_registrations').select('*').eq('tournament_id', tournamentId)
    const { data: expData } = await (supabase as any)
      .from('tournament_expenses')
      .select('*')
      .eq('tournament_id', tournamentId)

    const regs = regsData as Registration[] | null
    const exp = expData as any[] | null

    // Calculate Revenue
    const revenue = (regs?.filter((r) => r.payment_status === 'paid').length || 0) * 50 
    
    // Calculate Expenses
    const expenseTotal = exp?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0
    setExpenses(exp || [])

    // Show Rate
    const checkedIn = regs?.filter((r) => r.weighed_in_at).length || 0
    const totalRegs = regs?.length || 1
    const showRate = Math.round((checkedIn / totalRegs) * 100)

    // Team Leaderboard (Mocking medal counts)
    const mockLeaderboard = [
      { name: 'Cobra Kai', gold: 5, silver: 2, bronze: 1, points: 20 },
      { name: 'Miyagi-Do', gold: 4, silver: 3, bronze: 3, points: 21 },
      { name: 'Eagle Fang', gold: 2, silver: 5, bronze: 0, points: 16 },
    ].sort((a,b) => b.points - a.points)
    
    setTeamLeaderboard(mockLeaderboard)

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
    const { error } = await (supabase as any).from('tournament_expenses').insert({
      tournament_id: tournamentId,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      description: newExpense.description
    })

    if (!error) {
      setNewExpense({ category: '', amount: '', description: '' })
      setIsExpenseModalOpen(false)
      fetchData() // Refresh
    }
  }



  if (loading) return <ConcludedViewSkeleton />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Net Profit" 
          value={`$${stats.netProfit}`}
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
          trend={`${stats.netProfit > 0 ? '+' : ''}${Math.round((stats.netProfit / (stats.totalRevenue || 1)) * 100)}% Margin`}
          trendDirection={stats.netProfit > 0 ? 'up' : 'down'}
        />
        <KPICard 
          title="Total Revenue" 
          value={`$${stats.totalRevenue}`}
          icon={<DollarSign className="h-4 w-4 text-blue-500" />}
        />
        <KPICard 
          title="Total Expenses" 
          value={`$${stats.totalExpenses}`}
          icon={<Calculator className="h-4 w-4 text-orange-500" />}
        />
        <KPICard 
          title="Show Rate" 
          value={`${stats.showRate}%`}
          icon={<UserCheck className="h-4 w-4 text-purple-500" />}
        />
      </div>

      <div className="flex justify-end">
        <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Calculator className="mr-2 h-4 w-4" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tournament Expense</DialogTitle>
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
              <Button onClick={handleAddExpense}>Save Expense</Button>
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
                  {teamLeaderboard.map((team, i) => (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">No expenses recorded</TableCell>
                    </TableRow>
                  ) : expenses.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>{e.category}</TableCell>
                      <TableCell className="text-right">${e.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

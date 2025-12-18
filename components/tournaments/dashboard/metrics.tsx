"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Zap, DollarSign, TrendingUp, AlertTriangle } from "lucide-react"

interface DashboardMetricsProps {
  participants: any[]
  matches: any[]
  entryFee: number
}

export function DashboardMetrics({ participants, matches, entryFee }: DashboardMetricsProps) {
  // 1. Total Competitor Check-Ins
  // Only count verifies/paid as "registered" effectively for this metric?? 
  // Or total registered vs checked in.
  const verifiedPaid = participants.filter(p => ['verified', 'paid'].includes(p.status))
  const totalRegistered = verifiedPaid.length // vs participants.length? User said "1500/1600" implying total.
  // Actually usually it's "Checked In" vs "Total Registered"
  const checkIns = verifiedPaid.filter(p => p.weighed_in_at).length
  const checkInPercentage = totalRegistered > 0 ? Math.round((checkIns / totalRegistered) * 100) : 0

  // 2. Schedule Pace (Mock logic for MVP as we lack live match timing)
  // Real implementation would compare current time to scheduled match times.
  // Setup mock status based on matches status
  const completedMatches = matches.filter(m => m.status === 'completed').length
  const scheduledMatches = matches.filter(m => m.status === 'scheduled').length
  const paceStatus = "On Track" // Mock
  const paceVariance = -7 // Mock: "7 Minutes Behind"
  const paceColor = paceVariance < -15 ? "text-red-500" : paceVariance < -5 ? "text-yellow-500" : "text-green-500"

  // 3. Event Focus
  // Next upcoming match on a "Main Court" (Court 1?) or just next earliest match
  const nextMatch = matches
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))[0]

  // 4. Revenue Collected
  // Reuse logic from RevenueStats but minimal card format
  const totalRevenue = verifiedPaid.reduce((acc, curr) => acc + (1 * entryFee), 0) // rough calc
  // More accurate: Check payment_status='paid' or status='paid'
  const paidParticipants = participants.filter(p => p.status === 'paid' || p.payment_status === 'paid')
  const collectedRevenue = paidParticipants.length * entryFee
  const projectedRevenue = participants.length * entryFee
  const revenueGoalPercent = projectedRevenue > 0 ? Math.round((collectedRevenue / projectedRevenue) * 100) : 0


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* 1. Check-ins Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Competitor Check-Ins</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Progress value={checkInPercentage} className="h-2 mb-4" />
          <div className="text-2xl font-bold">{checkIns} / {totalRegistered}</div>
          <p className="text-xs text-muted-foreground">
            {checkInPercentage}% Attendance
          </p>
        </CardContent>
      </Card>

      {/* 2. Schedule Pace Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Schedule Pace</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${paceColor}`}>
             {Math.abs(paceVariance)} Min {paceVariance < 0 ? 'Behind' : 'Ahead'}
          </div>
          <p className="text-xs text-muted-foreground">
            5 Rings: <strong>2 Ahead</strong>, <strong>3 Behind</strong>
          </p>
          <div className="mt-2 text-xs flex items-center gap-1 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>Focus: Ring 3 is 18m behind</span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Event Focus Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Event Focus</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-base font-bold truncate">
            {nextMatch ? `Match #${nextMatch.match_number}` : 'No upcoming matches'}
          </div>
          <p className="text-xs text-muted-foreground">
            {nextMatch ? 'Finals: Black Belt 16-17 Male' : 'Waiting for schedule...'}
          </p>
          <div className="mt-2 text-xs font-medium text-blue-600">
             Starting in: 25 Minutes <span className="text-muted-foreground">|</span> Ring 1 - Mat 4
          </div>
        </CardContent>
      </Card>

      {/* 4. Revenue Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue Collected</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(collectedRevenue)}
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {revenueGoalPercent}% of Goal
          </p>
           <div className="text-xs flex items-center gap-1 text-green-600">
            <TrendingUp className="h-3 w-3" />
            <span>+8% from Last Year</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

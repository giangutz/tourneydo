"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Participant {
  id: string
  actual_weight: number | null
  disqualified: boolean
  disqualification_reason: string | null
  player: {
    first_name: string
    last_name: string
    weight: number | null // registered weight
  }
  team?: {
    name: string
  } | null
}

export function FailedWeighIns({ participants }: { participants: Participant[] }) {
  // Logic: Identify participants who are disqualified OR missed weight
  const failed = participants.filter(p => {
    const isDisqualified = p.disqualified
    // Example logic: if actual > registered + allowance (assuming 0 allowance for display for now)
    const missedWeight = p.actual_weight !== null && p.player.weight && p.actual_weight > p.player.weight
    
    // Alert if disqualified due to weight OR simply disqualified currently
    // Or if they missed weight but aren't disqualified yet (Action needed!)
    return isDisqualified || missedWeight
  })

  if (failed.length === 0) return null

  return (
    <Card className="border-destructive/50 bg-destructive/5 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <CardTitle>Action Required: Weigh-In Issues</CardTitle>
        </div>
        <CardDescription>
          The following athletes have weight discrepancies or disqualifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {failed.map(p => (
            <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-3 rounded-lg border">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {p.player.first_name} {p.player.last_name}
                  <Badge variant="outline">{p.team?.name || 'Unattached'}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <Scale className="h-3 w-3" />
                  <span>Registered: {p.player.weight}kg</span>
                  <span className="text-destructive font-medium">Actual: {p.actual_weight ?? 'N/A'}kg</span>
                </div>
              </div>
              
              <div className="text-sm">
                 {p.disqualified ? (
                   <Badge variant="destructive">Disqualified</Badge>
                 ) : (
                   <Badge variant="secondary" className="text-destructive border-destructive/30">Over Weight</Badge>
                 )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

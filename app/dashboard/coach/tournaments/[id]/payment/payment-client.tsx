"use client"

import { useState, useMemo, useEffect } from "react"
import { Tournament, Team, TournamentRegistration } from "@/types/models"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { CreditCard, Users, CheckCircle2, Clock, Weight, Ruler } from "lucide-react"
import { toast } from "sonner"
import { submitBulkPayments } from "@/lib/actions/payments"
import { useRouter } from "next/navigation"

interface PaymentClientProps {
  tournament: Tournament
  teams: Team[]
  registrations: TournamentRegistration[]
  coachId: string
  divisions: any[] // Using any to avoid complex type matching for now, verified by query
}

export function PaymentClient({ tournament, teams, registrations, coachId, divisions }: PaymentClientProps) {
  const router = useRouter()
  // selectedTeam state removed
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [referenceNumber, setReferenceNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Helper to calculate age from DOB
  const calculateAge = (dob: string | null) => {
    if (!dob) return null
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Helper to format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Helper to predict division if not assigned
  const getPredictedDivision = (player: any, assignedDivision: any) => {
    // If we have a FULL assignment (division + category), use that
    // But usually we only have division name from the join if 'tournament_divisions' is just the division part.
    // The previous code returned `assignedDivision.name`.
    // If the query included category, we could use that.
    // For now, let's proceed with prediction if detailed info is missing, or enhance the display.
    
    // Actually, if assignedDivision is set, it means the organizer/system has locked them in.
    // But the user request implies they want this detail *even if* it is just "Possible".
    // Let's rely on prediction for the "Possible" label to verify data.
    
    if (!player?.dob) return 'Unknown'
    const age = calculateAge(player.dob)
    if (age === null) return 'Unknown'

    // 1. Find Division by Age
    const division = divisions.find(d => {
      const min = d.min_age === null ? 0 : d.min_age
      const max = d.max_age === null ? 999 : d.max_age
      return age >= min && age <= max
    })

    if (!division) return 'No eligible division'

    // 2. Find Skill Level (Belt)
    let skill = 'Unknown'
    if (player.belt_level) {
      if (['White'].includes(player.belt_level)) skill = 'Beginner'
      else if (['Yellow', 'Blue'].includes(player.belt_level)) skill = 'Novice I'
      else if (['Red', 'Brown'].includes(player.belt_level)) skill = 'Novice II'
      else if (['Black'].includes(player.belt_level)) skill = 'Advanced'
    }

    // 3. Find Category (Weight/Height)
    let categoryName = 'Unknown'
    if (division.tournament_categories?.length) {
      const gender = player.gender // 'male' | 'female'
      
      const category = division.tournament_categories.find((cat: any) => {
        // Gender check
        if (cat.gender !== 'both' && cat.gender !== gender) return false

        // Height check (common for Gradeschool)
        if (cat.min_height !== null || cat.max_height !== null) {
          if (!player.height) return false
          const minH = cat.min_height === null ? 0 : cat.min_height
          // Note: Logic often implies < max, or <= max. Standard is usually (min <= h < max), but let's be loose.
          // lib/constants/divisions logic: min <= < max (except top group).
          // Let's stick to simple bounds check.
          const maxH = cat.max_height === null ? 999 : cat.max_height
          
          // Strict check: min <= h < max (unless max is null/very high? No, usually top group is open)
          // For now, simple inclusive/exclusive check matching the constants logic:
          // Constants: minHeight defined -> >= min. Max defined -> < max (unless it's the top cap?)
          // Let's assume inclusive min, exclusive max for now as per previous constant file viewing.
          // BUT Gradeschool Group 6 was <= 168.01.
          // Let's just use >= min && (limit === null || <= limit) to be safe for visual matching.
          return player.height >= minH && player.height <= maxH
        }

        // Weight check
        if (cat.min_weight !== null || cat.max_weight !== null) {
          if (!player.weight) return false
          const minW = cat.min_weight === null ? 0 : cat.min_weight
          const maxW = cat.max_weight === null ? 999 : cat.max_weight
          // Weight classes: > min && <= max usually.
          // Fin is <= max. Heavy is > min.
          return player.weight > minW && player.weight <= maxW
        }

        return false
      })

      if (category) categoryName = category.name
    }

    // 4. Construct Label
    // Format: "Division Gender Skill - Category"
    // Gender Label:
    const isChild = age < 12
    const genderLabel = player.gender === 'male' ? (isChild ? 'Boys' : 'Men') : (isChild ? 'Girls' : 'Women')

    return `${division.name} ${genderLabel} ${skill} - ${categoryName}`
  }

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter registrations by status
  const pendingRegistrations = useMemo(() => registrations.filter(r => r.status === 'pending'), [registrations])
  const paidRegistrations = useMemo(() => registrations.filter(r => r.status === 'paid'), [registrations])
  const verifiedRegistrations = useMemo(() => registrations.filter(r => r.status === 'verified'), [registrations])

  // Pagination Logic
  const totalPages = Math.ceil(pendingRegistrations.length / pageSize)
  const paginatedPending = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return pendingRegistrations.slice(start, start + pageSize)
  }, [pendingRegistrations, currentPage, pageSize])

  // Reset page if data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [registrations])

  // Calculate amount
  const entryFee = tournament.entry_fee || 0
  const totalAmount = selectedPlayers.length * entryFee

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const handleSelectAllPending = () => {
    const allPendingIds = pendingRegistrations.map(r => r.player_id)
    const allSelected = allPendingIds.every(id => selectedPlayers.includes(id))
    
    if (allSelected) {
      // Deselect all pending
      setSelectedPlayers(prev => prev.filter(id => !allPendingIds.includes(id)))
    } else {
      // Select all pending
      const newSelected = new Set([...selectedPlayers, ...allPendingIds])
      setSelectedPlayers(Array.from(newSelected))
    }
  }

  const handleSubmit = async () => {
    if (selectedPlayers.length === 0) {
      toast.error("Please select at least one player")
      return
    }

    if (!referenceNumber.trim() || referenceNumber.length !== 5) {
      toast.error("Please enter the last 5 characters of the reference number")
      return
    }

    setIsSubmitting(true)

    try {
      // Group selected players by team to create separate payments if needed
      const selectedRegs = registrations.filter(r => selectedPlayers.includes(r.player_id))
      const playersByTeam: Record<string, string[]> = {}
      
      selectedRegs.forEach(r => {
        if (!playersByTeam[r.team_id]) {
          playersByTeam[r.team_id] = []
        }
        playersByTeam[r.team_id].push(r.player_id)
      })

      const teamIds = Object.keys(playersByTeam)
      const submissions = teamIds.map(teamId => ({
        team_id: teamId,
        amount: playersByTeam[teamId].length * entryFee,
        playerIds: playersByTeam[teamId]
      }))

      // Single Bulk Request
      const result = await submitBulkPayments(
        submissions,
        {
          tournament_id: tournament.id,
          coach_id: coachId,
          reference_number: referenceNumber.trim()
        },
        `/dashboard/coach/tournaments/${tournament.id}/payment`
      )

      if (result.success) {
        toast.success("Payments Submitted", {
          description: `Successfully submitted payments for ${selectedPlayers.length} players across ${teamIds.length} teams.`
        })
        setSelectedPlayers([])
        setReferenceNumber("")
        // No need for explicit refresh if revalidatePath works, but router.refresh() is good for client state
        router.refresh()
      } else {
        toast.error("Submission Failed", {
          description: result.error || "Unknown error"
        })
      }
    } catch (error) {
      console.error("Payment submission error:", error)
      toast.error("Submission Failed", {
        description: "An unexpected error occurred."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Player Selection - Grouped by Status for Clarity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <Users className="h-5 w-5" />
             Select Players to Pay For
          </CardTitle>
          <CardDescription>
            Entry Fee: ₱{entryFee.toLocaleString()} per player. You can select players from multiple teams.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* 1. PENDING PLAYERS */}
          {pendingRegistrations.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Pending Payment ({pendingRegistrations.length})
                  </Label>
                  {/* Page Size Selector */}
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(val) => {
                      setPageSize(Number(val))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue placeholder="Page Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSelectAllPending}>
                  {pendingRegistrations.every(r => selectedPlayers.includes(r.player_id)) ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Group by Team - Using Paginated Data */}
              {teams.map(team => {
                // Filter the PAGINATED list, not the full list
                const teamPending = paginatedPending.filter(r => r.team_id === team.id)
                if (teamPending.length === 0) return null

                return (
                  <div key={team.id} className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                      {team.name}
                    </div>
                    <div className="border rounded-lg divide-y">
                      {teamPending.map(reg => {
                        const player = (reg as any).player
                        const division = (reg as any).tournament_divisions
                        const predictedDivision = getPredictedDivision(player, division)
                        const isSelected = selectedPlayers.includes(reg.player_id)
                        
                        return (
                          <div 
                            key={reg.id} 
                            className={`p-4 transition-colors cursor-pointer ${isSelected ? 'bg-muted/50' : 'hover:bg-muted/20'}`}
                            onClick={() => togglePlayer(reg.player_id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => togglePlayer(reg.player_id)}
                                onClick={(e) => e.stopPropagation()} // Prevent double-toggle
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-semibold text-base">
                                      {player?.first_name} {player?.last_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {team.name}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                                    Pending
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                      <Weight className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Weight:</span>
                                      <span className="font-medium">{player?.weight ? `${player.weight} kg` : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Height:</span>
                                      <span className="font-medium">{player?.height ? `${player.height} cm` : 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Possible Division</div>
                                    <div className="font-medium text-sm text-primary">
                                      {predictedDivision}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No pending payments.
            </div>
          )}

          {/* 2. PAID (Verification Pending) */}
          {paidRegistrations.length > 0 && (
             <div className="space-y-4 pt-4 border-t">
               <div className="flex items-center justify-between pb-2">
                 <Label className="text-sm font-semibold flex items-center gap-2">
                   <CreditCard className="h-4 w-4 text-blue-500" />
                   Paid - Awaiting Verification ({paidRegistrations.length})
                 </Label>
               </div>
               {/* Simplified list for paid players - grouped by team */}
               {teams.map(team => {
                 const teamPaid = paidRegistrations.filter(r => r.team_id === team.id)
                 if (teamPaid.length === 0) return null
                 return (
                   <div key={`paid-${team.id}`} className="space-y-2">
                     <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">{team.name}</div>
                     <div className="border rounded-lg p-2 space-y-2">
                       {teamPaid.map(reg => {
                           const player = (reg as any).player
                           return (
                             <div key={reg.id} className="flex justify-between items-center text-sm p-2 hover:bg-muted/50 rounded-md">
                               <div>{player?.first_name} {player?.last_name}</div>
                               <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>
                             </div>
                           )
                       })}
                     </div>
                   </div>
                 )
               })}
             </div>
          )}

           {/* 3. VERIFIED */}
           {verifiedRegistrations.length > 0 && (
             <div className="space-y-4 pt-4 border-t">
               <div className="flex items-center justify-between pb-2">
                 <Label className="text-sm font-semibold flex items-center gap-2">
                   <CheckCircle2 className="h-4 w-4 text-green-500" />
                   Verified ({verifiedRegistrations.length})
                 </Label>
               </div>
                {/* Simplified list for verified players */}
                {teams.map(team => {
                 const teamVerified = verifiedRegistrations.filter(r => r.team_id === team.id)
                 if (teamVerified.length === 0) return null
                 return (
                   <div key={`verified-${team.id}`} className="space-y-2">
                     <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">{team.name}</div>
                     <div className="border rounded-lg p-2 space-y-2 bg-muted/20">
                       {teamVerified.map(reg => {
                           const player = (reg as any).player
                           return (
                             <div key={reg.id} className="flex justify-between items-center text-sm p-2">
                               <div className="opacity-70">{player?.first_name} {player?.last_name}</div>
                               <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Verified</Badge>
                             </div>
                           )
                       })}
                     </div>
                   </div>
                 )
               })}
             </div>
          )}

        </CardContent>
      </Card>{/* Payment Details */}
          {selectedPlayers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Step 2: Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount Summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                  <div className="text-3xl font-bold text-primary">
                    ₱{totalAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedPlayers.length} player(s) × ₱{entryFee.toLocaleString()}
                  </div>
                </div>

                {/* Reference Number */}
                <div className="space-y-2">
                  <Label htmlFor="reference">
                    Payment Reference Number (Last 5 Characters) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reference"
                    maxLength={5}
                    placeholder="e.g. 56789 or AB123"
                    value={referenceNumber}
                    onChange={e => {
                      // Allow alphanumeric, remove special chars/spaces if needed, or just slice
                      // Let's allow alphanumeric and filter out spaces/symbols to be safe for a "ref number"
                      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5)
                      setReferenceNumber(val)
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Please enter the last 5 characters of your payment reference number or transaction ID.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedPlayers.length === 0 || !referenceNumber.trim()}
                >
                  {isSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Submit Payment for Verification
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
    </div>
  )
}
